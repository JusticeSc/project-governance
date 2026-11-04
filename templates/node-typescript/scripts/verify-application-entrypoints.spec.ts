/** Explicit application launcher and executable classification enforcement. */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { applicationEntrypointViolations } from './verify-application-entrypoints.ts'
import { type ApplicationEntrypointPolicy } from './project-policy.ts'

const fixturePolicy: ApplicationEntrypointPolicy = {
  rootLaunchers: {
    start: { path: 'apps/console/src/bin.ts', source: 'apps/console/src/bin.ts', kind: 'source' },
    'start:built': { path: 'apps/console/lib/types/bin.js', source: 'apps/console/src/bin.ts', kind: 'artifact' },
  },
  manifestBins: {},
  executableSources: {},
}

const cleanups: string[] = []

afterEach(() => {
  for (const path of cleanups.splice(0)) rmSync(path, { recursive: true, force: true })
})

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'dsh-application-entrypoints-'))
  cleanups.push(root)
  return root
}

function write(root: string, path: string, content: string): void {
  const target = resolve(root, path)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, content)
}

describe('application entrypoints', () => {
  it('accepts the repository launcher inventory', () => {
    expect(applicationEntrypointViolations(resolve(import.meta.dirname, '..'))).toEqual([])
  })

  it('rejects a package-level application bin', () => {
    const root = fixture()
    write(root, 'packages/example/app/package.json', JSON.stringify({ bin: { app: 'lib/bin.js' } }))

    expect(applicationEntrypointViolations(root, fixturePolicy)).toEqual([
      'packages/example/app/package.json: package bin has no explicit application/build/test classification',
    ])
  })

  it('rejects an unclassified executable source', () => {
    const root = fixture()
    write(root, 'packages/example/app/src/bin.ts', '#!/usr/bin/env node\n')

    expect(applicationEntrypointViolations(root, fixturePolicy)).toEqual([
      'packages/example/app/src/bin.ts: executable source has no application/build/test classification',
    ])
  })

  it('rejects an executable at an application package root', () => {
    const root = fixture()
    write(root, 'apps/example/rogue.mjs', '#!/usr/bin/env node\n')

    expect(applicationEntrypointViolations(root, fixturePolicy)).toEqual([
      'apps/example/rogue.mjs: executable source has no application/build/test classification',
    ])
  })

  it('rejects an executable at the repository root', () => {
    const root = fixture()
    write(root, 'rogue.mjs', '#!/usr/bin/env node\n')

    expect(applicationEntrypointViolations(root, fixturePolicy)).toEqual([
      'rogue.mjs: executable source has no application/build/test classification',
    ])
  })

  it('rejects an unclassified executable in an app workspace', () => {
    const root = fixture()
    write(root, 'apps/rogue/src/bin.ts', '#!/usr/bin/env node\n')

    expect(applicationEntrypointViolations(root, fixturePolicy)).toEqual([
      'apps/rogue/src/bin.ts: executable source has no application/build/test classification',
    ])
  })


  it('rejects a new root demo until its launch role is classified', () => {
    const root = fixture()
    write(root, 'package.json', JSON.stringify({ scripts: { 'demo:new-app': 'tsx apps/new-app/src/main.ts' } }))

    expect(applicationEntrypointViolations(root, fixturePolicy)).toEqual([
      'package.json scripts.demo:new-app: launcher has no explicit application classification',
    ])
  })

  it('requires source ownership for source and built launcher commands and rejects bypasses', () => {
    const root = fixture()
    const source = 'apps/console/src/bin.ts'
    write(root, 'package.json', JSON.stringify({ scripts: { start: 'tsx ' + source, 'start:built': 'node apps/console/lib/types/bin.js' } }))
    expect(applicationEntrypointViolations(root, fixturePolicy)).toEqual([source + ': classified launcher source is missing', source + ': classified launcher source is missing'])
    write(root, source, 'export {}\n')
    expect(applicationEntrypointViolations(root, fixturePolicy)).toEqual([])
    write(root, 'package.json', JSON.stringify({ scripts: { start: 'node packages/example/app/src/bin.ts' } }))
    expect(applicationEntrypointViolations(root, fixturePolicy)).toEqual(['package.json scripts.start: launcher must select ' + source])
  })

  it.each([
    { kind: 'source', entry: 'apps/console/lib/types/bin.js' },
    { kind: 'artifact', entry: 'apps/console/src/bin.ts' },
    { kind: 'artifact', entry: 'apps/other/lib/types/bin.js' },
    { kind: 'artifact', entry: 'apps/console/lib/../src/bin.ts' },
  ] as const)('rejects a $kind launcher selecting $entry', ({ kind, entry }) => {
    const root = fixture()
    const source = 'apps/console/src/bin.ts'
    const policy: ApplicationEntrypointPolicy = {
      ...fixturePolicy,
      rootLaunchers: { start: { path: entry, source, kind } },
    }
    write(root, source, 'export {}\n')
    write(root, 'package.json', JSON.stringify({ scripts: { start: 'node ' + entry } }))

    expect(applicationEntrypointViolations(root, policy)).toEqual([
      expect.stringContaining('package.json scripts.start:'),
    ])
  })

  it('accepts explicit executable and bin classifications and rejects a changed bin', () => {
    const root = fixture()
    const manifest = 'apps/console/package.json'
    const source = 'apps/console/src/bin.ts'
    const policy: ApplicationEntrypointPolicy = {
      rootLaunchers: {},
      manifestBins: { [manifest]: { console: 'lib/bin.js' } },
      executableSources: { [source]: 'Console application executable.' },
    }
    write(root, source, '#!/usr/bin/env node\n')
    write(root, manifest, JSON.stringify({ bin: { console: 'lib/bin.js' } }))
    expect(applicationEntrypointViolations(root, policy)).toEqual([])
    write(root, manifest, JSON.stringify({ bin: { console: 'lib/other.js' } }))
    expect(applicationEntrypointViolations(root, policy)[0]).toContain('classified bin must remain')
  })
})
