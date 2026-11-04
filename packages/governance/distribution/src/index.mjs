// The product allowlist selects the exporter's author files; the separately packaged Skill
// directory is the only content installed into a consumer's discovery seat.
import {
  constants,
  copyFileSync,
  globSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmdirSync,
  statSync,
  unlinkSync,
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
    throw new Error('root package.json must list "package.json" in its files allowlist')
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
 * The seat is created exclusively: an existing directory is never merged, overwritten or repaired.
 * If copying fails, only unchanged paths created by this call are removed.
 *
 * @param {string} sourceRoot product workspace root
 * @param {string} targetRoot existing target repository
 * @returns {{ seat: string, fileCount: number }} installed seat path and copied file count
 */
export function installSkill(sourceRoot, targetRoot) {
  const source = resolveSourceRoot(sourceRoot)
  const skill = join(source, 'skills/project-governance')
  const skillsStat = lstatSync(join(source, 'skills'))
  if (skillsStat.isSymbolicLink() || !skillsStat.isDirectory()) throw new Error('Skill source parent must be a real directory')
  const files = []
  function collect(directory, prefix = '') {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const name = prefix ? `${prefix}/${entry.name}` : entry.name
      const path = join(directory, entry.name)
      const stat = lstatSync(path)
      if (stat.isSymbolicLink()) throw new Error(`Skill symlinks are not supported: ${name}`)
      if (stat.isDirectory()) collect(path, name)
      else if (stat.isFile()) files.push(name)
      else throw new Error(`Skill entry is not a regular file or directory: ${name}`)
    }
  }
  const skillStat = lstatSync(skill)
  if (skillStat.isSymbolicLink() || !skillStat.isDirectory()) throw new Error('Skill source must be a real directory')
  collect(skill)
  for (const required of ['SKILL.md', 'LICENSE', 'SOURCE-LICENSE.txt', 'scripts/install-template.mjs', 'assets/template.json.gz']) {
    if (!files.includes(required)) throw new Error(`Skill source is missing ${required}`)
  }
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
  const created = []
  try {
    mkdirSync(seat)
    created.push({ path: seat, directory: true, identity: lstatSync(seat) })
    for (const name of files) {
      const destination = join(seat, name)
      const parentPath = dirname(destination)
      const missing = []
      for (let path = parentPath; path !== seat && !lstatSync(path, { throwIfNoEntry: false }); path = dirname(path)) missing.push(path)
      for (const path of missing.reverse()) {
        mkdirSync(path)
        created.push({ path, directory: true, identity: lstatSync(path) })
      }
      copyFileSync(join(skill, name), destination, constants.COPYFILE_EXCL)
      created.push({ path: destination, source: join(skill, name), identity: lstatSync(destination) })
    }
  } catch (error) {
    const remaining = []
    for (const item of created.reverse()) {
      try {
        if (item.directory) {
          const current = lstatSync(item.path, { throwIfNoEntry: false })
          if (!current) continue
          if (!current.isDirectory() || !item.identity.ino || current.ino !== item.identity.ino || current.dev !== item.identity.dev) {
            throw new Error('Created directory has changed')
          }
          rmdirSync(item.path)
        }
        else {
          const current = lstatSync(item.path, { throwIfNoEntry: false })
          if (!current) continue
          if (!current.isFile() || !item.identity.ino || current.ino !== item.identity.ino ||
              current.dev !== item.identity.dev || !readFileSync(item.path).equals(readFileSync(item.source))) {
            throw new Error('Created path has changed')
          }
          unlinkSync(item.path)
        }
      } catch {
        remaining.push(item.path)
      }
    }
    if (remaining.length) throw new Error(`${error.message}\nPaths requiring review: ${remaining.join(', ')}`, { cause: error })
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
