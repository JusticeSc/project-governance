import assert from 'node:assert/strict'
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

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
