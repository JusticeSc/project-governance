// Selects the files this Skill distributes and installs them into a repository's Skill seat.
//
// The root package.json `files` allowlist is the only selection source: no second list of paths
// lives here. Installed content keeps the real workspace layout, because the runtime imports its
// workspace packages by package name instead of relative paths.
import {
  constants,
  copyFileSync,
  globSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
} from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'

/** Repository-relative install seat; the Agent Skill discovery location. */
export const SEAT_PATH = '.agents/skills/project-governance'

// Build and runtime caches never belong to the distributed Skill.
const SKIPPED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '.hg',
  '.svn',
  '__pycache__',
  '.cache',
  '.turbo',
  '.nyc_output',
  '.venv',
])

// A license or source-attribution notice at the source root must travel with the copied content.
const NOTICE_NAME = /^(?:licen[cs]e|source-licen[cs]e|notice|attribution)(?:\.[a-z0-9]+)?$/i

/**
 * List the files the distribution ships, as sorted POSIX-style repository-relative paths.
 *
 * @param {string} sourceRoot product workspace root (contains package.json)
 * @returns {string[]} files selected by the root `files` allowlist
 */
export function packageFiles(sourceRoot) {
  const source = resolveSourceRoot(sourceRoot)
  const manifest = readManifest(source)
  const files = new Set()
  for (const entry of manifest.files) collectEntry(source, entry, files)
  if (!files.has('package.json')) {
    throw new Error('root package.json must list "package.json" in its files allowlist so an installed seat keeps its workspace manifest')
  }
  const selected = new Set([...files].map((name) => name.toLowerCase()))
  for (const name of readdirSync(source)) {
    if (!NOTICE_NAME.test(name)) continue
    const noticePath = join(source, name)
    if (!lstatSync(noticePath).isFile()) {
      throw new Error(`root ${name} must be a regular file, not a directory or link`)
    }
    if (!selected.has(name.toLowerCase())) {
      throw new Error(`root ${name} must be listed in package.json.files so the source attribution travels with the distributed content`)
    }
  }
  return [...files].sort()
}

/**
 * Install the distributed Skill into `<targetRoot>/.agents/skills/project-governance`.
 *
 * All inputs are validated before the first write. The seat is created exclusively: an existing
 * directory is never merged, overwritten or repaired. If copying fails, only the seat this call
 * created is removed.
 *
 * @param {string} sourceRoot product workspace root
 * @param {string} targetRoot existing target repository
 * @returns {{ seat: string, fileCount: number }} installed seat path and copied file count
 */
export function installSkill(sourceRoot, targetRoot) {
  const source = resolveSourceRoot(sourceRoot)
  const files = packageFiles(source)
  if (typeof targetRoot !== 'string' || targetRoot.trim() === '') {
    throw new Error('install needs an existing target repository')
  }
  let target
  try {
    target = realpathSync(resolve(targetRoot))
  } catch {
    throw new Error(`target repository does not exist: ${targetRoot}`)
  }
  if (!statSync(target).isDirectory()) throw new Error(`target repository is not a directory: ${targetRoot}`)
  const parents = ['.agents', '.agents/skills']
  for (const name of parents) {
    const path = join(target, name)
    const stat = lstatSync(path, { throwIfNoEntry: false })
    if (stat && (stat.isSymbolicLink() || !stat.isDirectory())) {
      throw new Error(`${name} must be a real directory inside the target, not a symlink, junction or file`)
    }
  }
  const seat = join(target, SEAT_PATH)
  if (lstatSync(seat, { throwIfNoEntry: false })) {
    throw new Error(`${SEAT_PATH} already exists; install never overwrites, merges or repairs an existing seat`)
  }
  for (const name of parents) {
    const path = join(target, name)
    if (!lstatSync(path, { throwIfNoEntry: false })) mkdirSync(path)
  }
  const parent = realpathSync(join(target, '.agents/skills'))
  const parentRel = relative(target, parent)
  if (parentRel === '..' || parentRel.startsWith(`..${sep}`) || isAbsolute(parentRel)) {
    throw new Error('.agents/skills must resolve inside the target repository')
  }
  let created = false
  try {
    mkdirSync(seat)
    created = true
    for (const name of files) {
      const destination = join(seat, name)
      mkdirSync(dirname(destination), { recursive: true })
      copyFileSync(join(source, name), destination, constants.COPYFILE_EXCL)
    }
  } catch (error) {
    if (created) rmSync(seat, { recursive: true, force: true })
    throw error
  }
  return { seat, fileCount: files.length }
}

