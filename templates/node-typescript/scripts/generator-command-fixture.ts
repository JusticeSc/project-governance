import { spawnSync, type SpawnSyncReturns } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { onTestFinished } from 'vitest'
import { removeFixtureSafely } from './test-fixture-cleanup.ts'

const templateRoot = resolve(import.meta.dirname, '..')

/** Write a file in a test-owned fixture, creating its parent directories. */
export function put(root: string, path: string, contents: string): void {
  const filename = join(root, path)
  mkdirSync(dirname(filename), { recursive: true })
  writeFileSync(filename, contents)
}

/** Create an isolated command fixture with selected real inputs and shared dependencies. */
export function generatorFixture(prefix: string, paths: readonly string[]): string {
  const root = mkdtempSync(join(tmpdir(), prefix))
  onTestFinished(() => { removeFixtureSafely(root) })
  for (const path of paths) {
    const destination = join(root, path)
    mkdirSync(dirname(destination), { recursive: true })
    copyFileSync(join(templateRoot, path), destination)
  }
  put(root, 'package.json', '{ "name": "fixture-root", "type": "module", "private": true }\n')
  put(root, 'pnpm-workspace.yaml', 'packages: ["apps/*", "packages/*/*"]\n')
  symlinkSync(join(templateRoot, 'node_modules'), join(root, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir')
  return root
}

/** Execute a real TypeScript command in its test-owned workspace. */
export function runGenerator(root: string, script: string, ...args: string[]): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, ['--import', 'tsx', `scripts/${script}.ts`, ...args], {
    cwd: root, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1', NODE_OPTIONS: '' },
  })
}

/** Combine captured streams for actionable test failure diagnostics. */
export function commandOutput(result: SpawnSyncReturns<string>): string {
  return `${result.stdout}${result.stderr}`
}
