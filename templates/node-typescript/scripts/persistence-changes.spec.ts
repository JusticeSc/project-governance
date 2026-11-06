/** Exercise real format extraction and the source-derived history protocol in isolated trees. */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { extractPersistenceSchema } from './persistence-schema.ts'
import { persistenceCatalogArtifacts, runPersistenceCatalog } from './gen-persistence-catalog.ts'
import { loadPersistenceHistory, parsePersistenceProse, parsePersistenceSnapshot, runPersistenceChanges, validatePersistenceHistory, verifyPersistenceChanges } from './persistence-changes.ts'
import { createPersistenceFinalizationCheckpoint, loadPersistenceFinalization } from './persistence-finalization.ts'
import { runPersistenceFinalization } from './persistence-finalize.ts'
import { reviewPersistenceSchemas } from './persistence-review.ts'
import type { PersistenceSchemaInventory } from './persistence-schema-model.ts'

const temporary: string[] = []
const OWNER = 'packages/data/archive/src/types.ts'
const BASE = '2026-11-02-archive-baseline'
const NEXT = '2026-11-03-archive-change'
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
  const root = mkdtempSync(join(tmpdir(), 'project-persistence-'))
  temporary.push(root)
  put(root, 'tsconfig.base.json', JSON.stringify({ compilerOptions: {
    target: 'ES2024', module: 'NodeNext', moduleResolution: 'NodeNext', strict: true, types: [], lib: ['ES2024'],
  } }))
  put(root, 'persistence.config.json', JSON.stringify({ roots: [{ id: 'archive', owner: OWNER, type: 'Archive', versionField: 'schemaVersion' }] }))
  put(root, OWNER, [
    'export interface Label { readonly en: string; readonly zh: string }',
    'export interface ArchiveEntry { readonly savedAt: number; readonly label: Label }',
    'export type Storage =',
    '  | { readonly kind: "local"; readonly path: string }',
    '  | { readonly kind: "remote"; readonly url: string }',
    'export interface Archive {',
    '  readonly schemaVersion: 1',
    '  readonly title: Label',
    '  readonly entries: readonly ArchiveEntry[]',
    '  readonly storage: Storage',
    '}',
    'export interface Settings { readonly enabled: boolean }',
    '',
  ].join('\n'))
  put(root, 'prose.json', JSON.stringify({
    en: { summary: 'Isolated protocol fixture.', compatibility: 'Fixture author input; not a runtime compatibility claim.', verification: 'This fixture exercises declared schema history, not a released reader.' },
    zh: { summary: '隔离协议夹具。', compatibility: '夹具作者输入，不声称运行时兼容。', verification: '该夹具检查声明结构历史，不验证已发布读取器。' },
  }))
  return root
}

