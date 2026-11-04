/** Accepted per-root persistence histories, independent of publication evidence. */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { JSON_SCHEMA, load } from 'js-yaml'
import type { PersistenceHistory, PersistenceHistoryEntry } from './persistence-changes.ts'
import type { PersistenceRoot, PersistenceSchemaInventory } from './persistence-schema-model.ts'

const DIRECTORY = 'docs/persistence-changes/finalized'
const ID = /^[a-z][a-z0-9-]*$/u
const DIGEST = /^[a-f0-9]{64}$/u
const RECORD_ID = /^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/u

/** An accepted root and the exact history records on its predecessor chain. */
export interface PersistenceFinalizationCheckpoint {
  readonly schemaVersion: 1
  readonly root: string
  readonly recordId: string
  readonly version: number | null
  readonly digest: string
  readonly acceptedRecords: Readonly<Record<string, string>>
}

/** Accepted record ids and highest version for each separately finalized root. */
export interface PersistenceFinalization {
  readonly versions: ReadonlyMap<string, number>
  readonly acceptedRecords: ReadonlySet<string>
}

function versionOf(root: PersistenceRoot): number | null {
  if (root.versionField === undefined) return null
  const node = root.schema.nodes[0]
  const property = node?.kind === 'object' ? node.properties.find(item => item.name === root.versionField) : undefined
  const value = property === undefined ? undefined : root.schema.nodes[property.type]
  if (property?.optional !== false || value?.kind !== 'literal'
    || typeof value.value !== 'number' || !Number.isSafeInteger(value.value) || value.value < 0) {
    throw new Error(`${root.key}: finalization requires a declared numeric literal versionField`)
  }
  return value.value
}

function recordDigest(entry: PersistenceHistoryEntry, rootId: string): string {
  const change = entry.record.changes.find(change => change.root === rootId)
  const schema = entry.snapshot.roots.find(root => root.key === rootId) ?? null
  return createHash('sha256').update('persistence-finalization-record-v2\n').update(JSON.stringify({
    id: entry.record.id, baseline: entry.record.baseline, formatVersion: entry.snapshot.formatVersion, change, schema,
  })).digest('hex')
}

/** Capture one root's acknowledged predecessor chain without a publication claim.
 * @param history - validated acknowledgement history.
 * @param current - complete current inventory matching the selected root's history tip.
 * @param rootId - declared stable root id; other roots are not finalized.
 * @returns immutable per-root record identities and its explicitly declared version, or null.
 */
export function createPersistenceFinalizationCheckpoint(
  history: PersistenceHistory, current: PersistenceSchemaInventory, rootId: string,
): PersistenceFinalizationCheckpoint {
  const item = current.roots.find(root => root.key === rootId)
  const tip = history.tips.get(rootId)
  if (item === undefined || tip?.root === null || tip?.root === undefined || !isDeepStrictEqual(tip.root, item)) {
    throw new Error(`${rootId}: finalization requires the current root to match acknowledged history`)
  }
  const entries = new Map(history.entries.map(entry => [entry.record.id, entry]))
  const acceptedRecords: Record<string, string> = {}
  let id: string | null = tip.id
  while (id !== null) {
    const entry = entries.get(id)
    const change = entry?.record.changes.find(change => change.root === rootId)
    if (entry === undefined || change === undefined || Object.hasOwn(acceptedRecords, id)) throw new Error(`${rootId}: invalid predecessor chain`)
    acceptedRecords[id] = recordDigest(entry, rootId)
    id = change.previous
  }
  return { schemaVersion: 1, root: rootId, recordId: tip.id, version: versionOf(item), digest: item.digest, acceptedRecords }
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label}: expected an object`)
  return value as Record<string, unknown>
}

function status(root: string, path: string): Record<string, string> | undefined {
  if (!existsSync(join(root, path))) return undefined
  const source = readFileSync(join(root, path), 'utf8').replaceAll('\r\n', '\n')
  const openings = [...source.matchAll(/^```yaml persistence-finalization[ \t]*$/gmu)]
  if (openings.length === 0) return undefined
  const blocks = [...source.matchAll(/^```yaml persistence-finalization[ \t]*\n([\s\S]*?)^```[ \t]*$/gmu)]
  if (openings.length !== 1 || blocks.length !== 1) throw new Error(`${path}: expected one closed persistence-finalization record`)
  const parsed = object(load(blocks[0]?.[1] ?? '', { schema: JSON_SCHEMA }), path)
  if (Object.keys(parsed).join(',') !== 'roots') throw new Error(`${path}: expected roots mapping`)
  const roots = object(parsed.roots, `${path} roots`)
  for (const [id, recordId] of Object.entries(roots)) {
    if (!ID.test(id) || typeof recordId !== 'string' || !RECORD_ID.test(recordId)) throw new Error(`${path}: invalid finalization record for ${id}`)
  }
  return roots as Record<string, string>
}

