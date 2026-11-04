import { runCommand } from './adapters.mjs'

const SHA = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/
const API_BYTES = 16 * 1024 * 1024
const BODY_BYTES = 256 * 1024

function reject(code) {
  throw Object.assign(new Error(code), { code })
}
function object(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) reject('invalid-api-schema')
  return value
}
function text(value, limit = BODY_BYTES) {
  if (typeof value !== 'string') reject('invalid-api-schema')
  if (Buffer.byteLength(value) > limit) reject('feedback-byte-limit')
  return value
}
function integer(value) {
  if (!Number.isSafeInteger(value) || value <= 0) reject('invalid-api-schema')
  return value
}
function sha(value) {
  if (typeof value !== 'string' || !SHA.test(value)) reject('invalid-commit-id')
  return value
}
function time(value) {
  if (typeof value !== 'string' || !ISO.test(value) || !Number.isFinite(Date.parse(value))) reject('invalid-timestamp')
  return Date.parse(value)
}
function actor(value) {
  object(value)
  if (typeof value.login !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9-]*(?:\[bot\])?$/.test(value.login)) reject('invalid-api-schema')
  if (!['User', 'Bot', 'Organization', 'Mannequin'].includes(value.type)) reject('invalid-api-schema')
  return { login: value.login, type: value.type }
}
function url(value) {
  text(value, 8192)
  const parsed = new URL(value)
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) reject('invalid-api-schema')
  return value
}


/**
 * Collect untrusted review bodies and Git-proven PR-only evidence. request(endpoint)
 * accepts both REST endpoints and GET graphql?query=... endpoints, without recording credentials.
 * Search failure aborts; a failed PR contributes no partial evidence. No conversation comments.
 */
