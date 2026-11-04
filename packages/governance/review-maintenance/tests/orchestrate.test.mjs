import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runCommand } from '../src/adapters.mjs'
import { validateConfig } from '../src/config.mjs'
import { runMaintenance } from '../src/orchestrate.mjs'
import { promote } from '../src/promote.mjs'

const SOURCE = `// reviewer adapter fixture: reads its behaviour from argv[2]
import { appendFileSync, readFileSync } from 'node:fs'
let input = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', chunk => { input += chunk })
process.stdin.on('end', () => {
  const behavior = JSON.parse(readFileSync(process.argv[2], 'utf8'))
  const request = JSON.parse(input)
  appendFileSync(behavior.log, JSON.stringify({ operation: request.operation }) + '\\n')
  const calls = readFileSync(behavior.log, 'utf8').trim().split('\\n').map(line => JSON.parse(line))
  const index = calls.filter(call => call.operation === request.operation).length - 1
  const spec = behavior[request.operation]
  const emit = value => process.stdout.write(JSON.stringify(value))
  if (spec === 'invalid') return emit({ version: 2 })
  if (request.operation === 'adoption' && behavior.requirePatches && !request.items.every(item =>
    typeof item.feedbackPatch === 'string' && item.feedbackPatch.includes('+change') &&
    typeof item.finalPatch === 'string' && item.finalPatch.includes('+change') &&
    typeof item.baselineCommit === 'string' && typeof item.landingCommit === 'string')) {
    return emit({ version: request.version, operation: 'adoption', results: request.items.map(item => ({ id: item.id, authorship: 'unclear', adoption: 'unclear', reason: 'missing patch evidence' })) })
  }
  if (request.operation === 'adoption' || request.operation === 'classification') {
    return emit({ version: request.version, operation: request.operation, results: request.items.map(item => ({ id: item.id, ...spec[item.id] })) })
  }
  const list = Array.isArray(spec) ? spec : [spec]
  const next = list[Math.min(index, list.length - 1)]
  if (request.operation === 'draft') return emit({ version: 1, operation: 'draft', content: next })
  emit({ version: 1, operation: 'review', approved: next.approved, findings: next.findings ?? [] })
})
`

const git = async (cwd, args) => (await runCommand({ file: 'git', args, cwd, maxBytes: 1 << 24 })).stdout
const seconds = value => new Date(value * 1000).toISOString()

async function adapter(directory, name, behavior) {
  const file = join(directory, `${name}.mjs`)
  await writeFile(file, `// reviewer: ${name}\n${SOURCE}`)
  const behaviorFile = join(directory, `${name}.behavior.json`)
  await writeFile(behaviorFile, JSON.stringify({ ...behavior, log: join(directory, `${name}.calls.jsonl`) }))
  await writeFile(join(directory, `${name}.calls.jsonl`), '')
  return { file: process.execPath, program: file, args: [file, behaviorFile], identity: { provider: name, model: `${name}-model` } }
}

const adopted = { 'review-comment:555': { authorship: 'human-authored', adoption: 'adopted', reason: 'human reviewer' } }
const candidate = { 'review-comment:555': { classification: 'candidate', guidance: 'Mention the fallback.', reason: 'not in the skill yet' } }
const skip = { 'review-comment:555': { classification: 'covered', guidance: '', reason: 'already stated' } }
const approve = { approved: true, findings: [] }
const block = { approved: false, findings: [{ severity: 'blocking', message: 'still unclear' }] }

