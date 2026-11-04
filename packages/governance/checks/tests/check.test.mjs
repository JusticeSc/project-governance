// Black-box regression for the configured-check contract: real CLI process, real policy files.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { after, describe, it } from 'node:test'
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  rmdirSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runChecks } from '@project-governance/checks'

const here = dirname(fileURLToPath(import.meta.url))
const cli = resolve(here, '../../../../apps/cli/bin/governance.mjs')
const bases = []

after(() => {
  for (const base of bases) rmSync(base, { recursive: true, force: true })
})

function makeBase() {
  const base = mkdtempSync(join(tmpdir(), 'governance-checks-'))
  bases.push(base)
  return base
}

function writePolicy(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

// The probe writes its marker next to itself, so an executed command leaves evidence on disk even
// when the CLI output is not inspected.
function writeProbe(dir, name = 'probe.cjs', marker = 'executed.txt') {
  const path = join(dir, name)
  writeFileSync(
    path,
    [
      "const { writeFileSync } = require('node:fs')",
      "const { join } = require('node:path')",
      `writeFileSync(join(__dirname, '${marker}'), 'executed\\n')`,
      "console.log('probe executed')",
      '',
    ].join('\n'),
  )
  return path
}

function commandFor(script) {
  return `"${process.execPath}" "${script}"`
}

function markerPath(dir) {
  return join(dir, 'executed.txt')
}

function makeRepository(base, name = 'repo') {
  const repo = join(base, name)
  mkdirSync(repo, { recursive: true })
  return repo
}

function runCli(args, cwd) {
  const child = spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8', timeout: 120_000 })
  if (child.error) throw child.error
  return child
}

function linkDirectory(target, path) {
  symlinkSync(resolve(target), path, process.platform === 'win32' ? 'junction' : 'dir')
}

function removeLink(path) {
  if (process.platform === 'win32') rmdirSync(path)
  else unlinkSync(path)
}

describe('configured checks', () => {
  it('runs the default governance-checks.json policy and writes no target state', () => {
    const base = makeBase()
    const repo = makeRepository(base)
    const probe = writeProbe(repo)
    writePolicy(join(repo, 'governance-checks.json'), { checks: { probe: commandFor(probe) } })

    const child = runCli(['check', repo], base)

    assert.equal(child.status, 0, `${child.stdout}\n${child.stderr}`)
    assert.match(child.stdout, /1\/1 configured checks passed/)
    assert.equal(readFileSync(markerPath(repo), 'utf8'), 'executed\n')
    assert.equal(existsSync(join(repo, '.governance')), false, 'check must not create .governance')
  })

  it('returns the exit code through the package interface', () => {
    const base = makeBase()
    const repo = makeRepository(base)
    const probe = writeProbe(repo)
    writePolicy(join(repo, 'governance-checks.json'), { checks: { probe: commandFor(probe) } })

    const stdout = console.log
    const stderr = console.error
    console.log = () => {}
    console.error = () => {}
    try {
      assert.equal(runChecks(repo), 0)
      assert.equal(readFileSync(markerPath(repo), 'utf8'), 'executed\n')
      writePolicy(join(repo, 'governance-checks.json'), { checks: {} })
      assert.equal(runChecks(repo), 2)
    } finally {
      console.log = stdout
      console.error = stderr
    }
    assert.equal(existsSync(join(repo, '.governance')), false)
  })

  it('validates every command before running any of them', () => {
    const base = makeBase()
    const repo = makeRepository(base)
    const probe = writeProbe(repo)
    writePolicy(join(repo, 'governance-checks.json'), {
      checks: { first: commandFor(probe), second: 42 },
    })

    const child = runCli(['check', repo], base)

    assert.equal(child.status, 2, `${child.stdout}\n${child.stderr}`)
    assert.match(child.stderr, /checks\.second/)
    assert.equal(existsSync(markerPath(repo)), false, 'a later invalid command must block all execution')
  })

  it('rejects NUL commands before any earlier check can execute', () => {
    const base = makeBase()
    const repo = makeRepository(base)
    const probe = writeProbe(repo)
    writePolicy(join(repo, 'governance-checks.json'), {
      checks: { first: commandFor(probe), invalid: 'node\u0000 --version' },
    })
    const child = runCli(['check', repo], base)
    assert.equal(child.status, 2, `${child.stdout}\n${child.stderr}`)
    assert.equal(existsSync(markerPath(repo)), false, 'invalid process input must block the whole plan')
  })

  it('refuses a policy without configured commands instead of deriving checks', () => {
    const base = makeBase()
    const repo = makeRepository(base)
    const probe = writeProbe(repo)
    writePolicy(join(repo, 'governance-checks.json'), { checks: {} })

    let child = runCli(['check', repo], base)
    assert.equal(child.status, 2, `${child.stdout}\n${child.stderr}`)
    assert.match(child.stderr, /never derived from project files/)

    writePolicy(join(repo, 'governance-checks.json'), { schema: 'x', checks: { blank: '   ' } })
    child = runCli(['check', repo], base)
    assert.equal(child.status, 2, `${child.stdout}\n${child.stderr}`)
    assert.match(child.stderr, /non-empty command string/)

    writePolicy(join(repo, 'governance-checks.json'), {})
    child = runCli(['check', repo], base)
    assert.equal(child.status, 2)
    assert.equal(existsSync(markerPath(repo)), false, 'no configured command may run for an invalid policy')
    assert.equal(existsSync(probe), true)
  })

  it('reports a failing command as exit 1 and recovers when the command passes again', () => {
    const base = makeBase()
    const repo = makeRepository(base)
    const probe = writeProbe(repo)
    writePolicy(join(repo, 'governance-checks.json'), {
      checks: { broken: `"${process.execPath}" -e "process.exit(3)"` },
    })

    const child = runCli(['check', repo], base)

    assert.equal(child.status, 1, `${child.stdout}\n${child.stderr}`)
    assert.match(child.stderr, /failed checks: broken/)
    assert.match(child.stdout, /observed exit 3/)

    writePolicy(join(repo, 'governance-checks.json'), { checks: { broken: commandFor(probe) } })
    const recovered = runCli(['check', repo], base)
    assert.equal(recovered.status, 0, `${recovered.stdout}\n${recovered.stderr}`)
    assert.equal(readFileSync(markerPath(repo), 'utf8'), 'executed\n')
  })

  it('reports a terminated command as exit 1', () => {
    const base = makeBase()
    const repo = makeRepository(base)
    writePolicy(join(repo, 'governance-checks.json'), {
      checks: { terminated: `"${process.execPath}" -e "process.kill(process.pid, 'SIGTERM')"` },
    })

    const child = runCli(['check', repo], base)

    assert.equal(child.status, 1, `${child.stdout}\n${child.stderr}`)
    assert.match(child.stderr, /failed checks: terminated/)
    // The command runs through the shell, so a signal that ends the command itself reaches the caller as
    // the shell's non-zero status; only a shell killed by a signal produces the `signal` line. Never assert
    // the shell's own signal bookkeeping as a portable fact.
    assert.match(child.stdout, /\[observed exit \d+(?:, signal \w+)?\]/)
  })

  it('treats missing, malformed and non-file policies as configuration errors', () => {
    const base = makeBase()
    const repo = makeRepository(base)

    let child = runCli(['check', repo], base)
    assert.equal(child.status, 2, `${child.stdout}\n${child.stderr}`)
    assert.match(child.stderr, /cannot read policy/)

    writeFileSync(join(repo, 'governance-checks.json'), '{ not json\n')
    child = runCli(['check', repo], base)
    assert.equal(child.status, 2)
    assert.match(child.stderr, /not valid JSON/)

    rmSync(join(repo, 'governance-checks.json'))
    mkdirSync(join(repo, 'governance-checks.json'))
    child = runCli(['check', repo], base)
    assert.equal(child.status, 2)
    assert.match(child.stderr, /is not a file/)

    child = runCli(['check', join(base, 'absent-repository')], base)
    assert.equal(child.status, 2)
    assert.match(child.stderr, /cannot open repository/)
    assert.equal(existsSync(join(base, 'absent-repository')), false)
  })

  it('runs an explicit repository-relative policy', () => {
    const base = makeBase()
    const repo = makeRepository(base)
    const probe = writeProbe(repo)
    mkdirSync(join(repo, 'config'))
    writePolicy(join(repo, 'config', 'checks.json'), { checks: { probe: commandFor(probe) } })

    const child = runCli(['check', repo, '--policy', 'config/checks.json'], base)

    assert.equal(child.status, 0, `${child.stdout}\n${child.stderr}`)
    assert.equal(readFileSync(markerPath(repo), 'utf8'), 'executed\n')
  })
})

describe('policy containment', () => {
  it('refuses a policy outside the target even though it executes alone', () => {
    const base = makeBase()
    const repo = makeRepository(base)
    const outside = join(base, 'outside-policy')
    mkdirSync(outside)
    const probe = writeProbe(outside)
    writePolicy(join(outside, 'policy.json'), { checks: { probe: commandFor(probe) } })

    const alone = runCli(['check', outside, '--policy', 'policy.json'], base)
    assert.equal(alone.status, 0, `${alone.stdout}\n${alone.stderr}`)
    assert.equal(readFileSync(markerPath(outside), 'utf8'), 'executed\n')
    rmSync(markerPath(outside))

    let child = runCli(['check', repo, '--policy', '../outside-policy/policy.json'], base)
    assert.equal(child.status, 2, `${child.stdout}\n${child.stderr}`)
    assert.match(child.stderr, /must resolve inside/)
    assert.equal(existsSync(markerPath(outside)), false, 'an outside policy must not execute')

    child = runCli(['check', repo, '--policy', join(outside, 'policy.json')], base)
    assert.equal(child.status, 2)
    assert.equal(existsSync(markerPath(outside)), false, 'an absolute outside policy must not execute')
  })

  it('refuses a policy redirected outside the target through a junction', () => {
    const base = makeBase()
    const repo = makeRepository(base)
    const outside = join(base, 'redirected-target')
    mkdirSync(outside)
    const probe = writeProbe(outside)
    writePolicy(join(outside, 'policy.json'), { checks: { probe: commandFor(probe) } })

    const redirected = join(repo, 'policy-link')
    linkDirectory(outside, redirected)
    try {
      const child = runCli(['check', repo, '--policy', 'policy-link/policy.json'], base)
      assert.equal(child.status, 2, `${child.stdout}\n${child.stderr}`)
      assert.match(child.stderr, /must resolve inside/)
      assert.equal(existsSync(markerPath(outside)), false, 'a redirected policy must not execute')
    } finally {
      removeLink(redirected)
    }
  })

  it('accepts a repository reached through a legitimate alias', () => {
    const base = makeBase()
    const repo = makeRepository(base)
    const probe = writeProbe(repo)
    writePolicy(join(repo, 'governance-checks.json'), { checks: { probe: commandFor(probe) } })

    const alias = join(base, 'repository alias')
    linkDirectory(repo, alias)
    try {
      const child = runCli(['check', alias], base)
      assert.equal(child.status, 0, `${child.stdout}\n${child.stderr}`)
      assert.equal(readFileSync(markerPath(repo), 'utf8'), 'executed\n')
      assert.equal(existsSync(join(repo, '.governance')), false)
      assert.equal(lstatSync(alias).isSymbolicLink(), true)
    } finally {
      removeLink(alias)
    }
  })
})

describe('check arguments', () => {
  it('rejects bad arguments before touching the repository', () => {
    const base = makeBase()
    const repo = makeRepository(base)
    const probe = writeProbe(repo)
    writePolicy(join(repo, 'governance-checks.json'), { checks: { probe: commandFor(probe) } })

    for (const args of [
      ['check', repo, '--policy'],
      ['check', repo, 'extra'],
      ['check', repo, '--unknown'],
      ['check', repo, '--policy', 'governance-checks.json', '--policy', 'governance-checks.json'],
    ]) {
      const child = runCli(args, base)
      assert.equal(child.status, 2, `${args.join(' ')}\n${child.stdout}\n${child.stderr}`)
      assert.equal(existsSync(markerPath(repo)), false, `${args.join(' ')} must not execute a check`)
    }

    const missing = runCli(['--help'], base)
    assert.equal(missing.status, 0)
    assert.match(missing.stdout, /project-governance check/)
  })
})
