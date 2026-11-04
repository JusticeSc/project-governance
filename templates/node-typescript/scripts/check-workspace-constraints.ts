/**
 * Workspace package invariant checks for package-manager-independent quality
 * gates.
 *
 * Run: `tsx scripts/check-workspace-constraints.ts`.
 */

import { existsSync, globSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { load as loadYaml } from 'js-yaml'
import { isForbiddenPublicationFile } from './publication-payload.ts'

const root = resolve(import.meta.dirname, '..')

/** Directories beside real packages that hold local artifacts rather than workspace members. */
const localArtifactDirs: Record<string, true> = { node_modules: true }

/** The subset of package.json fields this constraint check cares about. */
export interface PackageManifest {
  name?: string
  version?: string
  license?: string
  private?: boolean
  type?: string
  main?: string
  types?: string
  bin?: string | Record<string, string>
  exports?: Record<string, ExportTarget | undefined>
  files?: string[]
  icon?: string
  publishConfig?: { access?: string }
  repository?: { type?: string; url?: string; directory?: string }
  peerDependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  dependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
}

/** Node package export target: a path, a fallback list, a conditional map, or an exclusion. */
export type ExportTarget = string | readonly ExportTarget[] | { readonly [condition: string]: ExportTarget | undefined } | null

/** One workspace manifest and its repo-relative path. */
export interface WorkspaceManifest {
  dir: string
  manifest: PackageManifest
}

function readJson(path: string): PackageManifest {
  return JSON.parse(readFileSync(path, 'utf8')) as PackageManifest
}

const rootManifest = readJson(join(root, 'package.json'))
const repositoryVersion = rootManifest.version


/**
 * Read the root manifest and every member declared by pnpm-workspace.yaml.
 * @param repositoryRoot - repository or fixture root containing the workspace declaration.
 * @returns Manifests with normalized repository-relative directories.
 * @throws When the workspace declaration is invalid or matches no member manifests.
 */
export function readWorkspaceManifests(repositoryRoot: string): WorkspaceManifest[] {
  const config = loadYaml(readFileSync(join(repositoryRoot, 'pnpm-workspace.yaml'), 'utf8'))
  if (typeof config !== 'object' || config === null || !('packages' in config)
    || !Array.isArray(config.packages) || config.packages.length === 0
    || !config.packages.every((member: unknown): member is string => typeof member === 'string' && member.length > 0)) {
    throw new Error('pnpm-workspace.yaml: packages must be a non-empty list of workspace patterns')
  }
  const patterns = config.packages.filter(member => !member.startsWith('!')).map(member => `${member}/package.json`)
  const exclude = config.packages.filter(member => member.startsWith('!')).map(member => `${member.slice(1)}/package.json`)
  const paths = globSync(patterns, {
    cwd: repositoryRoot,
    exclude: ['**/node_modules/**', '**/.git/**', ...exclude],
  }).map(path => path.replaceAll('\\', '/'))
  if (paths.length === 0) throw new Error('pnpm-workspace.yaml: packages matched no workspace manifests')
  return [...new Set(['package.json', ...paths])].sort().map(path => ({
    dir: dirname(path).replaceAll('\\', '/'),
    manifest: readJson(join(repositoryRoot, path)),
  }))
}


function sameStringList(actual: readonly string[] | undefined, expected: readonly string[]): boolean {
  return !!actual && actual.length === expected.length && actual.every((value, index) => value === expected[index])
}

/**
 * Compute canonical publication patterns, including declared and exported icon paths and exported locale JSON resources.
 * @param manifest - workspace package manifest.
 * @returns the icon and deduplicated locale targets followed by runtime and declaration payloads.
 */
export function expectedPackageFiles(manifest: PackageManifest): readonly string[] {
  const localeFiles = new Set<string>()
  for (const resource of Object.keys(manifest.exports ?? {})) {
    if (!/^\.\/(?:.+\/)?locale\/[^/]+\.json$/u.test(resource)) continue
    const target = exportDefault(manifest, resource)
    if (target?.startsWith('./') && target.endsWith('.json')) localeFiles.add(target.slice(2))
  }
  const targets = (value: ExportTarget | undefined): string[] => typeof value === 'string' ? [value]
    : typeof value === 'object' && value !== null ? Object.values(value).flatMap(targets) : []
  const icons = [
    ...typeof manifest.icon === 'string' ? [manifest.icon.replace(/^\.\//u, '')] : [],
    ...Object.entries(manifest.exports ?? {}).filter(([key]) => /^\.\/(?:.+\/)?icon$/u.test(key))
      .flatMap(([, target]) => targets(target)).filter(icon => icon.startsWith('./')).map(icon => icon.slice(2)),
  ]
  return [
    ...new Set(icons),
    ...[...localeFiles].sort(),
    'lib/index.js',
    ...manifest.bin ? ['lib/bin.js'] : [],
    // Worker-thread packages ship a CJS worker entry; the browser worker
    // bundle is an ES module a page loads with `new Worker(type: 'module')`.
    // Keyed on the artifact path, like ./client below.
    ...exportDefault(manifest, './worker') === './lib/worker.cjs' ? ['lib/worker.cjs'] : [],
    ...exportDefault(manifest, './worker') === './lib/worker.js' ? ['lib/worker.js'] : [],
    // A surface bundle's startup row is its own bundle: the Loader imports it
    // as a row module, so it cannot ride inside the package entry.
    ...exportDefault(manifest, './startup') === './lib/startup.js' ? ['lib/startup.js'] : [],
    // Subpaths whose runtime default is the tsc-emitted tree (lib/types/*.js —
    // browser-safe source channels rehomed off src so plain Node can import
    // them without type stripping) publish the emitted JS alongside the
    // declarations.
    ...usesEmittedTreeDefaults(manifest) ? ['lib/types/**/*.js'] : [],
    'lib/types/**/*.d.ts',
  ]
}

/** Fields of a conditional export; scalar and list targets have no named conditions. */
function exportFields(value: ExportTarget | undefined): { readonly [condition: string]: ExportTarget | undefined } | undefined {
  return typeof value !== 'object' || value === null || isExportList(value) ? undefined : value
}

function isExportList(value: ExportTarget): value is readonly ExportTarget[] {
  return Array.isArray(value)
}


/** Runtime target of an export entry: conditional `default`, or the bare-string shorthand. */
function exportDefault(manifest: PackageManifest, subpath: string): string | undefined {
  const entry = manifest.exports?.[subpath]
  if (typeof entry === 'string') return entry
  const target = exportFields(entry)?.default
  return typeof target === 'string' ? target : undefined
}


/** Whether any export's runtime default points into the tsc-emitted lib/types tree. */
function usesEmittedTreeDefaults(manifest: PackageManifest): boolean {
  return Object.keys(manifest.exports ?? {}).some(subpath =>
    exportDefault(manifest, subpath)?.startsWith('./lib/types/') === true)
}

/** Public runtime packages live under packages; repository applications are private tools. */
function isReleaseMemberDirectory(dir: string): boolean {
  return new RegExp('^packages/[^/]+/[^/]+$').test(dir)
}

/**
 * Require every declared workspace manifest, including private members, to carry
 * the root manifest's shared version regardless of its package name.
 * @param manifest - a declared workspace manifest.
 * @param expected - the root manifest's version.
 * @returns A diagnostic for a missing root version or a member mismatch.
 */
export function checkWorkspaceVersion(manifest: PackageManifest, expected: string | undefined): string | undefined {
  if (!expected || manifest.version !== expected) {
    return `${manifest.name ?? '(unnamed package)'}: package.json version must match root version ${expected ?? '(missing)'}`
  }
  return undefined
}

/**
 * Check one declared workspace manifest against publication and package policy.
 * @param workspace - package directory and parsed manifest.
 * @param expectedVersion - the root manifest's shared version.
 * @returns path-qualified policy violations.
 */
export function checkWorkspaceManifest({ dir, manifest }: WorkspaceManifest, expectedVersion = repositoryVersion): string[] {
  const errors: string[] = []
  const label = manifest.name ?? dir
  const versionError = checkWorkspaceVersion(manifest, expectedVersion)
  if (versionError !== undefined) errors.push(versionError)
  if (isReleaseMemberDirectory(dir)) {
    if (manifest.private === true) errors.push(label + ': runtime package must not be private')
    if (manifest.publishConfig?.access !== 'public') errors.push(label + ': publishConfig.access must be public')
    if (manifest.repository?.type !== 'git' || !manifest.repository.url || manifest.repository.directory !== dir) {
      errors.push(label + ': repository must name the Git source and this package directory')
    }
  } else if (manifest.private !== true) errors.push(label + ': repository application/root must be private')
  for (const file of manifest.files ?? []) {
    if (isForbiddenPublicationFile(file)) errors.push(label + ': files must not publish ' + JSON.stringify(file))
  }


  if (dir.startsWith('packages/')) {
    if (manifest.type !== 'module') {
      errors.push(`${label}: package.json must set "type": "module"`)
    }
    if (manifest.main !== 'lib/index.js') {
      errors.push(`${label}: package.json must set "main": "lib/index.js"`)
    }
    if (manifest.types !== 'lib/types/index.d.ts') {
      errors.push(`${label}: package.json must set "types": "lib/types/index.d.ts"`)
    }
    const rootEntry = exportFields(manifest.exports?.['.'])
    if (rootEntry?.types !== './lib/types/index.d.ts') {
      errors.push(`${label}: package.json exports["."].types must be "./lib/types/index.d.ts"`)
    }
    if (rootEntry?.default !== './lib/index.js') {
      errors.push(`${label}: package.json exports["."].default must be "./lib/index.js"`)
    }
    const expectedFiles = expectedPackageFiles(manifest)
    if (!sameStringList(manifest.files, expectedFiles)) {
      errors.push(`${label}: package.json files must be ${JSON.stringify(expectedFiles)}`)
    }
  }

  return errors.map(error => `${relative(root, join(root, dir, 'package.json'))}: ${error}`)
}

/**
 * Enforce `packages/<group>/<pkg>`: groups are open-named containers without a
 * package.json, and packages may be neither flat nor more deeply nested.
 */
function checkHierarchyShape(): string[] {
  const errors: string[] = []
  const packagesRoot = join(root, 'packages')
  for (const group of readdirSync(packagesRoot, { withFileTypes: true })) {
    if (!group.isDirectory()) continue
    const groupRel = join('packages', group.name)
    if (existsSync(join(packagesRoot, group.name, 'package.json'))) {
      errors.push(`${groupRel}: a group dir must not contain a package.json — packages live at packages/<group>/<pkg>, not directly under packages/`)
      continue
    }
    for (const pkg of readdirSync(join(packagesRoot, group.name), { withFileTypes: true })) {
      if (!pkg.isDirectory()) continue
      if (localArtifactDirs[pkg.name] === true) continue
      const pkgRel = join(groupRel, pkg.name)
      if (!existsSync(join(packagesRoot, group.name, pkg.name, 'package.json'))) {
        errors.push(`${pkgRel}: expected a package here (no package.json found) — the hierarchy is exactly packages/<group>/<pkg>, no deeper nesting`)
      }
    }
  }
  return errors
}

function checkRepositoryVersion(): string[] {
  // The shared workspace version may carry a prerelease segment before publication.
  if (repositoryVersion && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(repositoryVersion)) return []
  return ['package.json: version must be X.Y.Z with an optional prerelease segment']
}

/** Dependency sections whose ranges reach a published tarball or a local install. */
const dependencySections = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const

/**
 * Require exact workspace dependency ranges for every declared workspace relationship.
 *
 * A hand-written range says nothing about the version the workspace actually
 * carries, and `pnpm pack` leaves it alone: `^0.0.1` published from version
 * `0.0.2` names a version that does not exist. The protocol makes pack
 * substitute the member's real version. Dependency targets determine the range,
 * regardless of the consuming manifest's name or directory.
 * @param manifests - every workspace manifest.
 * @returns One error per workspace reference with a disallowed range.
 */
export function checkWorkspaceProtocol(manifests: readonly WorkspaceManifest[]): string[] {
  const members = new Set(manifests.map(entry => entry.manifest.name).filter(name => name !== undefined))
  const errors: string[] = []
  for (const { dir, manifest } of manifests) {
    for (const section of dependencySections) {
      for (const [name, range] of Object.entries(manifest[section] ?? {})) {
        if (!members.has(name)) continue
        const expected = 'workspace:*'
        if (range === expected) continue
        errors.push(`${manifest.name ?? dir}: ${section}.${name} must use ${expected}, got ${range}`)
      }
    }
  }
  return errors
}

/** Run the repository constraint gate. */
export function main(): void {
  const manifests = readWorkspaceManifests(root)
  const errors = [
    ...checkRepositoryVersion(),
    ...manifests.flatMap(workspace => checkWorkspaceManifest(workspace)),
    ...checkWorkspaceProtocol(manifests),
    ...checkHierarchyShape(),
  ]
  if (errors.length > 0) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main()
