// Behaviour adapted from DeepSeek Harness 687f282e docs/cookbook/maintaining-dsh-code-review.md
// and .agents/notes/proposed/process/2026-07-13-human-review-skill-maintenance.md.
// License: ../../../../SOURCE-LICENSE.txt.
// Reads and validates the operator's private configuration. The file lives outside any checkout:
// it names the reviewed repository, the skill to maintain, the two reviewer adapters, the gates
// that must pass, and the optional notification command. Nothing here is a repository file.
import { readFile } from 'node:fs/promises'
import { isAbsolute } from 'node:path'

const fail = message => {
  throw new Error(`review-maintenance: ${message}`)
}
const object = (value, name) => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) fail(`${name} must be an object`)
  return value
}
const string = (value, name, { empty = false } = {}) => {
  if (typeof value !== 'string' || (!empty && value.trim() === '') || value.includes('\0')) fail(`${name} must be a non-empty string`)
  return value
}
export const command = (value, name) => {
  object(value, name)
  const result = { file: string(value.file, `${name}.file`), args: value.args ?? [] }
  if (!isAbsolute(result.file)) fail(`${name}.file must be absolute`)
  if (!Array.isArray(result.args) || result.args.some(arg => typeof arg !== 'string' || arg.includes('\0'))) fail(`${name}.args must be strings`)
  return result
}

/**
 * Validate a loaded configuration object.
 *
 * @param {unknown} raw parsed JSON
 * @returns {{repository: string, checkout: string, targetSkill: string, stateDirectory: string,
 *   targetRef: string, fetch: {remote: string} | null, windowDays: number, maxRevisions: number,
 *   adapters: {primary: object, secondary: object}, gates: {name: string, file: string, args: string[]}[],
 *   notification: {file: string, args: string[]} | null, promote: {remote: string, baseBranch: string} | null}}
 */
export function validateConfig(raw) {
  object(raw, 'config')
  const repository = string(raw.repository, 'repository')
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(repository)) fail('repository must be owner/name')
  const checkout = string(raw.checkout, 'checkout')
  if (!isAbsolute(checkout)) fail('checkout must be absolute')
  const targetSkill = string(raw.targetSkill, 'targetSkill')
  if (isAbsolute(targetSkill) || targetSkill.includes('\\') || targetSkill.split('/').some(part => part === '' || part === '.' || part === '..')) {
    fail('targetSkill must be a repository-relative path inside the checkout')
  }
  const stateDirectory = string(raw.stateDirectory, 'stateDirectory')
  if (!isAbsolute(stateDirectory)) fail('stateDirectory must be absolute and outside the checkout')

  const windowDays = raw.windowDays ?? 2
  if (!Number.isSafeInteger(windowDays) || windowDays < 1 || windowDays > 90) fail('windowDays must be an integer between 1 and 90')
  const maxRevisions = raw.maxRevisions ?? 2
  if (!Number.isSafeInteger(maxRevisions) || maxRevisions < 0 || maxRevisions > 5) fail('maxRevisions must be an integer between 0 and 5')

  const adapters = object(raw.adapters, 'adapters')
  const primary = { ...command(adapters.primary, 'adapters.primary'), identity: object(adapters.primary.identity, 'adapters.primary.identity') }
  const secondary = { ...command(adapters.secondary, 'adapters.secondary'), identity: object(adapters.secondary.identity, 'adapters.secondary.identity') }
  if (adapters.primary.program !== undefined) primary.program = string(adapters.primary.program, 'adapters.primary.program')
  if (adapters.secondary.program !== undefined) secondary.program = string(adapters.secondary.program, 'adapters.secondary.program')

  const rawGates = raw.gates ?? []
  if (!Array.isArray(rawGates)) fail('gates must be an array')
  const names = new Set()
  const gates = rawGates.map((gate, index) => {
    const validated = command(gate, `gates[${index}]`)
    const name = string(gate.name, `gates[${index}].name`)
    if (names.has(name)) fail(`duplicate gate name ${name}`)
    names.add(name)
    return { name, ...validated }
  })

  const notification = raw.notification === undefined || raw.notification === null ? null : command(raw.notification, 'notification')

  let fetchConfig = null
  if (raw.fetch !== undefined && raw.fetch !== null && raw.fetch !== false) {
    const fetched = object(raw.fetch, 'fetch')
    fetchConfig = { remote: string(fetched.remote ?? 'origin', 'fetch.remote') }
  }

  let promote = null
  if (raw.promote !== undefined && raw.promote !== null) {
    const value = object(raw.promote, 'promote')
    promote = { remote: string(value.remote ?? 'origin', 'promote.remote'), baseBranch: string(value.baseBranch ?? 'main', 'promote.baseBranch') }
  }

  return {
    repository,
    checkout,
    targetSkill,
    stateDirectory,
    targetRef: string(raw.targetRef ?? `refs/remotes/origin/main`, 'targetRef'),
    fetch: fetchConfig,
    windowDays,
    maxRevisions,
    adapters: { primary, secondary },
    gates,
    notification,
    promote,
  }
}

/** Load configuration from an explicit path. */
export async function loadConfig(path) {
  let text
  try {
    text = await readFile(path, 'utf8')
  } catch (error) {
    fail(`cannot read ${path}: ${error.message}`)
  }
  let raw
  try {
    raw = JSON.parse(text)
  } catch (error) {
    fail(`${path} is not JSON: ${error.message}`)
  }
  return validateConfig(raw)
}
