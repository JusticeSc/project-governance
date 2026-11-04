import assert from 'node:assert/strict'
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { gzipSync } from 'node:zlib'
import { exportTemplate } from '../scripts/export-template.mjs'

const product = fileURLToPath(new URL('../', import.meta.url))
const script = join(product, 'scripts/install-template.mjs')

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'governance-template-install-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  return root
}

function install(target) {
  return spawnSync(process.execPath, [script, target], { cwd: product, encoding: 'utf8' })
}

function assertTemplate(target) {
  assert.deepEqual(readFileSync(join(target, 'package.json')), readFileSync(join(product, 'templates/node-typescript/package.json')))
  assert.deepEqual(readFileSync(join(target, '.gitignore')), readFileSync(join(product, 'templates/node-typescript/gitignore')))
  assert.equal(lstatSync(join(target, '.claude/skills')).isSymbolicLink(), true)
  assert.equal(realpathSync(join(target, '.claude/skills')), realpathSync(join(target, '.agents/skills')))
}

test('installs the fixed template directly into a new project', t => {
  const target = join(fixture(t), 'new-project')
  const result = install(target)
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
  assertTemplate(target)
})

test('a copied Skill inside the target installs the exact exported template without a workspace', t => {
  const root = fixture(t)
  const target = join(root, 'project')
  const seat = join(target, '.agents/skills/project-governance')
  mkdirSync(join(target, '.agents/skills'), { recursive: true })
  cpSync(join(product, 'skills/project-governance'), seat, { recursive: true })
  const skillBefore = readFileSync(join(seat, 'SKILL.md'))
  const reference = exportTemplate(join(root, 'reference'))
  const env = { ...process.env }
  delete env.NODE_PATH
  delete env.NODE_OPTIONS
  const result = spawnSync(process.execPath, [join(seat, 'scripts/install-template.mjs'), target], {
    cwd: root, env, encoding: 'utf8',
  })
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
  function installedFiles(directory, prefix = '') {
    return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
      const name = prefix ? `${prefix}/${entry.name}` : entry.name
      if (name === '.agents/skills/project-governance') return []
      return entry.isDirectory() ? installedFiles(join(directory, entry.name), name) : [name]
    })
  }
  assert.deepEqual(installedFiles(target).sort(), [...reference.files].sort())
  for (const name of reference.files) {
    const expected = join(reference.destination, name)
    const actual = join(target, name)
    if (lstatSync(expected).isSymbolicLink()) assert.equal(readlinkSync(actual), readlinkSync(expected), name)
    else assert.deepEqual(readFileSync(actual), readFileSync(expected), name)
  }
  assert.deepEqual(readFileSync(join(seat, 'SKILL.md')), skillBefore)
  assert.equal(existsSync(join(seat, 'node_modules')), false)
  const again = spawnSync(process.execPath, [join(seat, 'scripts/install-template.mjs'), target], { cwd: root, env, encoding: 'utf8' })
  assert.equal(again.status, 1, `${again.stdout}\n${again.stderr}`)
  assert.deepEqual(readFileSync(join(seat, 'SKILL.md')), skillBefore)
})

