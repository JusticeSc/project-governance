/**
 * Verify package README frontmatter kinds and the summary/contents/Dev Note
 * skeleton in both languages.
 *
 * Every group and package README declares a kind from the workspace policy, and
 * every package carries a classification (or the declared default) with its
 * reason, so a library, executable, or reference package cannot drift silently. Structural
 * titles are checked in English and Chinese; neither language's presence is
 * taken to prove the other.
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { load as loadYaml } from 'js-yaml'
import { readWorkspaceManifests } from './check-workspace-constraints.ts'
import { isRecord, isStringList, readManifestObject } from './manifest-json.ts'

const GATE = 'verify-package-readme-kind'
const root = resolve(import.meta.dirname, '..')
const POLICY = 'scripts/package-readme-policy.manifest.json'

/** One declared package kind: its label and the structure it promises. */
export interface KindContract {
  readonly kind: string
  readonly reason: string
}

/** Read and validate the README kind policy. */
interface ReadmeKindPolicy {
  readonly allowedKinds: readonly string[]
  readonly groupKind: string
  readonly defaultPackageKind: string
  readonly packageKinds: Readonly<Record<string, KindContract>>
}


/** Fields the source documentation standard removes as redundant. */
const REDUNDANT_FIELDS = ['name', 'audience', 'tags', 'i18n'] as const

/**
 * Parse a README frontmatter block into a field map.
 * @param file - repository-relative README path, used in diagnostics.
 * @param source - complete README text.
 * @returns the parsed mapping; empty when the README has no frontmatter mapping.
 */
export function readFrontmatter(file: string, source: string): Record<string, unknown> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(source)
  if (match === null) throw new Error(`${file}: missing YAML frontmatter`)
  const parsed: unknown = loadYaml(match[1] ?? '')
  if (!isRecord(parsed)) {
    throw new Error(`${file}: frontmatter must be a YAML mapping`)
  }
  return Object.fromEntries(Object.entries(parsed))
}

/**
 * Read the kind policy and prove its labels and classifications are coherent.
 * @param repositoryRoot - repository root holding the policy manifest.
 * @param packageDirectories - actual `packages/<group>/<pkg>` member directories.
 * @returns the validated policy.
 * @throws on an empty label set, a group label missing from it, an unknown or unjustified kind, or a stale classification.
 */
export function readKindPolicy(repositoryRoot: string, packageDirectories: ReadonlySet<string>): ReadmeKindPolicy {
  const parsed = readManifestObject(repositoryRoot, POLICY, GATE)
  const allowed = 'allowedKinds' in parsed ? parsed.allowedKinds : undefined
  if (!isStringList(allowed)) {
    throw new Error(`${GATE}: allowedKinds must be a non-empty list of kind labels`)
  }
  if (new Set(allowed).size !== allowed.length) throw new Error(`${GATE}: allowedKinds contains a duplicate label`)
  const groupKind = 'groupKind' in parsed ? parsed.groupKind : undefined
  if (typeof groupKind !== 'string' || !allowed.includes(groupKind)) {
    throw new Error(`${GATE}: groupKind must be one of allowedKinds`)
  }
  const defaultPackageKind = 'defaultPackageKind' in parsed ? parsed.defaultPackageKind : undefined
  if (typeof defaultPackageKind !== 'string' || !allowed.includes(defaultPackageKind) || defaultPackageKind === groupKind) {
    throw new Error(`${GATE}: defaultPackageKind must be a non-group label from allowedKinds`)
  }
  const rawKinds = 'packageKinds' in parsed ? parsed.packageKinds : undefined
  if (!isRecord(rawKinds)) {
    throw new Error(`${GATE}: packageKinds must be an object keyed by package directory`)
  }
  const packageKinds: Record<string, KindContract> = {}
  for (const [directory, value] of Object.entries(rawKinds)) {
    if (!packageDirectories.has(directory)) {
      throw new Error(`${GATE}: packageKinds names ${directory}, which is not a package workspace member — remove the stale classification`)
    }
    if (!isRecord(value)) {
      throw new Error(`${GATE}: packageKinds.${directory} must hold kind and reason`)
    }
    const kind = 'kind' in value ? value.kind : undefined
    const reason = 'reason' in value ? value.reason : undefined
    if (typeof kind !== 'string' || !allowed.includes(kind) || kind === groupKind) {
      throw new Error(`${GATE}: packageKinds.${directory}.kind must be a non-group label from ${allowed.join(', ')}`)
    }
    if (typeof reason !== 'string' || reason.trim() === '') {
      throw new Error(`${GATE}: packageKinds.${directory}.reason must state why the package has this kind`)
    }
    packageKinds[directory] = { kind, reason }
  }
  return { allowedKinds: allowed, groupKind, defaultPackageKind, packageKinds }
}

