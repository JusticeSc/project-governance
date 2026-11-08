import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  collectHostDependencyExportPolicyViolations, collectPackageDependencyViolations, collectRootTypePackageViolations,
  collectRuntimeSourceExportUses, discoverPackageDependencyScope, expectedPackageDependencies, fixPackageDependencies,
  readHostBuildEntries, readPackageDependencyState, repairPackageDependencyManifest,
  type PackageDependencyFacts, type PackageDependencyState,
} from './verify-package-dependencies.ts'
import { collectRuntimeLocalSourceSpecifiers, collectRuntimeSourcePackageUses, collectSourcePackageUses } from './source-package-uses.ts'
import type { PackageDependencyPolicy } from './package-dependency-policy.ts'

const roots: string[] = []
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }) })
const policy: PackageDependencyPolicy = {
  configurationOnlyDevDependencies: {}, safeHostDependencyExports: {}, peerRequiredHostExports: {},
}
function fixture(files: Record<string, string | object>): string {
  const root = mkdtempSync(join(tmpdir(), 'node-dependency-policy-'))
  roots.push(root)
  for (const [file, value] of Object.entries(files)) {
    mkdirSync(dirname(join(root, file)), { recursive: true })
    writeFileSync(join(root, file), typeof value === 'string' ? value : JSON.stringify(value))
  }
  return root
}
async function state(dependencies: Record<string, string> = {}): Promise<{ root: string; value: PackageDependencyState }> {
  const root = fixture({
    'apps/tool/package.json': { name: '@f/tool', dependencies },
    'apps/tool/src/bin.ts': "import { value } from '@f/library'; import 'external'; export { value }\n",
    'packages/g/library/package.json': { name: '@f/library' },
    'packages/g/library/src/index.ts': 'export const value = 1\n',
  })
  return { root, value: await readPackageDependencyState(root, {
    ...policy, safeHostDependencyExports: { '@f/library': ['value'] },
  }) }
}

