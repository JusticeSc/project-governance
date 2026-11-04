import { constants, copyFileSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, realpathSync, rmSync, rmdirSync, statSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
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
        typeof content !== 'string' || !['file', 'link'].includes(kind)) {
      throw new Error(`Invalid template path or entry: ${name}`)
    }
    if (kind === 'link' && (name !== '.claude/skills' || content !== '../.agents/skills')) {
      throw new Error(`Invalid template link: ${name}`)
    }
    if (kind === 'file' && (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(content))) {
      throw new Error(`Invalid template file encoding: ${name}`)
    }
    names.add(name)
  }
  mkdirSync(destination)
  for (const [name, kind, content] of entries) {
    const path = join(destination, ...name.split('/'))
    mkdirSync(dirname(path), { recursive: true })
    if (kind === 'link') symlinkSync(content, path, 'dir')
    else writeFileSync(path, Buffer.from(content, 'base64'), { flag: 'wx' })
  }
  return { destination, files: [...names] }
}

function planTree(source, destination, relative, actions, conflicts) {
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const input = join(source, entry.name)
    const output = join(destination, entry.name)
    const name = relative ? `${relative}/${entry.name}` : entry.name
    const existing = lstatSync(output, { throwIfNoEntry: false })
    if (entry.isDirectory()) {
      if (existing && (!existing.isDirectory() || existing.isSymbolicLink())) {
        conflicts.push(name)
        continue
      }
      if (!existing) actions.push({ kind: 'directory', input, output })
      planTree(input, output, name, actions, conflicts)
    } else if (existing) {
      conflicts.push(name)
    } else {
      actions.push({ kind: entry.isSymbolicLink() ? 'link' : 'file', input, output })
    }
  }
}

function rollback(created) {
  const remaining = []
  for (const item of created.reverse()) {
    try {
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
        const unchanged = item.kind === 'link'
          ? current.isSymbolicLink() && readlinkSync(item.output) === readlinkSync(item.input)
          : current.isFile() && readFileSync(item.output).equals(readFileSync(item.input))
        if (!sameIdentity || !unchanged) throw new Error('Created path has changed')
        unlinkSync(item.output)
      }
    } catch {
      remaining.push(item.output)
    }
  }
  return remaining
}

function installTemplate(output) {
  if (typeof output !== 'string' || output.trim() === '') {
    throw new Error('usage: node <skill-dir>/scripts/install-template.mjs <project-directory>')
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
    planTree(staged.destination, destination, '', actions, conflicts)
    if (conflicts.length) throw new Error(`Existing paths prevent installation; no project files were changed:\n${conflicts.map(path => `  ${path}`).join('\n')}`)

    const created = []
    let attempted
    try {
      for (const action of actions) {
        attempted = action
        if (action.kind === 'directory') mkdirSync(action.output)
        else if (action.kind === 'link') symlinkSync(readlinkSync(action.input), action.output, 'dir')
        else copyFileSync(action.input, action.output, constants.COPYFILE_EXCL)
        const item = { ...action }
        created.push(item)
        item.identity = lstatSync(action.output)
        attempted = undefined
      }
    } catch (error) {
      const remaining = rollback(created)
      if (attempted && lstatSync(attempted.output, { throwIfNoEntry: false }) && !remaining.includes(attempted.output)) remaining.push(attempted.output)
      const recovery = remaining.length ? `\nPaths requiring review: ${remaining.join(', ')}` : '\nCreated paths were removed.'
      throw new Error(`${error.message}${recovery}`, { cause: error })
    }
    return { destination, files: staged.files }
  } finally {
    rmSync(temporary, { recursive: true, force: true })
  }
}

try {
  if (process.argv.length !== 3) throw new Error('usage: node <skill-dir>/scripts/install-template.mjs <project-directory>')
  const result = installTemplate(process.argv[2])
  console.log(`Installed ${result.files.length} template author files to ${result.destination}; no dependencies, hooks or build outputs.`)
} catch (error) {
  console.error(`install-template: ${error.message}`)
  process.exitCode = 1
}
