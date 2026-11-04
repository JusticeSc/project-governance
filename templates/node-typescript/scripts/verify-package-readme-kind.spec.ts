import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { removeFixtureSafely } from './test-fixture-cleanup.ts'

const repository = resolve(import.meta.dirname, '..')
const roots: string[] = []
const copiedFiles = [
  'scripts/verify-package-readme-kind.ts',
  'scripts/check-workspace-constraints.ts',
  'scripts/publication-payload.ts',
  'scripts/manifest-json.ts',
]

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'dsh-package-readme-kind-'))
  roots.push(root)
  for (const file of copiedFiles) {
    const destination = join(root, file)
    mkdirSync(dirname(destination), { recursive: true })
    copyFileSync(join(repository, file), destination)
  }
  writeFileSync(join(root, 'package.json'), '{"name":"fixture-root","private":true}')
  writeFileSync(join(root, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*/*\n')
  writeFileSync(join(root, 'scripts/package-readme-policy.manifest.json'), JSON.stringify({
    allowedKinds: ['package-group', 'package-library'], groupKind: 'package-group', defaultPackageKind: 'package-library', packageKinds: {},
  }))
  for (const directory of ['packages', 'packages/util', 'packages/util/probe']) {
    mkdirSync(join(root, directory), { recursive: true })
    const kind = directory === 'packages/util/probe' ? 'package-library' : 'package-group'
    const frontmatter = `---\nkind: "${kind}"\ndescription: "Fixture"\n---\n\n`
    writeFileSync(join(root, directory, 'README.md'), `${frontmatter}## Summary\n\n## Table of Contents\n\n## Dev Note\n`)
    writeFileSync(join(root, directory, 'README.zh.md'), `${frontmatter}## 摘要\n\n## 目录\n\n## 开发记录\n`)
  }
  writeFileSync(join(root, 'packages/util/probe/package.json'), '{"name":"fixture-library","version":"1.0.0"}')
  symlinkSync(join(repository, 'node_modules'), join(root, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir')
  return root
}

function runChecker(root: string) {
  return spawnSync(process.execPath, ['--import', 'tsx/esm', 'scripts/verify-package-readme-kind.ts'], {
    cwd: root, encoding: 'utf8', timeout: 20_000,
  })
}

afterEach(() => {
  for (const root of roots.splice(0)) removeFixtureSafely(root)
})

describe('package group README kind gate', () => {
  it('accepts English and Chinese package group and package READMEs', () => {
    const result = runChecker(fixture())
    expect(result.status, result.stderr).toBe(0)
    expect(result.stdout).toContain('verify-package-readme-kind:')
    expect(result.stdout).toContain('in both languages')
  }, 30_000)

  it.each(['packages/README.zh.md', 'packages/util/README.zh.md'])(
    'rejects an invalid kind in %s', (file) => {
      const root = fixture()
      const baseline = runChecker(root)
      expect(baseline.status, baseline.stderr).toBe(0)
      expect(baseline.stdout).toContain('in both languages')

      const path = join(root, file)
      const original = readFileSync(path, 'utf8')
      expect(original).toContain('kind: "package-group"')
      writeFileSync(path, original.replace('kind: "package-group"', 'kind: "package-library"'))
      const result = runChecker(root)
      expect(result.status, result.stderr).toBe(1)
      expect(result.stderr).toContain(file)
      expect(result.stderr).toContain('kind')
    }, 60_000,
  )

  it.each(['packages/README.zh.md', 'packages/util/README.zh.md'])(
    'rejects a missing Chinese package group README %s', (file) => {
      const root = fixture()
      const baseline = runChecker(root)
      expect(baseline.status, baseline.stderr).toBe(0)
      expect(baseline.stdout).toContain('in both languages')

      rmSync(join(root, file))
      const result = runChecker(root)
      expect(result.status, result.stderr).toBe(1)
      expect(result.stderr).toContain(file)
    }, 60_000,
  )
})
