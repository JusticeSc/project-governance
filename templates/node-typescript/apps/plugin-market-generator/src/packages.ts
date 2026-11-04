/** Read package manifests and find the bundle packages of a repository tree without running any of their code. */
import { posix } from 'node:path'
import semver from 'semver'
import { parse as parseYaml } from 'yaml'
import type { PackageFiles } from './files.ts'

/** A package manifest as read from a file; only the fields the generator reads are typed. */
export interface Manifest {
  readonly name?: unknown
  readonly version?: unknown
  readonly description?: unknown
  readonly icon?: unknown
  readonly author?: unknown
  readonly homepage?: unknown
  readonly repository?: unknown
  readonly keywords?: unknown
  readonly deprecated?: unknown
  readonly workspaces?: unknown
  readonly exports?: unknown
  readonly engines?: unknown
  readonly dsh?: { readonly bundle?: unknown }
}

/** Depth limit of the fallback scan, counted in directories below the repository root. */
const SCAN_DEPTH = 3
const SKIPPED_DIRECTORIES = new Set(['node_modules', 'test', 'tests', 'fixtures', 'examples', 'example'])

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Read a `package.json`.
 * @param files - the tree to read.
 * @param dir - package directory in the tree.
 * @returns the parsed object, or undefined when the file is absent or is not a JSON object.
 */
export async function readManifest(files: PackageFiles, dir: string): Promise<Manifest | undefined> {
  const bytes = await files.read(posix.join(dir, 'package.json'))
  if (bytes === undefined) return undefined
  let value: unknown
  try {
    value = JSON.parse(Buffer.from(bytes).toString('utf8'))
  } catch (_malformed) {
    // A malformed manifest declares no package.
    return undefined
  }
  return isObject(value) ? value : undefined
}

/**
 * Whether a manifest declares a DSH bundle.
 * @param manifest - parsed manifest, or undefined for a directory without one.
 * @returns true when `dsh.bundle` is an object whose `patch` is a string or an array of strings.
 */
export function isBundle(manifest: Manifest | undefined): boolean {
  const bundle = manifest?.dsh?.bundle
  if (!isObject(bundle)) return false
  return typeof bundle.patch === 'string' || (Array.isArray(bundle.patch) && bundle.patch.every(file => typeof file === 'string'))
}

/** Return the manifest's explicit compatibility range unchanged, or explain why the release cannot be listed. */
export function dshRange(manifest: Manifest): string | Error {
  const declared = isObject(manifest.engines) ? manifest.engines.dsh : undefined
  if (typeof declared !== 'string' || declared.trim() === '') {
    return new Error('engines.dsh must be a non-blank SemVer range declared in the manifest')
  }
  if (semver.validRange(declared) === null) return new Error(`engines.dsh ${JSON.stringify(declared)} is not a valid SemVer range`)
  return declared
}

/** String members of a value that is an array, or none. */
function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

/** Workspace globs from `package.json` `workspaces` or `pnpm-workspace.yaml` `packages`; negated globs are dropped. */
async function workspaceGlobs(files: PackageFiles, manifest: Manifest | undefined): Promise<string[]> {
  const declared = manifest?.workspaces
  const fromManifest = Array.isArray(declared) ? strings(declared) : isObject(declared) ? strings(declared.packages) : []
  const pnpmFile = await files.read('pnpm-workspace.yaml')
  let parsed: unknown
  try {
    parsed = pnpmFile === undefined ? undefined : parseYaml(Buffer.from(pnpmFile).toString('utf8'))
  } catch (_malformed) {
    // A malformed workspace file declares no packages.
    parsed = undefined
  }
  return [...fromManifest, ...isObject(parsed) ? strings(parsed.packages) : []].filter(glob => !glob.startsWith('!'))
}

function directories(files: PackageFiles, dir: string): string[] {
  return files.directories(dir).filter(name => !name.startsWith('.') && name !== 'node_modules')
}

/** Match one path segment against a glob segment in which `*` stands for any characters. */
function segmentMatches(pattern: string, name: string): boolean {
  return new RegExp(`^${pattern.split('*').map(part => part.replace(/[.+?^${}()|[\]\\]/gu, '\\$&')).join('.*')}$`, 'u').test(name)
}

/**
 * Expand one workspace glob into existing directories. Each `/`-separated segment is a literal name, a name with `*`
 * wildcards, or `**` for zero or more directories up to the scan depth; parent-relative globs match nothing.
 */
function expandGlob(files: PackageFiles, glob: string): string[] {
  const segments = posix.normalize(glob.replace(/^\.\//u, '').replace(/\/+$/u, '')).split('/').filter(segment => segment !== '' && segment !== '.')
  if (segments.includes('..')) return []
  const found = new Set<string>()
  const walk = (relative: string, rest: string[], depth: number): void => {
    const [head, ...tail] = rest
    if (head === undefined) {
      found.add(relative)
      return
    }
    if (head === '**') {
      walk(relative, tail, depth)
      if (depth < SCAN_DEPTH) for (const name of directories(files, relative)) walk(posix.join(relative, name), rest, depth + 1)
      return
    }
    for (const name of directories(files, relative)) {
      if (segmentMatches(head, name)) walk(posix.join(relative, name), tail, depth + 1)
    }
  }
  walk('', segments, 0)
  return [...found]
}

/** Bundle package directories up to the scan depth, skipping test and example trees. */
async function scan(files: PackageFiles): Promise<string[]> {
  const found: string[] = []
  const walk = async (relative: string, depth: number): Promise<void> => {
    for (const name of directories(files, relative)) {
      if (SKIPPED_DIRECTORIES.has(name)) continue
      const child = posix.join(relative, name)
      if (isBundle(await readManifest(files, child))) found.push(child)
      else if (depth < SCAN_DEPTH) await walk(child, depth + 1)
    }
  }
  await walk('', 1)
  return found
}

/**
 * Locate bundle packages in a repository tree, in this order of precedence:
 * 1. the root manifest declares a bundle: the root only;
 * 2. workspace globs match bundle packages: those packages;
 * 3. otherwise: every bundle package found within three directory levels, outside test and example trees.
 * @param files - repository tree.
 * @param warn - receives workspace globs that match no directory.
 * @returns repository-relative POSIX package directories, `''` for the root, sorted.
 */
export async function findBundlePackages(files: PackageFiles, warn: (message: string) => void = () => {}): Promise<string[]> {
  const manifest = await readManifest(files, '')
  if (isBundle(manifest)) return ['']
  const declared = new Set<string>()
  for (const glob of await workspaceGlobs(files, manifest)) {
    const matches = expandGlob(files, glob)
    if (matches.length === 0) warn(`workspace glob ${JSON.stringify(glob)} matches no directory`)
    for (const dir of matches) if (isBundle(await readManifest(files, dir))) declared.add(dir)
  }
  return (declared.size > 0 ? [...declared] : await scan(files)).sort()
}
