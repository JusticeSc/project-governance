import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { describe, expect, it, onTestFinished } from 'vitest'
import { removeFixtureSafely } from './test-fixture-cleanup.ts'

const templateRoot = resolve(import.meta.dirname, '..')
const vitestCli = resolve(templateRoot, 'node_modules/vitest/vitest.mjs')

function put(root: string, path: string, source: string): void {
  mkdirSync(dirname(join(root, path)), { recursive: true })
  writeFileSync(join(root, path), source)
}

function configure(root: string, include = 'packages/*/*/src/**/*.{ts,tsx}'): void {
  put(root, 'vitest.config.mjs', `export default {
  test: {
    include: ['checks.spec.ts'], maxWorkers: 1,
    coverage: {
      provider: 'v8', include: [${JSON.stringify(include)}],
      reporter: ['text', ${JSON.stringify(join(root, 'coverage-uncovered-locations.cjs'))}],
      thresholds: { perFile: true, statements: 100, branches: 100, functions: 100, lines: 100 }
    }
  }
}\n`)
}

function run(root: string) {
  return spawnSync(process.execPath, [vitestCli, 'run', '--coverage'], {
    cwd: root, encoding: 'utf8', env: { ...process.env, NODE_OPTIONS: '' },
  })
}

describe('package coverage command boundary', () => {
  it('reports absent runtime source, rejects an omitted real source map, and enforces actual per-file thresholds', () => {
    const root = mkdtempSync(join(tmpdir(), 'package-coverage-contract-'))
    onTestFinished(() => { removeFixtureSafely(root) })
    symlinkSync(join(templateRoot, 'node_modules'), join(root, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir')
    copyFileSync(join(templateRoot, 'scripts/coverage-uncovered-locations.cjs'), join(root, 'coverage-uncovered-locations.cjs'))
    put(root, 'package.json', '{"type":"module"}\n')
    put(root, 'checks.spec.ts', 'import { expect, it } from "vitest"\nit("runs its tooling check", () => { expect(true).toBe(true) })\n')
    configure(root)
    const empty = run(root)
    expect(empty.status, empty.stdout + empty.stderr).toBe(0)
    expect(empty.stdout + empty.stderr).toContain('no package runtime source files')

    put(root, 'packages/core/rules/src/index.ts', 'export function decide(value: boolean): number { return value ? 1 : 0 }\n')
    configure(root, 'omitted/**/*.ts')
    const omitted = run(root)
    expect(omitted.status, omitted.stdout + omitted.stderr).not.toBe(0)
    expect(omitted.stdout + omitted.stderr).toContain('missing from coverage report')

    configure(root)
    const uncovered = run(root)
    expect(uncovered.status, uncovered.stdout + uncovered.stderr).not.toBe(0)
    expect(uncovered.stdout + uncovered.stderr).toContain('100%')
    put(root, 'checks.spec.ts', 'import { expect, it } from "vitest"\nimport { decide } from "./packages/core/rules/src/index.ts"\nit("covers the real API branches", () => { expect(decide(true)).toBe(1); expect(decide(false)).toBe(0) })\n')
    const covered = run(root)
    expect(covered.status, covered.stdout + covered.stderr).toBe(0)
  }, 120_000)
})
