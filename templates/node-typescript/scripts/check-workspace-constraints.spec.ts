/** Workspace dependency ranges and package publication constraints. */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, onTestFinished } from 'vitest'
import {
  checkWorkspaceVersion,
  checkWorkspaceManifest,
  checkWorkspaceProtocol,
  expectedPackageFiles,
  readWorkspaceManifests,
  type WorkspaceManifest,
} from './check-workspace-constraints.ts'


describe('workspace manifest discovery', () => {
  it('checks root, application, package, and their declared workspace protocol', () => {
    const root = mkdtempSync(join(tmpdir(), 'workspace-ranges-'))
    onTestFinished(() => { rmSync(root, { recursive: true, force: true }) })
    const consumers = ['.', 'apps/console', 'apps/worker', 'packages/tools/probe']
    const runtime = 'packages/core/runtime'
    writeFileSync(join(root, 'pnpm-workspace.yaml'), 'packages: ["packages/*/*", "apps/*"]')
    for (const dir of [...consumers, runtime]) {
      mkdirSync(join(root, dir), { recursive: true })
      writeFileSync(join(root, dir, 'package.json'), JSON.stringify(dir === runtime
        ? { name: '@fixture/runtime' }
        : { dependencies: { '@fixture/runtime': 'workspace:^' } }))
    }
    const manifests = readWorkspaceManifests(root)
    expect(manifests.map(entry => entry.dir).sort()).toEqual([...consumers, runtime].sort())
    expect(checkWorkspaceProtocol(manifests).sort()).toEqual(consumers.map(dir =>
      `${dir}: dependencies.@fixture/runtime must use workspace:*, got workspace:^`).sort())
  })

  it('rejects a declared member outside the app and library hierarchy', () => {
    const root = mkdtempSync(join(tmpdir(), 'workspace-ranges-'))
    onTestFinished(() => { rmSync(root, { recursive: true, force: true }) })
    writeFileSync(join(root, 'package.json'), '{}')
    writeFileSync(join(root, 'pnpm-workspace.yaml'), 'packages: [apps/*, tools/*]')
    mkdirSync(join(root, 'tools/probe'), { recursive: true })
    writeFileSync(join(root, 'tools/probe/package.json'), '{}')
    expect(() => readWorkspaceManifests(root)).toThrow(
      'workspace member tools/probe is outside the apps/<app> or packages/<group>/<package> hierarchy',
    )
  })

  it.each([
    { owner: 'apps/console', nested: 'apps/console/tools/helper' },
    { owner: 'packages/core/rules', nested: 'packages/core/rules/tools/helper' },
  ])('rejects nested package manifests below $owner', ({ owner, nested }) => {
    const root = mkdtempSync(join(tmpdir(), 'workspace-ranges-'))
    onTestFinished(() => { rmSync(root, { recursive: true, force: true }) })
    writeFileSync(join(root, 'package.json'), '{}')
    writeFileSync(join(root, 'pnpm-workspace.yaml'), 'packages: ["packages/*/*", "apps/*"]')
    mkdirSync(join(root, owner), { recursive: true })
    writeFileSync(join(root, owner, 'package.json'), '{}')
    mkdirSync(join(root, nested), { recursive: true })
    writeFileSync(join(root, nested, 'package.json'), '{}')
    expect(() => readWorkspaceManifests(root)).toThrow(
      `package manifest ${nested}/package.json is outside the apps/<app> or packages/<group>/<package> hierarchy`,
    )
  })

  it.each(['', 'null', '{}', 'packages: []', 'packages: [false]', 'packages: [""]', 'packages: wrong'])(
    'rejects an invalid workspace declaration: %s', (contents) => {
      const root = mkdtempSync(join(tmpdir(), 'workspace-ranges-'))
      onTestFinished(() => { rmSync(root, { recursive: true, force: true }) })
      writeFileSync(join(root, 'pnpm-workspace.yaml'), contents)
      expect(() => readWorkspaceManifests(root)).toThrow('packages must be a non-empty list of workspace patterns')
    },
  )

  it('accepts an empty workspace but rejects an existing member excluded by its patterns', () => {
    const root = mkdtempSync(join(tmpdir(), 'workspace-ranges-'))
    onTestFinished(() => { rmSync(root, { recursive: true, force: true }) })
    writeFileSync(join(root, 'package.json'), '{}')
    writeFileSync(join(root, 'pnpm-workspace.yaml'), 'packages: [missing/*]')
    expect(readWorkspaceManifests(root).map(member => member.dir)).toEqual(['.'])
    mkdirSync(join(root, 'apps/cli/src'), { recursive: true })
    writeFileSync(join(root, 'apps/cli/src/index.ts'), 'export const value = 1\n')
    expect(() => readWorkspaceManifests(root)).toThrow('apps/cli')
  })
})

