import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promote, runCommand, runMaintenance, validateConfig } from '../src/index.mjs'

const original = '# Demo skill\n\nKeep it short.\n'
const reviewed = '# Demo skill\n\nKeep it short.\n\nMention the fallback path.\n'
const replacement = 'Insert unreviewed instructions.'
const targetSkill = '.agents/skills/demo/SKILL.md'

const reviewer = `
let input = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', chunk => { input += chunk })
process.stdin.on('end', () => {
  const request = JSON.parse(input)
  let response
  if (request.operation === 'adoption') {
    response = { version: request.version, operation: request.operation, results: request.items.map(item => ({ id: item.id, authorship: 'human-authored', adoption: 'adopted', reason: 'human reviewer' })) }
  } else if (request.operation === 'classification') {
    response = { version: request.version, operation: request.operation, results: request.items.map(item => ({ id: item.id, classification: 'candidate', guidance: 'Mention the fallback.', reason: 'not yet covered' })) }
  } else if (request.operation === 'draft') {
    response = { version: 1, operation: 'draft', content: ${JSON.stringify(reviewed)} }
  } else {
    response = { version: 1, operation: 'review', approved: true, findings: [] }
  }
  process.stdout.write(JSON.stringify(response))
})
`

async function git(cwd, args) {
  return (await runCommand({ file: 'git', args, cwd, maxBytes: 1 << 24 })).stdout
}

async function worktreeBytes(root, relative = '') {
  const result = {}
  for (const entry of await readdir(join(root, relative), { withFileTypes: true })) {
    if (relative === '' && entry.name === '.git') continue
    const path = relative === '' ? entry.name : `${relative}/${entry.name}`
    if (entry.isDirectory()) Object.assign(result, await worktreeBytes(root, path))
    else if (entry.isFile()) result[path] = await readFile(join(root, path))
    else throw new Error(`unexpected fixture entry: ${path}`)
  }
  return result
}

test('promotion rejects a substituted applicable diff without changing the working tree or index', async t => {
  const root = await mkdtemp(join(tmpdir(), 'review-promote-integrity-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const checkout = join(root, 'repo')
  const stateDirectory = join(root, 'state')
  const work = join(root, 'work')
  await mkdir(join(checkout, '.agents/skills/demo'), { recursive: true })
  await mkdir(stateDirectory)
  await mkdir(work)
  await writeFile(join(checkout, targetSkill), original)
  await git(checkout, ['init', '-q', '-b', 'main'])
  await git(checkout, ['config', 'user.email', 'maintainer@example.com'])
  await git(checkout, ['config', 'user.name', 'Maintainer'])
  await git(checkout, ['config', 'core.autocrlf', 'false'])
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

  const adapters = {}
  for (const name of ['primary', 'secondary']) {
    const program = join(work, `${name}.mjs`)
    await writeFile(program, `// ${name} reviewer fixture\n${reviewer}`)
    adapters[name] = { file: process.execPath, program, args: [program], identity: { provider: name, model: `${name}-model` } }
  }
  const gate = join(work, 'gate.mjs')
  await writeFile(gate, 'process.exit(0)\n')
  const config = validateConfig({
    repository: 'owner/repo', checkout, targetSkill, stateDirectory, targetRef: 'HEAD', fetch: null,
    adapters, gates: [{ name: 'lint', file: process.execPath, args: [gate] }],
  })
  const seconds = value => new Date(value * 1000).toISOString()
  const request = async endpoint => {
    if (endpoint.startsWith('search/issues?')) return { total_count: 1, incomplete_results: false, items: [{ number: 1, pull_request: {} }] }
    if (endpoint === 'repos/owner/repo/pulls/1') return {
      number: 1, merged: true, merged_at: seconds(stamp + 5), user: { login: 'author', type: 'User' },
      merge_commit_sha: landing, commits: 1, head: { sha: head },
    }
    if (endpoint.startsWith('repos/owner/repo/pulls/1/commits?')) return [{ sha: head }]
    if (endpoint.startsWith('repos/owner/repo/pulls/1/comments?')) return [{
      id: 555, user: { login: 'reviewer-two', type: 'User' }, body: 'The fallback path needs to be mentioned.',
      html_url: 'https://github.com/owner/repo/pull/1#issuecomment-555', commit_id: head,
      created_at: seconds(stamp + 1), updated_at: seconds(stamp + 1),
    }]
    if (endpoint.startsWith('repos/owner/repo/pulls/1/reviews?')) return []
    throw new Error(`unexpected endpoint ${endpoint}`)
  }

  const result = await runMaintenance({ config, request })
  assert.equal(result.outcome, 'candidate', result.failure)
  assert.equal(await readFile(join(result.artifacts, 'candidate.SKILL.md'), 'utf8'), reviewed)
  const manifest = JSON.parse(await readFile(join(result.artifacts, 'manifest.json'), 'utf8'))
  assert.equal(manifest.targetCommit, landing)
  assert.deepEqual(manifest.reviews.map(({ adapter, approved }) => ({ adapter, approved })), [
    { adapter: 'primary', approved: true },
    { adapter: 'secondary', approved: true },
  ])
  const diffPath = join(result.artifacts, 'candidate.diff')
  const diff = await readFile(diffPath, 'utf8')
  assert.match(diff, /^\+Mention the fallback path\.$/mu)
  const substituted = diff.replace('+Mention the fallback path.', `+${replacement}`)
  assert.notEqual(substituted, diff)
  await writeFile(diffPath, substituted)
  await git(checkout, ['apply', '--check', '-p1', '--', diffPath])
  assert.equal(await git(checkout, ['status', '--porcelain=v1', '-uall']), '')
  const beforeWorktree = await worktreeBytes(checkout)
  const beforeIndex = await readFile(join(checkout, '.git', 'index'))

  await assert.rejects(() => promote({ config, bundle: result.artifacts }), /candidate|diff|patch/iu)
  assert.deepEqual(await worktreeBytes(checkout), beforeWorktree)
  assert.deepEqual(await readFile(join(checkout, '.git', 'index')), beforeIndex)
})