/**
 * Check frontmatter fields and structural titles for one README.
 * @param file - repository-relative README path.
 * @param source - complete README text.
 * @param expectedKind - the kind the workspace policy or position requires.
 * @returns one diagnostic per violation.
 */
export function readmeKindErrors(file: string, source: string, expectedKind: string): string[] {
  const errors: string[] = []
  let metadata: Record<string, unknown>
  try {
    metadata = readFrontmatter(file, source)
  } catch (error) {
    return [`${file}: ${error instanceof Error ? error.message : String(error)}`]
  }
  if (metadata.kind !== expectedKind) {
    errors.push(`${file}: kind must be ${JSON.stringify(expectedKind)}, found ${JSON.stringify(metadata.kind)}`)
  }
  if (typeof metadata.description !== 'string' || metadata.description.trim() === '') {
    errors.push(`${file}: description must be a non-empty string`)
  }
  for (const field of REDUNDANT_FIELDS) {
    if (field in metadata) errors.push(`${file}: ${field} is redundant or has no governed consumer`)
  }
  const chinese = file.endsWith('.zh.md')
  const required = chinese
    ? [[/^## 摘要$/mu, '摘要'], [/^## 目录$/mu, '目录'], [/^#{2,3} 开发记录$/mu, '开发记录']] as const
    : [[/^## Summary$/mu, 'Summary'], [/^## Table of Contents$/mu, 'Table of Contents'], [/^#{2,3} Dev Note$/mu, 'Dev Note']] as const
  for (const [pattern, label] of required) {
    if (!pattern.test(source)) errors.push(`${file}: missing ${label}`)
  }
  return errors
}

/** CLI entry: validate policy and every group/package README, or exit 1. */
export function main(): void {
  const members = readWorkspaceManifests(root)
  const packageDirectories = new Set(members.map(entry => entry.dir).filter(dir => /^packages\/[^/]+\/[^/]+$/u.test(dir)))
  const policy = readKindPolicy(root, packageDirectories)
  const errors: string[] = []
  const groupDirectories = new Set(['packages', ...[...packageDirectories].map(dir => dir.split('/').slice(0, 2).join('/'))])
  for (const directory of [...groupDirectories].sort()) {
    for (const file of [`${directory}/README.md`, `${directory}/README.zh.md`]) {
      if (!existsSync(resolve(root, file))) {
        errors.push(`${file}: package group README is missing`)
        continue
      }
      errors.push(...readmeKindErrors(file, readFileSync(resolve(root, file), 'utf8'), policy.groupKind))
    }
  }
  for (const directory of [...packageDirectories].sort()) {
    const kind = policy.packageKinds[directory]?.kind ?? policy.defaultPackageKind
    for (const file of [`${directory}/README.md`, `${directory}/README.zh.md`]) {
      if (!existsSync(resolve(root, file))) {
        errors.push(`${file}: package README is missing`)
        continue
      }
      errors.push(...readmeKindErrors(file, readFileSync(resolve(root, file), 'utf8'), kind))
    }
  }
  if (errors.length > 0) {
    console.error(`${GATE}: README kind violations:`)
    for (const error of errors) console.error(`  ${error}`)
    process.exit(1)
  }
  console.log(`${GATE}: ${groupDirectories.size} group and ${packageDirectories.size} package README kinds match ${POLICY} in both languages.`)
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main()
