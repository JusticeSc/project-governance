import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, onTestFinished } from 'vitest'
import { commandOutput as output, generatorFixture, put, runGenerator as run } from './generator-command-fixture.ts'
import { removeFixtureSafely } from './test-fixture-cleanup.ts'

function fixture(): string {
  return generatorFixture('test-tsconfig-command-', [
    '.oxlintrc.json', 'tsconfig.base.json', 'tsconfig.node.base.json',
    'scripts/check-workspace-constraints.ts', 'scripts/publication-payload.ts',
    'scripts/parallelism.ts', 'scripts/run-oxlint.ts', 'scripts/gen-test-tsconfig.ts',
  ])
}

function member(root: string, dir: string): void {
  put(root, `${dir}/package.json`, JSON.stringify({ name: 'fixture-member', type: 'module', private: true }))
  const extendsPath = dir.startsWith('apps/') ? '../../tsconfig.base.json' : '../../../tsconfig.base.json'
  put(root, `${dir}/tsconfig.json`, JSON.stringify({ extends: extendsPath, compilerOptions: { rootDir: 'src', outDir: 'lib/types' }, include: ['src'] }))
  put(root, `${dir}/src/index.ts`, 'export const answer = 42\n')
  put(root, `${dir}/tests/example.spec.ts`, 'export function check(): void {\n  Promise.resolve()\n}\n')
}