describe('workspace version coherence', () => {
  it.each([
    { name: '@fixture/rules' },
    { name: 'tool-package' },
    { name: '@fixture/private-app', private: true },
    {},
  ])('rejects stale or missing versions independently of names and private status: %j', (identity) => {
    expect(checkWorkspaceVersion({ ...identity, version: '0.1.2-alpha.5' }, '0.1.2-rc.1'))
      .toContain('version must match root version 0.1.2-rc.1')
    expect(checkWorkspaceVersion(identity, '0.1.2-rc.1')).toContain('version must match root version')
    expect(checkWorkspaceVersion({ ...identity, version: '0.1.2-rc.1' }, '0.1.2-rc.1')).toBeUndefined()
  })

  it('does not accept missing root and member versions as equal', () => {
    expect(checkWorkspaceVersion({}, undefined)).toContain('root version (missing)')
  })

  it('enforces the root-owned version on every declared member, including private apps', () => {
    const root = mkdtempSync(join(tmpdir(), 'workspace-versions-'))
    onTestFinished(() => { rmSync(root, { recursive: true, force: true }) })
    writeFileSync(join(root, 'pnpm-workspace.yaml'), 'packages: ["packages/*/*", "apps/*"]')
    const members = [
      { dir: '.', manifest: { name: 'workspace-root', private: true, version: '1.2.3' } },
      { dir: 'packages/core/rules', manifest: { name: '@fixture/rules', version: '1.2.2' } },
      { dir: 'apps/console', manifest: { name: 'console-app', private: true, version: '1.2.2' } },
      { dir: 'apps/tooling', manifest: { name: 'private-tool', private: true, version: '1.2.2' } },
    ]
    for (const { dir, manifest } of members) {
      mkdirSync(join(root, dir), { recursive: true })
      writeFileSync(join(root, dir, 'package.json'), JSON.stringify(manifest))
    }
    const manifests = readWorkspaceManifests(root)
    const expected = manifests.find(entry => entry.dir === '.')?.manifest.version
    if (expected === undefined) throw new Error('version fixture has no root version')
    expect(manifests.flatMap(({ manifest }) => checkWorkspaceVersion(manifest, expected) ?? [])).toHaveLength(3)
    expect(manifests.flatMap(({ manifest }) => checkWorkspaceVersion({ ...manifest, version: expected }, expected) ?? [])).toEqual([])
  })
})

