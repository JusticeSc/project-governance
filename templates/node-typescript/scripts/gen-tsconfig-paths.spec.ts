import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import ts from 'typescript'
import { describe, expect, it, onTestFinished } from 'vitest'
import {
  collectPackageAliases,
  collectPackageNames,
  generateConfig,
  mappedSpecifiers,
  renderAliases,
  uncoveredPackages,
  writeRegion,
} from './gen-tsconfig-paths.ts'

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'workspace-aliases-'))
  onTestFinished(() => { rmSync(root, { recursive: true, force: true }) })
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'stockroom', private: true }))
  writeFileSync(join(root, 'pnpm-workspace.yaml'), 'packages: ["packages/*/*", "!packages/ignored/*", "apps/*"]\n')
  return root
}

function library(root: string, dir: string, name?: string, source = true): void {
  mkdirSync(join(root, dir), { recursive: true })
  writeFileSync(join(root, dir, 'package.json'), JSON.stringify({ name }))
  if (source) {
    mkdirSync(join(root, dir, 'src'))
    writeFileSync(join(root, dir, 'src/index.ts'), 'export const stock = 1\n')
  }
}

function config(manual = ''): string {
  return [
    '{ "compilerOptions": { "paths": {',
    '      // Manual comments remain owned by the author.',
    manual,
    '      // BEGIN generated package aliases — pnpm run gen-tsconfig-paths',
    '      "stale": ["gone"]',
    '      // END generated package aliases',
    '    } }, "unrelated": { "not-an-alias": ["elsewhere"] } }',
  ].join('\n')
}

