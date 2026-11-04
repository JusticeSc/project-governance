// Behaviour adapted from DeepSeek Harness 687f282e docs/cookbook/maintaining-dsh-code-review.md
// and .agents/notes/proposed/process/2026-07-13-human-review-skill-maintenance.md.
// License: ../../../../SOURCE-LICENSE.txt.
// One periodic maintenance run: acquire evidence, classify with two independent adapters, draft a
// candidate skill, gate and review it in isolation, and save a private reviewed bundle.
import { lstat, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { randomBytes } from 'node:crypto'
import { assertIndependentCommands, runCommand, runReviewer } from './adapters.mjs'
import { collectReviewEvidence } from './evidence.mjs'

const BATCH = 20
const ADAPTER_TIMEOUT = 600_000

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)

function bounded(text, limit) {
  if (typeof text !== 'string' || text.length === 0) throw new Error('review-maintenance: empty text')
  if (Buffer.byteLength(text) > limit) throw new Error('review-maintenance: text exceeds byte limit')
  return text
}

function batches(values) {
  const result = []
  for (let index = 0; index < values.length; index += BATCH) result.push(values.slice(index, index + BATCH))
  return result
}

/** Wrap untrusted review text so an adapter treats it as data rather than instructions. */
export function untrusted(nonce, body) {
  return `<untrusted-feedback nonce="${nonce}">\n${body}\n</untrusted-feedback>`
}

function daysBefore(clock, days) {
  return new Date(clock().getTime() - days * 86_400_000).toISOString()
}

async function git(config, args) {
  return (await runCommand({ file: 'git', args, cwd: config.checkout, maxBytes: 16 * 1024 * 1024 })).stdout
}

async function changedPaths(config) {
  const output = await git(config, ['status', '--porcelain=v1', '-uall'])
  return output.split('\n').filter(Boolean).map(line => {
    const path = line.slice(3)
    const arrow = path.indexOf(' -> ')
    return (arrow === -1 ? path : path.slice(arrow + 4)).replace(/^"|"$/gu, '')
  })
}

/**
 * Produce a unified diff named with repository-relative paths, so `git apply -p1` in the checkout
 * applies exactly the reviewed candidate and nothing else.
 */
async function unifiedDiff(config, before, after, directory) {
  const left = join(directory, 'a', config.targetSkill)
  const right = join(directory, 'b', config.targetSkill)
  await mkdir(dirname(left), { recursive: true })
  await mkdir(dirname(right), { recursive: true })
  await writeFile(left, before)
  await writeFile(right, after)
  try {
    const { stdout } = await (async () => {
      try {
        return await runCommand({ file: 'git', args: ['diff', '--no-index', '--no-prefix', '--no-color', '--', `a/${config.targetSkill}`, `b/${config.targetSkill}`], cwd: directory, maxBytes: 16 * 1024 * 1024 })
      } catch (error) {
        // `git diff --no-index` exits 1 whenever the files differ.
        if (error.exitCode === 1 && typeof error.stdout === 'string' && error.stdout !== '') return error
        throw error
      }
    })()
    return stdout
  } finally {
    await rm(join(directory, 'a'), { recursive: true, force: true })
    await rm(join(directory, 'b'), { recursive: true, force: true })
  }
}

async function prospectiveRealpath(path) {
  let parent = resolve(path)
  const missing = []
  for (;;) {
    try {
      return join(await realpath(parent), ...missing.reverse())
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      const next = dirname(parent)
      if (next === parent) throw error
      missing.push(basename(parent))
      parent = next
    }
  }
}

async function requireExternalState(config) {
  const checkout = await realpath(config.checkout)
  const state = await prospectiveRealpath(config.stateDirectory)
  const path = relative(checkout, state)
  if (path === '' || (!isAbsolute(path) && path !== '..' && !path.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`))) {
    throw new Error('stateDirectory must be outside the maintained checkout')
  }
  for (const directory of ['runs', 'private', 'log']) {
    const destination = await prospectiveRealpath(join(config.stateDirectory, directory))
    const inside = relative(state, destination)
    if (inside === '' || isAbsolute(inside) || inside === '..' || inside.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`)) {
      throw new Error('state subdirectory must not redirect outside stateDirectory')
    }
  }
}