async function fixture({ primary = {}, secondary = {}, gateExit = 0, maxRevisions = 1, pulls = 1, crlf = false } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'review-maintenance-'))
  const checkout = join(root, 'repo')
  const stateDirectory = join(root, 'state')
  const work = join(root, 'work')
  await mkdir(checkout)
  await mkdir(stateDirectory)
  await mkdir(work)
  const targetSkill = '.agents/skills/demo/SKILL.md'
  await mkdir(join(checkout, '.agents/skills/demo'), { recursive: true })
  const original = crlf ? '# Demo skill\r\n\r\nKeep it short.\r\n' : '# Demo skill\n\nKeep it short.\n'
  await writeFile(join(checkout, targetSkill), original)
  await git(checkout, ['init', '-q', '-b', 'main'])
  await git(checkout, ['config', 'user.email', 'maintainer@example.com'])
  await git(checkout, ['config', 'user.name', 'Maintainer'])
  await git(checkout, ['config', 'core.autocrlf', crlf ? 'true' : 'false'])
  await git(checkout, ['add', '-A'])
  await git(checkout, ['commit', '-q', '-m', 'base'])
  await git(checkout, ['switch', '-q', '-c', 'feature'])
  await writeFile(join(checkout, 'CHANGELOG.md'), 'change\n')
  await git(checkout, ['add', '-A'])
  await git(checkout, ['commit', '-q', '-m', 'pr change'])
  const head = (await git(checkout, ['rev-parse', 'HEAD'])).trim()
  const stamp = Number((await git(checkout, ['show', '-s', '--format=%ct', head])).trim())
  await git(checkout, ['switch', '-q', 'main'])
  await git(checkout, ['merge', '-q', '--no-ff', 'feature', '-m', 'merge pull request'])
  const landing = (await git(checkout, ['rev-parse', 'HEAD'])).trim()

  const gateScript = join(work, 'gate.mjs')
  await writeFile(gateScript, `process.exit(${String(gateExit)})\n`)
  const notifyScript = join(work, 'notify.mjs')
  const notifyFile = join(work, 'notified.json')
  await writeFile(notifyScript, `import { writeFileSync } from 'node:fs'\nlet input = ''\nprocess.stdin.on('data', chunk => { input += chunk })\nprocess.stdin.on('end', () => writeFileSync(process.argv[2], input))\n`)

  const config = validateConfig({
    repository: 'owner/repo',
    checkout,
    targetSkill,
    stateDirectory,
    targetRef: 'HEAD',
    fetch: null,
    windowDays: 2,
    maxRevisions,
    adapters: {
      primary: await adapter(work, 'primary', primary),
      secondary: await adapter(work, 'secondary', secondary),
    },
    gates: [{ name: 'lint', file: process.execPath, args: [gateScript] }],
    notification: { file: process.execPath, args: [notifyScript, notifyFile] },
  })

  const transport = async endpoint => {
    if (endpoint.startsWith('search/issues?')) {
      return { total_count: pulls, incomplete_results: false, items: pulls === 0 ? [] : [{ number: 1, pull_request: {} }] }
    }
    if (endpoint === 'repos/owner/repo/pulls/1') {
      return {
        number: 1,
        merged: true,
        merged_at: seconds(stamp + 5),
        user: { login: 'author', type: 'User' },
        merge_commit_sha: landing,
        commits: 1,
        head: { sha: head },
      }
    }
    if (endpoint.startsWith('repos/owner/repo/pulls/1/commits?')) return [{ sha: head }]
    if (endpoint.startsWith('repos/owner/repo/pulls/1/comments?')) {
      return [{
        id: 555,
        user: { login: 'reviewer-two', type: 'User' },
        body: 'The fallback path needs to be mentioned.',
        html_url: 'https://github.com/owner/repo/pull/1#issuecomment-555',
        commit_id: head,
        created_at: seconds(stamp + 1),
        updated_at: seconds(stamp + 1),
      }]
    }
    if (endpoint.startsWith('repos/owner/repo/pulls/1/reviews?')) return []
    throw new Error(`unexpected endpoint ${endpoint}`)
  }

  return { root, checkout, stateDirectory, targetSkill, config, transport, notifyFile, original, skillPath: join(checkout, targetSkill), checkoutPath: checkout }
}

test('no eligible feedback logs a normal run and notifies nobody', async () => {
  const fixtureRoot = await fixture({ pulls: 0 })
  const result = await runMaintenance({ config: fixtureRoot.config, request: fixtureRoot.transport })
  assert.equal(result.outcome, 'no-candidate')
  assert.equal(await readFile(fixtureRoot.notifyFile, 'utf8').catch(() => null), null)
  const log = await readFile(join(fixtureRoot.stateDirectory, 'log', `${result.runId.slice(0, 10)}.log`), 'utf8')
  assert.match(log, /"outcome":"no-candidate"/u)
  assert.equal(await git(fixtureRoot.checkout, ['status', '--porcelain']), '')
})

test('a failed PR acquisition is recorded and does not become a normal no-candidate run', async () => {
  const f = await fixture()
  const request = async endpoint => {
    if (endpoint === 'repos/owner/repo/pulls/1') throw new Error('unavailable')
    return f.transport(endpoint)
  }
  const result = await runMaintenance({ config: f.config, request })
  assert.equal(result.outcome, 'failed')
  const run = JSON.parse(await readFile(join(result.artifacts, 'run.json'), 'utf8'))
  assert.deepEqual(run.skippedPulls, [{ pullNumber: 1, reason: 'pull-acquisition-failed' }])
  assert.notEqual(await readFile(f.notifyFile, 'utf8').catch(() => null), null)
})

