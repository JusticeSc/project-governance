/** Enforce the retained application source/artifact entrypoints and classify executable sources. */

import { existsSync, globSync, readFileSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

import { applicationEntrypointPolicy, type ApplicationEntrypointPolicy } from './project-policy.ts'

interface PackageManifest {
  readonly bin?: unknown
}

interface RootManifest {
  readonly scripts?: Record<string, unknown>
}


const SOURCE_PATTERNS = [
  '*.ts',
  '*.js',
  '*.mjs',
  '*.cjs',
  'apps/**/*.ts',
  'apps/**/*.js',
  'apps/**/*.mjs',
  'apps/**/*.cjs',
  'packages/**/*.ts',
  'packages/**/*.js',
  'packages/**/*.mjs',
  'packages/**/*.cjs',
]

const SOURCE_EXCLUDES = [
  '**/node_modules/**',
  '**/lib/**',
  '**/dist/**',
  '**/coverage/**',
]

/** Convert a host path from glob output to the repository's slash form. */
function repositoryPath(path: string): string {
  return path.split(sep).join('/')
}

/** Stable comparison for string and object npm `bin` declarations. */
function normalizedBin(value: unknown): string | undefined {
  if (typeof value === 'string') return JSON.stringify(value)
  if (!isRecord(value)) return undefined
  const entries = Object.entries(value)
  if (!entries.every(([, target]) => typeof target === 'string')) return undefined
  return JSON.stringify(Object.fromEntries(entries.sort(([left], [right]) => left.localeCompare(right))))
}

function manifestBinViolations(root: string, policy: ApplicationEntrypointPolicy): string[] {
  const failures: string[] = []
  const manifests = globSync(['apps/*/package.json', 'packages/*/*/package.json'], { cwd: root }).sort()
  for (const rawPath of manifests) {
    const path = repositoryPath(rawPath)
    const manifest = JSON.parse(readFileSync(resolve(root, path), 'utf8')) as PackageManifest
    if (manifest.bin === undefined) continue
    const expected = policy.manifestBins[path]
    if (expected === undefined) {
      failures.push(path + ': package bin has no explicit application/build/test classification')
      continue
    }
    if (normalizedBin(manifest.bin) !== normalizedBin(expected)) {
      failures.push(`${path}: classified bin must remain ${JSON.stringify(expected)}, got ${JSON.stringify(manifest.bin)}`)
    }
  }
  return failures
}

function executableSourceViolations(root: string, policy: ApplicationEntrypointPolicy): string[] {
  const failures: string[] = []
  for (const rawPath of globSync(SOURCE_PATTERNS, { cwd: root, exclude: SOURCE_EXCLUDES }).sort()) {
    const path = repositoryPath(rawPath)
    const source = readFileSync(resolve(root, path), 'utf8')
    if (!source.startsWith('#!')) continue
    if (!Object.hasOwn(policy.executableSources, path)) {
      failures.push(`${path}: executable source has no application/build/test classification`)
    }
  }
  return failures
}

function rootLauncherViolations(root: string, policy: ApplicationEntrypointPolicy): string[] {
  const manifestPath = resolve(root, 'package.json')
  if (!existsSync(manifestPath)) return []
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as RootManifest
  const failures: string[] = []
  for (const [name, commandValue] of Object.entries(manifest.scripts ?? {}).sort(([left], [right]) => left.localeCompare(right))) {
    const classification = policy.rootLaunchers[name]
    if (classification === undefined) {
      if (name.startsWith('demo:') || name.startsWith('start:') || name === 'start') {
        failures.push('package.json scripts.' + name + ': launcher has no explicit application classification')
      }
      continue
    }
    const { path: entry, source, kind } = classification
    const sourcePath = repositoryPath(relative(root, resolve(root, source)))
    const entryPath = repositoryPath(relative(root, resolve(root, entry)))
    const owner = /^(apps\/[^/]+|packages\/[^/]+\/[^/]+)\/src\//.exec(sourcePath)?.[1]
    const classifiedPlane = owner !== undefined && (kind === 'source'
      ? entryPath === sourcePath
      : entryPath.startsWith(`${owner}/lib/`))
    if (!classifiedPlane) {
      failures.push(`package.json scripts.${name}: ${kind} launcher must select its owner's ${kind === 'source' ? 'source' : 'lib artifact'}`)
    }
    const command = typeof commandValue === 'string' ? commandValue : ''
    if (!command.includes(entry)) failures.push('package.json scripts.' + name + ': launcher must select ' + entry)
    if (!existsSync(resolve(root, source))) failures.push(source + ': classified launcher source is missing')
  }
  return failures
}

/**
 * Find unsupported application entrypoints below a repository root.
 * @param root - repository or test-fixture root.
 * @returns deterministic path-qualified violations.
 */
export function applicationEntrypointViolations(root: string, policy: ApplicationEntrypointPolicy = applicationEntrypointPolicy): string[] {
  return [
    ...manifestBinViolations(root, policy),
    ...executableSourceViolations(root, policy),
    ...rootLauncherViolations(root, policy),
  ]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = resolve(import.meta.dirname, '..')
  const failures = applicationEntrypointViolations(root)
  if (failures.length > 0) {
    console.error('verify-application-entrypoints: unsupported launcher(s):')
    for (const failure of failures) console.error(`  ${failure}`)
    process.exitCode = 1
  } else {
    console.log('verify-application-entrypoints: application source and artifact launchers are classified.')
  }
}
