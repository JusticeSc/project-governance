/**
 * Reject authorized ambiguous labels from maintained repository text.
 *
 * The policy names the labels that may not stand in for a concrete source,
 * field, identity, or evidence, and why. Words with a legitimate concrete
 * meaning stay unblocked: source attribution that names its license and record
 * is precise, not vague. Archive and vendored trees are excluded by policy;
 * a symlink's stored target is checked instead of following it.
 */

import { lstatSync, readFileSync, readdirSync, readlinkSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { isRecord, isStringList, isNonemptyStringArray as isStringArray, readManifestObject } from './manifest-json.ts'

const GATE = 'verify-concrete-terms'
const root = resolve(import.meta.dirname, '..')
const POLICY = 'scripts/concrete-terms.manifest.json'

/** Directories that hold generated, installed, or local-only trees. */
const SKIPPED_DIRECTORIES: Readonly<Record<string, true>> = {
  '.git': true, node_modules: true, lib: true, coverage: true, dist: true, tmp: true, '.pnpm-store': true, '.pnpm-cache': true, __pycache__: true,
}

/** One authorized blocked label. */
export interface BlockedTerm {
  readonly term: string
  readonly reason: string
}

/** The declared concrete-terms policy. */
export interface ConcreteTermsPolicy {
  readonly blockedTerms: readonly BlockedTerm[]
  readonly excludedPrefixes: readonly string[]
  readonly requiredRoots: readonly string[]
}

/** One blocked term occurrence in a path or text line. */
export interface ConcreteTermViolation {
  /** Repository-relative path. */
  readonly file: string
  /** One-based source line, or null when the path itself contains a blocked term. */
  readonly line: number | null
  /** The matched policy term. */
  readonly term: string
}


/**
 * Read and validate the concrete-terms policy.
 * @param repositoryRoot - repository root holding the policy manifest.
 * @returns the authorized labels and scope exclusions.
 * @throws on an empty term list, a reasonless term, or an empty exclusion list.
 */
export function readConcreteTermsPolicy(repositoryRoot: string): ConcreteTermsPolicy {
  const parsed = readManifestObject(repositoryRoot, POLICY, GATE)
  const rawTerms = 'blockedTerms' in parsed ? parsed.blockedTerms : undefined
  if (!Array.isArray(rawTerms) || rawTerms.length === 0) {
    throw new Error(`${GATE}: blockedTerms must name the labels this workspace refuses`)
  }
  const blockedTerms: BlockedTerm[] = []
  for (const item of rawTerms) {
    if (!isRecord(item)) {
      throw new Error(`${GATE}: blockedTerms entries must hold term and reason`)
    }
    const term = 'term' in item ? item.term : undefined
    const reason = 'reason' in item ? item.reason : undefined
    if (typeof term !== 'string' || term.trim() === '') throw new Error(`${GATE}: a blocked term is empty`)
    if (typeof reason !== 'string' || reason.trim() === '') {
      throw new Error(`${GATE}: ${term} needs the reason it cannot stand in for concrete evidence`)
    }
    blockedTerms.push({ term, reason })
  }
  const excludedPrefixes = 'excludedPrefixes' in parsed ? parsed.excludedPrefixes : undefined
  if (!isStringArray(excludedPrefixes)) {
    throw new Error(`${GATE}: excludedPrefixes must be a list of repository-relative prefixes`)
  }
  const requiredRoots = 'requiredRoots' in parsed ? parsed.requiredRoots : undefined
  if (!isStringList(requiredRoots)) throw new Error(`${GATE}: requiredRoots must be a non-empty list`)
  return { blockedTerms, excludedPrefixes, requiredRoots }
}

/** Whether one path falls under a policy exclusion. */
function isExcluded(file: string, policy: ConcreteTermsPolicy): boolean {
  return policy.excludedPrefixes.some(prefix => file === prefix || file.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`))
}

/** Normalize text for label matching exactly as the policy declares. */
function normalized(value: string): string {
  return value.normalize('NFKC').toLowerCase()
}

/**
 * Find authorized labels in one maintained path or text.
 * @param file - repository-relative path.
 * @param source - file text, or a symlink target.
 * @param policy - validated policy.
 * @returns violations outside excluded trees.
 */
export function findConcreteTermViolations(
  file: string,
  source: string,
  policy: ConcreteTermsPolicy,
): ConcreteTermViolation[] {
  if (isExcluded(file, policy)) return []
  const violations: ConcreteTermViolation[] = []
  for (const { term } of policy.blockedTerms) {
    if (normalized(file).includes(normalized(term))) violations.push({ file, line: null, term })
  }
  for (const [index, line] of source.split(/\r?\n/u).entries()) {
    for (const { term } of policy.blockedTerms) {
      if (normalized(line).includes(normalized(term))) violations.push({ file, line: index + 1, term })
    }
  }
  return violations
}

/**
 * List maintained repository files without following symlinked directories.
 * @param directory - absolute directory to walk.
 * @param relativeDirectory - repository-relative directory.
 * @param policy - validated policy.
 * @param files - accumulator of repository-relative paths.
 */
function walk(
  directory: string,
  relativeDirectory: string,
  policy: ConcreteTermsPolicy,
  files: string[],
): void {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const relative = relativeDirectory === '' ? entry.name : `${relativeDirectory}/${entry.name}`
    if (entry.isDirectory()) {
      if (SKIPPED_DIRECTORIES[entry.name] === true || isExcluded(relative, policy)) continue
      walk(join(directory, entry.name), relative, policy, files)
    } else if (entry.isFile() || entry.isSymbolicLink()) {
      if (!isExcluded(relative, policy)) files.push(relative)
    }
  }
}

/**
 * Read one path's text or symlink target.
 * @param repositoryRoot - absolute repository root.
 * @param file - repository-relative path.
 * @returns the text, or undefined for a binary or unreadable path.
 */
function readText(repositoryRoot: string, file: string): string | undefined {
  const path = resolve(repositoryRoot, file)
  const stat = lstatSync(path)
  if (stat.isSymbolicLink()) return readlinkSync(path)
  try {
    const text = readFileSync(path, 'utf8')
    return text.includes('\u0000') ? undefined : text
  } catch {
    return undefined
  }
}

/** CLI entry: scan the maintained tree, or exit 1 with every occurrence. */
export function main(): void {
  const policy = readConcreteTermsPolicy(root)
  const files: string[] = []
  walk(root, '', policy, files)
  const missingRoots = policy.requiredRoots.filter((rootPath) => {
    const directory = rootPath.replace(/\/$/u, '')
    return !files.some(file => file === directory || file.startsWith(`${directory}/`))
  })
  if (missingRoots.length > 0) {
    console.error(`${GATE}: maintained tree is missing required root(s): ${missingRoots.join(', ')} — the scan would pass by checking too little`)
    process.exit(1)
  }
  const violations = files.flatMap((file) => {
    const text = readText(root, file)
    return text === undefined ? [] : findConcreteTermViolations(file, text, policy)
  })
  if (violations.length === 0) {
    console.log(`${GATE}: ${files.length} maintained file(s) contain none of ${policy.blockedTerms.map(entry => entry.term).join(', ')}.`)
    return
  }
  console.error(`${GATE}: replace each ambiguous label with the exact source, field, identity, or evidence:`)
  for (const violation of violations) {
    const location = violation.line === null ? violation.file : `${violation.file}:${String(violation.line)}`
    console.error(`  ${location} (${violation.term})`)
  }
  process.exit(1)
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main()
