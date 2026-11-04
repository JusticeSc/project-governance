import { spawnSync, type SpawnSyncReturns } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { describe, expect, it, onTestFinished } from 'vitest'
import { copySelectedWorkspaceFixture, selectWorkspaceFixtureInputs } from './workspace-fixture.ts'
import { removeFixtureSafely } from './test-fixture-cleanup.ts'

const templateRoot = resolve(import.meta.dirname, '..')

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'empty-workspace-contract-'))
  onTestFinished(() => { removeFixtureSafely(root) })
  const inputs = selectWorkspaceFixtureInputs(templateRoot)
  copySelectedWorkspaceFixture({ ...inputs, paths: inputs.paths.filter(path => !path.startsWith('apps/') && !path.startsWith('packages/')
    && path !== 'persistence.config.json' && !path.startsWith('docs/persistence-changes/')) }, root)
  put(root, 'package.json', JSON.stringify({ name: 'fixture-root', version: '1.0.0', license: 'MIT', private: true, type: 'module' }))
  put(root, 'pnpm-workspace.yaml', 'packages: ["apps/*", "packages/*/*"]\n')
  put(root, 'aggregate.ts', 'export const tooling = true\n')
  put(root, 'tsconfig.host.json', JSON.stringify({ extends: './tsconfig.node.base.json', compilerOptions: { noEmit: true }, files: ['aggregate.ts'], references: [] }))
  put(root, 'scripts/project-policy.ts', [
    'export const applicationEntrypointPolicy = { rootLaunchers: {}, manifestBins: {}, executableSources: {} }',
    'export const generatedEnglishSources = []',
    'export const publicRepositoryBlobRoot = "https://github.com/fixture/project/blob/main/"',
  ].join('\n') + '\n')
  put(root, 'scripts/product-use.manifest.json', JSON.stringify({ roles: ['product', 'test-support'], entries: [], packages: {} }))
  put(root, 'scripts/executable-sources.manifest.json', '{"executableSources":{}}\n')
  put(root, 'scripts/cli-help.manifest.json', JSON.stringify({ slug: 'cli-help', english: 'help.md', chinese: 'help.zh.md', commands: [] }))
  for (const page of ['help.md', 'help.zh.md']) put(root, page, '<!-- BEGIN GENERATED cli-help -->\n\n<!-- END GENERATED cli-help -->\n')
  symlinkSync(join(templateRoot, 'node_modules'), join(root, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir')
  return root
}

function put(root: string, path: string, contents: string): void {
  const filename = join(root, path)
  mkdirSync(dirname(filename), { recursive: true })
  writeFileSync(filename, contents)
}

function run(root: string, script: string, ...args: string[]) {
  return spawnSync(process.execPath, ['--import', 'tsx', `scripts/${script}.ts`, ...args], {
    cwd: root, encoding: 'utf8', env: { ...process.env, NODE_OPTIONS: '' },
  })
}

function output(result: SpawnSyncReturns<string>): string {
  return `${result.stdout}${result.stderr}`
}

describe('empty workspace command boundaries', () => {
  it('distinguishes an empty workspace from undeclared source, and checks newly declared members', () => {
    const root = fixture()
    for (const [script, args] of [
      ['check-workspace-constraints', []], ['verify-product-use', []],
      ['verify-no-top-level-await', []], ['gen-cli-help', ['--check']],
      ['verify-node-next-types', []], ['persistence-changes', ['--check']], ['build', ['--scope', 'artifacts']],
    ] as const) {
      const result = run(root, script, ...args)
      expect(result.status, output(result)).toBe(0)
    }
    expect(output(run(root, 'build', '--scope', 'artifacts'))).toContain('no workspace artifacts')
    put(root, 'help.md', '<!-- BEGIN GENERATED cli-help -->\nStale launcher help.\n<!-- END GENERATED cli-help -->\n')
    const staleHelp = run(root, 'gen-cli-help', '--check')
    expect(staleHelp.status, output(staleHelp)).not.toBe(0)
    expect(output(staleHelp)).toContain('stale cli-help region')
    const synchronized = run(root, 'gen-cli-help')
    expect(synchronized.status, output(synchronized)).toBe(0)
    expect(readFileSync(join(root, 'help.md'), 'utf8')).not.toContain('Stale launcher help.')
    expect(run(root, 'gen-cli-help', '--check').status).toBe(0)

    put(root, 'apps/shell/src/index.ts', 'export const value = 1\n')
    const orphan = run(root, 'check-workspace-constraints')
    expect(orphan.status, output(orphan)).not.toBe(0)
    expect(output(orphan)).toContain('not a declared workspace member')

    const rootManifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string }
    put(root, 'apps/shell/package.json', JSON.stringify({ name: 'shell', version: rootManifest.version, private: true }))
    put(root, 'packages/core/rules/package.json', JSON.stringify({ name: '@fixture/rules', version: rootManifest.version }))
    put(root, 'packages/core/rules/src/index.ts', 'export const value: number = "invalid"\n')
    for (const directory of ['apps/shell', 'packages/core/rules']) {
      put(root, `${directory}/tsconfig.json`, JSON.stringify({
        compilerOptions: { composite: true, declaration: true, rootDir: 'src', outDir: 'lib/types', skipLibCheck: true, module: 'esnext', target: 'es2024' },
        include: ['src/**/*.ts'],
      }))
    }
    const use = run(root, 'verify-product-use')
    expect(use.status, output(use)).not.toBe(0)
    expect(output(use)).toContain('no product-use classification')
    const omitted = run(root, 'build', '--scope', 'artifacts')
    expect(omitted.status, output(omitted)).not.toBe(0)
    expect(output(omitted)).toContain('missing from')

    put(root, 'tsconfig.host.json', JSON.stringify({ extends: './tsconfig.node.base.json', compilerOptions: { noEmit: true }, files: [], references: [
      { path: './apps/shell' }, { path: './packages/core/rules' },
    ] }))
    const invalid = run(root, 'build', '--scope', 'artifacts')
    expect(invalid.status, output(invalid)).not.toBe(0)
    expect(output(invalid)).toContain('TS2322')
    put(root, 'packages/core/rules/src/index.ts', 'export const value: number = 1\n')
    put(root, 'packages/core/rules/package.json', JSON.stringify({
      name: '@fixture/rules', version: rootManifest.version, type: 'module', license: 'MIT',
      publishConfig: { access: 'public' }, repository: { type: 'git', url: 'https://github.com/fixture/project.git', directory: 'packages/core/rules' },
      main: 'lib/index.js', types: 'lib/types/index.d.ts',
      exports: { '.': { types: './lib/types/index.d.ts', default: './lib/index.js' } },
      files: ['lib/index.js', 'lib/types/**/*.d.ts'],
    }))
    put(root, 'apps/shell/package.json', JSON.stringify({
      name: 'shell', version: rootManifest.version, private: true, type: 'module',
      dependencies: { '@fixture/rules': 'workspace:*' },
    }))
    put(root, 'scripts/product-use.manifest.json', JSON.stringify({
      roles: ['product', 'test-support'], entries: ['apps/shell'],
      packages: { 'packages/core/rules': { role: 'product', reason: 'The application runtime depends on this library.' } },
    }))
    for (const script of ['check-workspace-constraints', 'verify-product-use', 'build']) {
      const accepted = run(root, script)
      expect(accepted.status, output(accepted)).toBe(0)
    }
    put(root, 'packages/core/rules/src/omitted.ts', 'export const omitted = 1\n')
    put(root, 'packages/core/rules/tsconfig.json', JSON.stringify({
      compilerOptions: { composite: true, declaration: true, rootDir: 'src', outDir: 'lib/types' }, files: ['src/index.ts'],
    }))
    const omittedSource = run(root, 'build', '--scope', 'typecheck')
    expect(omittedSource.status, output(omittedSource)).not.toBe(0)
    expect(output(omittedSource)).toContain('omitted by the compiler project graph')
    const unboundLint = run(root, 'run-oxlint', '.')
    expect(unboundLint.status, output(unboundLint)).not.toBe(0)
    expect(output(unboundLint)).toContain('not included by its nearest tsconfig')
  }, 120_000)
})