describe('generated tsconfig package aliases', () => {
  it('maps arbitrary declared namespaces and directory mismatches, honoring exclusions and source boundaries', () => {
    const root = fixture()
    library(root, 'packages/business/rules-engine', '@stockroom/stock-rules')
    library(root, 'packages/helpers/physical-directory', 'inventory-tools')
    library(root, 'packages/helpers/artifact-only', '@elsewhere/artifact', false)
    library(root, 'packages/ignored/hidden', '@stockroom/hidden')
    library(root, 'apps/cli', 'stockroom-cli')
    expect(collectPackageAliases(root)).toEqual([
      { specifier: '@stockroom/stock-rules', source: './packages/business/rules-engine/src' },
      { specifier: 'inventory-tools', source: './packages/helpers/physical-directory/src' },
    ])
    expect(collectPackageNames(root)).toEqual(['@stockroom/stock-rules', 'inventory-tools'])
  })

  it('resolves a new business library from source before built output exists', () => {
    const root = fixture()
    library(root, 'packages/business/rules-engine', '@stockroom/stock-rules')
    const aliases = collectPackageAliases(root)
    const paths = Object.fromEntries(aliases.map(alias => [alias.specifier, [join(root, alias.source)]]))
    const options: ts.CompilerOptions = { paths, moduleResolution: ts.ModuleResolutionKind.Bundler }
    expect(existsSync(join(root, 'packages/business/rules-engine/lib'))).toBe(false)
    const resolved = ts.resolveModuleName('@stockroom/stock-rules', join(root, 'apps/cli/src/index.ts'), options, ts.sys)
    expect(resolved.resolvedModule?.resolvedFileName.replaceAll('\\', '/'))
      .toBe(join(root, 'packages/business/rules-engine/src/index.ts').replaceAll('\\', '/'))
    expect(ts.resolveModuleName('@stockroom/missing', join(root, 'apps/cli/src/index.ts'), options, ts.sys).resolvedModule).toBeUndefined()
  })

  it('rejects duplicate declared names deterministically rather than selecting by group order', () => {
    const root = fixture()
    library(root, 'packages/z/second', '@stockroom/stock-rules')
    library(root, 'packages/a/first', '@stockroom/stock-rules')
    expect(() => collectPackageAliases(root)).toThrow(
      '@stockroom/stock-rules is claimed by packages/a/first and packages/z/second',
    )
  })

  it.each([undefined, '@stockroom/rules/subpath', 'inventory/*'])('rejects unsupported source package names: %s', (name) => {
    const root = fixture()
    library(root, 'packages/business/rules', name)
    expect(() => collectPackageAliases(root)).toThrow('must declare a bare package name')
  })

  it('preserves scoped and unscoped manual aliases and comments without overwriting them', () => {
    const aliases = [
      { specifier: '@stockroom/stock-rules', source: './packages/business/rules/src' },
      { specifier: 'inventory-tools', source: './packages/helpers/tools/src' },
      { specifier: '@elsewhere/new', source: './packages/helpers/new/src' },
    ]
    const current = config('      "@stockroom/stock-rules": ["./custom/rules.ts"],\n      "inventory-tools": ["./custom/tools.ts"],')
    const next = generateConfig(current, aliases)
    expect(next).toContain('"@stockroom/stock-rules": ["./custom/rules.ts"]')
    expect(next).toContain('"inventory-tools": ["./custom/tools.ts"]')
    expect(next).toContain('// Manual comments remain owned by the author.')
    expect(next).toContain('"unrelated": { "not-an-alias": ["elsewhere"] }')
    expect(next).not.toContain('./packages/business/rules/src')
    expect(next).not.toContain('stale')
    expect(uncoveredPackages(aliases.map(alias => alias.specifier), mappedSpecifiers(next))).toEqual([])
    expect(generateConfig(next, aliases)).toBe(next)
    expect(renderAliases(aliases, new Set(['@stockroom/stock-rules', 'inventory-tools'])).endsWith(',')).toBe(false)
  })

  it('does not count subpaths, wildcards, unrelated fields or invalid targets as bare mappings', () => {
    const text = JSON.stringify({
      '@stockroom/stock-rules': ['unrelated'],
      compilerOptions: {
        paths: {
          '@stockroom/stock-rules/subpath': ['./src/index.ts'],
          '@stockroom/*': ['./src/*'],
          'inventory-tools/subpath': ['./src/index.ts'],
          'missing-target': [],
          'wrong-target': './src/index.ts',
          'empty-target': [''],
          '@other/valid': ['./src/index.ts'],
          'valid-unscoped': ['./src/tools.ts'],
        },
      },
    })
    expect(mappedSpecifiers(text)).toEqual(new Set(['@other/valid', 'valid-unscoped']))
    expect(uncoveredPackages(['@stockroom/stock-rules', 'missing-target'], mappedSpecifiers(text)))
      .toEqual(['@stockroom/stock-rules', 'missing-target'])
    expect(() => mappedSpecifiers('{')).toThrow()
  })

  it('preserves an invalid manual alias but reports it uncovered until the author repairs it', () => {
    const aliases = [{ specifier: '@stockroom/stock-rules', source: './packages/business/rules/src' }]
    const next = generateConfig(config('      "@stockroom/stock-rules": [],'), aliases)
    expect(next).toContain('"@stockroom/stock-rules": []')
    expect(next).not.toContain('./packages/business/rules/src')
    expect(uncoveredPackages(['@stockroom/stock-rules'], mappedSpecifiers(next))).toEqual(['@stockroom/stock-rules'])
    const repaired = next.replace('"@stockroom/stock-rules": []', '"@stockroom/stock-rules": ["./custom/rules.ts"]')
    expect(uncoveredPackages(['@stockroom/stock-rules'], mappedSpecifiers(repaired))).toEqual([])
  })

  it('refuses absent or reversed marked regions', () => {
    expect(() => writeRegion('{}', '')).toThrow('missing the generated-region markers')
    expect(() => writeRegion([
      '      // END generated package aliases',
      '      // BEGIN generated package aliases — pnpm run gen-tsconfig-paths',
    ].join('\n'), '')).toThrow('missing the generated-region markers')
  })
})
