import { spawnSync, type SpawnSyncReturns } from 'node:child_process'
import { mkdtempSync, readFileSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, onTestFinished } from 'vitest'
import { aggregateCheckArgs, referencedProjectsCompilerArgs } from './compile-referenced-projects.ts'
import { commandOutput as output, generatorFixture, put, runGenerator } from './generator-command-fixture.ts'
import { removeFixtureSafely } from './test-fixture-cleanup.ts'

function fixture(): string {
  const root = generatorFixture('host-references-command-', [
    'tsconfig.base.json', 'tsconfig.node.base.json', 'scripts/check-workspace-constraints.ts',
    'scripts/publication-payload.ts', 'scripts/gen-host-references.ts',
  ])
  put(root, 'tsconfig.host.json', [
    '{ "extends": "./tsconfig.node.base.json", "compilerOptions": { "noEmit": true }, "files": [],',
    '  "references": [',
    '    // BEGIN generated workspace references — pnpm run gen-host-references',
    '',
    '    // END generated workspace references',
    '  ]',
    '}',
    '',
  ].join('\n'))
  return root
}

function member(root: string, dir: string, value: number): void {
  put(root, `${dir}/package.json`, JSON.stringify({ name: `fixture-${value}`, type: 'module', private: true }))
  put(root, `${dir}/tsconfig.json`, JSON.stringify({
    extends: dir.startsWith('apps/') ? '../../tsconfig.base.json' : '../../../tsconfig.base.json',
    compilerOptions: { rootDir: 'src', outDir: 'lib/types' }, include: ['src'],
  }))
  put(root, `${dir}/src/index.ts`, `export const value = ${value}\n`)
}

function run(root: string, ...args: string[]): SpawnSyncReturns<string> {
  return runGenerator(root, 'gen-host-references', ...args)
}

function expectRepeatAndRemoval(root: string, path: string, original: string, registered: string): void {
  const repeated = run(root)
  expect(repeated.status, output(repeated)).toBe(0)
  expect(readFileSync(path, 'utf8')).toBe(registered)
  removeFixtureSafely(join(root, 'apps/console'))
  const removed = run(root)
  expect(removed.status, output(removed)).toBe(0)
  expect(readFileSync(path, 'utf8')).toBe(original)
}

