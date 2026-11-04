import { constants, copyFileSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, rmdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { gunzipSync } from 'node:zlib'

// The compressed archive contains only files exported by the product's fixed-template exporter.
function stageTemplate(destination) {
  const entries = JSON.parse(gunzipSync(readFileSync(new URL('../assets/template.json.gz', import.meta.url))).toString('utf8'))
  if (!Array.isArray(entries) || entries.length === 0) throw new Error('Invalid template payload')
  const names = new Set()
  for (const entry of entries) {
    if (!Array.isArray(entry) || entry.length !== 3) throw new Error('Invalid template entry')
    const [name, kind, content] = entry
    if (typeof name !== 'string' || name.includes('\\') || name.includes(':') ||
        name.split('/').some(part => !part || part === '.' || part === '..') || names.has(name) ||
        typeof content !== 'string' || kind !== 'file') {
      throw new Error(`Invalid template path or entry: ${name}`)
    }
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(content)) {
      throw new Error(`Invalid template file encoding: ${name}`)
    }
    names.add(name)
  }
  mkdirSync(destination)
  for (const [name, , content] of entries) {
    const path = join(destination, ...name.split('/'))
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, Buffer.from(content, 'base64'), { flag: 'wx' })
  }
  return { destination, files: [...names] }
}

function planTree(source, destination, path, actions, conflicts, redirects) {
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const input = join(source, entry.name)
    const output = join(destination, entry.name)
    const name = path ? `${path}/${entry.name}` : entry.name
    const existing = lstatSync(output, { throwIfNoEntry: false })
    if (existing?.isSymbolicLink() &&
        (entry.isDirectory() || statSync(output, { throwIfNoEntry: false })?.isDirectory())) {
      conflicts.push(name)
      redirects.push(name)
    } else if (entry.isDirectory()) {
      if (existing && !existing.isDirectory()) {
        conflicts.push(name)
        continue
      }
      if (!existing) actions.push({ kind: 'directory', input, output })
      planTree(input, output, name, actions, conflicts, redirects)
    } else if (existing) {
      conflicts.push(name)
    } else {
      actions.push({ kind: 'file', input, output })
    }
  }
}

// Check every inner ancestor before writing or removing a path. The target
// itself is canonicalized when it already exists, so root aliases remain valid.
function requireSafeParents(destination, output) {
  if (output === destination) return
  let directory = destination
  for (const part of ['', ...relative(destination, dirname(output)).split(sep).filter(Boolean)]) {
    if (part) directory = join(directory, part)
    const current = lstatSync(directory)
    if (current.isSymbolicLink() || !current.isDirectory()) {
      throw new Error(`Target directory was redirected or changed: ${directory}`)
    }
  }
}

function rollback(created, destination) {
  const remaining = []
  for (const item of created.reverse()) {
    try {
      requireSafeParents(destination, item.output)
      if (item.kind === 'directory') {
        const current = lstatSync(item.output, { throwIfNoEntry: false })
        if (!current) continue
        if (!current.isDirectory() || !item.identity?.ino || current.ino !== item.identity.ino || current.dev !== item.identity.dev) {
          throw new Error('Created directory has changed')
        }
        rmdirSync(item.output)
      } else {
        const current = lstatSync(item.output, { throwIfNoEntry: false })
        if (!current) continue
        const sameIdentity = item.identity && item.identity.ino !== 0 && current.ino === item.identity.ino && current.dev === item.identity.dev
        const unchanged = current.isFile() && readFileSync(item.output).equals(readFileSync(item.input))
        if (!sameIdentity || !unchanged) throw new Error('Created path has changed')
        unlinkSync(item.output)
      }
    } catch {
      remaining.push(item.output)
    }
  }
  return remaining
}

function installTemplate(output, addMissing) {
  if (typeof output !== 'string' || output.trim() === '' || output.startsWith('--')) {
    throw new Error('usage: node <skill-dir>/scripts/install-template.mjs [--add-missing] <project-directory>')
  }
  const requested = resolve(output)
  const existing = lstatSync(requested, { throwIfNoEntry: false })
  const destination = existing ? realpathSync(requested) : requested
  if (existing && !statSync(destination).isDirectory()) throw new Error(`Target is not a directory: ${requested}`)

  const temporary = mkdtempSync(join(tmpdir(), 'project-governance-template-'))
  try {
    const staged = stageTemplate(join(temporary, 'template'))
    const actions = existing ? [] : [{ kind: 'directory', output: destination }]
    const conflicts = []
    const redirects = []
    planTree(staged.destination, destination, '', actions, conflicts, redirects)
    const list = conflicts.map(path => `  ${path}`).join('\n')
    if (redirects.length) {
      throw new Error(`Redirected target directories prevent installation; no project files were changed. Existing conflicts:\n${list}`)
    }
    if (conflicts.length && !addMissing) {
      throw new Error(`Existing paths prevent installation; no project files were changed:\n${list}`)
    }
    if (conflicts.length) console.error(`Existing conflicts (not overwritten):\n${list}`)

    const created = []
    let attempted
    try {
      for (const action of actions) {
        attempted = action
        requireSafeParents(destination, action.output)
        if (action.kind === 'directory') mkdirSync(action.output)
        else copyFileSync(action.input, action.output, constants.COPYFILE_EXCL)
        const item = { ...action }
        created.push(item)
        item.identity = lstatSync(action.output)
        attempted = undefined
      }
    } catch (error) {
      const remaining = rollback(created, destination)
      if (attempted && !remaining.includes(attempted.output)) remaining.push(attempted.output)
      const recovery = remaining.length ? `\nPaths requiring review: ${remaining.join(', ')}` : '\nCreated paths were removed.'
      throw new Error(`${error.message}${recovery}`, { cause: error })
    }
    return { destination, copied: actions.filter(action => action.kind === 'file').length, conflicts }
  } finally {
    rmSync(temporary, { recursive: true, force: true })
  }
}

try {
  const args = process.argv.slice(2)
  const addMissing = args[0] === '--add-missing'
  if (args.length !== (addMissing ? 2 : 1)) {
    throw new Error('usage: node <skill-dir>/scripts/install-template.mjs [--add-missing] <project-directory>')
  }
  const result = installTemplate(args[addMissing ? 1 : 0], addMissing)
  if (result.conflicts.length) {
    console.log(`Partial installation: added ${result.copied} template author files to ${result.destination}; ${result.conflicts.length} conflicts remain for reconciliation.`)
    process.exitCode = 3
  } else {
    console.log(`Installed ${result.copied} template author files to ${result.destination}; no dependencies, hooks or build outputs.`)
  }
} catch (error) {
  console.error(`install-template: ${error.message}`)
  process.exitCode = 1
}
