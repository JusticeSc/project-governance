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
  it('checks root, app, runtime, tooling, and newly declared members while honoring exclusions', () => {
    const root = mkdtempSync(join(tmpdir(), 'dsh-workspace-ranges-'))
    onTestFinished(() => { rmSync(root, { recursive: true, force: true }) })
    const consumers = ['.', 'apps/cli', 'apps/web', 'apps/desktop', 'apps/desktop-host', 'benchmarks', 'website', 'python/sdk-runtime', 'tools/probe']
    writeFileSync(join(root, 'pnpm-workspace.yaml'), [
      'packages:', '  - packages/*/*', '  - apps/*', '  - apps/cli', '  - benchmarks',
      '  - website', '  - python/sdk-runtime', '  - tools/*', '  - "!tools/excluded"',
    ].join('\n'))
    for (const dir of [...consumers, 'tools/excluded', 'unlisted/probe', 'packages/core/runtime']) {
      mkdirSync(join(root, dir), { recursive: true })
      writeFileSync(join(root, dir, 'package.json'), JSON.stringify(dir === 'packages/core/runtime'
        ? { name: '@deepseek-ai/dsh-runtime' }
        : { dependencies: { '@deepseek-ai/dsh-runtime': 'workspace:^' } }))
    }
    const manifests = readWorkspaceManifests(root)
    expect(manifests.map(entry => entry.dir).sort()).toEqual([...consumers, 'packages/core/runtime'].sort())
    expect(checkWorkspaceProtocol(manifests).sort()).toEqual(consumers.map(dir =>
      `${dir}: dependencies.@deepseek-ai/dsh-runtime must use workspace:*, got workspace:^`).sort())
  })

  it.each(['', 'null', '{}', 'packages: []', 'packages: [false]', 'packages: [""]', 'packages: wrong'])(
    'rejects an invalid workspace declaration: %s', (contents) => {
      const root = mkdtempSync(join(tmpdir(), 'dsh-workspace-ranges-'))
      onTestFinished(() => { rmSync(root, { recursive: true, force: true }) })
      writeFileSync(join(root, 'pnpm-workspace.yaml'), contents)
      expect(() => readWorkspaceManifests(root)).toThrow('packages must be a non-empty list of workspace patterns')
    },
  )

  it('rejects a declaration that matches no workspace members', () => {
    const root = mkdtempSync(join(tmpdir(), 'dsh-workspace-ranges-'))
    onTestFinished(() => { rmSync(root, { recursive: true, force: true }) })
    writeFileSync(join(root, 'pnpm-workspace.yaml'), 'packages: [missing/*]')
    expect(() => readWorkspaceManifests(root)).toThrow('packages matched no workspace manifests')
  })
})

describe('workspace version coherence', () => {
  it.each([
    { name: '@stockroom/stock-rules' },
    { name: 'inventory-tools' },
    { name: '@elsewhere/private-app', private: true },
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

  it('enforces the root-owned version on all pnpm members, including applications and private tools', () => {
    const root = mkdtempSync(join(tmpdir(), 'workspace-versions-'))
    onTestFinished(() => { rmSync(root, { recursive: true, force: true }) })
    writeFileSync(join(root, 'pnpm-workspace.yaml'), 'packages: ["packages/*/*", "apps/*", "tools/*", "!tools/excluded"]')
    const members = [
      { dir: '.', manifest: { name: 'stockroom-root', private: true, version: '1.2.3' } },
      { dir: 'packages/stock/rules', manifest: { name: '@stockroom/stock-rules', version: '1.2.2' } },
      { dir: 'apps/console', manifest: { name: 'inventory-console', private: true, version: '1.2.2' } },
      { dir: 'tools/private', manifest: { name: '@stockroom/tool', private: true, version: '1.2.2' } },
      { dir: 'tools/excluded', manifest: { name: 'excluded', version: '0.0.0' } },
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
    expect(expectedPackageFiles({ name: '@deepseek-ai/dsh-localized', exports })).toEqual([
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
  const dir = 'packages/stock/rules-engine'
  const manifest: WorkspaceManifest['manifest'] = {
    name: '@stockroom/stock-rules',
    version: '1.2.3',
    type: 'module',
    main: 'lib/index.js',
    types: 'lib/types/index.d.ts',
    exports: { '.': { types: './lib/types/index.d.ts', default: './lib/index.js' } },
    files: ['lib/index.js', 'lib/types/**/*.d.ts'],
    publishConfig: { access: 'public' },
    repository: { type: 'git', url: 'https://example.com/stockroom.git', directory: dir },
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
  expect(checkWorkspaceManifest({ dir: 'apps/console', manifest: { name: 'inventory-console', version: '1.2.3' } }, '1.2.3'))
    .toEqual([expect.stringContaining('repository application/root must be private')])
  expect(checkWorkspaceManifest({ dir: 'apps/console', manifest: { name: 'inventory-console', private: true, version: '1.2.3' } }, '1.2.3')).toEqual([])
})

it('keeps exact workspace dependency ranges for every dependency section', () => {
  for (const section of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    const provider = { dir: 'packages/g/probe', manifest: { name: '@f/probe' } }
    expect(checkWorkspaceProtocol([provider, { dir: 'apps/tool', manifest: { [section]: { '@f/probe': 'workspace:*' } } }])).toEqual([])
    expect(checkWorkspaceProtocol([provider, { dir: 'apps/tool', manifest: { [section]: { '@f/probe': '^1.0.0' } } }]))
      .toEqual([expect.stringContaining('must use workspace:*')])
  }
})