describe('Node source import classification', () => {
  it('distinguishes runtime and type-only imports, exports, import types and local closure edges', () => {
    const source = [
      "import type { Kind } from 'types-only'",
      "import value, { type Other, run } from 'runtime'",
      "export type { Shape } from 'export-types'",
      "export { value } from 'export-values'",
      "type Dynamic = import('dynamic-types').Kind",
      "const lazy = import('dynamic-runtime')",
      "const required = require('required-runtime')",
      "import { local } from './nested.js'",
    ].join('\n')
    expect([...collectSourcePackageUses('probe.ts', source)].sort()).toEqual([
      'dynamic-runtime', 'dynamic-types', 'export-types', 'export-values', 'required-runtime', 'runtime', 'types-only',
    ])
    expect([...collectRuntimeSourcePackageUses('probe.ts', source)].sort()).toEqual([
      'dynamic-runtime', 'export-values', 'required-runtime', 'runtime',
    ])
    expect([...collectRuntimeLocalSourceSpecifiers('probe.ts', source)]).toEqual(['./nested.js'])
    expect(collectRuntimeSourceExportUses('probe.ts', source).map(use => [use.specifier, use.exportName])).toEqual([
      ['dynamic-runtime', '*'], ['export-values', 'value'], ['required-runtime', '*'], ['runtime', 'default'], ['runtime', 'run'],
    ])
  })
  it('discovers every application and package without a product opt-in roster', async () => {
    const { value } = await state()
    expect(discoverPackageDependencyScope(value.packages, policy).selected).toHaveLength(2)
    expect(value.facts.map(fact => fact.manifest.name)).toEqual(['@f/tool', '@f/library'])
  })
  it('checks runtime dependencies for index and bin application entries', async () => {
    const root = fixture({
      'apps/tool/package.json': { name: '@f/tool', dependencies: { 'index-runtime': '^1.0.0' } },
      'apps/tool/src/index.ts': "import 'index-runtime'\n",
    })
    expect(collectPackageDependencyViolations(await readPackageDependencyState(root, policy))).toEqual([])

    const manifestPath = join(root, 'apps/tool/package.json')
    writeFileSync(join(root, 'apps/tool/src/bin.ts'), "import 'bin-runtime'\n")
    writeFileSync(manifestPath, JSON.stringify({
      name: '@f/tool', dependencies: { 'index-runtime': '^1.0.0' }, devDependencies: { 'bin-runtime': '^1.0.0' },
    }))
    expect(collectPackageDependencyViolations(await readPackageDependencyState(root, policy)))
      .toEqual([expect.stringContaining('bin-runtime (apps/tool/src/bin.ts) must be dependencies-only')])

    writeFileSync(manifestPath, JSON.stringify({
      name: '@f/tool', dependencies: { 'index-runtime': '^1.0.0', 'bin-runtime': '^1.0.0' },
    }))
    expect(collectPackageDependencyViolations(await readPackageDependencyState(root, policy))).toEqual([])
    rmSync(join(root, 'apps/tool/src/index.ts'))
    expect(collectPackageDependencyViolations(await readPackageDependencyState(root, policy))).toEqual([])
    rmSync(join(root, 'apps/tool/src/bin.ts'))
    await expect(readPackageDependencyState(root, policy)).rejects.toThrow('Host runtime entry')
  })
  it('rejects a missing declaration, then accepts exact recovery', async () => {
    const { root, value } = await state()
    expect(collectPackageDependencyViolations(value)).toEqual(expect.arrayContaining([
      expect.stringContaining('@f/library'), expect.stringContaining('external'),
    ]))
    const manifest = { name: '@f/tool', dependencies: { '@f/library': 'workspace:*', external: '^1.0.0' } }
    writeFileSync(join(root, 'apps/tool/package.json'), JSON.stringify(manifest))
    const recovered = await readPackageDependencyState(root, { ...policy, safeHostDependencyExports: { '@f/library': ['value'] } })
    expect(collectPackageDependencyViolations(recovered)).toEqual([])
  })
  it('rejects wrong sections and workspace ranges; repairs without guessing external versions', async () => {
    const { value } = await state({ '@f/library': 'workspace:^', external: '^1.2.3' })
    const subject = value.facts[0]!
    subject.manifest.devDependencies = { external: '^1.2.3' }
    expect(collectPackageDependencyViolations(value)).toEqual(expect.arrayContaining([
      expect.stringContaining('workspace:*'), expect.stringContaining('dependencies-only'),
    ]))
    repairPackageDependencyManifest(subject)
    expect(subject.manifest.dependencies).toEqual({ '@f/library': 'workspace:*', external: '^1.2.3' })
    expect(subject.manifest.devDependencies).toBeUndefined()
    expect(collectPackageDependencyViolations(value)).toEqual([])
  })
  it('validates an entire repair batch before touching any manifest', async () => {
    const { root, value } = await state({ '@f/library': 'workspace:^' })
    const before = readFileSync(join(root, 'apps/tool/package.json'), 'utf8')
    expect(() => fixPackageDependencies(root, value)).toThrow('cannot repair undeclared third-party dependency external')
    expect(readFileSync(join(root, 'apps/tool/package.json'), 'utf8')).toBe(before)
  })
  it('requires classification of shared workspace runtime exports and rejects stale entries', async () => {
    const { value } = await state({ '@f/library': 'workspace:*', external: '^1.0.0' })
    expect(collectHostDependencyExportPolicyViolations(value.facts, value.workspaceNames, policy))
      .toEqual([expect.stringContaining('@f/library#value is not classified')])
    expect(collectHostDependencyExportPolicyViolations(value.facts, value.workspaceNames, {
      safeHostDependencyExports: { '@f/library': ['missing', '*'] }, peerRequiredHostExports: {},
    })).toEqual(expect.arrayContaining([expect.stringContaining('unused'), expect.stringContaining('unbounded')]))
    const subject: PackageDependencyFacts = { ...value.facts[0]!, peerRequiredHostDependencies: new Set(['@f/library']) }
    expect(expectedPackageDependencies(subject).get('@f/library')?.section).toBe('peer-dev')
    repairPackageDependencyManifest(subject)
    expect(subject.manifest.peerDependencies).toEqual({ '@f/library': 'workspace:*' })
    expect(subject.manifest.devDependencies).toEqual({ '@f/library': 'workspace:*' })
  })
  it('keeps Node types at the root rather than package-local duplicate links', () => {
    expect(collectRootTypePackageViolations({}, []).join('\n')).toContain('@types/node')
    expect(collectRootTypePackageViolations({ devDependencies: { '@types/node': '^22.20.1' } }, [{
      name: '@f/tool', dir: 'apps/tool', manifestPath: 'apps/tool/package.json',
      manifest: { devDependencies: { '@types/node': '^22.20.1' } },
    }])).toEqual([expect.stringContaining('remove devDependencies.@types/node')])
  })
  it('reads private Node build entries and rejects entries outside source/compiler output mapping', async () => {
    const root = fixture({
      'packages/g/tool/tsdown.config.ts': "export default { entry: ['lib/types/worker.js'] }\n",
      'packages/g/tool/src/worker.ts': "import 'worker-runtime'\n",
    })
    const pkg = { dir: 'packages/g/tool', manifestPath: 'packages/g/tool/package.json', name: '@f/tool', manifest: {} }
    expect(await readHostBuildEntries(root, pkg)).toEqual([join(root, 'packages/g/tool/src/worker.ts')])
    const invalidRoot = fixture({ 'packages/g/tool/tsdown.config.ts': "export default { entry: 'dist/worker.js' }\n" })
    await expect(readHostBuildEntries(invalidRoot, pkg)).rejects.toThrow('cannot map to a source entry')
  })
})
