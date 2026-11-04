import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it, onTestFinished } from 'vitest'
import { exportKeyErrors, type ExportKeyPolicy } from './verify-package-export-keys.ts'

const POLICY: ExportKeyPolicy = {
  standardExports: ['.', './package.json'],
  additions: {
    'packages/a/lib': [{ key: './testing', owner: 'package-owner', reason: 'The test helper is exported for downstream fixtures.' }],
  },
}

describe('package export key policy', () => {
  it('accepts standard entries and a reviewed addition', () => {
    expect(exportKeyErrors('packages/a/lib', ['.', './package.json', './testing'], POLICY)).toEqual([])
  })

  it('rejects an unreviewed subpath and a reviewed key that left the manifest', () => {
    const errors = exportKeyErrors('packages/a/lib', ['.', './src/index.ts'], POLICY)
    expect(errors).toEqual(expect.arrayContaining([
      expect.stringContaining('packages/a/lib: export "./src/index.ts"'),
      expect.stringContaining('packages/a/lib: approved export "./testing"'),
    ]))
  })
})

describe('workspace export key CLI', () => {
  it('checks app and library keys, preserves apps without exports, and rejects stale app policy', () => {
    const root = resolve(import.meta.dirname, '..')
    const fixture = mkdtempSync(join(tmpdir(), 'workspace-export-keys-'))
    onTestFinished(() => { rmSync(fixture, { recursive: true, force: true }) })
    for (const directory of ['scripts', 'apps/service', 'packages/util/library']) {
      mkdirSync(join(fixture, directory), { recursive: true })
    }
    for (const file of ['verify-package-export-keys.ts', 'check-workspace-constraints.ts', 'manifest-json.ts', 'publication-payload.ts']) {
      copyFileSync(join(root, 'scripts', file), join(fixture, 'scripts', file))
    }
    symlinkSync(join(root, 'node_modules'), join(fixture, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir')
    const writeJson = (file: string, value: unknown) => {
      writeFileSync(join(fixture, file), JSON.stringify(value) + '\n')
    }
    const policy = { standardExports: ['.', './package.json'], additions: {} }
    const standard = { '.': './entry.js', './package.json': './package.json' }
    const app = { name: '@fixture/service', private: true, exports: standard }
    const library = { name: '@fixture/library', exports: standard }
    writeJson('package.json', { type: 'module', private: true })
    writeFileSync(join(fixture, 'pnpm-workspace.yaml'), 'packages:\n  - apps/*\n  - packages/*/*\n')
    writeJson('scripts/package-export-keys.manifest.json', policy)
    writeJson('packages/util/library/package.json', library)
    writeJson('apps/service/package.json', { name: app.name, private: true })
    for (const directory of ['apps/service', 'packages/util/library']) {
      writeFileSync(join(fixture, directory, 'entry.js'), 'export const value = 1\n')
    }
    const run = () => spawnSync(process.execPath, ['--import', 'tsx', join(fixture, 'scripts/verify-package-export-keys.ts')], {
      cwd: fixture, encoding: 'utf8', env: { ...process.env, NODE_OPTIONS: '' }, timeout: 10_000,
    })
    const noExports = run()
    expect(noExports.status, noExports.stderr).toBe(0)
    writeJson('apps/service/package.json', app)
    const appBefore = readFileSync(join(fixture, 'apps/service/package.json'))
    const standardApp = run()
    expect(standardApp.status, standardApp.stderr).toBe(0)

    writeJson('apps/service/package.json', { ...app, exports: { ...standard, './worker': './entry.js' } })
    const rejectedApp = run()
    expect(rejectedApp.status, rejectedApp.stderr).toBe(1)
    expect(rejectedApp.stderr).toContain('apps/service: export "./worker"')
    writeJson('scripts/package-export-keys.manifest.json', {
      ...policy, additions: { 'apps/service': [{ key: './worker', owner: 'service-owner', reason: 'Worker entry for the service consumer.' }] },
    })
    const registeredApp = run()
    expect(registeredApp.status, registeredApp.stderr).toBe(0)
    writeFileSync(join(fixture, 'apps/service/package.json'), appBefore)
    const staleApp = run()
    expect(staleApp.status, staleApp.stderr).toBe(1)
    expect(staleApp.stderr).toContain('apps/service: approved export "./worker" is absent')
    writeJson('scripts/package-export-keys.manifest.json', policy)

    const libraryBefore = readFileSync(join(fixture, 'packages/util/library/package.json'))
    writeJson('packages/util/library/package.json', { ...library, exports: { ...standard, './worker': './entry.js' } })
    const rejectedLibrary = run()
    expect(rejectedLibrary.status, rejectedLibrary.stderr).toBe(1)
    expect(rejectedLibrary.stderr).toContain('packages/util/library: export "./worker"')
    writeJson('packages/util/library/package.json', { name: library.name })
    const missingLibraryExports = run()
    expect(missingLibraryExports.status, missingLibraryExports.stderr).toBe(1)
    expect(missingLibraryExports.stderr).toContain('packages/util/library: package.json needs exports')
    writeFileSync(join(fixture, 'packages/util/library/package.json'), libraryBefore)
    const restored = run()
    expect(restored.status, restored.stderr).toBe(0)
    expect(readFileSync(join(fixture, 'apps/service/package.json'))).toEqual(appBefore)
    expect(readFileSync(join(fixture, 'packages/util/library/package.json'))).toEqual(libraryBefore)
  }, 60_000)
})