function resolveSourceRoot(sourceRoot) {
  if (typeof sourceRoot !== 'string' || sourceRoot.trim() === '') {
    throw new Error('the distribution source root must be a non-empty path')
  }
  let source
  try {
    source = realpathSync(resolve(sourceRoot))
  } catch {
    throw new Error(`source root does not exist: ${sourceRoot}`)
  }
  if (!statSync(source).isDirectory()) throw new Error(`source root is not a directory: ${sourceRoot}`)
  return source
}

function readManifest(source) {
  let manifest
  try {
    manifest = JSON.parse(readFileSync(join(source, 'package.json'), 'utf8'))
  } catch (error) {
    throw new Error(`cannot read the root package.json: ${error.message}`)
  }
  const entries = manifest?.files
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error('root package.json needs a non-empty files allowlist; it is the only distribution selection')
  }
  return manifest
}

function collectEntry(source, entry, files) {
  if (typeof entry !== 'string' || entry.trim() === '') {
    throw new Error('package.json.files entries must be non-empty strings')
  }
  const normalized = entry.replaceAll('\\', '/').replace(/\/+$/, '')
  if (normalized === '' || normalized.startsWith('/') || isAbsolute(entry) || /^[a-z]:/i.test(normalized)) {
    throw new Error(`package path must be repository-relative: ${entry}`)
  }
  const segments = normalized.split('/')
  if (segments.includes('.') || segments.includes('..')) throw new Error(`unsafe package path: ${entry}`)
  if (!/[*?[{\]]/.test(normalized)) {
    visit(source, normalized, files)
    return
  }
  const matches = globSync(normalized, { cwd: source, exclude: isSkippedPath })
  if (matches.length === 0) throw new Error(`package pattern has no matching files: ${entry}`)
  for (const match of matches) visit(source, match, files)
}

function isSkippedPath(path) {
  return path.replaceAll('\\', '/').split('/').some((segment) => SKIPPED_DIRECTORIES.has(segment))
}

function visit(source, name, files) {
  const normalized = name.replaceAll('\\', '/').replace(/\/+$/, '')
  if (normalized === '') throw new Error(`unsafe package path: ${name}`)
  if (isSkippedPath(normalized)) return
  const full = resolve(source, normalized)
  const local = relative(source, full)
  if (local === '' || local === '..' || local.startsWith(`..${sep}`) || isAbsolute(local)) {
    throw new Error(`package path resolves outside the source root: ${name}`)
  }
  let stat
  let candidate = source
  for (const segment of local.split(sep)) {
    candidate = join(candidate, segment)
    try {
      stat = lstatSync(candidate)
    } catch {
      throw new Error(`package path does not exist: ${name}`)
    }
    if (stat.isSymbolicLink()) throw new Error(`package symlinks are not supported: ${name}`)
  }
  const canonical = realpathSync(full)
  const canonicalRel = relative(source, canonical)
  if (canonicalRel === '' || canonicalRel === '..' || canonicalRel.startsWith(`..${sep}`) || isAbsolute(canonicalRel)) {
    throw new Error(`package path resolves outside the source root: ${name}`)
  }
  if (stat.isDirectory()) {
    for (const child of readdirSync(full).sort()) {
      if (SKIPPED_DIRECTORIES.has(child)) continue
      visit(source, `${normalized}/${child}`, files)
    }
    return
  }
  if (!stat.isFile()) throw new Error(`package path is not a regular file or directory: ${name}`)
  files.add(canonicalRel.replaceAll('\\', '/'))
}
