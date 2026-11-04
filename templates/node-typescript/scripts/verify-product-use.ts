/**
 * Verify that every package states how the product uses it and that the stated
 * role matches the actual runtime dependency graph.
 *
 * A package reachable from a declared product entry is product code and must
 * say so. A development-only or test-support package must not ride a runtime
 * dependency into the shipped product. A classification with no owning package
 * is stale, and a role with no reason is an unexplained exemption.
 */

import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { readWorkspaceManifests, type WorkspaceManifest } from './check-workspace-constraints.ts'
import { isRecord, isStringList, readManifestObject } from './manifest-json.ts'

const GATE = 'verify-product-use'
const root = resolve(import.meta.dirname, '..')
const POLICY = 'scripts/product-use.manifest.json'

/** One package's declared product role. */
export interface ProductUseClassification {
  readonly role: string
  readonly reason: string
}

/** The declared product-use policy. */
export interface ProductUsePolicy {
  readonly roles: readonly string[]
  readonly entries: readonly string[]
  readonly packages: Readonly<Record<string, ProductUseClassification>>
}


/**
 * Read the product-use policy.
 * @param repositoryRoot - repository root holding the policy manifest.
 * @returns the declared roles, entries, and classifications.
 * @throws on malformed roles, entries, or classifications.
 */
export function readProductUsePolicy(repositoryRoot: string): ProductUsePolicy {
  const parsed = readManifestObject(repositoryRoot, POLICY, GATE)
  const roles = 'roles' in parsed ? parsed.roles : undefined
  if (!isStringList(roles)) throw new Error(`${GATE}: roles must be a non-empty list`)
  if (new Set(roles).size !== roles.length) throw new Error(`${GATE}: roles contains a duplicate`)
  const entries = 'entries' in parsed ? parsed.entries : undefined
  if (!isStringList(entries)) throw new Error(`${GATE}: entries must be a non-empty list of workspace directories`)
  const rawPackages = 'packages' in parsed ? parsed.packages : undefined
  if (!isRecord(rawPackages)) {
    throw new Error(`${GATE}: packages must be an object keyed by package directory`)
  }
  const packages: Record<string, ProductUseClassification> = {}
  for (const [directory, value] of Object.entries(rawPackages)) {
    if (!isRecord(value)) {
      throw new Error(`${GATE}: packages.${directory} must hold role and reason`)
    }
    const role = 'role' in value ? value.role : undefined
    const reason = 'reason' in value ? value.reason : undefined
    if (typeof role !== 'string' || !roles.includes(role)) {
      throw new Error(`${GATE}: packages.${directory}.role must be one of ${roles.join(', ')}`)
    }
    if (typeof reason !== 'string' || reason.trim() === '') {
      throw new Error(`${GATE}: packages.${directory}.reason must state the package's product use`)
    }
    packages[directory] = { role, reason }
  }
  return { roles, entries, packages }
}

/**
 * Runtime workspace dependencies of one member: `dependencies` and `optionalDependencies`.
 * @param manifest - parsed member manifest.
 * @returns dependency package names, unsorted.
 */
function runtimeDependencies(manifest: { dependencies?: Record<string, string>; optionalDependencies?: Record<string, string> }): string[] {
  return [...Object.keys(manifest.dependencies ?? {}), ...Object.keys(manifest.optionalDependencies ?? {})]
}

/**
 * Collect the runtime package closure reachable from one entry directory.
 * @param memberByDirectory - workspace members keyed by directory.
 * @param memberByName - workspace members keyed by package name.
 * @param entry - entry directory.
 * @returns reachable package names, including the entry's own name.
 */
function runtimeClosure(
  memberByDirectory: ReadonlyMap<string, string>,
  memberByName: ReadonlyMap<string, { dir: string; deps: string[] }>,
  entry: string,
): Set<string> {
  const entryName = memberByDirectory.get(entry)
  if (entryName === undefined) return new Set()
  const reached = new Set<string>()
  const queue = [entryName]
  while (queue.length > 0) {
    const name = queue.pop()
    if (name === undefined || reached.has(name)) continue
    reached.add(name)
    for (const dependency of memberByName.get(name)?.deps ?? []) {
      if (memberByName.has(dependency)) queue.push(dependency)
    }
  }
  return reached
}

/**
 * Compare declared roles with the actual runtime closure.
 * @param manifests - every workspace member.
 * @param policy - validated product-use policy.
 * @returns one diagnostic per stale, unreachable, or misclassified package.
 */
export function productUseErrors(
  manifests: readonly WorkspaceManifest[],
  policy: ProductUsePolicy,
): string[] {
  const memberByDirectory = new Map<string, string>()
  const memberByName = new Map<string, { dir: string; deps: string[] }>()
  for (const entry of manifests) {
    const name = entry.manifest.name
    if (name === undefined) continue
    memberByDirectory.set(entry.dir, name)
    memberByName.set(name, { dir: entry.dir, deps: runtimeDependencies(entry.manifest) })
  }
  const packageDirectories = new Set(manifests.map(entry => entry.dir).filter(dir => /^packages\/[^/]+\/[^/]+$/u.test(dir)))
  const errors: string[] = []
  for (const entry of policy.entries) {
    if (!memberByDirectory.has(entry)) errors.push(`entry ${entry} is not a workspace member`)
    else if (entry === '.') errors.push('the workspace root cannot be a product entry')
  }
  for (const directory of packageDirectories) {
    if (!Object.hasOwn(policy.packages, directory)) {
      errors.push(`${directory}: no product-use classification — state its role and reason in ${POLICY}`)
    }
  }
  for (const directory of Object.keys(policy.packages)) {
    if (!packageDirectories.has(directory)) {
      errors.push(`${directory} is not a package member — remove the stale classification`)
    }
  }
  const closures = policy.entries.map(entry => runtimeClosure(memberByDirectory, memberByName, entry))
  for (const [directory, classification] of Object.entries(policy.packages)) {
    const name = memberByDirectory.get(directory)
    if (name === undefined) continue
    const reachable = closures.some(closure => closure.has(name))
    if (classification.role === 'product' && !reachable) {
      errors.push(`${directory}: classified product but no declared entry reaches it through runtime dependencies`)
    }
    if (classification.role !== 'product' && reachable) {
      errors.push(`${directory}: classified ${classification.role} but a declared entry reaches it at runtime — product packages must use the product role`)
    }
  }
  return errors
}

/** CLI entry: run the product-use comparison and report its findings. */
export function main(): void {
  const manifests = readWorkspaceManifests(root)
  const policy = readProductUsePolicy(root)
  const errors = productUseErrors(manifests, policy)
  const packageDirectories = new Set(manifests.map(entry => entry.dir).filter(dir => /^packages\/[^/]+\/[^/]+$/u.test(dir)))
  if (errors.length > 0) {
    console.error(`${GATE}: product-use violations:`)
    for (const error of errors) console.error(`  ${error}`)
    process.exit(1)
  }
  const roles = new Set(Object.values(policy.packages).map(classification => classification.role))
  console.log(`${GATE}: ${packageDirectories.size} package(s) classified from ${policy.entries.length} entr${policy.entries.length === 1 ? 'y' : 'ies'} (${[...roles].sort().join(', ')}); no stale or unreachable role.`)
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main()