export async function collectReviewEvidence({ checkout, repository, targetRef, since, pulls, request, maxPatchBytes = 1048576, environment = {} }) {
  if (typeof checkout !== 'string' || !checkout || typeof targetRef !== 'string' || !targetRef || targetRef.startsWith('-') || !/^[A-Za-z0-9_.\/-]+$/.test(targetRef)) reject('invalid-options')
  if (typeof repository !== 'string' || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) reject('invalid-options')
  time(since)
  if (!Number.isSafeInteger(maxPatchBytes) || maxPatchBytes < 1 || maxPatchBytes > API_BYTES) reject('invalid-options')
  if (pulls !== undefined && (!Array.isArray(pulls) || pulls.some(number => !Number.isSafeInteger(number) || number < 1))) reject('invalid-options')
  if (request !== undefined && typeof request !== 'function') reject('invalid-options')
  object(environment)
  if (Object.entries(environment).some(([key, value]) => !['GH_TOKEN', 'GITHUB_TOKEN', 'GH_CONFIG_DIR'].includes(key) || typeof value !== 'string')) reject('invalid-auth-environment')
  const command = async (file, args, bound, env = {}) => (await runCommand({ file, args, cwd: checkout, maxBytes: bound, environment: env })).stdout
  const git = (args, bound = API_BYTES) => command('git', ['-c', 'core.hooksPath=/dev/null', '-c', 'diff.external=', ...args], bound)
  const ancestor = async (a, b) => {
    try { await git(['merge-base', '--is-ancestor', a, b]); return true } catch (error) {
      if (error.exitCode === 1) return false
      throw error
    }
  }
  const target = sha((await git(['rev-parse', '--verify', `${targetRef}^{commit}`])).trim())
  const transport = request ?? (async endpoint => JSON.parse(await command('gh', ['api', '--method', 'GET', endpoint], API_BYTES, environment)))
  const get = async endpoint => {
    const result = await transport(endpoint)
    const serialized = JSON.stringify(result)
    if (serialized === undefined || Buffer.byteLength(serialized) > API_BYTES) reject('api-byte-limit')
    return result
  }
  const pages = async endpoint => {
    const all = []
    for (let page = 1; page <= 100; page++) {
      const batch = await get(`${endpoint}?per_page=100&page=${page}`)
      if (!Array.isArray(batch) || batch.length > 100) reject('invalid-api-schema')
      all.push(...batch)
      if (batch.length < 100) return all
    }
    reject('pagination-limit')
  }
  let selectedPulls
  if (pulls !== undefined) selectedPulls = [...new Set(pulls)]
  else {
    selectedPulls = []
    let total
    for (let page = 1; ; page++) {
      const query = `repo:${repository} is:pr is:merged merged:>=${since}`
      const result = object(await get(`search/issues?q=${encodeURIComponent(query)}&per_page=100&page=${page}`))
      if (!Number.isSafeInteger(result.total_count) || result.total_count < 0 || typeof result.incomplete_results !== 'boolean' || !Array.isArray(result.items) || result.items.length > 100) reject('invalid-search-schema')
      if (result.total_count > 1000) reject('search-result-cap')
      if (result.incomplete_results) reject('incomplete-search')
      if (total !== undefined && result.total_count !== total) reject('search-changed-during-pagination')
      total = result.total_count
      for (const item of result.items) {
        object(item)
        integer(item.number)
        object(item.pull_request)
        if (selectedPulls.includes(item.number)) reject('duplicate-search-result')
        selectedPulls.push(item.number)
      }
      if (selectedPulls.length === total) break
      if (selectedPulls.length > total || result.items.length < 100 || page >= 10) reject('incomplete-search')
    }
  }
  const items = [], skippedPulls = [], excluded = []
  for (const pullNumber of selectedPulls) {
    try {
      const path = `repos/${repository}/pulls/${pullNumber}`
      const pull = object(await get(path))
      if (pull.number !== pullNumber || pull.merged !== true) reject('pull-not-merged')
      const merged = time(pull.merged_at)
      const author = actor(pull.user)
      const landingCommit = sha(pull.merge_commit_sha)
      if (!await ancestor(landingCommit, target)) reject('merge-not-reachable')
      const parents = (await git(['show', '-s', '--format=%P', landingCommit])).trim().split(/\s+/).filter(Boolean).map(sha)
      if (parents.length !== 1 && parents.length !== 2) reject('unsupported-landing-parents')
      const targetParent = parents[0]
      if (!Number.isSafeInteger(pull.commits) || pull.commits < 1) reject('invalid-api-schema')
      if (pull.commits > 250) reject('pull-commit-cap')
      const commits = await pages(`${path}/commits`)
      if (commits.length !== pull.commits || commits.length > 250) reject('incomplete-pull-commits')
      const ids = commits.map(commit => sha(object(commit).sha))
      if (new Set(ids).size !== ids.length) reject('duplicate-pull-commit')
      const head = sha(object(pull.head).sha)
      if (!ids.includes(head)) reject('head-not-in-pull-commits')
      const dated = []
      for (const id of ids) {
        if (!await ancestor(id, head)) reject('pull-commit-not-on-head')
        const stamp = Number((await git(['show', '-s', '--format=%ct', id])).trim()) * 1000
        if (!Number.isSafeInteger(stamp)) reject('invalid-git-timestamp')
        dated.push({ id, stamp })
      }
      if (parents.length === 2) {
        if (parents[1] !== head) reject('landing-head-mismatch')
      } else {
        // A rebase landing has surviving PR commits already on T and is ambiguous.
        for (const id of ids) if (await ancestor(id, targetParent)) reject('ambiguous-rebase-landing')
        const tree = (await git(['merge-tree', '--write-tree', targetParent, head])).trim()
        if (!SHA.test(tree) || tree !== (await git(['rev-parse', `${landingCommit}^{tree}`])).trim()) reject('unreconstructable-squash-landing')
      }
      // Preflight ends here: no feedback endpoint has been contacted above.
      const comments = await pages(`${path}/comments`)
      const reviews = await pages(`${path}/reviews`)
      const metadata = new Map()
      if (reviews.length) {
        const [owner, name] = repository.split('/')
        let cursor = null
        const seen = new Set()
        for (let page = 0; ; page++) {
          if (page >= 100) reject('pagination-limit')
          const after = cursor === null ? '' : `,after:${JSON.stringify(cursor)}`
          const query = `query { repository(owner:${JSON.stringify(owner)},name:${JSON.stringify(name)}) { pullRequest(number:${pullNumber}) { reviews(first:100${after}) { nodes { databaseId createdAt submittedAt lastEditedAt body author { login } commit { oid } } pageInfo { hasNextPage endCursor } } } } }`
          const response = object(await get(`graphql?query=${encodeURIComponent(query)}`))
          if (response.errors !== undefined) reject('review-edit-metadata-unavailable')
          const connection = object(object(object(object(response.data).repository).pullRequest).reviews)
          if (!Array.isArray(connection.nodes) || connection.nodes.length > 100) reject('invalid-api-schema')
          for (const node of connection.nodes) {
            object(node)
            integer(node.databaseId)
            if (!Object.hasOwn(node, 'lastEditedAt') || metadata.has(node.databaseId)) reject('invalid-review-edit-metadata')
            metadata.set(node.databaseId, node)
          }
          const info = object(connection.pageInfo)
          if (typeof info.hasNextPage !== 'boolean') reject('invalid-api-schema')
          if (!info.hasNextPage) break
          cursor = text(info.endCursor, 4096)
          if (!cursor || seen.has(cursor)) reject('invalid-pagination-cursor')
          seen.add(cursor)
        }
        if (metadata.size !== reviews.length) reject('incomplete-review-edit-metadata')
      }
      const finalPatch = await git(['diff', '--no-ext-diff', '--no-textconv', '--binary', targetParent, landingCommit, '--'], maxPatchBytes)
      if (Buffer.byteLength(finalPatch) > maxPatchBytes) reject('patch-byte-limit')
      const acquired = [], rejected = []
      const seenItems = new Set()
      const patches = new Map()
      for (const [kind, feedback] of [...comments.map(value => ['review-comment', value]), ...reviews.map(value => ['review', value])]) {
        object(feedback)
        const id = `${kind}:${integer(feedback.id)}`
        if (seenItems.has(id)) reject('duplicate-feedback')
        seenItems.add(id)
        if (kind === 'review' && feedback.submitted_at === null) {
          rejected.push({ id, pullNumber, reason: 'review-not-submitted' }); continue
        }
        const user = actor(feedback.user)
        const body = text(feedback.body)
        const sourceUrl = url(feedback.html_url)
        const commitId = sha(feedback.commit_id)
        let createdAt, updatedAt, feedbackTime
        if (kind === 'review') {
          const node = metadata.get(feedback.id)
          if (!node || node.body !== body || object(node.author).login !== user.login || sha(object(node.commit).oid) !== commitId) reject('review-metadata-mismatch')
          createdAt = node.createdAt
          time(createdAt)
          if (node.submittedAt === null || feedback.submitted_at === null) {
            rejected.push({ id, pullNumber, reason: 'review-not-submitted' }); continue
          }
          feedbackTime = time(node.submittedAt)
          if (feedbackTime !== time(feedback.submitted_at) || time(createdAt) > feedbackTime) reject('review-metadata-mismatch')
          updatedAt = node.lastEditedAt === null ? node.submittedAt : node.lastEditedAt
          if (time(updatedAt) < time(createdAt)) reject('invalid-timestamp-order')
        } else {
          createdAt = feedback.created_at
          updatedAt = feedback.updated_at
          feedbackTime = time(createdAt)
          if (time(updatedAt) < feedbackTime) reject('invalid-timestamp-order')
        }
        let reason
        if (user.type !== 'User') reason = 'non-user-author'
        else if (user.login.toLowerCase() === author.login.toLowerCase()) reason = 'pull-author-feedback'
        else if (time(createdAt) >= merged || time(updatedAt) >= merged || feedbackTime >= merged) reason = 'not-strictly-pre-merge'
        else if (!ids.includes(commitId)) reason = 'review-anchor-not-in-pull'
        const baseline = dated.filter(commit => commit.stamp < feedbackTime).sort((a, b) => b.stamp - a.stamp || ids.indexOf(b.id) - ids.indexOf(a.id))[0]
        if (!reason && !baseline) reason = 'no-surviving-feedback-baseline'
        if (reason) { rejected.push({ id, pullNumber, reason }); continue }
        if (!patches.has(baseline.id)) {
          const base = sha((await git(['merge-base', baseline.id, targetParent])).trim())
          const patch = await git(['diff', '--no-ext-diff', '--no-textconv', '--binary', base, baseline.id, '--'], maxPatchBytes)
          if (Buffer.byteLength(patch) > maxPatchBytes) reject('patch-byte-limit')
          patches.set(baseline.id, patch)
        }
        const feedbackPatch = patches.get(baseline.id)
        acquired.push({ id, url: sourceUrl, body, author: user, createdAt, updatedAt, commitId, pullNumber, baselineCommit: baseline.id, targetParent, landingCommit, feedbackPatch, finalPatch })
      }
      items.push(...acquired)
      excluded.push(...rejected)
    } catch (error) {
      // Do not retain raw API errors, stderr, credentials or partially acquired PR data.
      skippedPulls.push({ pullNumber, reason: typeof error.code === 'string' && /^[a-z][a-z-]+$/.test(error.code) ? error.code : 'pull-acquisition-failed' })
    }
  }
  return { items, skippedPulls, excluded, selectedPulls }
}
