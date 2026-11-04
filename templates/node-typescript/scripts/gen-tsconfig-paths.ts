/**
 * Generate explicit source aliases for declared workspace libraries, preserving
 * hand-written aliases and comments outside the marked region.
 * @module scripts/gen-tsconfig-paths
 */

import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { readWorkspaceManifests } from './check-workspace-constraints.ts'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const CONFIG = join(ROOT, 'tsconfig.base.json')
const BEGIN = '      // BEGIN generated package aliases — pnpm run gen-tsconfig-paths'
const END = '      // END generated package aliases'

/** One declared workspace library mapped directly to source. */
interface PackageAlias {
  readonly specifier: string
  readonly source: string
}

function isBarePackageName(name: string): boolean {
  return /^(?:@[^/\s*]+\/)?[^/@.\s*][^/\s*]*$/u.test(name)
}

/**
 * Collect declared packages/<group>/<package> libraries with source directories.
 * @param repositoryRoot - repository or isolated fixture root.
 * @returns Explicit aliases sorted by declared package name.
 * @throws When a source package has no bare name or two packages claim one name.
 */
export function collectPackageAliases(repositoryRoot = ROOT): PackageAlias[] {
  const bySpecifier = new Map<string, PackageAlias & { directory: string }>()
  for (const { dir, manifest } of readWorkspaceManifests(repositoryRoot)) {
    if (!/^packages\/[^/]+\/[^/]+$/u.test(dir)) continue
    const source = join(repositoryRoot, dir, 'src')
    if (!existsSync(source) || !statSync(source).isDirectory()) continue
    const name = manifest.name
    if (typeof name !== 'string' || !isBarePackageName(name)) {
      throw new Error(`gen-tsconfig-paths: ${dir}/package.json must declare a bare package name.`)
    }
    const previous = bySpecifier.get(name)
    if (previous !== undefined) {
      throw new Error(`gen-tsconfig-paths: ${name} is claimed by ${previous.directory} and ${dir}.`)
    }
    bySpecifier.set(name, { specifier: name, source: `./${dir}/src`, directory: dir })
  }
  return [...bySpecifier.values()]
    .map(({ specifier, source }) => ({ specifier, source }))
    .sort((left, right) => left.specifier.localeCompare(right.specifier))
}

/**
 * Collect names requiring source aliases, using the same validated discovery.
 * @param repositoryRoot - repository or isolated fixture root.
 * @returns Sorted declared library names.
 */
export function collectPackageNames(repositoryRoot = ROOT): string[] {
  return collectPackageAliases(repositoryRoot).map(alias => alias.specifier)
}

/** Parse bare paths keys, optionally requiring usable target arrays. */
function readMappedSpecifiers(text: string, requireTargets: boolean): Set<string> {
  const parsed = ts.parseConfigFileTextToJson('tsconfig.base.json', text)
  if (parsed.error !== undefined) {
    throw new Error(`gen-tsconfig-paths: ${ts.flattenDiagnosticMessageText(parsed.error.messageText, '\n')}`)
  }
  const config: unknown = parsed.config
  if (typeof config !== 'object' || config === null || !('compilerOptions' in config)) return new Set()
  const options: unknown = config.compilerOptions
  if (typeof options !== 'object' || options === null || !('paths' in options)) return new Set()
  const paths: unknown = options.paths
  if (typeof paths !== 'object' || paths === null || Array.isArray(paths)) return new Set()
  const keys = new Set<string>()
  for (const [name, targets] of Object.entries(paths)) {
    if (!isBarePackageName(name)) continue
    if (!requireTargets || (Array.isArray(targets) && targets.length > 0
      && targets.every((target: unknown) => typeof target === 'string' && target.length > 0))) {
      keys.add(name)
    }
  }
  return keys
}

/**
 * Read usable bare package mappings specifically from compilerOptions.paths.
 * @param text - JSONC tsconfig contents, including comments and trailing commas.
 * @returns Bare names with nonempty string-array targets, excluding subpaths and wildcards.
 * @throws When the config is invalid JSONC.
 */
export function mappedSpecifiers(text: string): Set<string> {
  return readMappedSpecifiers(text, true)
}

/**
 * Report declared libraries not mapped to source by the config.
 * @param packages - every workspace library requiring an alias.
 * @param mapped - valid bare package mappings.
 * @returns Unmapped names in input order.
 */
export function uncoveredPackages(packages: readonly string[], mapped: ReadonlySet<string>): string[] {
  return packages.filter(name => !mapped.has(name))
}

/**
 * Render generated aliases without overwriting manually owned mappings.
 * @param aliases - aliases in emission order.
 * @param handWritten - bare specifiers mapped outside the generated region.
 * @returns JSON members without a trailing comma.
 */
export function renderAliases(aliases: readonly PackageAlias[], handWritten: ReadonlySet<string>): string {
  return aliases.filter(alias => !handWritten.has(alias.specifier))
    .map(alias => `      ${JSON.stringify(alias.specifier)}: [${JSON.stringify(alias.source)}]`).join(',\n')
}

/**
 * Replace only the marked generated region.
 * @param text - existing tsconfig contents.
 * @param body - rendered alias members.
 * @returns Updated contents with surrounding comments and manual aliases intact.
 * @throws When markers are missing or out of order.
 */
export function writeRegion(text: string, body: string): string {
  const begin = text.indexOf(BEGIN)
  const end = text.indexOf(END)
  if (begin < 0 || end < begin) {
    throw new Error(`gen-tsconfig-paths: ${CONFIG} is missing the generated-region markers.`)
  }
  return `${text.slice(0, begin)}${BEGIN}\n${body}\n${END}${text.slice(end + END.length)}`
}

/**
 * Generate the config while preserving valid hand-written package aliases.
 * @param text - current tsconfig JSONC.
 * @param aliases - discovered workspace aliases.
 * @returns Config with only the marked region replaced.
 */
export function generateConfig(text: string, aliases: readonly PackageAlias[]): string {
  const outside = writeRegion(text, '')
  return writeRegion(text, renderAliases(aliases, readMappedSpecifiers(outside, false)))
}

if (process.argv[1] && import.meta.filename === resolve(process.argv[1])) {
  const check = process.argv.includes('--check')
  const current = readFileSync(CONFIG, 'utf8')
  const aliases = collectPackageAliases()
  const next = generateConfig(current, aliases)
  const uncovered = uncoveredPackages(aliases.map(alias => alias.specifier), mappedSpecifiers(next))
  if (uncovered.length > 0) {
    console.error(`gen-tsconfig-paths: no valid bare alias maps ${uncovered.join(', ')}.`)
    process.exitCode = 1
  } else if (current === next) {
    console.log('gen-tsconfig-paths: tsconfig.base.json package aliases are current.')
  } else if (check) {
    console.error('gen-tsconfig-paths: tsconfig.base.json is stale; run `pnpm run gen-tsconfig-paths`.')
    process.exitCode = 1
  } else {
    writeFileSync(CONFIG, next)
    console.log('gen-tsconfig-paths: rewrote tsconfig.base.json package aliases.')
  }
}
