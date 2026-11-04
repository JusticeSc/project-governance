import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { inspectWorkspaceLicenses } from './verify-package-licenses.ts'

const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function writeManifest(root: string, file: string, manifest: Record<string, unknown>): void {
  const path = join(root, file)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`)
}

function createWorkspace(license: unknown = 'MIT'): string {
  const root = mkdtempSync(join(tmpdir(), 'workspace-package-licenses-'))
  roots.push(root)
  writeManifest(root, 'package.json', {
    name: 'stockroom-root', private: true, license,
    // Deliberately different from pnpm: this legacy field must not own membership.
    workspaces: ['legacy/*'],
  })
  writeFileSync(join(root, 'pnpm-workspace.yaml'), [
    'packages:', '  - apps/*', '  - packages/*/*', '  - tools/*', '  - "!tools/excluded"',
  ].join('\n'))
  writeManifest(root, 'apps/console/package.json', { name: 'inventory-console', private: true, license: 'MIT' })
  return root
}

describe('workspace package license gate', () => {
  it.each(['@stockroom/stock-rules', 'inventory-tools', '@unrelated/renamed-library'])(
    'rejects wrong licenses regardless of a member name: %s', (name) => {
      const root = createWorkspace()
      writeManifest(root, 'packages/stock/rules-engine/package.json', { name, license: 'BSD-3-Clause' })
      expect(inspectWorkspaceLicenses(root)).toEqual({
        packageCount: 3,
        failures: [`packages/stock/rules-engine/package.json: ${name} must declare "license": "MIT"; found "BSD-3-Clause".`],
      })
      writeManifest(root, 'packages/stock/rules-engine/package.json', { name, license: 'MIT' })
      expect(inspectWorkspaceLicenses(root)).toEqual({ packageCount: 3, failures: [] })
    },
  )

  it('uses pnpm-only private members, honors exclusions, and ignores undeclared legacy workspaces', () => {
    const root = createWorkspace()
    writeManifest(root, 'tools/private/package.json', { name: 'private-tool', private: true, license: 'ISC' })
    writeManifest(root, 'tools/excluded/package.json', { name: 'excluded-tool', license: 'ISC' })
    writeManifest(root, 'legacy/old/package.json', { name: 'legacy-tool', license: 'ISC' })
    expect(inspectWorkspaceLicenses(root)).toEqual({
      packageCount: 3,
      failures: ['tools/private/package.json: private-tool must declare "license": "MIT"; found "ISC".'],
    })
    writeManifest(root, 'tools/private/package.json', { name: 'private-tool', private: true, license: 'MIT' })
    expect(inspectWorkspaceLicenses(root)).toEqual({ packageCount: 3, failures: [] })
  })

  it.each([undefined, '', '   '])('rejects missing or empty member licenses: %j', (license) => {
    const root = createWorkspace()
    writeManifest(root, 'packages/stock/rules/package.json', { name: '@stockroom/stock-rules', license })
    expect(inspectWorkspaceLicenses(root).failures).toEqual([
      expect.stringContaining('packages/stock/rules/package.json: @stockroom/stock-rules must declare "license": "MIT";'),
    ])
  })

  it.each([undefined, '', '   ', 42])('rejects missing or invalid root declarations explicitly: %j', (license) => {
    const root = createWorkspace()
    writeManifest(root, 'package.json', { name: 'stockroom-root', private: true, license })
    expect(inspectWorkspaceLicenses(root).failures).toEqual(['package.json: root must declare a non-empty license.'])
  })

  it('takes the expected shared license from the root rather than pinning MIT in the gate', () => {
    const root = createWorkspace('Apache-2.0')
    expect(inspectWorkspaceLicenses(root).failures).toEqual([
      'apps/console/package.json: inventory-console must declare "license": "Apache-2.0"; found "MIT".',
    ])
    writeManifest(root, 'apps/console/package.json', { name: 'inventory-console', license: 'Apache-2.0' })
    expect(inspectWorkspaceLicenses(root)).toEqual({ packageCount: 2, failures: [] })
  })
})