describe('package payload constraints', () => {
  it.each([
    ['./art/icon.svg', ['art/icon.svg']],
    [{ import: './art/icon.svg', default: './art/fallback.svg' }, ['art/icon.svg', 'art/fallback.svg']],
    [['./art/icon.svg', './art/icon.svg'], ['art/icon.svg']],
  ] as const)('includes exported icon targets in the canonical payload: %j', (icon, expected) => {
    expect(expectedPackageFiles({ exports: { './icon': icon } })).toEqual([...expected, 'lib/index.js', 'lib/types/**/*.d.ts'])
  })

  it.each(['icon.svg', './icon.svg'])('includes and deduplicates manifest icon %s', (icon) => {
    expect(expectedPackageFiles({ icon, exports: { './icon': './icon.svg' } })).toEqual(['icon.svg', 'lib/index.js', 'lib/types/**/*.d.ts'])
  })

  it('includes manifest, root, and subpath icon targets', () => {
    expect(expectedPackageFiles({ icon: './legacy.svg', exports: { './icon': './fallback.svg', './search/icon': './search.svg' } })).toEqual([
      'legacy.svg', 'fallback.svg', 'search.svg', 'lib/index.js', 'lib/types/**/*.d.ts',
    ])
  })


  it.each([
    { exports: { './locale/*.json': './locale/*.json' }, resources: ['locale/*.json'] },
    { exports: { './search/locale/*.json': './resources/search/*.json' }, resources: ['resources/search/*.json'] },
    { exports: { './locale/en.json': './locale/en.json', './locale/zh.json': './locale/zh.json' }, resources: ['locale/en.json', 'locale/zh.json'] },
    { exports: { './locale/*.json': { default: './locale/*.json' } }, resources: ['locale/*.json'] },
    { exports: { './locale/*.json': './locale/*.json', './search/locale/*.json': './locale/*.json' }, resources: ['locale/*.json'] },
    { exports: { './search/locale/*.json': './z/*.json', './locale/*.json': './a/*.json' }, resources: ['a/*.json', 'z/*.json'] },
  ])('includes declared locale resources in the canonical payload: $exports', ({ exports, resources }) => {
    expect(expectedPackageFiles({ name: '@fixture/localized', exports })).toEqual([
      ...resources, 'lib/index.js', 'lib/types/**/*.d.ts',
    ])
  })

  it('does not infer locale payloads from unrelated or non-JSON exports', () => {
    expect(expectedPackageFiles({
      exports: {
        './config.json': './config.json',
        './locale/README.md': './locale/README.md',
        './locale/en.json': './metadata.js',
        './locale/zh.json': null,
        './locale/fr.json': { types: './locale/fr.d.ts' },
      },
    })).toEqual(['lib/index.js', 'lib/types/**/*.d.ts'])
  })

})

it('checks isolated runtime metadata, exports and publication payload, including negative recovery', () => {
  const dir = 'packages/core/rules'
  const manifest: WorkspaceManifest['manifest'] = {
    name: '@fixture/rules',
    version: '1.2.3',
    type: 'module',
    main: 'lib/index.js',
    types: 'lib/types/index.d.ts',
    exports: { '.': { types: './lib/types/index.d.ts', default: './lib/index.js' } },
    files: ['lib/index.js', 'lib/types/**/*.d.ts'],
    publishConfig: { access: 'public' },
    repository: { type: 'git', url: 'https://example.com/project.git', directory: dir },
  }
  expect(checkWorkspaceManifest({ dir, manifest }, '1.2.3')).toEqual([])
  for (const changed of [
    { ...manifest, version: '1.2.2' },
    { ...manifest, private: true },
    { ...manifest, publishConfig: { access: 'restricted' } },
    { ...manifest, repository: { ...manifest.repository, directory: 'packages/wrong/directory' } },
    { ...manifest, types: 'src/index.ts' },
    { ...manifest, exports: { '.': { default: './src/index.ts' } } },
    { ...manifest, files: [...manifest.files!, 'src/**/*'] },
    { ...manifest, files: ['lib/index.js'] },
  ]) expect(checkWorkspaceManifest({ dir, manifest: changed }, '1.2.3')).not.toEqual([])
  expect(checkWorkspaceManifest({ dir, manifest }, '1.2.3')).toEqual([])
  expect(checkWorkspaceManifest({ dir: 'apps/console', manifest: { name: 'console-app', version: '1.2.3' } }, '1.2.3'))
    .toEqual([expect.stringContaining('repository application/root must be private')])
  expect(checkWorkspaceManifest({ dir: 'apps/console', manifest: { name: 'console-app', private: true, version: '1.2.3' } }, '1.2.3')).toEqual([])
})

it('keeps exact workspace dependency ranges for every dependency section', () => {
  for (const section of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    const provider = { dir: 'packages/g/probe', manifest: { name: '@f/probe' } }
    expect(checkWorkspaceProtocol([provider, { dir: 'apps/tool', manifest: { [section]: { '@f/probe': 'workspace:*' } } }])).toEqual([])
    expect(checkWorkspaceProtocol([provider, { dir: 'apps/tool', manifest: { [section]: { '@f/probe': '^1.0.0' } } }]))
      .toEqual([expect.stringContaining('must use workspace:*')])
  }
})