describe('host project reference command', () => {
  it('registers an omitted library for the actual aggregate while preserving an authored app reference', () => {
    const root = fixture()
    member(root, 'apps/console', 7)
    member(root, 'packages/core/rules', 42)
    put(root, 'aggregate.ts', [
      "import { value as app } from './apps/console/src/index.ts'",
      "import { value as library } from './packages/core/rules/src/index.ts'",
      'export const result: number = app + library',
      '',
    ].join('\n'))
    const current = [
      '{ "extends": "./tsconfig.node.base.json", "compilerOptions": { "noEmit": true, "rewriteRelativeImportExtensions": false },',
      '  "files": ["aggregate.ts"], "references": [',
      '    // Keep this authored config spelling and comment.',
      '    { "path": "./apps/console/tsconfig.json" },',
      '    // BEGIN generated workspace references — pnpm run gen-host-references',
      '',
      '    // END generated workspace references',
      '  ] }',
      '',
    ].join('\n')
    put(root, 'tsconfig.host.json', current)
    expect(() => referencedProjectsCompilerArgs(root, 'host')).toThrow('workspace member missing')

    const generated = run(root)
    expect(generated.status, output(generated)).toBe(0)
    const next = readFileSync(join(root, 'tsconfig.host.json'), 'utf8')
    expect(next).toContain('    // Keep this authored config spelling and comment.\n    { "path": "./apps/console/tsconfig.json" },')
    const compiled = spawnSync(process.execPath, referencedProjectsCompilerArgs(root, 'host'), { cwd: root, encoding: 'utf8' })
    expect(compiled.status, output(compiled)).toBe(0)
    const aggregate = spawnSync(process.execPath, aggregateCheckArgs('host'), { cwd: root, encoding: 'utf8' })
    expect(aggregate.status, output(aggregate)).toBe(0)
    put(root, 'packages/core/rules/src/index.ts', 'export const value = "not numeric"\n')
    const rebuilt = spawnSync(process.execPath, referencedProjectsCompilerArgs(root, 'host'), { cwd: root, encoding: 'utf8' })
    expect(rebuilt.status, output(rebuilt)).toBe(0)
    const rejected = spawnSync(process.execPath, aggregateCheckArgs('host'), { cwd: root, encoding: 'utf8' })
    expect(rejected.status, output(rejected)).not.toBe(0)
    expect(output(rejected)).toContain('error TS2322')
  }, 120_000)

  it('refuses generated markers nested inside an authored reference object without changing it', () => {
    const root = fixture()
    put(root, 'manual/tsconfig.json', '{ "files": [] }\n')
    const current = [
      '{ "references": [',
      '  { "path": "./manual",',
      '    // BEGIN generated workspace references — pnpm run gen-host-references',
      '',
      '    // END generated workspace references',
      '  }',
      '] }',
      '',
    ].join('\n')
    put(root, 'tsconfig.host.json', current)
    const rejected = run(root)
    expect(rejected.status, output(rejected)).not.toBe(0)
    expect(readFileSync(join(root, 'tsconfig.host.json'), 'utf8')).toBe(current)
  })

  it('checks without writing, preserves authored references and removes only stale generated members', () => {
    const root = fixture()
    member(root, 'apps/console', 7)
    const path = join(root, 'tsconfig.host.json')
    const current = readFileSync(path, 'utf8').replace('  "references": [', '  "references": [\n    { "path": "./manual" },')
    put(root, 'manual/tsconfig.json', '{ "files": [] }\n')
    writeFileSync(path, current)
    const stale = run(root, '--check')
    expect(stale.status, output(stale)).toBe(1)
    expect(readFileSync(path, 'utf8')).toBe(current)
    const generated = run(root)
    expect(generated.status, output(generated)).toBe(0)
    const registered = readFileSync(path, 'utf8')
    const checked = run(root, '--check')
    expect(checked.status, output(checked)).toBe(0)
    expectRepeatAndRemoval(root, path, current, registered)
  }, 120_000)

  it.each([
    '{ "references": [] }\n',
    '{ "references": [], "other": [\n// BEGIN generated workspace references — pnpm run gen-host-references\n\n// END generated workspace references\n] }\n',
    '{ "references": [\n// END generated workspace references\n\n// BEGIN generated workspace references — pnpm run gen-host-references\n] }\n',
    '{ "references": [\n// BEGIN generated workspace references — pnpm run gen-host-references\n// BEGIN generated workspace references — pnpm run gen-host-references\n\n// END generated workspace references\n] }\n',
    '{ "references": [\n// BEGIN generated workspace references — pnpm run gen-host-references\n{ "path": 42 }\n// END generated workspace references\n] }\n',
  ])('refuses conflicting configuration without changing any bytes: %s', (current) => {
    const root = fixture()
    member(root, 'apps/console', 7)
    put(root, 'tsconfig.host.json', current)
    const rejected = run(root)
    expect(rejected.status, output(rejected)).not.toBe(0)
    expect(readFileSync(join(root, 'tsconfig.host.json'), 'utf8')).toBe(current)
  })

  it('rejects an undeclared real member instead of silently omitting its reference', () => {
    const root = fixture()
    member(root, 'apps/console', 7)
    put(root, 'pnpm-workspace.yaml', 'packages: ["packages/*/*"]\n')
    const path = join(root, 'tsconfig.host.json')
    const current = readFileSync(path, 'utf8')
    const rejected = run(root)
    expect(rejected.status, output(rejected)).not.toBe(0)
    expect(output(rejected)).toContain('not a declared workspace member')
    expect(readFileSync(path, 'utf8')).toBe(current)
  })

  it('does not partially register members when a member has no source config', () => {
    const root = fixture()
    member(root, 'apps/console', 7)
    member(root, 'packages/core/rules', 42)
    unlinkSync(join(root, 'packages/core/rules/tsconfig.json'))
    const path = join(root, 'tsconfig.host.json')
    const current = readFileSync(path, 'utf8')
    const rejected = run(root)
    expect(rejected.status, output(rejected)).not.toBe(0)
    expect(readFileSync(path, 'utf8')).toBe(current)
  })

  it('refuses a redirected host config without writing to its existing external target', () => {
    const root = fixture()
    const external = mkdtempSync(join(tmpdir(), 'host-references-outside-'))
    onTestFinished(() => { removeFixtureSafely(external) })
    member(root, 'apps/console', 7)
    const current = readFileSync(join(root, 'tsconfig.host.json'), 'utf8')
    const target = join(external, 'tsconfig.host.json')
    writeFileSync(target, current)
    unlinkSync(join(root, 'tsconfig.host.json'))
    symlinkSync(target, join(root, 'tsconfig.host.json'), 'file')
    const rejected = run(root)
    expect(rejected.status, output(rejected)).not.toBe(0)
    expect(output(rejected)).toContain('not a regular project config')
    expect(readFileSync(target, 'utf8')).toBe(current)
  })

  it('does not duplicate an authored directory-style reference to an existing member', () => {
    const root = fixture()
    member(root, 'apps/console', 7)
    const path = join(root, 'tsconfig.host.json')
    const current = readFileSync(path, 'utf8').replace('  "references": [', '  "references": [\n    { "path": "./apps/console" },')
    writeFileSync(path, current)
    const generated = run(root)
    expect(generated.status, output(generated)).toBe(0)
    expect(readFileSync(path, 'utf8')).toBe(current)
  })

  it('registers a member after an authored reference with no trailing comma', () => {
    const root = fixture()
    member(root, 'apps/console', 7)
    put(root, 'manual/tsconfig.json', '{ "compilerOptions": { "composite": true, "outDir": "lib", "skipLibCheck": true }, "files": ["index.ts"] }\n')
    put(root, 'manual/index.ts', 'export const original = 3\n')
    const path = join(root, 'tsconfig.host.json')
    const current = readFileSync(path, 'utf8').replace('  "references": [', '  "references": [\n    { "path": "./manual" }')
    writeFileSync(path, current)
    const generated = run(root)
    expect(generated.status, output(generated)).toBe(0)
    const next = readFileSync(path, 'utf8')
    expect(next).toContain('  "references": [\n    { "path": "./manual" }\n    // BEGIN generated workspace references')
    const compiled = spawnSync(process.execPath, referencedProjectsCompilerArgs(root, 'host'), { cwd: root, encoding: 'utf8' })
    expect(compiled.status, output(compiled)).toBe(0)
    const checked = run(root, '--check')
    expect(checked.status, output(checked)).toBe(0)
    const repeated = run(root)
    expect(repeated.status, output(repeated)).toBe(0)
    expect(readFileSync(path, 'utf8')).toBe(next)
    removeFixtureSafely(join(root, 'apps/console'))
    const removed = run(root)
    expect(removed.status, output(removed)).toBe(0)
    expect(readFileSync(path, 'utf8')).toBe(current)
  }, 120_000)

  it.each(['outside', 'inside'])('keeps a middle region maintainable with its empty separator %s the region', (ownership) => {
    const root = fixture()
    const path = join(root, 'tsconfig.host.json')
    const current = readFileSync(path, 'utf8')
      .replace('  "references": [', '  "references": [\n    { "path": "./manual-before" }')
      .replace('    // BEGIN generated workspace references — pnpm run gen-host-references\n',
        `    // BEGIN generated workspace references — pnpm run gen-host-references\n${ownership === 'inside' ? ',\n' : ''}`)
      .replace('    // END generated workspace references', `    // END generated workspace references\n    ${ownership === 'outside' ? ', ' : ''}{ "path": "./manual-after" }`)
    writeFileSync(path, current)
    const empty = run(root, '--check')
    expect(empty.status, output(empty)).toBe(0)
    member(root, 'apps/console', 7)
    const generated = run(root)
    expect(generated.status, output(generated)).toBe(0)
    const registered = readFileSync(path, 'utf8')
    expectRepeatAndRemoval(root, path, current, registered)
  }, 120_000)

  it.each(['first', 'middle'])('refuses unsafe external separators in a %s region before takeover and allows member exit after migration', (position) => {
    const root = fixture()
    member(root, 'apps/console', 7)
    put(root, 'manual/tsconfig.json', '{ "compilerOptions": { "composite": true, "outDir": "lib", "skipLibCheck": true }, "files": ["index.ts"] }\n')
    put(root, 'manual/index.ts', 'export const original = 3\n')
    if (position === 'middle') {
      put(root, 'manual-before/tsconfig.json', '{ "compilerOptions": { "composite": true, "outDir": "lib", "skipLibCheck": true }, "files": ["index.ts"] }\n')
      put(root, 'manual-before/index.ts', 'export const preceding = 2\n')
    }
    const path = join(root, 'tsconfig.host.json')
    const current = readFileSync(path, 'utf8')
      .replace('  "references": [', position === 'middle' ? '  "references": [\n    { "path": "./manual-before" },' : '  "references": [')
      .replace('    // BEGIN generated workspace references — pnpm run gen-host-references\n',
        '    // BEGIN generated workspace references — pnpm run gen-host-references\n    { "path": "./apps/console" }')
      .replace('    // END generated workspace references', '    // END generated workspace references\n    , { "path": "./manual" }')
    writeFileSync(path, current)
    const valid = spawnSync(process.execPath, referencedProjectsCompilerArgs(root, 'host'), { cwd: root, encoding: 'utf8' })
    expect(valid.status, output(valid)).toBe(0)
    const refused = run(root)
    expect(refused.status, output(refused)).toBe(1)
    expect(output(refused)).toContain('move the separator comma inside the generated region')
    expect(readFileSync(path, 'utf8')).toBe(current)
    const refusedCheck = run(root, '--check')
    expect(refusedCheck.status, output(refusedCheck)).toBe(1)
    expect(readFileSync(path, 'utf8')).toBe(current)

    const migrated = current.replace('{ "path": "./apps/console" }', '{ "path": "./apps/console" },')
      .replace('    , { "path": "./manual" }', '    { "path": "./manual" }')
    writeFileSync(path, migrated)
    const generated = run(root)
    expect(generated.status, output(generated)).toBe(0)
    expect(readFileSync(path, 'utf8')).toBe(migrated)
    const checked = run(root, '--check')
    expect(checked.status, output(checked)).toBe(0)
    removeFixtureSafely(join(root, 'apps/console'))
    const removed = run(root)
    expect(removed.status, output(removed)).toBe(0)
    expect(readFileSync(path, 'utf8')).toBe(migrated.replace('    { "path": "./apps/console" },', ''))
    const empty = run(root, '--check')
    expect(empty.status, output(empty)).toBe(0)
  }, 120_000)
})