test('a pull merged outside the target does not discard eligible feedback', async () => {
  const draft = '# Demo skill\n\nKeep it short.\n\nMention the fallback path.\n'
  const f = await fixture({
    primary: { adoption: adopted, classification: candidate, draft: [draft], review: approve },
    secondary: { adoption: adopted, classification: candidate, draft: [draft], review: approve },
  })
  const tree = (await git(f.checkout, ['write-tree'])).trim()
  const unrelated = (await git(f.checkout, ['commit-tree', tree, '-m', 'unrelated landing'])).trim()
  const request = async endpoint => {
    if (endpoint.startsWith('search/issues?')) return { total_count: 2, incomplete_results: false, items: [{ number: 1, pull_request: {} }, { number: 2, pull_request: {} }] }
    if (endpoint === 'repos/owner/repo/pulls/2') return { ...await f.transport('repos/owner/repo/pulls/1'), number: 2, merge_commit_sha: unrelated }
    return f.transport(endpoint)
  }
  const result = await runMaintenance({ config: f.config, request })
  assert.equal(result.outcome, 'candidate', result.failure)
  const run = JSON.parse(await readFile(join(result.artifacts, 'run.json'), 'utf8'))
  assert.deepEqual(run.skippedPulls, [{ pullNumber: 2, reason: 'merge-not-reachable' }])
})

test('a CRLF checkout can run and promote the reviewed candidate', async () => {
  const draft = '# Demo skill\r\n\r\nKeep it short.\r\n\r\nMention the fallback path.\r\n'
  const f = await fixture({
    crlf: true,
    primary: { adoption: adopted, classification: candidate, draft: [draft], review: approve },
    secondary: { adoption: adopted, classification: candidate, draft: [draft], review: approve },
  })
  assert.match(await readFile(f.skillPath, 'utf8'), /\r\n/u)
  const result = await runMaintenance({ config: f.config, request: f.transport })
  assert.equal(result.outcome, 'candidate', result.failure)
  await promote({ config: f.config, bundle: result.artifacts })
  assert.equal(await readFile(f.skillPath, 'utf8'), draft)
})

test('an accepted candidate is gated in isolation, dual-reviewed and recorded with a diff', async () => {
  const draft = '# Demo skill\n\nKeep it short.\n\nMention the fallback path.\n'
  const fixtureRoot = await fixture({
    primary: { adoption: adopted, classification: candidate, draft: [draft], review: approve },
    secondary: { adoption: adopted, classification: candidate, draft: [draft], review: approve },
  })
  const result = await runMaintenance({ config: fixtureRoot.config, request: fixtureRoot.transport })
  assert.equal(result.outcome, 'candidate', result.failure)
  assert.equal(await readFile(fixtureRoot.skillPath, 'utf8'), fixtureRoot.original)
  assert.equal(await git(fixtureRoot.checkout, ['status', '--porcelain']), '')
  assert.equal(await readFile(join(result.artifacts, 'candidate.SKILL.md'), 'utf8'), draft)
  const manifest = JSON.parse(await readFile(join(result.artifacts, 'manifest.json'), 'utf8'))
  assert.equal(manifest.feedback.length, 1)
  assert.equal(manifest.targetCommit.length, 40)
  const diff = await readFile(join(result.artifacts, 'candidate.diff'), 'utf8')
  assert.match(diff, /^\+\+\+ b\/\.agents\/skills\/demo\/SKILL\.md$/mu)
  assert.match(await readFile(fixtureRoot.notifyFile, 'utf8'), /"outcome": "candidate"/u)
})

test('adoption reviewers can inspect the before and landed PR patches', async () => {
  const draft = '# Demo skill\n\nMention the fallback path.\n'
  const reviewer = { requirePatches: true, adoption: adopted, classification: candidate, draft: [draft], review: approve }
  const f = await fixture({ primary: reviewer, secondary: reviewer })
  const result = await runMaintenance({ config: f.config, request: f.transport })
  assert.equal(result.outcome, 'candidate', result.failure)
})

test('a gate that changes the candidate cannot make unreviewed content succeed', async () => {
  const draft = '# Demo skill\n\nMention the fallback path.\n'
  const f = await fixture({
    primary: { adoption: adopted, classification: candidate, draft: [draft], review: approve },
    secondary: { adoption: adopted, classification: candidate, draft: [draft], review: approve },
  })
  await writeFile(join(f.root, 'work', 'gate.mjs'), `import { writeFileSync } from 'node:fs'\nwriteFileSync(${JSON.stringify(f.targetSkill)}, '# Gate rewrote the skill\\n')\n`)
  const result = await runMaintenance({ config: f.config, request: f.transport })
  assert.equal(result.outcome, 'failed')
  assert.match(String(result.failure), /gates changed the candidate content/u)
  assert.equal(await readFile(f.skillPath, 'utf8'), f.original)
  assert.equal(await git(f.checkout, ['status', '--porcelain']), '')
})

