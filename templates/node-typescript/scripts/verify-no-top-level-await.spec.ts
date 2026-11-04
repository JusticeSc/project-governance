import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  declaredExecutableSources,
  excludedEntry,
  findTopLevelAwaits,
  scanRepository,
  sourceCorpus,
} from './verify-no-top-level-await.ts'

function fixture(files: Record<string, string>): string {
  const directory = mkdtempSync(join(tmpdir(), 'template-tla-'))
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(directory, path)), { recursive: true })
    writeFileSync(join(directory, path), text)
  }
  return directory
}

describe('module-scope await detection', () => {
  it('reports a top-level await but not the explicit main function that owns it', () => {
    expect(findTopLevelAwaits('packages/a/lib/src/index.ts', 'const ready = await start()\n')).toEqual([
      { file: 'packages/a/lib/src/index.ts', line: 1, what: 'await expression', text: 'const ready = await start()' },
    ])
    const owned = 'async function main(): Promise<void> { await start() }\nvoid main()\n'
    expect(findTopLevelAwaits('packages/a/lib/src/index.ts', owned)).toEqual([])
  })

  it('excludes only the file that starts with a shebang or a declared launcher', () => {
    const bins = new Set(['packages/a/cli/src/run.ts'])
    expect(excludedEntry('packages/a/cli/src/run.ts', 'await main()\n', bins)).toBe('bin')
    expect(excludedEntry('apps/tool/src/bin.ts', 'await main()\n', new Set(), new Set(['apps/tool/src/bin.ts']))).toBe('declared')
    expect(excludedEntry('packages/a/cli/src/other.ts', '#! /usr/bin/env node\nawait main()\n', bins)).toBe('shebang')
    expect(excludedEntry('packages/a/cli/src/other.ts', '// #!/usr/bin/env node\nawait main()\n', bins)).toBeUndefined()
  })
})

describe('workspace corpus and declared launchers', () => {
  it('checks both package and application sources and refuses a declaration naming no corpus file', () => {
    const directory = fixture({
      'packages/a/lib/src/index.ts': 'export const value = 1\n',
      'apps/tool/src/bin.ts': 'await main()\n',
      'scripts/executable-sources.manifest.json': JSON.stringify({ executableSources: { 'apps/tool/src/bin.ts': 'Process entry.' } }),
    })
    try {
      expect(sourceCorpus(directory)).toEqual(['apps/tool/src/bin.ts', 'packages/a/lib/src/index.ts'])
      expect(declaredExecutableSources(directory, sourceCorpus(directory))).toEqual(new Set(['apps/tool/src/bin.ts']))
      expect(scanRepository(directory)).toEqual({
        checked: 1,
        excluded: [{ file: 'apps/tool/src/bin.ts', reason: 'declared' }],
        violations: [],
      })
      writeFileSync(join(directory, 'scripts/executable-sources.manifest.json'),
        JSON.stringify({ executableSources: { 'apps/missing/src/bin.ts': 'Stale.' } }))
      expect(() => scanRepository(directory)).toThrow('absent from the scanned corpus')
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('refuses a corpus glob that omits an existing source directory', () => {
    const directory = fixture({
      'packages/a/lib/src/index.ts': '',
      'packages/b/other/src/index.ts': '',
    })
    try {
      expect(() => sourceCorpus(directory, 'packages/a/*/src/**/*.ts')).toThrow('leaves out package sources: packages/b/other/src/index.ts')
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
