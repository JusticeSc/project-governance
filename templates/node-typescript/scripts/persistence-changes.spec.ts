/** Exercise real format extraction and the source-derived history protocol in isolated trees. */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { extractPersistenceSchema } from './persistence-schema.ts'
import { persistenceCatalogArtifacts } from './gen-persistence-catalog.ts'
import { loadPersistenceHistory, parsePersistenceProse, parsePersistenceSnapshot, runPersistenceChanges, validatePersistenceHistory, verifyPersistenceChanges } from './persistence-changes.ts'
import { createPersistenceFinalizationCheckpoint, loadPersistenceFinalization } from './persistence-finalization.ts'
import { reviewPersistenceSchemas } from './persistence-review.ts'
import type { PersistenceSchemaInventory } from './persistence-schema-model.ts'

const temporary: string[] = []
const OWNER = 'packages/util/plugin-market-index/src/types.ts'
const BASE = '2026-11-02-market-index-format-1'
const NEXT = '2026-11-03-market-index-change'
const extracted = new Map<string, { readonly inputs: string; readonly schema: PersistenceSchemaInventory }>()
afterEach(() => {
  extracted.clear()
  for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true })
})

function put(root: string, path: string, content: string): void {
  mkdirSync(dirname(join(root, path)), { recursive: true })
  writeFileSync(join(root, path), content)
}

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'market-persistence-'))
  temporary.push(root)
  put(root, 'tsconfig.base.json', JSON.stringify({ compilerOptions: {
    target: 'ES2024', module: 'NodeNext', moduleResolution: 'NodeNext', strict: true, types: [], lib: ['ES2024'],
  } }))
  put(root, OWNER, readFileSync(new URL('../packages/util/plugin-market-index/src/types.ts', import.meta.url), 'utf8'))
  put(root, 'prose.json', JSON.stringify({
    en: { summary: 'Isolated protocol fixture.', compatibility: 'Fixture author input; not a runtime compatibility claim.', verification: 'This fixture exercises declared schema history, not a released reader.' },
    zh: { summary: '隔离协议夹具。', compatibility: '夹具作者输入，不声称运行时兼容。', verification: '该夹具检查声明结构历史，不验证已发布读取器。' },
  }))
  return root
}

// The standalone fixture has two authored compiler inputs. Reuse only exact input
// bytes within its lifetime; every actual type/config edit forces a new program.
function current(root: string): PersistenceSchemaInventory {
  const inputs = JSON.stringify([readFileSync(join(root, OWNER), 'utf8'), readFileSync(join(root, 'tsconfig.base.json'), 'utf8')])
  const cached = extracted.get(root)
  if (cached?.inputs === inputs) return cached.schema
  const schema = extractPersistenceSchema(root)
  extracted.set(root, { inputs, schema })
  return schema
}

function command(root: string, args: readonly string[]): Record<string, unknown> {
  return JSON.parse(runPersistenceChanges([...args, '--json'], root, current)) as Record<string, unknown>
}

function baseline(root: string): void {
  expect(command(root, ['--baseline', BASE, '--prose', 'prose.json']).ok).toBe(true)
}

function change(root: string, from: string, to: string): void {
  const path = join(root, OWNER)
  const source = readFileSync(path, 'utf8')
  if (!source.includes(from)) throw new Error('fixture edit did not match the actual format owner')
  writeFileSync(path, source.replace(from, to))
}

function refresh(root: string): void {
  for (const artifact of persistenceCatalogArtifacts(root, current(root))) put(root, artifact.path, artifact.content)
}