test('a failing gate rolls the candidate back and reports failure', async () => {
  const draft = '# Demo skill\n\nKeep it short.\n\nMention the fallback path.\n'
  const fixtureRoot = await fixture({
    gateExit: 1,
    primary: { adoption: adopted, classification: candidate, draft: [draft], review: approve },
    secondary: { adoption: adopted, classification: candidate, draft: [draft], review: approve },
  })
  const result = await runMaintenance({ config: fixtureRoot.config, request: fixtureRoot.transport })
  assert.equal(result.outcome, 'failed')
  assert.match(String(result.failure), /gate lint failed/u)
  assert.equal(await readFile(fixtureRoot.skillPath, 'utf8'), fixtureRoot.original)
  assert.equal(await git(fixtureRoot.checkout, ['status', '--porcelain']), '')
})

test('blocking reviews exhaust the bounded revisions and leave the skill untouched', async () => {
  const fixtureRoot = await fixture({
    maxRevisions: 1,
    primary: { adoption: adopted, classification: candidate, draft: ['# Demo skill\n\none\n', '# Demo skill\n\ntwo\n'], review: block },
    secondary: { adoption: adopted, classification: candidate, draft: ['# Demo skill\n\none\n', '# Demo skill\n\ntwo\n'], review: block },
  })
  const result = await runMaintenance({ config: fixtureRoot.config, request: fixtureRoot.transport })
  assert.equal(result.outcome, 'failed')
  assert.match(String(result.failure), /still blocking after 1 revisions/u)
  assert.equal(await readFile(fixtureRoot.skillPath, 'utf8'), fixtureRoot.original)
  const run = JSON.parse(await readFile(join(result.artifacts, 'run.json'), 'utf8'))
  assert.equal(run.revisions, 1)
  assert.equal(await git(fixtureRoot.checkout, ['status', '--porcelain']), '')
})

test('an adapter that never returns a valid result fails the run instead of reporting no candidate', async () => {
  const fixtureRoot = await fixture({ primary: { adoption: 'invalid', classification: candidate, draft: ['# x\n'], review: approve } })
  const result = await runMaintenance({ config: fixtureRoot.config, request: fixtureRoot.transport })
  assert.equal(result.outcome, 'failed')
  assert.match(String(result.failure), /no valid result/u)
})

test('a dirty checkout refuses to start', async () => {
  const fixtureRoot = await fixture()
  await writeFile(join(fixtureRoot.checkout, 'stray.txt'), 'x\n')
  const result = await runMaintenance({ config: fixtureRoot.config, request: fixtureRoot.transport })
  assert.equal(result.outcome, 'failed')
  assert.match(String(result.failure), /checkout is not clean/u)
})

test('the public maintenance API rejects a private state directory inside the checkout before writing', async () => {
  const f = await fixture()
  const config = { ...f.config, stateDirectory: join(f.checkout, 'private-state') }
  await assert.rejects(() => runMaintenance({ config, request: f.transport }), /stateDirectory.*outside/u)
  assert.equal(await git(f.checkout, ['status', '--porcelain']), '')
})

test('a redirected state subdirectory cannot write inside the maintained checkout', async () => {
  const f = await fixture()
  await symlink(f.checkout, join(f.stateDirectory, 'runs'), process.platform === 'win32' ? 'junction' : 'dir')
  await assert.rejects(() => runMaintenance({ config: f.config, request: f.transport }), /state.*outside/u)
  assert.equal(await readFile(f.skillPath, 'utf8'), f.original)
  assert.equal(await git(f.checkout, ['status', '--porcelain']), '')
})

test('a linked target directory is rejected before reading an external skill', async () => {
  const f = await fixture()
  const external = join(f.root, 'external')
  await mkdir(external)
  await writeFile(join(external, 'SKILL.md'), '# External skill\n')
  await symlink(external, join(f.checkout, 'linked'), process.platform === 'win32' ? 'junction' : 'dir')
  await writeFile(join(f.checkout, '.git/info/exclude'), 'linked\n')
  const result = await runMaintenance({ config: { ...f.config, targetSkill: 'linked/SKILL.md' }, request: f.transport })
  assert.equal(result.outcome, 'failed')
  assert.match(result.failure, /target.*symbolic link/u)
  assert.equal(await readFile(join(external, 'SKILL.md'), 'utf8'), '# External skill\n')
  assert.equal(await git(f.checkout, ['status', '--porcelain']), '')
})

