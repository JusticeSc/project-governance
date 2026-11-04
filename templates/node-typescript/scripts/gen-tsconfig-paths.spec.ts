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
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'workspace-root', private: true }))
  writeFileSync(join(root, 'pnpm-workspace.yaml'), 'packages: ["packages/*/*", "!packages/ignored/*", "apps/*"]\n')
  return root
}

function library(root: string, dir: string, name?: string, source = true): void {
  mkdirSync(join(root, dir), { recursive: true })
  writeFileSync(join(root, dir, 'package.json'), JSON.stringify({ name }))
  if (source) {
    mkdirSync(join(root, dir, 'src'))
    writeFileSync(join(root, dir, 'src/index.ts'), 'export const value = 1\n')
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
  it('maps scoped and unscoped packages from their real source directories', () => {
    const root = fixture()
    library(root, 'packages/core/rules', '@fixture/rules')
    library(root, 'packages/utilities/filesystem', 'filesystem-tools')
    library(root, 'packages/utilities/artifact-only', '@external/artifact', false)
    library(root, 'apps/console', 'console-app')
    expect(collectPackageAliases(root)).toEqual([
      { specifier: '@fixture/rules', source: './packages/core/rules/src' },
      { specifier: 'filesystem-tools', source: './packages/utilities/filesystem/src' },
    ])
    expect(collectPackageNames(root)).toEqual(['@fixture/rules', 'filesystem-tools'])
  })
  it('rejects an excluded library instead of omitting its alias', () => {
    const root = fixture()
    library(root, 'packages/ignored/hidden', '@fixture/hidden')
    expect(() => collectPackageAliases(root)).toThrow('not a declared workspace member')
  })


  it('resolves a new library from source before built output exists', () => {
    const root = fixture()
    library(root, 'packages/core/rules', '@fixture/rules')
    const aliases = collectPackageAliases(root)
    const paths = Object.fromEntries(aliases.map(alias => [alias.specifier, [join(root, alias.source)]]))
    const options: ts.CompilerOptions = { paths, moduleResolution: ts.ModuleResolutionKind.Bundler }
    expect(existsSync(join(root, 'packages/core/rules/lib'))).toBe(false)
    const resolved = ts.resolveModuleName('@fixture/rules', join(root, 'apps/console/src/index.ts'), options, ts.sys)
    expect(resolved.resolvedModule?.resolvedFileName.replaceAll('\\', '/'))
      .toBe(join(root, 'packages/core/rules/src/index.ts').replaceAll('\\', '/'))
    expect(ts.resolveModuleName('@fixture/missing', join(root, 'apps/console/src/index.ts'), options, ts.sys).resolvedModule).toBeUndefined()
  })

  it('rejects duplicate declared names deterministically rather than selecting by group order', () => {
    const root = fixture()
    library(root, 'packages/z/second', '@fixture/rules')
    library(root, 'packages/a/first', '@fixture/rules')
    expect(() => collectPackageAliases(root)).toThrow(
      '@fixture/rules is claimed by packages/a/first and packages/z/second',
    )
  })

  it.each([undefined, '@fixture/rules/subpath', 'tools/*'])('rejects unsupported source package names: %s', (name) => {
    const root = fixture()
    library(root, 'packages/core/rules', name)
    expect(() => collectPackageAliases(root)).toThrow('must declare a bare package name')
  })

  it('preserves scoped and unscoped manual aliases and comments without overwriting them', () => {
    const aliases = [
      { specifier: '@fixture/rules', source: './packages/core/rules/src' },
      { specifier: 'filesystem-tools', source: './packages/utilities/tools/src' },
      { specifier: '@external/new', source: './packages/utilities/new/src' },
    ]
    const current = config('      "@fixture/rules": ["./custom/rules.ts"],\n      "filesystem-tools": ["./custom/tools.ts"],')
    const next = generateConfig(current, aliases)
    expect(next).toContain('"@fixture/rules": ["./custom/rules.ts"]')
    expect(next).toContain('"filesystem-tools": ["./custom/tools.ts"]')
    expect(next).toContain('// Manual comments remain owned by the author.')
    expect(next).toContain('"unrelated": { "not-an-alias": ["elsewhere"] }')
    expect(next).not.toContain('./packages/core/rules/src')
    expect(next).not.toContain('stale')
    expect(uncoveredPackages(aliases.map(alias => alias.specifier), mappedSpecifiers(next))).toEqual([])
    expect(generateConfig(next, aliases)).toBe(next)
    expect(renderAliases(aliases, new Set(['@fixture/rules', 'filesystem-tools'])).endsWith(',')).toBe(false)
  })

  it('does not count subpaths, wildcards, unrelated fields or invalid targets as bare mappings', () => {
    const text = JSON.stringify({
      '@fixture/rules': ['unrelated'],
      compilerOptions: {
        paths: {
          '@fixture/rules/subpath': ['./src/index.ts'],
          '@fixture/*': ['./src/*'],
          'filesystem-tools/subpath': ['./src/index.ts'],
          'missing-target': [],
          'wrong-target': './src/index.ts',
          'empty-target': [''],
          '@other/valid': ['./src/index.ts'],
          'valid-unscoped': ['./src/tools.ts'],
        },
      },
    })
    expect(mappedSpecifiers(text)).toEqual(new Set(['@other/valid', 'valid-unscoped']))
    expect(uncoveredPackages(['@fixture/rules', 'missing-target'], mappedSpecifiers(text)))
      .toEqual(['@fixture/rules', 'missing-target'])
    expect(() => mappedSpecifiers('{')).toThrow()
  })

  it('preserves an invalid manual alias but reports it uncovered until the author repairs it', () => {
    const aliases = [{ specifier: '@fixture/rules', source: './packages/core/rules/src' }]
    const next = generateConfig(config('      "@fixture/rules": [],'), aliases)
    expect(next).toContain('"@fixture/rules": []')
    expect(next).not.toContain('./packages/core/rules/src')
    expect(uncoveredPackages(['@fixture/rules'], mappedSpecifiers(next))).toEqual(['@fixture/rules'])
    const repaired = next.replace('"@fixture/rules": []', '"@fixture/rules": ["./custom/rules.ts"]')
    expect(uncoveredPackages(['@fixture/rules'], mappedSpecifiers(repaired))).toEqual([])
  })

  it('refuses absent or reversed marked regions', () => {
    expect(() => writeRegion('{}', '')).toThrow('missing the generated-region markers')
    expect(() => writeRegion([
      '      // END generated package aliases',
      '      // BEGIN generated package aliases — pnpm run gen-tsconfig-paths',
    ].join('\n'), '')).toThrow('missing the generated-region markers')
  })
})
