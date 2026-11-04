import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { removeFixtureSafely } from './test-fixture-cleanup.ts'

const templateRoot = resolve(import.meta.dirname, '..')
const fixtures: string[] = []

function checkIgnoredCorpus(count: number) {
  const root = mkdtempSync(join(tmpdir(), 'dsh-doc-opt-outs-'))
  fixtures.push(root)
  mkdirSync(join(root, 'scripts'))
  for (const file of ['doc-typecheck.ts', 'doc-typecheck-paths.ts', 'paired-markdown-derivatives.ts', 'markdown.ts', 'repo-files.ts']) {
    cpSync(join(templateRoot, 'scripts', file), join(root, 'scripts', file))
  }
  symlinkSync(join(templateRoot, 'node_modules'), join(root, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir')
  writeFileSync(join(root, 'package.json'), JSON.stringify({ type: 'module' }))
  writeFileSync(join(root, 'README.md'), '# Sketches\n\n' + Array.from({ length: count }, () => '```ts ignore-check\nmissingApi()\n```\n').join('\n'))
  const env = { ...process.env }
  delete env.NODE_OPTIONS
  delete env.NODE_PATH
  delete env.DSH_DOC_TYPECHECK_USE_BUILD_OUTPUT
  return spawnSync(process.execPath, ['--import', 'tsx', 'scripts/doc-typecheck.ts'], {
    cwd: root, env, encoding: 'utf8', timeout: 20_000,
  })
}

afterEach(() => {
  for (const root of fixtures.splice(0)) removeFixtureSafely(root)
})

describe('documentation opt-out threshold', () => {
  it('rejects four ignored fences even when no checked fence remains', () => {
    const result = checkIgnoredCorpus(4)
    expect(result.status, result.stdout + result.stderr).toBe(1)
    expect(result.stderr).toContain('too many blocks opt out of checking (4/4)')
  }, 30_000)

  it('preserves the minimum corpus size for sketch-only documentation', () => {
    const result = checkIgnoredCorpus(3)
    expect(result.status, result.stdout + result.stderr).toBe(0)
    expect(result.stdout).toContain('no ts code blocks to check')
  }, 30_000)
})