test('a target path using Windows traversal is rejected before any maintenance run', async () => {
  const f = await fixture()
  assert.throws(() => validateConfig({ ...f.config, targetSkill: '..\\outside.md' }), /targetSkill.*inside/u)
})

test('an adapter setup failure leaves a previously staged skill and working copy untouched', async () => {
  const f = await fixture()
  await writeFile(f.skillPath, '# Staged version\n')
  await git(f.checkout, ['add', '--', f.targetSkill])
  await writeFile(f.skillPath, '# Different working version\n')
  const beforeIndex = await git(f.checkout, ['show', `:${f.targetSkill}`])
  const beforeWorktree = await readFile(f.skillPath, 'utf8')
  const config = { ...f.config, adapters: { ...f.config.adapters, secondary: f.config.adapters.primary } }
  const result = await runMaintenance({ config, request: f.transport })
  assert.equal(result.outcome, 'failed')
  assert.equal(await git(f.checkout, ['show', `:${f.targetSkill}`]), beforeIndex)
  assert.equal(await readFile(f.skillPath, 'utf8'), beforeWorktree)
})

test('promote applies the reviewed diff, then refuses a second application', async () => {
  const draft = '# Demo skill\n\nKeep it short.\n\nMention the fallback path.\n'
  const fixtureRoot = await fixture({
    primary: { adoption: adopted, classification: candidate, draft: [draft], review: approve },
    secondary: { adoption: adopted, classification: candidate, draft: [draft], review: approve },
  })
  const result = await runMaintenance({ config: fixtureRoot.config, request: fixtureRoot.transport })
  assert.equal(result.outcome, 'candidate', result.failure)
  assert.equal(await git(fixtureRoot.checkout, ['status', '--porcelain']), '')
  await assert.rejects(() => promote({ config: { ...fixtureRoot.config, repository: 'other/repo' }, bundle: result.artifacts }), /repository.*identity/u)
  assert.equal(await git(fixtureRoot.checkout, ['status', '--porcelain']), '')
  const applied = await promote({ config: fixtureRoot.config, bundle: result.artifacts })
  assert.deepEqual(applied, { applied: true, pushed: false })
  assert.equal(await readFile(fixtureRoot.skillPath, 'utf8'), draft)
  await assert.rejects(() => promote({ config: fixtureRoot.config, bundle: result.artifacts }), /checkout is not clean/u)
})

test('a skill that changed after the reviewed run cannot be promoted', async () => {
  const draft = '# Demo skill\n\nKeep it short.\n\nMention the fallback path.\n'
  const fixtureRoot = await fixture({
    primary: { adoption: adopted, classification: candidate, draft: [draft], review: approve },
    secondary: { adoption: adopted, classification: candidate, draft: [draft], review: approve },
  })
  const result = await runMaintenance({ config: fixtureRoot.config, request: fixtureRoot.transport })
  assert.equal(result.outcome, 'candidate', result.failure)
  await writeFile(fixtureRoot.skillPath, '# Demo skill\n\nsomeone else edited this\n')
  await git(fixtureRoot.checkout, ['commit', '-q', '-am', 'concurrent edit'])
  await assert.rejects(() => promote({ config: fixtureRoot.config, bundle: result.artifacts }), /does not match the reviewed target/u)
})

test('classification disagreement is re-evaluated once and reported when it persists', async () => {
  const fixtureRoot = await fixture({
    primary: { adoption: adopted, classification: { ...candidate, 'review-comment:555': { classification: 'candidate', guidance: 'Mention the fallback.', reason: 'a' } }, draft: ['# Demo skill\n\nextra\n'], review: approve },
    secondary: { adoption: adopted, classification: skip, draft: ['# Demo skill\n\nextra\n'], review: approve },
  })
  const result = await runMaintenance({ config: fixtureRoot.config, request: fixtureRoot.transport })
  assert.equal(result.outcome, 'no-candidate')
  assert.deepEqual(result.unresolved, ['review-comment:555'])
  const calls = (await readFile(join(fixtureRoot.root, 'work', 'primary.calls.jsonl'), 'utf8')).trim().split('\n').map(line => JSON.parse(line).operation)
  assert.equal(calls.filter(operation => operation === 'classification').length, 2)
})