function expectTestConfigCompiles(root: string, dir: string): void {
  const result = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', `${dir}/tests/tsconfig.json`, '--pretty', 'false'], {
    cwd: root, encoding: 'utf8',
  })
  expect(result.status, output(result)).toBe(0)
}
describe('test TypeScript configuration command', () => {
  it.each(['apps/console', 'packages/example/rules'])('binds real tests for %s and keeps typed lint enforcement', (dir) => {
    const root = fixture()
    member(root, dir)
    put(root, `${dir}/tests/example.spec.ts`, "import { answer } from '../src/index.ts'\nexport function check(): void {\n  Promise.resolve(answer)\n}\n")

    const generated = run(root, 'gen-test-tsconfig', dir)
    expect(generated.status, output(generated)).toBe(0)
    const config = join(root, dir, 'tests/tsconfig.json')
    expect(existsSync(config)).toBe(true)
    const rejected = run(root, 'run-oxlint', `${dir}/tests/example.spec.ts`)
    expect(rejected.status, output(rejected)).toBe(1)
    expect(output(rejected)).toContain('typescript(no-floating-promises)')
    put(root, `${dir}/tests/example.spec.ts`, "import { answer } from '../src/index.ts'\nexport function check(): void {\n  void Promise.resolve(answer)\n}\n")
    const accepted = run(root, 'run-oxlint', `${dir}/tests/example.spec.ts`)
    expect(accepted.status, output(accepted)).toBe(0)
    const build = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', '-b', dir, '--pretty', 'false'], { cwd: root, encoding: 'utf8' })
    expect(build.status, output(build)).toBe(0)
    expectTestConfigCompiles(root, dir)
  }, 120_000)

  it('inherits custom member JSX settings for actual TSX tests', () => {
    const root = fixture()
    member(root, 'apps/console')
    put(root, 'apps/console/tsconfig.json', JSON.stringify({
      extends: '../../tsconfig.base.json', compilerOptions: { rootDir: 'src', outDir: 'lib/types', jsx: 'preserve' }, include: ['src'],
    }))
    put(root, 'apps/console/tests/view.spec.tsx', 'declare global { namespace JSX { interface IntrinsicElements { div: object } } }\nexport const node = <div />\n')
    const generated = run(root, 'gen-test-tsconfig', 'apps/console')
    expect(generated.status, output(generated)).toBe(0)
    expectTestConfigCompiles(root, 'apps/console')
  })

  it('type-checks a real test-only workspace dependency without adding it to source dependencies', () => {
    const root = fixture()
    member(root, 'apps/console')
    put(root, 'apps/console/package.json', JSON.stringify({
      name: 'fixture-member', type: 'module', private: true, devDependencies: { '@fixture/helper': 'workspace:*' },
    }))
    put(root, 'packages/example/helper/package.json', JSON.stringify({ name: '@fixture/helper', type: 'module' }))
    put(root, 'packages/example/helper/src/index.ts', 'export const value = 42\n')
    const basePath = join(root, 'tsconfig.base.json')
    const marker = '// BEGIN generated package aliases — pnpm run gen-tsconfig-paths\n'
    const base = readFileSync(basePath, 'utf8')
    expect(base).toContain(marker)
    writeFileSync(basePath, base.replace(marker, `${marker}      "@fixture/helper": ["./packages/example/helper/src"]\n`))
    put(root, 'apps/console/tests/dependency.spec.ts', 'import { value } from "@fixture/helper"\nexport const result = value\n')
    const generated = run(root, 'gen-test-tsconfig', 'apps/console')
    expect(generated.status, output(generated)).toBe(0)
    expectTestConfigCompiles(root, 'apps/console')
  })

  it('refuses an existing test config without changing its bytes', () => {
    const root = fixture()
    member(root, 'apps/console')
    const existing = '{ "custom": true }\n'
    put(root, 'apps/console/tests/tsconfig.json', existing)
    const result = run(root, 'gen-test-tsconfig', 'apps/console')
    expect(result.status, output(result)).not.toBe(0)
    expect(output(result)).toContain('already exists')
    expect(readFileSync(join(root, 'apps/console/tests/tsconfig.json'), 'utf8')).toBe(existing)
  })

  it('does not generate for a member excluded from the declared workspace', () => {
    const root = fixture()
    member(root, 'apps/console')
    put(root, 'pnpm-workspace.yaml', 'packages: ["packages/*/*"]\n')
    const result = run(root, 'gen-test-tsconfig', 'apps/console')
    expect(result.status, output(result)).not.toBe(0)
    expect(output(result)).toContain('not a declared workspace member')
    expect(existsSync(join(root, 'apps/console/tests/tsconfig.json'))).toBe(false)
  })

  it('does not create a test project before real TypeScript tests exist', () => {
    const root = fixture()
    put(root, 'apps/console/package.json', JSON.stringify({ name: 'fixture-member', private: true }))
    put(root, 'apps/console/tsconfig.json', JSON.stringify({ extends: '../../tsconfig.base.json', include: ['src'] }))
    put(root, 'apps/console/src/index.ts', 'export const answer = 42\n')
    mkdirSync(join(root, 'apps/console/tests'))
    const result = run(root, 'gen-test-tsconfig', 'apps/console')
    expect(result.status, output(result)).not.toBe(0)
    expect(output(result)).toContain('has no TypeScript tests')
    expect(existsSync(join(root, 'apps/console/tests/tsconfig.json'))).toBe(false)
  })

  it('rejects redirected test directories before writing outside the project', () => {
    const root = fixture()
    const external = mkdtempSync(join(tmpdir(), 'test-tsconfig-outside-'))
    onTestFinished(() => { removeFixtureSafely(external) })
    put(root, 'apps/console/package.json', JSON.stringify({ name: 'fixture-member', type: 'module', private: true }))
    put(root, 'apps/console/tsconfig.json', JSON.stringify({ extends: '../../tsconfig.base.json', include: ['src'] }))
    put(root, 'apps/console/src/index.ts', 'export const answer = 42\n')
    put(external, 'example.spec.ts', 'export const value = 1\n')
    symlinkSync(external, join(root, 'apps/console/tests'), process.platform === 'win32' ? 'junction' : 'dir')
    const result = run(root, 'gen-test-tsconfig', 'apps/console')
    expect(result.status, output(result)).not.toBe(0)
    expect(output(result)).toContain('not an unredirected directory')
    expect(existsSync(join(external, 'tsconfig.json'))).toBe(false)
  })
})
