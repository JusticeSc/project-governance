import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { collectReviewEvidence } from '../src/evidence.mjs'

// REST/GraphQL responses below are deliberately constructed fixtures, not real human feedback.
const date = hour => `2026-01-01T${String(hour).padStart(2, '0')}:00:00Z`
const user = { login: 'reviewer', type: 'User' }
function fixture(t, shape = 'merge') {
  const checkout = mkdtempSync(join(tmpdir(), 'review-evidence-'))
  t.after(() => rmSync(checkout, { recursive: true, force: true }))
  const git = (args, hour = 1) => {
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^GIT_/i.test(key)))
    Object.assign(env, { GIT_AUTHOR_NAME: 'Fixture', GIT_AUTHOR_EMAIL: 'fixture@example.invalid', GIT_COMMITTER_NAME: 'Fixture', GIT_COMMITTER_EMAIL: 'fixture@example.invalid', GIT_AUTHOR_DATE: date(hour), GIT_COMMITTER_DATE: date(hour), GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null' })
    const result = spawnSync('git', ['-C', checkout, ...args], { env, encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr)
    return result.stdout.trim()
  }
  git(['init', '-b', 'main'])
  const commit = (file, body, hour) => {
    writeFileSync(join(checkout, file), body)
    git(['add', '--', file])
    git(['commit', '-m', 'constructed fixture'], hour)
    return git(['rev-parse', 'HEAD'])
  }
  commit('root.txt', 'root\n', 1)
  git(['checkout', '-b', 'feature'])
  commit('stack.txt', 'feature base\n', 2)
  git(['checkout', '-b', 'pr'])
  const clicked = commit('pr.txt', 'initial PR\n', 3)
  const baseline = commit('pr.txt', 'PR before feedback\n', 4)
  const head = commit('pr.txt', 'PR adopted change\n', 7)
  git(['checkout', 'main'])
  commit('target.txt', 'target-only feedback-matching change\n', 5)
  git(['merge', '--no-ff', 'feature', '-m', 'land feature'], 6)
  const targetParent = git(['rev-parse', 'HEAD'])
  if (shape === 'squash') {
    git(['merge', '--squash', 'pr'])
    git(['commit', '-m', 'squash PR'], 9)
  } else git(['merge', '--no-ff', 'pr', '-m', 'land PR'], 9)
  const landing = git(['rev-parse', 'HEAD'])
  git(['checkout', '--detach', landing])
  const comments = [{ id: 1, html_url: 'https://github.com/example/repo/pull/1#discussion_r1', body: 'constructed fixture: adopt PR change', user, created_at: date(6), updated_at: date(6), commit_id: clicked }]
  const reviews = []
  const graph = []
  const calls = []
  const pull = { number: 1, merged: true, merged_at: date(9), user: { login: 'author', type: 'User' }, merge_commit_sha: landing, commits: 3, head: { sha: head }, base: { ref: 'feature' } }
  const commits = [clicked, baseline, head].map(sha => ({ sha }))
  const request = async endpoint => {
    calls.push(endpoint)
    const parsed = new URL(endpoint, 'https://api.github.com/')
    const page = Number(parsed.searchParams.get('page') ?? 1)
    if (parsed.pathname === '/graphql') {
      const query = parsed.searchParams.get('query')
      const offset = query.includes('after:') ? 100 : 0
      return { data: { repository: { pullRequest: { reviews: { nodes: graph.slice(offset, offset + 100), pageInfo: { hasNextPage: graph.length > offset + 100, endCursor: graph.length > offset + 100 ? 'next' : null } } } } } }
    }
    if (parsed.pathname === '/repos/example/repo/pulls/1') return structuredClone(pull)
    for (const [suffix, values] of [['commits', commits], ['comments', comments], ['reviews', reviews]]) {
      if (parsed.pathname === `/repos/example/repo/pulls/1/${suffix}`) return structuredClone(values.slice((page - 1) * 100, page * 100))
    }
    throw new Error(`Unexpected constructed-fixture endpoint: ${endpoint}`)
  }
  const options = { checkout, repository: 'example/repo', targetRef: landing, since: date(1), pulls: [1], request }
  const addReview = (id, edited = null) => {
    reviews.push({ id, html_url: `https://github.com/example/repo/pull/1#pullrequestreview-${id}`, body: 'constructed fixture review', user, submitted_at: date(6), commit_id: clicked })
    graph.push({ databaseId: id, createdAt: date(5), submittedAt: date(6), lastEditedAt: edited, body: 'constructed fixture review', author: { login: user.login }, commit: { oid: clicked } })
  }
  return { options, pull, comments, commits, reviews, graph, calls, addReview, baseline, head, clicked, landing, targetParent, git }
}

test('real three-branch Git evidence excludes target-only changes and uses latest baseline, not clicked commit', async t => {
  const f = fixture(t)
  const result = await collectReviewEvidence(f.options)
  assert.deepEqual(result.skippedPulls, [])
  assert.equal(result.items.length, 1)
  const item = result.items[0]
  assert.equal(item.baselineCommit, f.baseline)
  assert.equal(item.commitId, f.clicked)
  assert.equal(item.targetParent, f.targetParent)
  assert.equal(item.landingCommit, f.landing)
  assert.match(item.feedbackPatch, /PR before feedback/)
  assert.doesNotMatch(item.feedbackPatch, /PR adopted change|target-only|target\.txt|stack\.txt/)
  assert.match(item.finalPatch, /PR adopted change/)
  assert.doesNotMatch(item.finalPatch, /target-only|target\.txt|stack\.txt/)
  assert.ok(!f.calls.some(endpoint => endpoint.includes('/issues/')))
})

test('reconstructs squash landing from real Git tree', async t => {
  const f = fixture(t, 'squash')
  const result = await collectReviewEvidence(f.options)
  assert.deepEqual(result.skippedPulls, [])
  assert.equal(result.items.length, 1)
  assert.doesNotMatch(result.items[0].finalPatch, /target-only/)
})

test('filters author, bot, strict creation/edit times, lost anchors and missing baseline', async t => {
  const f = fixture(t)
  const seed = f.comments[0]
  f.comments.push(
    { ...seed, id: 2, user: { login: 'AUTHOR', type: 'User' } },
    { ...seed, id: 3, user: { login: 'robot[bot]', type: 'Bot' } },
    { ...seed, id: 4, created_at: date(9), updated_at: date(9) },
    { ...seed, id: 5, updated_at: date(9) },
    { ...seed, id: 6, commit_id: 'a'.repeat(40) },
    { ...seed, id: 7, created_at: date(3), updated_at: date(3) },
  )
  const result = await collectReviewEvidence(f.options)
  assert.deepEqual(result.skippedPulls, [])
  assert.equal(result.items.length, 1)
  assert.deepEqual(result.excluded.map(value => value.reason), ['pull-author-feedback', 'non-user-author', 'not-strictly-pre-merge', 'not-strictly-pre-merge', 'review-anchor-not-in-pull', 'no-surviving-feedback-baseline'])
})

test('reviews use submission time and GraphQL edit metadata, never REST submission as edit proof', async t => {
  const f = fixture(t)
  f.comments.length = 0
  f.addReview(10)
  f.addReview(11, date(9))
  const result = await collectReviewEvidence(f.options)
  assert.deepEqual(result.skippedPulls, [])
  assert.equal(result.items[0].id, 'review:10')
  assert.equal(result.items[0].baselineCommit, f.baseline)
  assert.equal(result.items[0].updatedAt, date(6))
  assert.deepEqual(result.excluded, [{ id: 'review:11', pullNumber: 1, reason: 'not-strictly-pre-merge' }])
  delete f.graph[0].lastEditedAt
  const missing = await collectReviewEvidence(f.options)
  assert.deepEqual(missing.items, [])
  assert.equal(missing.skippedPulls[0].reason, 'invalid-review-edit-metadata')
})

test('fully paginates comments, reviews, review edit metadata and pull commits', async t => {
  const f = fixture(t)
  for (let id = 2; id <= 101; id++) f.comments.push({ ...f.comments[0], id })
  for (let id = 1000; id <= 1100; id++) f.addReview(id)
  // Construct additional *real* PR commits on a separate head, then land it.
  f.git(['checkout', '-b', 'large', f.head])
  for (let index = 0; index < 98; index++) {
    f.git(['commit', '--allow-empty', '-m', `fixture ${index}`], 7)
    f.commits.push({ sha: f.git(['rev-parse', 'HEAD']) })
  }
  const head = f.git(['rev-parse', 'HEAD'])
  f.git(['checkout', '--detach', f.targetParent])
  f.git(['merge', '--no-ff', head, '-m', 'land large fixture'], 9)
  const landing = f.git(['rev-parse', 'HEAD'])
  f.pull.commits = f.commits.length
  f.pull.head.sha = head
  f.pull.merge_commit_sha = landing
  const result = await collectReviewEvidence({ ...f.options, targetRef: landing })
  assert.deepEqual(result.skippedPulls, [])
  assert.equal(result.items.length, 202)
  for (const suffix of ['comments', 'reviews', 'commits']) assert.ok(f.calls.some(endpoint => endpoint.includes(`/${suffix}?per_page=100&page=2`)))
  assert.ok(f.calls.some(endpoint => endpoint.startsWith('graphql?') && decodeURIComponent(endpoint).includes('after:"next"')))
})

test('preflight rejects unreachable, oversized and unverifiable landing before feedback', async t => {
  const f = fixture(t)
  f.pull.commits = 251
  let result = await collectReviewEvidence(f.options)
  assert.equal(result.skippedPulls[0].reason, 'pull-commit-cap')
  assert.ok(!f.calls.some(endpoint => endpoint.includes('/comments') || endpoint.includes('/reviews') || endpoint.startsWith('graphql')))
  f.pull.commits = 3
  f.pull.merge_commit_sha = f.head
  result = await collectReviewEvidence({ ...f.options, targetRef: f.targetParent })
  assert.equal(result.skippedPulls[0].reason, 'merge-not-reachable')
  f.pull.merge_commit_sha = f.landing
  f.pull.head.sha = f.baseline
  result = await collectReviewEvidence(f.options)
  assert.equal(result.skippedPulls[0].reason, 'pull-commit-not-on-head')
})

test('byte bounds and malformed API fail a whole PR without returning partial evidence', async t => {
  const f = fixture(t)
  const bounded = await collectReviewEvidence({ ...f.options, maxPatchBytes: 1 })
  assert.equal(bounded.items.length, 0)
  assert.equal(bounded.skippedPulls.length, 1)
  f.comments.push({ ...f.comments[0], id: 2, updated_at: 'invalid' })
  const malformed = await collectReviewEvidence(f.options)
  assert.equal(malformed.items.length, 0)
  assert.equal(malformed.skippedPulls[0].reason, 'invalid-timestamp')
  const failed = await collectReviewEvidence({ ...f.options, request: async () => { throw new Error('private API failure') } })
  assert.deepEqual(failed.items, [])
  assert.deepEqual(failed.skippedPulls, [{ pullNumber: 1, reason: 'pull-acquisition-failed' }])
})

test('search paginates fully and never conceals cap, incomplete results or API failure', async t => {
  const f = fixture(t)
  const calls = []
  const searchRequest = async endpoint => {
    if (!endpoint.startsWith('search/')) throw new Error('constructed per-PR acquisition failure')
    calls.push(endpoint)
    const page = Number(new URL(endpoint, 'https://api.github.com').searchParams.get('page'))
    return { total_count: 101, incomplete_results: false, items: Array.from({ length: page === 1 ? 100 : 1 }, (_, index) => ({ number: (page - 1) * 100 + index + 1, pull_request: {} })) }
  }
  const options = { ...f.options, pulls: undefined }
  const result = await collectReviewEvidence({ ...options, request: searchRequest })
  assert.equal(calls.length, 2)
  assert.equal(result.selectedPulls.length, 101)
  assert.equal(result.skippedPulls.length, 101)
  for (const [payload, code] of [[{ total_count: 1001, incomplete_results: false, items: [] }, 'search-result-cap'], [{ total_count: 0, incomplete_results: true, items: [] }, 'incomplete-search'], [{ total_count: 1, incomplete_results: false, items: [] }, 'incomplete-search']]) {
    await assert.rejects(collectReviewEvidence({ ...options, request: async () => payload }), error => error.code === code)
  }
  await assert.rejects(collectReviewEvidence({ ...options, request: async () => { throw new Error('constructed search failure') } }), /constructed search failure/)
})

test('rejects one-parent landing whose tree cannot be reconstructed from PR and target', async t => {
  const f = fixture(t, 'squash')
  writeFileSync(join(f.options.checkout, 'foreign.txt'), 'not in PR head\n')
  f.git(['add', 'foreign.txt'])
  f.git(['commit', '--amend', '--no-edit'], 9)
  const alteredLanding = f.git(['rev-parse', 'HEAD'])
  f.pull.merge_commit_sha = alteredLanding
  const result = await collectReviewEvidence({ ...f.options, targetRef: alteredLanding })
  assert.deepEqual(result.items, [])
  assert.equal(result.skippedPulls[0].reason, 'unreconstructable-squash-landing')
  assert.ok(!f.calls.some(endpoint => endpoint.includes('/comments') || endpoint.includes('/reviews')))
})

test('rejects rebase-like landing with surviving PR commits already on target parent', async t => {
  const f = fixture(t)
  f.pull.merge_commit_sha = f.head
  const result = await collectReviewEvidence({ ...f.options, targetRef: f.head })
  assert.equal(result.skippedPulls[0].reason, 'ambiguous-rebase-landing')
  assert.ok(!f.calls.some(endpoint => endpoint.includes('/comments') || endpoint.includes('/reviews')))
})

test('reviews with removed anchors stay excluded and unavailable GraphQL fails closed', async t => {
  const f = fixture(t)
  f.addReview(10)
  f.reviews[0].commit_id = 'b'.repeat(40)
  f.graph[0].commit.oid = 'b'.repeat(40)
  const anchored = await collectReviewEvidence(f.options)
  assert.equal(anchored.items.length, 1)
  assert.deepEqual(anchored.excluded, [{ id: 'review:10', pullNumber: 1, reason: 'review-anchor-not-in-pull' }])
  const failed = await collectReviewEvidence({ ...f.options, request: async endpoint => endpoint.startsWith('graphql?') ? { errors: [{ message: 'constructed permission failure' }] } : f.options.request(endpoint) })
  assert.deepEqual(failed.items, [])
  assert.equal(failed.skippedPulls[0].reason, 'review-edit-metadata-unavailable')
})

test('patch bounds accept the complete exact-size patch and reject one byte less', async t => {
  const f = fixture(t)
  const full = await collectReviewEvidence(f.options)
  assert.equal(full.items.length, 1)
  const required = Math.max(Buffer.byteLength(full.items[0].feedbackPatch), Buffer.byteLength(full.items[0].finalPatch))
  const exact = await collectReviewEvidence({ ...f.options, maxPatchBytes: required })
  assert.equal(exact.items.length, 1)
  const short = await collectReviewEvidence({ ...f.options, maxPatchBytes: required - 1 })
  assert.deepEqual(short.items, [])
  assert.equal(short.skippedPulls.length, 1)
  assert.equal(short.skippedPulls[0].reason, 'output-byte-limit')
})