/** Validate retained root-owned checkpoints and their bilingual latest status.
 * @param root - checkout or isolated fixture root.
 * @param history - parsed history including any unaccepted successors.
 * @returns immutable accepted record ids and actual version bounds, or undefined without finalization.
 */
export function loadPersistenceFinalization(root: string, history: Pick<PersistenceHistory, 'entries'>): PersistenceFinalization | undefined {
  const directory = join(root, DIRECTORY)
  const folders = existsSync(directory) ? readdirSync(directory) : []
  const en = status(root, 'docs/persistence-changes/README.md')
  const zh = status(root, 'docs/persistence-changes/README.zh.md')
  if (en === undefined && zh === undefined && folders.length === 0) return undefined
  if (en === undefined || zh === undefined || JSON.stringify(Object.entries(en).sort()) !== JSON.stringify(Object.entries(zh).sort())) throw new Error('persistence finalization status is missing or differs between languages')
  const entries = new Map(history.entries.map(entry => [entry.record.id, entry]))
  const acceptedRecords = new Set<string>()
  const versions = new Map<string, number>()
  for (const folder of folders) {
    if (!ID.test(folder) || !Object.hasOwn(en, folder)) throw new Error(`unexpected finalization root ${folder}`)
    const files = readdirSync(join(directory, folder))
    const latest = en[folder] as string
    if (!files.includes(`${latest}.json`)) throw new Error(`${folder}: missing checkpoint ${latest}.json`)
    let latestAccepted: ReadonlySet<string> | undefined
    for (const file of files) {
      const recordId = file.replace(/\.json$/u, '')
      if (!file.endsWith('.json') || !RECORD_ID.test(recordId)) throw new Error(`${folder}: unexpected checkpoint ${file}`)
      const checkpoint = object(JSON.parse(readFileSync(join(directory, folder, file), 'utf8')), file)
      if (Object.keys(checkpoint).sort().join(',') !== 'acceptedRecords,digest,recordId,root,schemaVersion,version'
        || checkpoint.schemaVersion !== 1 || checkpoint.root !== folder || checkpoint.recordId !== recordId
        || (checkpoint.version !== null && (typeof checkpoint.version !== 'number' || !Number.isSafeInteger(checkpoint.version) || checkpoint.version < 0))
        || typeof checkpoint.digest !== 'string' || !DIGEST.test(checkpoint.digest)) throw new Error(`${file}: invalid checkpoint metadata`)
      const locked = object(checkpoint.acceptedRecords, file)
      for (const [id, expected] of Object.entries(locked)) {
        const entry = entries.get(id)
        if (!RECORD_ID.test(id) || typeof expected !== 'string' || !DIGEST.test(expected) || entry === undefined || recordDigest(entry, folder) !== expected) throw new Error(`${file}: finalized acknowledgement ${id} was removed or changed`)
        const change = entry.record.changes.find(change => change.root === folder)
        if (change === undefined) throw new Error(`${file}: record ${id} does not change ${folder}`)
        acceptedRecords.add(id)
      }
      const followed = new Set<string>()
      let cursor: string | null = recordId
      while (cursor !== null) {
        const change: PersistenceHistoryEntry['record']['changes'][number] | undefined =
          entries.get(cursor)?.record.changes.find(candidate => candidate.root === folder)
        if (change === undefined || !Object.hasOwn(locked, cursor) || followed.has(cursor)) throw new Error(`${file}: invalid accepted predecessor chain`)
        followed.add(cursor)
        cursor = change.previous
      }
      if (followed.size !== Object.keys(locked).length) throw new Error(`${file}: disconnected accepted predecessor chain`)
      if (recordId === latest) latestAccepted = followed
      const tip = entries.get(recordId)?.snapshot.roots.find(item => item.key === folder)
      if (tip === undefined || tip.digest !== checkpoint.digest || versionOf(tip) !== checkpoint.version) throw new Error(`${file}: finalized root does not match accepted history`)
      if (checkpoint.version !== null) versions.set(folder, Math.max(versions.get(folder) ?? 0, checkpoint.version as number))
    }
    if (latestAccepted === undefined) throw new Error(`${folder}: latest status is missing`)
    const accepted = latestAccepted
    if (files.some(file => !accepted.has(file.replace(/\.json$/u, '')))) throw new Error(`${folder}: latest status omits a retained checkpoint`)
  }
  for (const id of Object.keys(en)) if (!folders.includes(id)) throw new Error(`${id}: missing finalization directory`)
  return { versions, acceptedRecords }
}
