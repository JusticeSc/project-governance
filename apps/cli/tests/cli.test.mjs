// Black-box regression for the command surface: arguments, dispatch and exit codes only.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { after, describe, it } from 'node:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const cli = resolve(here, '../bin/governance.mjs')
const bases = []

after(() => {
  for (const base of bases) rmSync(base, { recursive: true, force: true })
})

function runCli(args) {
  const cwd = mkdtempSync(join(tmpdir(), 'governance-cli-'))
  bases.push(cwd)
  const child = spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8', timeout: 60_000 })
  if (child.error) throw child.error
  return child
}

describe('command surface', () => {
  it('prints help for a bare invocation and for --help', () => {
    for (const args of [[], ['--help'], ['-h'], ['help']]) {
      const child = runCli(args)
      assert.equal(child.status, 0, `${args.join(' ')}\n${child.stdout}\n${child.stderr}`)
      assert.match(child.stdout, /project-governance check \[repository\] \[--policy path\]/)
      assert.match(child.stdout, /project-governance install <existing-repository>/)
      assert.match(child.stdout, /npm ci --ignore-scripts/)
      assert.match(child.stdout, /0 all checks passed/)
      assert.equal(child.stderr, '')
    }
  })

  it('rejects an unknown command and unknown options', () => {
    let child = runCli(['verify'])
    assert.equal(child.status, 2, `${child.stdout}\n${child.stderr}`)
    assert.match(child.stderr, /unknown command: verify/)
    assert.equal(child.stdout, '')

    for (const args of [['check', '--policy'], ['check', 'a', 'b'], ['check', '--nope'], ['install'], ['install', 'a', 'b']]) {
      child = runCli(args)
      assert.equal(child.status, 2, `${args.join(' ')}\n${child.stdout}\n${child.stderr}`)
      assert.match(child.stderr, /^project-governance: /)
    }
  })

  it('prints help for install --help without installing', () => {
    const child = runCli(['install', '--help'])
    assert.equal(child.status, 0, `${child.stdout}\n${child.stderr}`)
    assert.match(child.stdout, /npm ci --ignore-scripts/)
  })

  it('reports exit 2 for a repository without a policy', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'governance-cli-empty-'))
    bases.push(cwd)
    const child = spawnSync(process.execPath, [cli, 'check'], { cwd, encoding: 'utf8', timeout: 60_000 })
    assert.equal(child.status, 2, `${child.stdout}\n${child.stderr}`)
    assert.match(child.stderr, /cannot read policy governance-checks\.json/)
  })
})