describe('market persistence history', () => {
  it('extracts real transitive format types and creates exactly one current baseline', () => {
    const root = fixture()
    const schema = current(root)
    expect(schema.roots.map(item => item.key)).toEqual(['MarketIndex'])
    expect(schema.types.some(item => item.names.some(name => name.endsWith('#MarketSource')))).toBe(true)
    baseline(root)
    expect(verifyPersistenceChanges(root, schema).entries).toHaveLength(1)
    expect(command(root, ['--baseline', BASE, '--prose', 'prose.json']).ok).toBe(false)
  })

  it('refuses invented compatibility and verification prose', () => {
    const root = fixture()
    expect(command(root, ['--baseline', BASE]).ok).toBe(false)
  })

  it('reports a real reachable type transition and refuses its missing decision', () => {
    const root = fixture()
    baseline(root)
    const before = current(root)
    change(root, 'readonly publishTimestamp: number', 'readonly publishTimestamp: string')
    const after = current(root)
    const review = reviewPersistenceSchemas(before, after)
    expect(review.roots.map(item => item.root)).toEqual(['MarketIndex'])
    expect(review.roots[0]?.changes.some(item => item.requiresCompatibilityReview)).toBe(true)
    const missing = command(root, ['--record', NEXT, '--prose', 'prose.json'])
    expect(missing.ok).toBe(false)
    expect(missing.code).toBe('decision-required')
    expect(command(root, ['--record', NEXT, '--decision', 'same-version', '--prose', 'prose.json']).ok).toBe(true)
    expect(command(root, ['--check']).ok).toBe(true)
    expect(reviewPersistenceSchemas(before, after).roots).toHaveLength(1)
  })

  it('does not demand an acknowledgement for comments, readonly or reordered declarations', () => {
    const root = fixture()
    baseline(root)
    const before = current(root)
    change(root, 'readonly publishTimestamp: number', 'publishTimestamp: number')
    change(root, 'readonly format: 1\n  readonly title: LocalizedText', 'readonly title: LocalizedText\n  /** Reordered without changing the format. */\n  readonly format: 1')
    const after = current(root)
    expect(after.roots[0]?.digest).toBe(before.roots[0]?.digest)
    refresh(root)
    expect(command(root, ['--check']).ok).toBe(true)
    expect(command(root, ['--record', NEXT, '--prose', 'prose.json']).ok).toBe(false)
    expect(loadPersistenceHistory(root).entries).toHaveLength(1)
  })

  it('rejects wrong roots, missing predecessors and snapshot drift', () => {
    const root = fixture()
    baseline(root)
    const history = loadPersistenceHistory(root)
    const base = history.entries[0]
    if (base === undefined) throw new Error('missing fixture baseline')
    expect(() => parsePersistenceSnapshot({ ...base.snapshot, roots: base.snapshot.roots.map(item => ({ ...item, key: 'WrongRoot' })) })).toThrow('invalid schema root')
    change(root, 'readonly publishTimestamp: number', 'readonly publishTimestamp: string')
    expect(command(root, ['--record', NEXT, '--decision', 'same-version', '--prose', 'prose.json']).ok).toBe(true)
    const next = loadPersistenceHistory(root).entries.find(entry => entry.record.id === NEXT)
    if (next === undefined) throw new Error('missing fixture successor')
    expect(() => validatePersistenceHistory([base, { ...next, record: { ...next.record,
      changes: next.record.changes.map(item => ({ ...item, previous: '2026-01-01-missing' })) } }])).toThrow('missing predecessor')
    expect(() => validatePersistenceHistory([base, { ...next, snapshot: base.snapshot }])).toThrow('after digest mismatch')
  })

  it('requires this transition to increase the actual format discriminator for a bump', () => {
    const root = fixture()
    baseline(root)
    change(root, 'readonly publishTimestamp: number', 'readonly publishTimestamp: string')
    expect(command(root, ['--record', NEXT, '--decision', 'version-bump', '--prose', 'prose.json']).code).toBe('version-transition-required')
    change(root, 'readonly format: 1', 'readonly format: 2')
    expect(command(root, ['--record', NEXT, '--decision', 'same-version', '--prose', 'prose.json']).code).toBe('version-transition-required')
    expect(command(root, ['--record', NEXT, '--decision', 'version-bump', '--prose', 'prose.json']).ok).toBe(true)
  })

  it('locks accepted machine declarations and snapshots, but not unaccepted successors', () => {
    const root = fixture()
    baseline(root)
    const before = current(root)
    const history = loadPersistenceHistory(root)
    const checkpoint = createPersistenceFinalizationCheckpoint(history, before)
    put(root, 'docs/persistence-changes/finalized/v1.json', JSON.stringify(checkpoint))
    for (const suffix of ['', '.zh']) put(root, `docs/persistence-changes/README${suffix}.md`, '```yaml market-format-finalization\nlatestFinalizedVersion: 1\n```\n')
    expect(loadPersistenceFinalization(root, history)?.acceptedRecords.has(BASE)).toBe(true)
    put(root, 'docs/persistence-changes/finalized/v1.json', JSON.stringify({ ...checkpoint, marketFormatVersion: 2 }))
    expect(() => loadPersistenceFinalization(root, history)).toThrow('invalid persistence finalization checkpoint metadata')
    put(root, 'docs/persistence-changes/finalized/v1.json', JSON.stringify(checkpoint))
    expect(loadPersistenceFinalization(root, history)?.acceptedRecords.has(BASE)).toBe(true)
    change(root, 'readonly publishTimestamp: number', 'readonly publishTimestamp: string')
    expect(command(root, ['--record', NEXT, '--decision', 'same-version', '--prose', 'prose.json']).ok).toBe(true)
    expect(command(root, ['--update', BASE, '--decision', 'same-version', '--prose', 'prose.json']).code).toBe('finalized-record-update')
    const entry = history.entries[0]
    if (entry === undefined) throw new Error('missing fixture accepted record')
    expect(() => loadPersistenceFinalization(root, { entries: [{ ...entry, record: { ...entry.record,
      changes: entry.record.changes.map(item => ({ ...item, decision: 'version-bump' })) } }] })).toThrow('removed or changed')
    const schema = current(root)
    expect(() => loadPersistenceFinalization(root, { entries: [{ ...entry, snapshot: schema }] })).toThrow('removed or changed')
  })

  it('rejects missing schema-node fields with the root and node location', () => {
    expect(() => parsePersistenceSnapshot({ formatVersion: 1, roots: [{ key: 'MarketIndex', kind: 'header',
      digest: '0'.repeat(64), schema: { root: 0, nodes: [{ kind: 'array' }] } }], types: [] }))
      .toThrow('MarketIndex.nodes[0]: missing field element')
  })

  it('rejects an inventory whose roots field is not an array', () => {
    expect(() => parsePersistenceSnapshot({ formatVersion: 1, roots: 'invalid', types: [] }))
      .toThrow('schema roots must be an array')
  })

  it('rejects a recorded baseline flag with the wrong type and names its file', () => {
    const root = fixture()
    baseline(root)
    const path = join(root, `docs/persistence-changes/${BASE}.md`)
    const source = readFileSync(path, 'utf8')
    expect(source).toContain('baseline: true')
    writeFileSync(path, source.replace('baseline: true', 'baseline: "true"'))
    expect(() => loadPersistenceHistory(root)).toThrow(`${BASE}.md.baseline must be boolean`)
  })

  it('rejects non-string author prose and identifies its language and section', () => {
    expect(() => parsePersistenceProse({
      en: { summary: 17, compatibility: 'Not a compatibility claim.', verification: 'Not a runtime claim.' },
      zh: { summary: '夹具。', compatibility: '不声称兼容。', verification: '不声称运行时验证。' },
    })).toThrow('en.summary must be a non-empty string')
  })
})
