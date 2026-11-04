/**
 * Check declared workspace export keys against this template's policy.
 *
 * Libraries require an export map; apps may omit it. Recorded additions name
 * their owner and reason, but do not prove the required rule change or domain
 * owner's confirmation. Review retains those responsibilities.
 */

import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { readWorkspaceManifests } from './check-workspace-constraints.ts'
import { isRecord, isStringList, readManifestObject } from './manifest-json.ts'

const GATE = 'verify-package-export-keys'
const root = resolve(import.meta.dirname, '..')
const POLICY = 'scripts/package-export-keys.manifest.json'

/** One reviewed non-standard export key. */
export interface ExportKeyAddition {
  readonly key: string
  readonly owner: string
  readonly reason: string
}

/** The declared export-key policy. */
export interface ExportKeyPolicy {
  readonly standardExports: readonly string[]
  readonly additions: Readonly<Record<string, readonly ExportKeyAddition[]>>
}


/**
 * Read the export-key policy and prove its additions name real library or app members.
 * @param repositoryRoot - repository root holding the policy manifest.
 * @param packageDirectories - actual library and app member directories.
 * @returns the validated policy.
 * @throws on malformed lists, an unknown directory, a standard key in additions, or an unjustified addition.
 */
export function readExportKeyPolicy(
  repositoryRoot: string,
  packageDirectories: ReadonlySet<string>,
): ExportKeyPolicy {
  const parsed = readManifestObject(repositoryRoot, POLICY, GATE)
  const standard = 'standardExports' in parsed ? parsed.standardExports : undefined
  if (!isStringList(standard)) throw new Error(`${GATE}: standardExports must be a non-empty list`)
  if (new Set(standard).size !== standard.length) throw new Error(`${GATE}: standardExports contains a duplicate key`)
  const rawAdditions = 'additions' in parsed ? parsed.additions : undefined
  if (!isRecord(rawAdditions)) {
    throw new Error(`${GATE}: additions must be an object keyed by package directory`)
  }
  const additions: Record<string, ExportKeyAddition[]> = {}
  for (const [directory, value] of Object.entries(rawAdditions)) {
    if (!packageDirectories.has(directory)) {
      throw new Error(`${GATE}: additions names ${directory}, which is not a package member — remove the stale approval`)
    }
    if (!Array.isArray(value)) throw new Error(`${GATE}: additions.${directory} must be a list`)
    const entries: ExportKeyAddition[] = []
    for (const item of value) {
      if (!isRecord(item)) {
        throw new Error(`${GATE}: additions.${directory} entries must hold key, owner, and reason`)
      }
      const key = 'key' in item ? item.key : undefined
      const owner = 'owner' in item ? item.owner : undefined
      const reason = 'reason' in item ? item.reason : undefined
      if (typeof key !== 'string' || key.length === 0) throw new Error(`${GATE}: additions.${directory} entry needs a key`)
      if (standard.includes(key)) throw new Error(`${GATE}: ${directory} lists standard export ${key} as an addition`)
      if (typeof owner !== 'string' || owner.trim() === '') throw new Error(`${GATE}: ${directory} ${key} needs the owning domain`)
      if (typeof reason !== 'string' || reason.trim() === '') throw new Error(`${GATE}: ${directory} ${key} needs a reason it cannot use the root export`)
      entries.push({ key, owner, reason })
    }
    additions[directory] = entries
  }
  return { standardExports: standard, additions }
}

/**
 * Check one package's export keys against the standard set and its approvals.
 * @param directory - package member directory.
 * @param keys - actual `exports` keys in the manifest.
 * @param policy - validated export-key policy.
 * @returns one diagnostic per missing approval or stale approval.
 */
export function exportKeyErrors(
  directory: string,
  keys: readonly string[],
  policy: ExportKeyPolicy,
): string[] {
  const approved = new Map((policy.additions[directory] ?? []).map(entry => [entry.key, entry]))
  const errors: string[] = []
  for (const key of keys) {
    if (policy.standardExports.includes(key)) continue
    if (!approved.has(key)) {
      errors.push(`${directory}: export ${JSON.stringify(key)} is not standard; add an owner and reason to ${POLICY} or remove the subpath`)
    }
  }
  for (const key of approved.keys()) {
    if (!keys.includes(key)) {
      errors.push(`${directory}: approved export ${JSON.stringify(key)} is absent from the manifest — remove the stale approval`)
    }
  }
  return errors
}

/** CLI entry: check library export maps and any app export maps, including stale policy entries. */
export function main(): void {
  const members = readWorkspaceManifests(root).filter(entry => /^(?:packages\/[^/]+\/[^/]+|apps\/[^/]+)$/u.test(entry.dir))
  const policy = readExportKeyPolicy(root, new Set(members.map(entry => entry.dir)))
  const errors = members.flatMap((entry) => {
    const raw: unknown = entry.manifest
    if (!isRecord(raw)) return [`${entry.dir}: package.json must hold an object`]
    const exports = 'exports' in raw ? raw.exports : undefined
    const keys = isRecord(exports) ? Object.keys(exports) : []
    if (entry.dir.startsWith('packages/') && keys.length === 0) return [`${entry.dir}: package.json needs exports`]
    return exportKeyErrors(entry.dir, keys, policy)
  })
  if (errors.length > 0) {
    console.error(`${GATE}: export-key violations:`)
    for (const error of errors) console.error(`  ${error}`)
    process.exit(1)
  }
  console.log(`${GATE}: ${members.length} package export key set(s) are standard or carry a named owner and reason.`)
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main()
