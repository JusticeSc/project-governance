// Runs the commands a repository configured for itself, and nothing else.
//
// The policy is a repository file (default: governance-checks.json) whose `checks` object maps
// names to non-empty command strings. Every command is validated before any of them runs, so a
// malformed policy never executes a partial plan. Checks are never derived from project files.
import { spawnSync } from 'node:child_process'
import { readFileSync, realpathSync, statSync } from 'node:fs'
import { isAbsolute, relative, resolve, sep } from 'node:path'

const PREFIX = 'project-governance:'

/**
 * Run the checks configured by `policyPath` inside `repository`.
 *
 * @param {string} repository existing repository directory
 * @param {string} [policyPath] repository-relative policy file (default `governance-checks.json`)
 * @returns {number} process exit code: 0 all checks passed, 1 a check failed or was terminated,
 *   2 the policy, a path or an argument could not be validated (nothing was executed)
 */
export function runChecks(repository, policyPath = 'governance-checks.json') {
  let root
  let plan
  try {
    ;({ root, plan } = loadPlan(repository, policyPath))
  } catch (error) {
    console.error(`${PREFIX} ${error.message}`)
    return 2
  }
  console.log(`${PREFIX} running ${plan.length} configured checks in ${root}`)
  const failures = []
  for (const { name, command } of plan) {
    console.log(`\n--- check ${name}: ${command} ---`)
    const result = spawnSync(command, { cwd: root, shell: true, stdio: 'inherit', env: process.env })
    if (result.error) {
      console.error(`${PREFIX} check ${name} could not start: ${result.error.message}`)
      failures.push(name)
      continue
    }
    console.log(`[observed exit ${result.status ?? 'none'}${result.signal ? `, signal ${result.signal}` : ''}]`)
    if (result.signal) console.error(`${PREFIX} check ${name} was terminated by ${result.signal}`)
    if (result.status !== 0) failures.push(name)
  }
  console.log(`\n${PREFIX} ${plan.length - failures.length}/${plan.length} configured checks passed`)
  if (failures.length > 0) {
    console.error(`${PREFIX} failed checks: ${failures.join(', ')}`)
    return 1
  }
  console.log(`${PREFIX} configured checks passed; this runs only the commands in the policy and does not prove semantic completeness, adoption or platform enforcement`)
  return 0
}

function loadPlan(repository, policyPath) {
  if (typeof repository !== 'string' || repository.trim() === '') {
    throw new Error('check needs a repository path')
  }
  if (typeof policyPath !== 'string' || policyPath.trim() === '') {
    throw new Error('the policy path must be a non-empty string')
  }
  let root
  try {
    root = realpathSync(resolve(repository))
  } catch (error) {
    throw new Error(`cannot open repository ${repository}: ${error.message}`)
  }
  if (!statSync(root).isDirectory()) throw new Error(`repository is not a directory: ${repository}`)
  const requested = isAbsolute(policyPath) ? resolve(policyPath) : resolve(root, policyPath)
  let canonicalPolicy
  try {
    canonicalPolicy = realpathSync(requested)
  } catch (error) {
    throw new Error(`cannot read policy ${policyPath}: ${error.message}`)
  }
  // Containment uses canonical paths, so a repository reached through an alias stays valid while a
  // policy file or any of its parent directories redirected outside the repository is refused.
  const escaped = relative(root, canonicalPolicy)
  if (escaped === '..' || escaped.startsWith(`..${sep}`) || isAbsolute(escaped)) {
    throw new Error(`policy ${policyPath} must resolve inside ${root}; an outside policy is never executed`)
  }
  if (!statSync(canonicalPolicy).isFile()) throw new Error(`policy ${policyPath} is not a file`)
  let text
  try {
    text = readFileSync(canonicalPolicy, 'utf8')
  } catch (error) {
    throw new Error(`cannot read policy ${policyPath}: ${error.message}`)
  }
  let policy
  try {
    policy = JSON.parse(text)
  } catch (error) {
    throw new Error(`policy ${policyPath} is not valid JSON: ${error.message}`)
  }
  const entries = policy?.checks
  if (entries === null || typeof entries !== 'object' || Array.isArray(entries)) {
    throw new Error(`policy ${policyPath} has no checks object`)
  }
  const names = Object.keys(entries)
  if (names.length === 0) {
    throw new Error(`policy ${policyPath} configures no checks; commands are never derived from project files`)
  }
  const plan = []
  for (const name of names) {
    const command = entries[name]
    if (typeof command !== 'string' || command.trim() === '') {
      throw new Error(`policy ${policyPath} checks.${name} must be a non-empty command string`)
    }
    if (command.includes('\u0000')) {
      throw new Error(`policy ${policyPath} checks.${name} must not contain NUL bytes`)
    }
    plan.push({ name, command })
  }
  return { root, plan }
}
