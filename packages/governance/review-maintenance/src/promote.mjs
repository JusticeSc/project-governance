// Behaviour adapted from DeepSeek Harness 687f282e docs/cookbook/maintaining-dsh-code-review.md
// and .agents/notes/proposed/process/2026-07-13-human-review-skill-maintenance.md.
// License: ../../../../SOURCE-LICENSE.txt.
// Apply a saved, reviewed candidate bundle. This is the only step that can change repository state
// beyond the reviewed working-tree diff, and it refuses unless the bundle still matches the checkout.
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { runCommand } from './adapters.mjs'

const sha256 = content => createHash('sha256').update(content).digest('hex')
const fail = message => {
  throw new Error(`review-maintenance promote: ${message}`)
}

async function git(config, args, options = {}) {
  return runCommand({ file: 'git', args, cwd: config.checkout, maxBytes: 16 * 1024 * 1024, ...options })
}

function prBody(config, manifest) {
  const feedback = manifest.feedback.map(item => `- ${item.id}${item.url === '' ? '' : ` (${item.url})`}`).join('\n')
  return [
    `Maintained ${config.targetSkill} from ${String(manifest.feedback.length)} agreed review finding(s).`,
    '',
    '## Feedback',
    feedback === '' ? '- none recorded' : feedback,
    '',
    '## Review',
    `- revisions: ${String(manifest.revisions)}`,
    `- adapter gate: ${manifest.reviewedDiff} reviewed by both adapters`,
    `- candidate sha256: ${manifest.candidateSkillSha256}`,
    '',
    'Opening a draft only. Automatic opening, merging or changing repository settings is out of scope.',
    '',
  ].join('\n')
}

/**
 * Apply a candidate bundle produced by a maintenance run.
 *
 * @param {object} options
 * @param {ReturnType<import('./config.mjs').validateConfig>} options.config
 * @param {string} options.bundle absolute path to `runs/<runId>`
 * @param {boolean} [options.openPr] push a branch and open a *draft* pull request
 * @param {(line: string) => void} [options.log]
 * @returns {Promise<{applied: boolean, pushed: boolean, pr?: string}>}
 */
export async function promote({ config, bundle, openPr = false, log = () => {} }) {
  const manifest = JSON.parse(await readFile(join(bundle, 'manifest.json'), 'utf8'))
  if (manifest.repository !== config.repository) fail('repository identity does not match the reviewed manifest')
  if (manifest.targetSkill !== config.targetSkill) fail('target Skill identity does not match the reviewed manifest')
  const diff = await readFile(join(bundle, 'candidate.diff'), 'utf8')
  const candidate = await readFile(join(bundle, 'candidate.SKILL.md'), 'utf8')
  if (sha256(diff) !== manifest.candidateDiffSha256 || sha256(candidate) !== manifest.candidateSkillSha256) {
    fail('candidate bundle content does not match its reviewed manifest')
  }
  const skillPath = join(config.checkout, config.targetSkill)

  const status = (await git(config, ['status', '--porcelain=v1', '-uall'])).stdout
  if (status.trim() !== '') fail('checkout is not clean')
  if (config.fetch !== null) await git(config, ['fetch', '--quiet', config.fetch.remote])

  const head = (await git(config, ['rev-parse', 'HEAD'])).stdout.trim()
  if (head !== manifest.targetCommit) fail(`checkout HEAD ${head} does not match the reviewed target ${manifest.targetCommit}`)
  if (manifest.sourceSkillBlob !== undefined && manifest.sourceSkillBlob !== null) {
    // Blob comparison, not raw bytes: checkout line-ending normalization is not content drift.
    const blob = (await git(config, ['rev-parse', `HEAD:${config.targetSkill}`])).stdout.trim()
    if (blob !== manifest.sourceSkillBlob) fail('the maintained skill changed after the reviewed run')
  } else if (sha256(await readFile(skillPath, 'utf8')) !== manifest.sourceSkillSha256) {
    fail('the maintained skill changed after the reviewed run')
  }

  await git(config, ['apply', '--check', '-p1', '--', join(bundle, 'candidate.diff')])
  await git(config, ['apply', '-p1', '--', join(bundle, 'candidate.diff')])

  const changed = (await git(config, ['status', '--porcelain=v1', '-uall'])).stdout.split('\n').filter(Boolean).map(line => line.slice(3))
  if (changed.length !== 1 || changed[0] !== config.targetSkill) fail(`applied diff changed unexpected paths: ${changed.join(', ') || 'none'}`)
  if (sha256(await readFile(skillPath, 'utf8')) !== manifest.candidateSkillSha256) fail('applied content does not match the reviewed candidate')
  log(`applied ${config.targetSkill}`)
  if (!openPr) return { applied: true, pushed: false }

  if (config.promote === null) fail('openPr requires a promote.remote and promote.baseBranch in the configuration')
  const branch = `review-maintenance/${String(manifest.runId)}`
  const message = `chore(review-maintenance): adopt agreed review guidance\n\nRun: ${String(manifest.runId)}`
  await git(config, ['switch', '--create', branch])
  await git(config, ['add', '--', config.targetSkill])
  await git(config, ['commit', '--quiet', '--message', message])
  await git(config, ['push', '--quiet', config.promote.remote, branch])

  const bodyFile = join(bundle, 'pr-body.md')
  const { writeFile } = await import('node:fs/promises')
  await writeFile(bodyFile, prBody(config, manifest))
  const { stdout } = await runCommand({
    file: 'gh',
    args: ['pr', 'create', '--draft', '--repo', config.repository, '--base', config.promote.baseBranch, '--head', branch, '--title', 'Adopt agreed review guidance', '--body-file', bodyFile],
    cwd: config.checkout,
    maxBytes: 1024 * 1024,
  })
  log(`opened draft pull request ${stdout.trim()}`)
  return { applied: true, pushed: true, pr: stdout.trim() }
}