// These fixtures keep all reachable declarations in their configured owner files.
function current(root: string): PersistenceSchemaInventory {
  const configuration = readFileSync(join(root, 'persistence.config.json'), 'utf8')
  const parsed: unknown = JSON.parse(configuration)
  if (parsed === null || typeof parsed !== 'object' || !('roots' in parsed) || !Array.isArray(parsed.roots)) throw new Error('invalid fixture configuration')
  const sources = parsed.roots.map((item: unknown) => {
    if (item === null || typeof item !== 'object' || !('owner' in item) || typeof item.owner !== 'string') throw new Error('invalid fixture owner')
    return readFileSync(join(root, item.owner), 'utf8')
  })
  const inputs = JSON.stringify([configuration, readFileSync(join(root, 'tsconfig.base.json'), 'utf8'), ...sources])
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

function fixtureWithVersionedAndUnversionedRoots(): string {
  const root = fixture()
  put(root, 'persistence.config.json', JSON.stringify({ roots: [
    { id: 'archive', owner: OWNER, type: 'Archive', versionField: 'schemaVersion' },
    { id: 'settings', owner: OWNER, type: 'Settings' },
  ] }))
  baseline(root)
  return root
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

describe('declared project persistence history', () => {
  it('extracts real transitive format types and creates exactly one current baseline', () => {
    const root = fixture()
    const schema = current(root)
    expect(schema.roots.map(item => item.key)).toEqual(['archive'])
    expect(schema.types.some(item => item.names.some(name => name.endsWith('#ArchiveEntry')))).toBe(true)
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
    change(root, 'readonly savedAt: number', 'readonly savedAt: string')
    const after = current(root)
    const review = reviewPersistenceSchemas(before, after)
    expect(review.roots.map(item => item.root)).toEqual(['archive'])
    expect(review.roots[0]?.changes.some(item => item.requiresCompatibilityReview)).toBe(true)
    const missing = command(root, ['--record', NEXT, '--prose', 'prose.json'])
    expect(missing.ok).toBe(false)
    expect(missing.code).toBe('decision-required')
    expect(command(root, ['--record', NEXT, '--decision', 'archive=same-version', '--prose', 'prose.json']).ok).toBe(true)
    expect(command(root, ['--check']).ok).toBe(true)
    expect(reviewPersistenceSchemas(before, after).roots).toHaveLength(1)
  })

  it('reports added discriminant kinds for an ordinary persisted union', () => {
    const root = fixture()
    baseline(root)
    const before = current(root)
    change(root, '{ readonly kind: "remote"; readonly url: string }',
      '{ readonly kind: "remote"; readonly url: string } | { readonly kind: "registry"; readonly name: string }')
    const after = current(root)
    const review = reviewPersistenceSchemas(before, after)
    expect(review.roots[0]?.changes).toContainEqual(expect.objectContaining({
      kind: 'union-variants-changed', requiresCompatibilityReview: true,
    }))
    expect(review.evidence.some(evidence => evidence.kind === 'kind-added'
      && evidence.locations.some(location => location.root === 'archive'
        && location.path === 'archive.storage[kind="registry"]'))).toBe(true)
  })

  it('requires review when an ordinary persisted union variant changes shape', () => {
    const root = fixture()
    baseline(root)
    const before = current(root)
    change(root, 'readonly url: string', 'readonly endpoint: string')
    const after = current(root)
    const review = reviewPersistenceSchemas(before, after)
    expect(review.roots[0]?.changes).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'property-removed', path: 'archive.storage.url', requiresCompatibilityReview: true }),
      expect.objectContaining({ kind: 'required-property-added', path: 'archive.storage.endpoint', requiresCompatibilityReview: true }),
    ]))
  })

  it('does not demand an acknowledgement for comments, readonly or reordered declarations', () => {
    const root = fixture()
    baseline(root)
    const before = current(root)
    change(root, 'readonly savedAt: number', 'savedAt: number')
    change(root, 'readonly schemaVersion: 1\n  readonly title: Label', 'readonly title: Label\n  /** Reordered without changing the schema. */\n  readonly schemaVersion: 1')
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
    change(root, 'readonly savedAt: number', 'readonly savedAt: string')
    expect(command(root, ['--record', NEXT, '--decision', 'archive=same-version', '--prose', 'prose.json']).ok).toBe(true)
    const next = loadPersistenceHistory(root).entries.find(entry => entry.record.id === NEXT)
    if (next === undefined) throw new Error('missing fixture successor')
    expect(() => validatePersistenceHistory([base, { ...next, record: { ...next.record,
      changes: next.record.changes.map(item => ({ ...item, previous: '2026-01-01-missing' })) } }])).toThrow('missing predecessor')
    expect(() => validatePersistenceHistory([base, { ...next, snapshot: base.snapshot }])).toThrow('after digest mismatch')
  })

  it('requires this transition to increase the actual format discriminator for a bump', () => {
    const root = fixture()
    baseline(root)
    change(root, 'readonly savedAt: number', 'readonly savedAt: string')
    expect(command(root, ['--record', NEXT, '--decision', 'archive=version-bump', '--prose', 'prose.json']).code).toBe('version-transition-required')
    change(root, 'readonly schemaVersion: 1', 'readonly schemaVersion: 2')
    expect(command(root, ['--record', NEXT, '--decision', 'archive=same-version', '--prose', 'prose.json']).code).toBe('version-transition-required')
    expect(command(root, ['--record', NEXT, '--decision', 'archive=version-bump', '--prose', 'prose.json']).ok).toBe(true)
  })

  it('locks accepted machine declarations and snapshots, but not unaccepted successors', () => {
    const root = fixture()
    baseline(root)
    const before = current(root)
    const history = loadPersistenceHistory(root)
    const checkpoint = createPersistenceFinalizationCheckpoint(history, before, 'archive')
    const path = `docs/persistence-changes/finalized/archive/${BASE}.json`
    put(root, path, JSON.stringify(checkpoint))
    for (const suffix of ['', '.zh']) put(root, `docs/persistence-changes/README${suffix}.md`, `\`\`\`yaml persistence-finalization\nroots:\n  archive: ${BASE}\n\`\`\`\n`)
    expect(loadPersistenceFinalization(root, history)?.acceptedRecords.has(BASE)).toBe(true)
    put(root, path, JSON.stringify({ ...checkpoint, recordId: NEXT }))
    expect(() => loadPersistenceFinalization(root, history)).toThrow('invalid checkpoint metadata')
    put(root, path, JSON.stringify(checkpoint))
    expect(loadPersistenceFinalization(root, history)?.acceptedRecords.has(BASE)).toBe(true)
    change(root, 'readonly savedAt: number', 'readonly savedAt: string')
    expect(command(root, ['--record', NEXT, '--decision', 'archive=same-version', '--prose', 'prose.json']).ok).toBe(true)
    expect(command(root, ['--update', BASE, '--decision', 'archive=same-version', '--prose', 'prose.json']).code).toBe('finalized-record-update')
    const entry = history.entries[0]
    if (entry === undefined) throw new Error('missing fixture accepted record')
    expect(() => loadPersistenceFinalization(root, { entries: [{ ...entry, record: { ...entry.record,
      changes: entry.record.changes.map(item => ({ ...item, decision: 'version-bump' })) } }] })).toThrow('removed or changed')
    const schema = current(root)
    expect(() => loadPersistenceFinalization(root, { entries: [{ ...entry, snapshot: schema }] })).toThrow('removed or changed')
  })

  it('rejects missing schema-node fields with the root and node location', () => {
    expect(() => parsePersistenceSnapshot({ formatVersion: 1, roots: [{ key: 'archive', kind: 'header',
      digest: '0'.repeat(64), schema: { root: 0, nodes: [{ kind: 'array' }] } }], types: [] }))
      .toThrow('archive.nodes[0]: missing field element')
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

  it('reports no declaration without fabricating baseline or catalog files', () => {
    const root = fixture()
    rmSync(join(root, 'persistence.config.json'))
    expect(extractPersistenceSchema(root).roots).toEqual([])
    expect(JSON.parse(runPersistenceChanges(['--check', '--json'], root))).toMatchObject({ ok: true, message: 'No persistence roots declared.', files: [] })
    expect(runPersistenceCatalog(['--root', root, '--check'])).toBe('No persistence roots declared.')
    expect(existsSync(join(root, 'docs/persistence-changes'))).toBe(false)
  })

  it('requires actual history for a declaration and a declaration for existing history', () => {
    const root = fixture()
    expect(command(root, ['--check'])).toMatchObject({ ok: false })
    baseline(root)
    rmSync(join(root, 'persistence.config.json'))
    expect(JSON.parse(runPersistenceChanges(['--check', '--json'], root))).toMatchObject({ ok: false })
    expect(() => runPersistenceCatalog(['--root', root, '--check'])).toThrow('history exists')
  })

  it.each([
    {}, { roots: [{}] },
    { roots: [{ id: 'archive', owner: OWNER }] },
    { roots: [{ id: 'archive', owner: '../outside.ts', type: 'Archive' }] },
    { roots: [{ id: 'archive', owner: OWNER, type: 'Archive', versionField: '' }] },
    { roots: [{ id: 'archive', owner: OWNER, type: 'Archive' }, { id: 'archive', owner: OWNER, type: 'Settings' }] },
    { roots: [{ id: 'archive', owner: OWNER, type: 'Archive' }, { id: 'other', owner: OWNER, type: 'Archive' }] },
  ])('rejects malformed or duplicate declarations %#', (config) => {
    const root = fixture()
    put(root, 'persistence.config.json', JSON.stringify(config))
    expect(() => extractPersistenceSchema(root)).toThrow()
    expect(existsSync(join(root, 'docs/persistence-changes'))).toBe(false)
  })

  it('rejects missing owners, missing exported types and invalid reachable types', () => {
    const missing = fixture()
    rmSync(join(missing, OWNER))
    expect(() => extractPersistenceSchema(missing)).toThrow('missing declared owner')
    const unexported = fixture()
    change(unexported, 'export interface Archive {', 'interface Archive {')
    expect(() => extractPersistenceSchema(unexported)).toThrow('expected one exported Archive')
    const invalid = fixture()
    change(invalid, 'readonly savedAt: number', 'readonly savedAt: MissingType')
    expect(() => extractPersistenceSchema(invalid)).toThrow('MissingType')
  })

  it.each(['number', '-1', '1 | 2'])('rejects invalid declared version type %s', (type) => {
    const root = fixture()
    change(root, 'readonly schemaVersion: 1', `readonly schemaVersion: ${type}`)
    expect(() => extractPersistenceSchema(root)).toThrow('required non-negative integer literal')
  })

  it('requires separate decisions and independent version transitions for multiple roots', () => {
    const root = fixtureWithVersionedAndUnversionedRoots()
    change(root, 'readonly schemaVersion: 1', 'readonly schemaVersion: 2')
    change(root, 'readonly enabled: boolean', 'readonly enabled: string')
    expect(command(root, ['--record', NEXT, '--decision', 'archive=version-bump', '--prose', 'prose.json']).code).toBe('decision-required')
    expect(command(root, ['--record', NEXT, '--decision', 'archive=version-bump', '--decision', 'settings=version-bump', '--prose', 'prose.json']).code).toBe('version-transition-required')
    expect(command(root, ['--record', NEXT, '--decision', 'archive=version-bump', '--decision', 'settings=same-version', '--prose', 'prose.json']).ok).toBe(true)
    expect(command(root, ['--check']).ok).toBe(true)
    const history = loadPersistenceHistory(root)
    expect(history.tips.get('archive')?.root?.versionField).toBe('schemaVersion')
    expect(history.tips.get('settings')?.root?.versionField).toBeUndefined()
  })

  it('does not infer a version promise from a property named format', () => {
    const root = fixture()
    put(root, 'persistence.config.json', JSON.stringify({ roots: [{ id: 'settings', owner: OWNER, type: 'Settings' }] }))
    change(root, 'readonly enabled: boolean', 'readonly enabled: boolean; readonly format: 1')
    baseline(root)
    change(root, 'readonly format: 1', 'readonly format: 2')
    expect(command(root, ['--record', NEXT, '--prose', 'prose.json']).code).toBe('decision-required')
    expect(command(root, ['--record', NEXT, '--decision', 'settings=version-bump', '--prose', 'prose.json']).code).toBe('version-transition-required')
    expect(command(root, ['--record', NEXT, '--decision', 'settings=same-version', '--prose', 'prose.json']).ok).toBe(true)
  })

  it('freezes versioned and unversioned roots without sharing a global version', () => {
    const root = fixtureWithVersionedAndUnversionedRoots()
    const history = loadPersistenceHistory(root)
    const schema = current(root)
    const archive = createPersistenceFinalizationCheckpoint(history, schema, 'archive')
    const settings = createPersistenceFinalizationCheckpoint(history, schema, 'settings')
    expect(archive.version).toBe(1)
    expect(settings.version).toBeNull()
    for (const checkpoint of [archive, settings]) put(root, `docs/persistence-changes/finalized/${checkpoint.root}/${BASE}.json`, JSON.stringify(checkpoint))
    for (const suffix of ['', '.zh']) put(root, `docs/persistence-changes/README${suffix}.md`, `\`\`\`yaml persistence-finalization\nroots:\n  archive: ${BASE}\n  settings: ${BASE}\n\`\`\`\n`)
    const accepted = loadPersistenceFinalization(root, history)
    expect([...accepted?.versions ?? []]).toEqual([['archive', 1]])
    expect(accepted?.acceptedRecords.has(BASE)).toBe(true)
    change(root, 'readonly enabled: boolean', 'readonly enabled: string')
    expect(command(root, ['--record', NEXT, '--decision', 'settings=same-version', '--prose', 'prose.json']).ok).toBe(true)
    expect(command(root, ['--check']).ok).toBe(true)
    expect(runPersistenceFinalization(['--root', root, '--id', 'settings'])).toContain(`${NEXT}.json`)
    expect(() => loadPersistenceFinalization(root, loadPersistenceHistory(root))).toThrow('latest status omits a retained checkpoint')
    for (const suffix of ['', '.zh']) put(root, `docs/persistence-changes/README${suffix}.md`, `\`\`\`yaml persistence-finalization\nroots:\n  archive: ${BASE}\n  settings: ${NEXT}\n\`\`\`\n`)
    expect(loadPersistenceFinalization(root, loadPersistenceHistory(root))?.acceptedRecords.has(NEXT)).toBe(true)
    expect(() => runPersistenceFinalization(['--root', root, '--id', 'settings'])).toThrow('refusing to replace accepted checkpoint')
    put(root, `docs/persistence-changes/finalized/settings/${BASE}.json`, JSON.stringify({ ...settings, version: 1 }))
    expect(() => loadPersistenceFinalization(root, loadPersistenceHistory(root))).toThrow('finalized root does not match accepted history')
  })

  it('retains the last root deletion in history rather than treating empty config as a bypass', () => {
    const root = fixture()
    baseline(root)
    put(root, 'persistence.config.json', JSON.stringify({ roots: [] }))
    expect(command(root, ['--check']).ok).toBe(false)
    expect(command(root, ['--record', NEXT, '--prose', 'prose.json']).code).toBe('decision-required')
    expect(command(root, ['--record', NEXT, '--decision', 'archive=same-version', '--prose', 'prose.json']).ok).toBe(true)
    expect(command(root, ['--check']).ok).toBe(true)
    expect(loadPersistenceHistory(root).tips.get('archive')?.root).toBeNull()
    const empty = fixture()
    put(empty, 'persistence.config.json', JSON.stringify({ roots: [] }))
    expect(command(empty, ['--check']).ok).toBe(false)
    expect(command(empty, ['--baseline', BASE, '--prose', 'prose.json']).ok).toBe(false)
  })

  it('rejects ambiguous, missing and surplus root decisions', () => {
    const root = fixture()
    baseline(root)
    change(root, 'readonly savedAt: number', 'readonly savedAt: string')
    for (const decisions of [
      ['--decision', 'same-version'],
      ['--decision', 'archive=same-version', '--decision', 'archive=same-version'],
      ['--decision', 'archive=same-version', '--decision', 'other=same-version'],
    ]) expect(command(root, ['--record', NEXT, ...decisions, '--prose', 'prose.json']).ok).toBe(false)
    expect(command(root, ['--record', NEXT, '--decision', 'archive=same-version', '--prose', 'prose.json']).ok).toBe(true)
  })

  it('cannot erase a version declaration to bypass an existing history promise', () => {
    const root = fixture()
    baseline(root)
    put(root, 'persistence.config.json', JSON.stringify({ roots: [{ id: 'archive', owner: OWNER, type: 'Archive' }] }))
    const result = command(root, ['--record', NEXT, '--decision', 'archive=same-version', '--prose', 'prose.json'])
    expect(result.ok).toBe(false)
    expect(result.message).toContain('cannot change its declared versionField')
  })

  it('tracks a real application-owned persistence type and rejects a missing named type', () => {
    const root = fixture()
    const owner = 'apps/journal/src/state.ts'
    put(root, owner, 'export interface State { readonly entries: readonly Entry[] }\nexport interface Entry { readonly content: string }\n')
    put(root, 'persistence.config.json', JSON.stringify({ roots: [{ id: 'app-state', owner, type: 'State' }] }))
    const schema = current(root)
    expect(schema.roots.map(item => item.key)).toEqual(['app-state'])
    expect(schema.types.some(item => item.names.some(name => name.endsWith('#Entry')))).toBe(true)
    baseline(root)
    expect(command(root, ['--check']).ok).toBe(true)
    put(root, 'persistence.config.json', JSON.stringify({ roots: [{ id: 'app-state', owner, type: 'Missing' }] }))
    expect(() => extractPersistenceSchema(root)).toThrow('expected one exported Missing')
  })

  it('accepts a project-root alias but rejects an owner redirected outside the project', () => {
    const root = fixture()
    const external = fixture()
    expect(extractPersistenceSchema(external).roots).toHaveLength(1)
    const container = mkdtempSync(join(tmpdir(), 'persistence-alias-'))
    temporary.push(container)
    const alias = join(container, 'project')
    symlinkSync(root, alias, 'junction')
    expect(extractPersistenceSchema(alias).roots).toHaveLength(1)
    const sourceDirectory = dirname(join(root, OWNER))
    rmSync(sourceDirectory, { recursive: true })
    symlinkSync(dirname(join(external, OWNER)), sourceDirectory, 'junction')
    expect(() => extractPersistenceSchema(root)).toThrow('resolves outside project')
    expect(JSON.parse(runPersistenceChanges(['--check', '--json'], root))).toMatchObject({ ok: false })
  })
})