test('rejects unsafe payload paths and links without changing the target', t => {
  const root = fixture(t)
  const seat = join(root, 'skill')
  const target = join(root, 'project')
  cpSync(join(product, 'skills/project-governance'), seat, { recursive: true })
  mkdirSync(target)
  writeFileSync(join(target, 'owner.txt'), 'keep\n')
  for (const entry of [
    ['../outside.txt', 'file', Buffer.from('unexpected').toString('base64')],
    ['.claude/skills', 'link', '../../outside'],
  ]) {
    writeFileSync(join(seat, 'assets/template.json.gz'), gzipSync(Buffer.from(JSON.stringify([entry]))))
    const result = spawnSync(process.execPath, [join(seat, 'scripts/install-template.mjs'), target], { cwd: root, encoding: 'utf8' })
    assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`)
    assert.match(result.stderr, /Invalid template (?:path or entry|link)/u)
    assert.deepEqual(readdirSync(target), ['owner.txt'])
    assert.equal(readFileSync(join(target, 'owner.txt'), 'utf8'), 'keep\n')
    assert.equal(existsSync(join(root, 'outside.txt')), false)
  }
})

test('installs into an existing project without changing unrelated owner files', t => {
  const target = fixture(t)
  mkdirSync(join(target, 'apps'), { recursive: true })
  writeFileSync(join(target, 'apps/owner.txt'), 'owner content\n')
  const result = install(target)
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
  assertTemplate(target)
  assert.equal(readFileSync(join(target, 'apps/owner.txt'), 'utf8'), 'owner content\n')
})

test('reports file and redirected directory conflicts before writing to an existing project', t => {
  const root = fixture(t)
  const target = join(root, 'project')
  const outside = join(root, 'outside')
  mkdirSync(target)
  mkdirSync(outside)
  writeFileSync(join(target, 'package.json'), 'owner manifest\n')
  writeFileSync(join(outside, 'owner.txt'), 'outside content\n')
  symlinkSync(outside, join(target, '.agents'), process.platform === 'win32' ? 'junction' : 'dir')
  const result = install(target)
  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`)
  assert.match(result.stderr, /package\.json/u)
  assert.match(result.stderr, /\.agents/u)
  assert.equal(readFileSync(join(target, 'package.json'), 'utf8'), 'owner manifest\n')
  assert.equal(readFileSync(join(outside, 'owner.txt'), 'utf8'), 'outside content\n')
  assert.equal(existsSync(join(target, 'README.md')), false)
})

test('removes only newly created paths after a copy failure', t => {
  const root = fixture(t)
  const target = join(root, 'project')
  mkdirSync(target)
  writeFileSync(join(target, 'owner.txt'), 'owner content\n')
  const hook = join(root, 'inject-copy-failure.mjs')
  writeFileSync(hook, `
import fs from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'
import { resolve, sep } from 'node:path'
const copy = fs.copyFileSync
let copies = 0
fs.copyFileSync = (...args) => {
  if (resolve(args[1]).startsWith(resolve(process.env.INSTALL_TEST_TARGET) + sep) && ++copies === 2) {
    throw new Error('injected copy failure')
  }
  return copy(...args)
}
syncBuiltinESMExports()
`)
  const result = spawnSync(process.execPath, ['--import', pathToFileURL(hook).href, script, target], {
    cwd: product,
    encoding: 'utf8',
    env: { ...process.env, INSTALL_TEST_TARGET: target },
  })
  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`)
  assert.match(result.stderr, /injected copy failure/u)
  assert.deepEqual(readdirSync(target), ['owner.txt'])
  assert.equal(readFileSync(join(target, 'owner.txt'), 'utf8'), 'owner content\n')
})

test('preserves content added to a new target during a failed installation', t => {
  const root = fixture(t)
  const target = join(root, 'project')
  const hook = join(root, 'inject-owner-file.mjs')
  writeFileSync(hook, `
import fs from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'
import { resolve, sep } from 'node:path'
const copy = fs.copyFileSync
let copies = 0
fs.copyFileSync = (...args) => {
  if (resolve(args[1]).startsWith(resolve(process.env.INSTALL_TEST_TARGET) + sep) && ++copies === 2) {
    fs.writeFileSync(resolve(process.env.INSTALL_TEST_TARGET, 'owner.txt'), 'owner content\\n')
    throw new Error('injected copy failure')
  }
  return copy(...args)
}
syncBuiltinESMExports()
`)
  const result = spawnSync(process.execPath, ['--import', pathToFileURL(hook).href, script, target], {
    cwd: product,
    encoding: 'utf8',
    env: { ...process.env, INSTALL_TEST_TARGET: target },
  })
  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`)
  assert.match(result.stderr, /Paths requiring review/u)
  assert.deepEqual(readdirSync(target), ['owner.txt'])
  assert.equal(readFileSync(join(target, 'owner.txt'), 'utf8'), 'owner content\n')
})