async function requireUnlinkedTarget(checkout, target) {
  let path = checkout
  for (const segment of target.split('/')) {
    path = join(path, segment)
    if ((await lstat(path)).isSymbolicLink()) throw new Error('target skill path contains a symbolic link')
  }
}

/**
 * Run one maintenance pass.
 *
 * @param {object} options
 * @param {ReturnType<import('./config.mjs').validateConfig>} options.config
 * @param {(endpoint: string) => Promise<unknown>} [options.request] GitHub GET transport; defaults to `gh api`
 * @param {() => Date} [options.clock]
 * @param {(line: string) => void} [options.log] operator-visible progress lines only
 * @returns {Promise<{outcome: 'no-candidate'|'candidate'|'failed', runId: string, artifacts: string,
 *   privateDirectory: string, candidate?: string, diff?: string, failure?: string, unresolved?: string[], excluded: object[]}>}
 */
export async function runMaintenance({ config, request, clock = () => new Date(), log = () => {} }) {
  await requireExternalState(config)
  const started = clock()
  const runId = `${started.toISOString().replace(/[:.]/gu, '-')}-${randomBytes(3).toString('hex')}`
  const artifacts = join(config.stateDirectory, 'runs', runId)
  const privateDirectory = join(config.stateDirectory, 'private', runId)
  const logDirectory = join(config.stateDirectory, 'log')
  await mkdir(artifacts, { recursive: true })
  await mkdir(privateDirectory, { recursive: true, mode: 0o700 })
  await mkdir(logDirectory, { recursive: true })

  const excluded = []
  const adoptionEvidence = []
  let unresolved = []
  const record = { runId, startedAt: started.toISOString(), repository: config.repository, targetRef: config.targetRef, excluded, unresolved, gates: [], revisions: 0 }

  const finish = async (outcome, extra = {}) => {
    record.outcome = outcome
    record.unresolved = unresolved
    record.finishedAt = clock().toISOString()
    Object.assign(record, extra)
    await writeFile(join(artifacts, 'run.json'), `${JSON.stringify(record, null, 2)}\n`)
    const line = JSON.stringify({ at: record.startedAt, runId, outcome, detail: extra.failure ?? extra.candidate ?? '', artifacts })
    await writeFile(join(logDirectory, `${record.startedAt.slice(0, 10)}.log`), `${line}\n`, { flag: 'a' })
    const result = { outcome, runId, artifacts, privateDirectory, excluded, unresolved, ...extra }
    // User decision: a normal no-candidate run leaves only its durable log; candidate and failure notify.
    if (outcome !== 'no-candidate' && config.notification !== null) {
      try {
        await runCommand({ file: config.notification.file, args: config.notification.args, cwd: config.stateDirectory, input: `${JSON.stringify(result, null, 2)}\n` })
      } catch (error) {
        record.notificationError = error.message
        await writeFile(join(artifacts, 'run.json'), `${JSON.stringify(record, null, 2)}\n`)
      }
    }
    return result
  }

  try {
    await assertIndependentCommands(config.adapters.primary, config.adapters.secondary)
    if ((await git(config, ['status', '--porcelain=v1', '-uall'])).trim() !== '') {
      return await finish('failed', { failure: 'checkout is not clean; a maintenance run starts from a clean tree' })
    }
    if (config.fetch !== null) await git(config, ['fetch', '--quiet', config.fetch.remote])
    const targetCommit = (await git(config, ['rev-parse', config.targetRef])).trim()
    record.targetCommit = targetCommit

    const skillPath = join(config.checkout, config.targetSkill)
    await requireUnlinkedTarget(config.checkout, config.targetSkill)
    const current = await readFile(skillPath, 'utf8')
    bounded(current, 512 * 1024)
    record.sourceSkillBytes = Buffer.byteLength(current)
    // Blob identity is line-ending independent, so promotion can detect real drift on any checkout.
    record.sourceSkillBlob = await git(config, ['rev-parse', `HEAD:${config.targetSkill}`]).then(value => value.trim()).catch(() => null)

    const evidence = await collectReviewEvidence({
      checkout: config.checkout,
      repository: config.repository,
      targetRef: config.targetRef,
      since: daysBefore(clock, config.windowDays),
      request,
    })
    record.selectedPulls = evidence.selectedPulls.length
    record.skippedPulls = evidence.skippedPulls
    const ineligibleReasons = new Set(['merge-not-reachable', 'ambiguous-rebase-landing', 'unreconstructable-squash-landing', 'unsupported-landing-parents'])
    if (evidence.skippedPulls.some(pull => !ineligibleReasons.has(pull.reason))) {
      return await finish('failed', { failure: 'one or more pull requests could not be acquired', skippedPulls: evidence.skippedPulls })
    }
    excluded.push(...evidence.excluded)
    if (evidence.items.length === 0) return await finish('no-candidate')
    log(`collected ${evidence.items.length} feedback items from ${evidence.selectedPulls.length} pull requests`)

    const nonce = randomBytes(16).toString('hex')
    const items = evidence.items.map(item => ({
      id: item.id, body: untrusted(nonce, item.body), url: item.url, pullNumber: item.pullNumber,
      commitId: item.commitId, baselineCommit: item.baselineCommit, targetParent: item.targetParent,
      landingCommit: item.landingCommit, feedbackPatch: untrusted(nonce, item.feedbackPatch),
      finalPatch: untrusted(nonce, item.finalPatch),
    }))

    // Adoption: both adapters must independently agree the item is human-authored and adopted.
    const adoption = new Map()
    let primaryValid = 0
    let secondaryValid = 0
    for (const item of items) {
      const batch = [item]
      const { url: _url, ...payload } = item
      const requestPayload = { version: 2, operation: 'adoption', items: [payload], feedbackNonce: nonce }
      const [primary, secondary] = await Promise.allSettled([
        runReviewer({ command: config.adapters.primary, request: requestPayload, runDirectory: privateDirectory, timeoutMs: ADAPTER_TIMEOUT, maxBytes: 16 * 1024 * 1024 }),
        runReviewer({ command: config.adapters.secondary, request: requestPayload, runDirectory: privateDirectory, timeoutMs: ADAPTER_TIMEOUT, maxBytes: 16 * 1024 * 1024 }),
      ])
      const first = verdicts(primary)
      const second = verdicts(secondary)
      if (first !== null) primaryValid += 1
      if (second !== null) secondaryValid += 1
      for (const { id } of batch) {
        const a = first?.get(id)
        const b = second?.get(id)
        if (a !== undefined && b !== undefined && a.authorship === 'human-authored' && a.adoption === 'adopted' && b.authorship === 'human-authored' && b.adoption === 'adopted') {
          adoption.set(id, { a, b })
          const originalEvidence = evidence.items.find(value => value.id === id)
          adoptionEvidence.push({ id, url: item.url, pullNumber: item.pullNumber, commitId: item.commitId, baselineCommit: item.baselineCommit, targetParent: item.targetParent, landingCommit: item.landingCommit, feedbackPatchSha256: await sha256(originalEvidence.feedbackPatch), finalPatchSha256: await sha256(originalEvidence.finalPatch), primary: { authorship: a.authorship, adoption: a.adoption, reason: a.reason }, secondary: { authorship: b.authorship, adoption: b.adoption, reason: b.reason } })
        } else excluded.push({ id, stage: 'adoption', reasons: [a?.authorship ?? 'unavailable', a?.adoption ?? '', b?.authorship ?? 'unavailable', b?.adoption ?? ''].filter(Boolean) })
      }
    }
    if (primaryValid === 0 || secondaryValid === 0) return await finish('failed', { failure: 'a reviewer adapter produced no valid result for any batch' })
    if (adoption.size === 0) return await finish('no-candidate')
    const adopted = items.filter(item => adoption.has(item.id))
    log(`${adopted.length} items agreed human-authored and adopted`)

    // Classification against the current skill, then one bounded re-evaluation for disagreements.
    const classified = await classify({ config, adopted, current, nonce, privateDirectory, request, excluded })
    if (classified.failed !== undefined) return await finish('failed', { failure: classified.failed })
    if (classified.candidates.length === 0) {
      unresolved = classified.unresolved
      return await finish('no-candidate', { unresolved })
    }
    unresolved = classified.unresolved
    const guidance = classified.candidates.map(candidate => candidate.guidance)
    log(`${classified.candidates.length} agreed candidate guidance items`)

    // Gate and review in a separate checkout; never write candidate content to the operator's tree.
    const isolatedCheckout = join(privateDirectory, 'checkout')
    const autocrlf = (await git(config, ['config', '--get', 'core.autocrlf']).catch(() => '')).trim()
    const cloneArgs = ['clone', '--quiet', '--no-hardlinks', '--no-checkout']
    if (autocrlf !== '') cloneArgs.push('-c', `core.autocrlf=${autocrlf}`)
    cloneArgs.push('--', config.checkout, isolatedCheckout)
    await runCommand({ file: 'git', args: cloneArgs, cwd: privateDirectory, maxBytes: 16 * 1024 * 1024 })
    const isolatedConfig = { ...config, checkout: isolatedCheckout, fetch: null }
    await git(isolatedConfig, ['checkout', '--quiet', '--detach', targetCommit])
    const isolatedSkill = join(isolatedCheckout, config.targetSkill)
    await requireUnlinkedTarget(isolatedCheckout, config.targetSkill)
    if (await readFile(isolatedSkill, 'utf8') !== current) throw new Error('isolated checkout does not match the source skill')
    const draftResult = await draftAndReview({ config: isolatedConfig, current, skillPath: isolatedSkill, guidance, nonce, privateDirectory, artifacts })
    record.revisions = draftResult.revisions
    record.gates = draftResult.gates
    record.reviews = draftResult.reviews
    if (!draftResult.ok) return await finish('failed', { failure: draftResult.failure })
    record.sourceSkill = config.targetSkill
    record.sourceSkillSha256 = await sha256(current)
    const manifest = {
      runId,
      repository: config.repository,
      targetRef: config.targetRef,
      targetCommit,
      targetSkill: config.targetSkill,
      sourceSkillSha256: record.sourceSkillSha256,
      sourceSkillBlob: record.sourceSkillBlob,
      candidateSkillSha256: await sha256(draftResult.content),
      candidateDiffSha256: await sha256(draftResult.diff),
      feedback: classified.candidates.map(candidate => ({ id: candidate.id, url: candidate.url ?? '', guidance: candidate.guidance })),
      adoption: adoptionEvidence,
      excluded,
      unresolved,
      revisions: draftResult.revisions,
      gates: draftResult.gates,
      reviews: draftResult.reviews,
      reviewedDiff: 'candidate.diff',
      candidate: 'candidate.SKILL.md',
      createdAt: clock().toISOString(),
    }
    await writeFile(join(artifacts, 'candidate.SKILL.md'), draftResult.content)
    await writeFile(join(artifacts, 'candidate.diff'), draftResult.diff)
    await writeFile(join(artifacts, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
    log(`reviewed candidate saved for ${config.targetSkill}`)
    return await finish('candidate', { candidate: config.targetSkill, diff: draftResult.diff })
  } catch (error) {
    return await finish('failed', { failure: error.message })
  }
}

function verdicts(settled) {
  if (settled.status !== 'fulfilled') return null
  const map = new Map()
  for (const result of settled.value.results) map.set(result.id, result)
  return map
}

async function classify({ config, adopted, current, nonce, privateDirectory, request, excluded }) {
  const payloadFor = batch => ({ version: 1, operation: 'classification', skill: current, items: batch.map(({ id, body }) => ({ id, body })), feedbackNonce: nonce })
  const run = async batch => {
    const payload = payloadFor(batch)
    const [primary, secondary] = await Promise.allSettled([
      runReviewer({ command: config.adapters.primary, request: payload, runDirectory: privateDirectory, timeoutMs: ADAPTER_TIMEOUT }),
      runReviewer({ command: config.adapters.secondary, request: payload, runDirectory: privateDirectory, timeoutMs: ADAPTER_TIMEOUT }),
    ])
    return { first: verdicts(primary), second: verdicts(secondary) }
  }
  const candidates = []
  const unresolved = []
  let valid = 0
  const revisit = []
  for (const batch of batches(adopted)) {
    const { first, second } = await run(batch)
    if (first !== null && second !== null) valid += 1
    for (const item of batch) {
      const a = first?.get(item.id)
      const b = second?.get(item.id)
      if (a === undefined || b === undefined) {
        excluded.push({ id: item.id, stage: 'classification', reasons: ['adapter unavailable'] })
        continue
      }
      if (a.classification === b.classification) {
        if (a.classification === 'candidate') {
          const text = [a.guidance, b.guidance].filter(value => value.trim() !== '').join('\n')
          candidates.push({ id: item.id, url: item.url, guidance: text === '' ? 'Apply the agreed reviewer guidance.' : text })
        } else excluded.push({ id: item.id, stage: 'classification', reasons: [a.classification] })
      } else revisit.push({ item, a, b })
    }
  }
  if (valid === 0) return { failed: 'a reviewer adapter produced no valid classification result for any batch', candidates, unresolved }
  if (revisit.length > 0) {
    const { first, second } = await run(revisit.map(entry => entry.item))
    for (const entry of revisit) {
      const a = first?.get(entry.item.id)
      const b = second?.get(entry.item.id)
      if (a !== undefined && b !== undefined && a.classification === b.classification && a.classification === 'candidate') {
        const text = [a.guidance, b.guidance].filter(value => value.trim() !== '').join('\n')
        candidates.push({ id: entry.item.id, url: entry.item.url, guidance: text === '' ? 'Apply the agreed reviewer guidance.' : text })
      } else if (a !== undefined && b !== undefined && a.classification === b.classification) {
        excluded.push({ id: entry.item.id, stage: 'classification', reasons: [a.classification] })
      } else {
        unresolved.push(entry.item.id)
      }
    }
  }
  return { candidates, unresolved }
}

async function draftAndReview({ config, current, skillPath, guidance, nonce, privateDirectory }) {
  const gates = []
  let content = current
  let notes = []
  for (let revision = 0; revision <= config.maxRevisions; revision++) {
    const draftRequest = { version: 1, operation: 'draft', skill: content, guidance: notes.length === 0 ? guidance : guidance.concat(notes), feedbackNonce: nonce }
    let draft
    try {
      draft = await runReviewer({ command: config.adapters.primary, request: draftRequest, runDirectory: privateDirectory, timeoutMs: ADAPTER_TIMEOUT })
    } catch (error) {
      return { ok: false, failure: `draft failed: ${error.message}`, revisions: revision, gates }
    }
    const candidate = draft.content
    if (candidate === content) return { ok: false, failure: 'draft returned the unchanged skill', revisions: revision, gates }
    bounded(candidate, 512 * 1024)
    // Both adapters always review the complete diff from the original guidance, not an incremental one.
    const diff = await unifiedDiff(config, current, candidate, privateDirectory)

    // Undo this attempt's write unless it is the accepted result, never overwriting a concurrent edit.
    const rollback = async () => {
      await git(config, ['reset', '--quiet', '--', config.targetSkill]).catch(() => {})
      const existing = await readFile(skillPath, 'utf8').catch(() => null)
      if (existing === candidate) await writeFile(skillPath, current)
    }

    await writeFile(skillPath, candidate)
    try {
      const changed = await changedPaths(config)
      if (changed.length !== 1 || changed[0] !== config.targetSkill) throw new Error(`candidate changed unexpected paths: ${changed.join(', ') || 'none'}`)
      if ((await git(config, ['diff', '--cached', '--name-only'])).trim() !== '') throw new Error('candidate staged changes')

      for (const gate of config.gates) {
        try {
          await runCommand({ file: gate.file, args: gate.args, cwd: config.checkout, maxBytes: 16 * 1024 * 1024 })
          gates.push({ name: gate.name, passed: true })
        } catch (error) {
          gates.push({ name: gate.name, passed: false, exitCode: error.exitCode ?? null })
          throw new Error(`gate ${gate.name} failed`)
        }
      }
      // Gates are foreign processes: re-verify they did not stage or change anything else.
      const afterGates = await changedPaths(config)
      if (afterGates.length !== 1 || afterGates[0] !== config.targetSkill) throw new Error(`gates changed unexpected paths: ${afterGates.join(', ') || 'none'}`)
      if ((await git(config, ['diff', '--cached', '--name-only'])).trim() !== '') throw new Error('gates staged changes')
      if (await readFile(skillPath, 'utf8') !== candidate) throw new Error('gates changed the candidate content')

      const reviewRequest = { version: 1, operation: 'review', candidate, diff }
      const [primary, secondary] = await Promise.allSettled([
        runReviewer({ command: config.adapters.primary, request: reviewRequest, runDirectory: privateDirectory, timeoutMs: ADAPTER_TIMEOUT }),
        runReviewer({ command: config.adapters.secondary, request: reviewRequest, runDirectory: privateDirectory, timeoutMs: ADAPTER_TIMEOUT }),
      ])
      const reviews = ['primary', 'secondary'].map((adapterName, index) => {
        const settled = index === 0 ? primary : secondary
        return settled.status === 'fulfilled'
          ? { adapter: adapterName, approved: settled.value.approved, findings: settled.value.findings }
          : { adapter: adapterName, approved: false, findings: [{ severity: 'blocking', message: `review unavailable: ${settled.reason.message}` }] }
      })
      const blocking = []
      for (const review of reviews) {
        blocking.push(...review.findings.filter(finding => finding.severity === 'blocking').map(finding => finding.message))
        if (!review.approved) blocking.push(`${review.adapter} review did not approve`)
      }
      if (blocking.length === 0) {
        const finalPaths = await changedPaths(config)
        if (finalPaths.length !== 1 || finalPaths[0] !== config.targetSkill ||
            (await git(config, ['diff', '--cached', '--name-only'])).trim() !== '' ||
            await readFile(skillPath, 'utf8') !== candidate) throw new Error('candidate changed after review')
        return { ok: true, content: candidate, diff, revisions: revision, gates, reviews }
      }

      notes = blocking
      if (revision === config.maxRevisions) {
        await rollback()
        return { ok: false, failure: `review still blocking after ${String(revision)} revisions: ${blocking.join(' | ')}`, revisions: revision, gates, reviews }
      }
    } catch (error) {
      await rollback()
      return { ok: false, failure: error.message, revisions: revision, gates }
    }
    // Rejected but revisable: drop the write and let the next round start from the same clean base.
    await rollback()
    content = candidate
  }
  return { ok: false, failure: 'review loop exhausted', revisions: config.maxRevisions, gates }
}


async function sha256(content) {
  const { createHash } = await import('node:crypto')
  return createHash('sha256').update(content).digest('hex')
}
