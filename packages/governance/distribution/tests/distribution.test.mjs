// Black-box regression for distribution selection and installation: real files, real CLI.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { after, describe, it } from 'node:test'
import {
  copyFileSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  rmdirSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { installSkill, packageFiles, SEAT_PATH } from '@project-governance/distribution'

const here = dirname(fileURLToPath(import.meta.url))
const workspaceRoot = resolve(here, '../../../..')
const cli = join(workspaceRoot, 'apps/cli/bin/governance.mjs')
const bases = []

after(() => {
  for (const base of bases) rmSync(base, { recursive: true, force: true })
})

function makeBase() {
  const base = mkdtempSync(join(tmpdir(), 'governance-distribution-'))
  bases.push(base)
  return base
}

const DEFAULT_FILES = ['package.json', 'SKILL.md', 'LICENSE', 'reference/', 'scripts/*.mjs']

function createSourceRoot(base, files = DEFAULT_FILES) {
  const source = join(base, 'source')
  for (const directory of [
    'reference/nested',
    'reference/node_modules',
    'reference/.git',
    'reference/.cache',
    'scripts',
    'private',
    'skills/project-governance/reference/nested',
    'skills/project-governance/assets',
    'skills/project-governance/scripts',
  ]) {
    mkdirSync(join(source, directory), { recursive: true })
  }
  writeFileSync(
    join(source, 'package.json'),
    `${JSON.stringify({ name: 'fixture-skill', version: '0.0.0', private: true, files }, null, 2)}\n`,
  )
  writeFileSync(join(source, 'SKILL.md'), '# fixture skill\n')
  writeFileSync(join(source, 'LICENSE'), 'MIT\n')
  writeFileSync(join(source, 'reference/a.md'), '# a\n')
  writeFileSync(join(source, 'reference/nested/b.md'), '# b\n')
  writeFileSync(join(source, 'reference/node_modules/ignored.js'), 'ignored\n')
  writeFileSync(join(source, 'reference/.git/config'), 'ignored\n')
  writeFileSync(join(source, 'reference/.cache/ignored'), 'ignored\n')
  writeFileSync(join(source, 'scripts/one.mjs'), 'export const one = 1\n')
  writeFileSync(join(source, 'scripts/two.mjs'), 'export const two = 2\n')
  writeFileSync(join(source, 'scripts/ignored.txt'), 'ignored\n')
  writeFileSync(join(source, 'private/secret.txt'), 'secret\n')
  writeFileSync(join(source, 'skills/project-governance/SKILL.md'), '# fixture skill\n')
  writeFileSync(join(source, 'skills/project-governance/reference/nested/b.md'), '# b\n')
  writeFileSync(join(source, 'skills/project-governance/LICENSE'), 'MIT\n')
  writeFileSync(join(source, 'skills/project-governance/SOURCE-LICENSE.txt'), 'attribution\n')
  writeFileSync(join(source, 'skills/project-governance/assets/template.json.gz'), 'fixture payload\n')
  writeFileSync(join(source, 'skills/project-governance/scripts/install-template.mjs'), '// fixture installer\n')
  return source
}

function createProductFixture(base) {
  const source = join(base, 'product')
  for (const name of packageFiles(workspaceRoot)) {
    const destination = join(source, name)
    mkdirSync(dirname(destination), { recursive: true })
    copyFileSync(join(workspaceRoot, name), destination)
  }
  const claude = join(source, 'templates/node-typescript/.claude')
  mkdirSync(claude, { recursive: true })
  writeFileSync(join(claude, 'settings.json'), '{"local":"do not distribute"}\n')
  writeFileSync(join(claude, 'settings.local.json'), '{"local":"do not distribute"}\n')
  return source
}

function linkDirectory(target, path) {
  symlinkSync(resolve(target), path, process.platform === 'win32' ? 'junction' : 'dir')
}

function removeLink(path) {
  if (process.platform === 'win32') rmdirSync(path)
  else unlinkSync(path)
}

function runCli(args, cwd) {
  const child = spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8', timeout: 120_000 })
  if (child.error) throw child.error
  return child
}

describe('distribution selection', () => {
  it('selects exactly the allowlist and skips private paths, dependencies and caches', () => {
    const base = makeBase()
    const source = createSourceRoot(base)

    assert.deepEqual(packageFiles(source), [
      'LICENSE',
      'SKILL.md',
      'package.json',
      'reference/a.md',
      'reference/nested/b.md',
      'scripts/one.mjs',
      'scripts/two.mjs',
    ])
  })

  it('distributes project skills without agent-local settings or links', () => {
    const source = createProductFixture(makeBase())
    const files = packageFiles(source)
    assert.ok(files.includes('templates/node-typescript/.agents/skills/dsh-doc/SKILL.md'))
    assert.ok(!files.some(file => file.startsWith('templates/node-typescript/.claude/')))
  })

  it('exports project skills without agent-local settings or links', () => {
    const base = makeBase()
    const source = createProductFixture(base)
    const dependency = join(source, 'node_modules/@project-governance/distribution')
    mkdirSync(dirname(dependency), { recursive: true })
    cpSync(join(source, 'packages/governance/distribution'), dependency, { recursive: true })
    const destination = join(base, 'exported')
    const child = spawnSync(process.execPath, [join(source, 'scripts/export-template.mjs'), destination], {
      cwd: source,
      encoding: 'utf8',
      timeout: 120_000,
    })
    if (child.error) throw child.error
    assert.equal(child.status, 0, `${child.stdout}\n${child.stderr}`)
    assert.equal(existsSync(join(destination, '.claude/skills')), false)
    assert.equal(
      readFileSync(join(destination, '.agents/skills/dsh-doc/SKILL.md'), 'utf8'),
      readFileSync(join(source, 'templates/node-typescript/.agents/skills/dsh-doc/SKILL.md'), 'utf8'),
    )
    assert.equal(existsSync(join(destination, '.claude/settings.json')), false)
    assert.equal(existsSync(join(destination, '.claude/settings.local.json')), false)
  })

  it('keeps dependency exclusions when a glob overlaps a selected directory', () => {
    const source = createSourceRoot(makeBase(), [...DEFAULT_FILES, 'reference/**/*.js'])
    writeFileSync(join(source, 'reference/nested/visible.js'), 'export const visible = true\n')
    assert.deepEqual(packageFiles(source), [
      'LICENSE',
      'SKILL.md',
      'package.json',
      'reference/a.md',
      'reference/nested/b.md',
      'reference/nested/visible.js',
      'scripts/one.mjs',
      'scripts/two.mjs',
    ])
  })

  it('rejects an explicitly selected file beneath an internal directory alias', () => {
    const source = createSourceRoot(makeBase(), ['package.json', 'LICENSE', 'linked/secret.txt'])
    linkDirectory(join(source, 'private'), join(source, 'linked'))
    try {
      assert.throws(() => packageFiles(source), /symlinks are not supported/)
    } finally {
      removeLink(join(source, 'linked'))
    }
  })

  it('refuses escape, symlink, missing and non-matching entries', () => {
    const base = makeBase()
    const outside = join(base, 'outside')
    mkdirSync(outside)
    writeFileSync(join(outside, 'payload.txt'), 'outside\n')

    let source = createSourceRoot(base, ['package.json', '../outside/payload.txt'])
    assert.throws(() => packageFiles(source), /unsafe package path|outside the source root/)

    source = createSourceRoot(base, ['package.json', join(base, 'outside', 'payload.txt')])
    assert.throws(() => packageFiles(source), /repository-relative/)

    source = createSourceRoot(base, ['package.json', 'missing.md'])
    assert.throws(() => packageFiles(source), /does not exist/)

    source = createSourceRoot(base, ['package.json', 'scripts/*.ts'])
    assert.throws(() => packageFiles(source), /no matching files/)

    source = createSourceRoot(base, ['package.json', 'linked'])
    linkDirectory(outside, join(source, 'linked'))
    try {
      assert.throws(() => packageFiles(source), /symlinks are not supported/)
    } finally {
      removeLink(join(source, 'linked'))
    }

    source = createSourceRoot(base, ['package.json', 'reference/'])
    linkDirectory(outside, join(source, 'reference', 'escaped'))
    try {
      assert.throws(() => packageFiles(source), /symlinks are not supported/)
    } finally {
      removeLink(join(source, 'reference', 'escaped'))
    }
  })

  it('requires the workspace manifest and the source notice in the allowlist', () => {
    const base = makeBase()
    let source = createSourceRoot(base, ['SKILL.md', 'reference/'])

    assert.throws(() => packageFiles(source), /must list "package.json"/)

    source = createSourceRoot(base, ['package.json', 'SKILL.md', 'LICENSE', 'reference/'])
    writeFileSync(join(source, 'SOURCE-LICENSE.txt'), 'attribution\n')
    assert.throws(() => packageFiles(source), /SOURCE-LICENSE\.txt must be listed/)

    writeFileSync(
      join(source, 'package.json'),
      `${JSON.stringify(
        {
          name: 'fixture-skill',
          version: '0.0.0',
          private: true,
          files: ['package.json', 'SKILL.md', 'LICENSE', 'reference/', 'SOURCE-LICENSE.txt'],
        },
        null,
        2,
      )}\n`,
    )
    const files = packageFiles(source)
    assert.ok(files.includes('SOURCE-LICENSE.txt'))
    assert.ok(files.includes('LICENSE'))
  })
})

describe('installation', () => {
  it('installs only the Skill files into a new seat and returns the location and count', () => {
    const base = makeBase()
    const source = createSourceRoot(base)
    const target = join(base, 'target')
    mkdirSync(target)
    writeFileSync(join(target, 'README.md'), '# consumer\n')
    mkdirSync(join(target, '.agents/skills/other-skill'), { recursive: true })
    writeFileSync(join(target, '.agents/skills/other-skill/keep.md'), '# keep\n')

    const result = installSkill(source, target)
    const expected = ['SKILL.md', 'LICENSE', 'SOURCE-LICENSE.txt', 'reference/nested/b.md', 'assets/template.json.gz', 'scripts/install-template.mjs']

    assert.equal(result.seat, join(target, SEAT_PATH))
    assert.equal(result.fileCount, expected.length)
    for (const name of expected) assert.equal(existsSync(join(result.seat, name)), true, name)
    assert.equal(readFileSync(join(result.seat, 'SKILL.md'), 'utf8'), '# fixture skill\n')
    assert.equal(readFileSync(join(result.seat, 'reference/nested/b.md'), 'utf8'), '# b\n')
    assert.equal(readFileSync(join(target, 'README.md'), 'utf8'), '# consumer\n')
    assert.equal(readFileSync(join(target, '.agents/skills/other-skill/keep.md'), 'utf8'), '# keep\n')
    assert.equal(lstatSync(join(target, '.agents')).isDirectory(), true)
    assert.equal(existsSync(join(result.seat, 'package.json')), false)
    assert.equal(existsSync(join(result.seat, 'private')), false)
  })

  it('refuses an existing seat without overwriting it', () => {
    const base = makeBase()
    const source = createSourceRoot(base)
    const target = join(base, 'target')
    mkdirSync(join(target, SEAT_PATH), { recursive: true })
    writeFileSync(join(target, SEAT_PATH, 'SKILL.md'), '# user edited\n')

    assert.throws(() => installSkill(source, target), /already exists/)

    assert.equal(readFileSync(join(target, SEAT_PATH, 'SKILL.md'), 'utf8'), '# user edited\n')
    assert.deepEqual(readdirSync(join(target, SEAT_PATH)), ['SKILL.md'])

    rmSync(join(target, SEAT_PATH), { recursive: true, force: true })
    const recovered = installSkill(source, target)
    assert.equal(recovered.fileCount, 6)
    assert.equal(readFileSync(join(recovered.seat, 'SKILL.md'), 'utf8'), '# fixture skill\n')
  })

  it('refuses redirected parents and writes nothing outside the target', () => {
    const base = makeBase()
    const source = createSourceRoot(base)
    const outside = join(base, 'outside')
    mkdirSync(outside)

    const redirectedAgents = join(base, 'redirected-agents')
    mkdirSync(redirectedAgents)
    linkDirectory(outside, join(redirectedAgents, '.agents'))
    try {
      assert.throws(() => installSkill(source, redirectedAgents), /\.agents must be a real directory/)
      assert.equal(existsSync(join(outside, 'skills')), false)
    } finally {
      removeLink(join(redirectedAgents, '.agents'))
    }

    const redirectedSkills = join(base, 'redirected-skills')
    mkdirSync(join(redirectedSkills, '.agents'), { recursive: true })
    linkDirectory(outside, join(redirectedSkills, '.agents/skills'))
    try {
      assert.throws(() => installSkill(source, redirectedSkills), /skills must be a real directory/)
      assert.equal(existsSync(join(outside, 'project-governance')), false)
    } finally {
      removeLink(join(redirectedSkills, '.agents/skills'))
    }
  })

  it('rejects targets that are missing, files, or unusable', () => {
    const base = makeBase()
    const source = createSourceRoot(base)
    const file = join(base, 'file.txt')
    writeFileSync(file, 'not a repository\n')

    assert.throws(() => installSkill(source, join(base, 'absent')), /does not exist/)
    assert.equal(existsSync(join(base, 'absent')), false)
    assert.throws(() => installSkill(source, file), /not a directory/)
  })
})

describe('CLI installation', () => {
  it('installs the standalone Skill and never overwrites it', () => {
    const base = makeBase()
    const target = join(base, '项目 consumer repo')
    mkdirSync(target)
    writeFileSync(join(target, 'README.md'), '# consumer\n')

    const first = runCli(['install', target], base)
    assert.equal(first.status, 0, `${first.stdout}\n${first.stderr}`)
    assert.match(first.stdout, /Next: read SKILL\.md/)
    const seat = join(target, SEAT_PATH)
    assert.deepEqual(readFileSync(join(seat, 'SKILL.md')), readFileSync(join(workspaceRoot, 'skills/project-governance/SKILL.md')))
    assert.deepEqual(readFileSync(join(seat, 'assets/template.json.gz')), readFileSync(join(workspaceRoot, 'skills/project-governance/assets/template.json.gz')))
    assert.equal(existsSync(join(seat, 'scripts/install-template.mjs')), true)
    assert.equal(existsSync(join(seat, 'package.json')), false)
    assert.equal(existsSync(join(seat, 'templates')), false)

    writeFileSync(join(seat, 'SKILL.md'), '# user edited seat\n')
    const second = runCli(['install', target], base)
    assert.equal(second.status, 1, `${second.stdout}\n${second.stderr}`)
    assert.match(second.stderr, /already exists/)
    assert.equal(readFileSync(join(seat, 'SKILL.md'), 'utf8'), '# user edited seat\n')
    assert.equal(readFileSync(join(target, 'README.md'), 'utf8'), '# consumer\n')
  })

  it('refuses redirected parents and absent targets through the CLI', () => {
    const base = makeBase()
    const outside = join(base, 'outside')
    mkdirSync(outside)
    const target = join(base, 'redirected project')
    mkdirSync(target)
    linkDirectory(outside, join(target, '.agents'))
    try {
      const child = runCli(['install', target], base)
      assert.equal(child.status, 1, `${child.stdout}\n${child.stderr}`)
      assert.match(child.stderr, /real directory/)
      assert.equal(existsSync(join(outside, 'skills')), false)
    } finally {
      removeLink(join(target, '.agents'))
    }

    const absent = join(base, 'absent repository')
    const missing = runCli(['install', absent], base)
    assert.equal(missing.status, 1, `${missing.stdout}\n${missing.stderr}`)
    assert.equal(existsSync(absent), false)
  })
})
