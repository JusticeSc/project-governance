import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it, onTestFinished } from 'vitest'
import { removeFixtureSafely } from './test-fixture-cleanup.ts'
import { copySelectedWorkspaceFixture, copyWorkspaceFixture, selectWorkspaceFixtureInputs } from './workspace-fixture.ts'

it('keeps current author bytes and untracked inputs without copying ignored transient probes', () => {
  const source = mkdtempSync(join(tmpdir(), 'dsh-fixture-inputs-'))
  const checkout = source + '-checkout'
  onTestFinished(() => { removeFixtureSafely(checkout); removeFixtureSafely(source) })
  execFileSync('git', ['init', '--quiet', source])
  writeFileSync(join(source, '.gitignore'), 'generated-probe.ts\n')
  writeFileSync(join(source, 'author.ts'), 'export const value = 1\n')
  execFileSync('git', ['add', '--all'], { cwd: source })
  writeFileSync(join(source, 'author.ts'), 'export const value = 2\n')
  writeFileSync(join(source, 'new-author.ts'), 'export const added = true\n')
  writeFileSync(join(source, 'generated-probe.ts'), 'temporary probe\n')

  copyWorkspaceFixture(source, checkout)

  expect(readFileSync(join(checkout, 'author.ts'), 'utf8')).toBe('export const value = 2\n')
  expect(readFileSync(join(checkout, 'new-author.ts'), 'utf8')).toBe('export const added = true\n')
  expect(existsSync(join(checkout, 'generated-probe.ts'))).toBe(false)
})

it('ignores a transient file removed after selection and copies the latest selected bytes', () => {
  const source = mkdtempSync(join(tmpdir(), 'dsh-fixture-selection-'))
  const checkout = source + '-checkout'
  onTestFinished(() => { removeFixtureSafely(checkout); removeFixtureSafely(source) })
  writeFileSync(join(source, 'gitignore'), 'generated-probe.ts\n')
  writeFileSync(join(source, 'author.ts'), 'before selection\n')
  writeFileSync(join(source, 'generated-probe.ts'), 'transient\n')
  const inputs = selectWorkspaceFixtureInputs(source)
  rmSync(join(source, 'generated-probe.ts'))
  writeFileSync(join(source, 'author.ts'), 'current working bytes\n')

  copySelectedWorkspaceFixture(inputs, checkout)

  expect(readFileSync(join(checkout, 'author.ts'), 'utf8')).toBe('current working bytes\n')
  expect(existsSync(join(checkout, 'generated-probe.ts'))).toBe(false)
})

it('fails with the selected author path when that input disappears before copying', () => {
  const source = mkdtempSync(join(tmpdir(), 'dsh-fixture-missing-'))
  const checkout = source + '-checkout'
  onTestFinished(() => { removeFixtureSafely(checkout); removeFixtureSafely(source) })
  writeFileSync(join(source, 'author.ts'), 'author bytes\n')
  const inputs = selectWorkspaceFixtureInputs(source)
  rmSync(join(source, 'author.ts'))

  expect(() => { copySelectedWorkspaceFixture(inputs, checkout) }).toThrow('Cannot copy selected fixture author author.ts')
  expect(existsSync(join(checkout, 'author.ts'))).toBe(false)
})

it('retains deleted tracked authors in the selection and refuses to silently omit them', () => {
  const source = mkdtempSync(join(tmpdir(), 'dsh-fixture-tracked-missing-'))
  const checkout = source + '-checkout'
  onTestFinished(() => { removeFixtureSafely(checkout); removeFixtureSafely(source) })
  execFileSync('git', ['init', '--quiet', '--template=', source])
  writeFileSync(join(source, 'author.ts'), 'author bytes\n')
  execFileSync('git', ['add', 'author.ts'], { cwd: source })
  rmSync(join(source, 'author.ts'))

  expect(() => { copyWorkspaceFixture(source, checkout) }).toThrow('Cannot copy selected fixture author author.ts')
})

it.each(['leaf', 'ancestor'] as const)('rejects a selected %s link and cleans up without touching its target', (kind) => {
  const temporary = mkdtempSync(join(tmpdir(), 'dsh-fixture-links-'))
  const source = join(temporary, 'source')
  const external = join(temporary, 'external')
  const checkout = join(temporary, 'checkout')
  onTestFinished(() => { removeFixtureSafely(temporary) })
  mkdirSync(join(source, 'src'), { recursive: true })
  mkdirSync(external)
  writeFileSync(join(source, 'src', 'author.ts'), 'author bytes\n')
  writeFileSync(join(external, 'author.ts'), 'external bytes\n')
  const inputs = selectWorkspaceFixtureInputs(source)
  if (kind === 'ancestor') {
    rmSync(join(source, 'src'), { recursive: true })
    symlinkSync(external, join(source, 'src'), process.platform === 'win32' ? 'junction' : 'dir')
  } else {
    rmSync(join(source, 'src', 'author.ts'))
    // Directory junctions also exercise leaf rejection without Windows symlink privileges.
    symlinkSync(external, join(source, 'src', 'author.ts'), process.platform === 'win32' ? 'junction' : 'dir')
  }

  expect(() => { copySelectedWorkspaceFixture(inputs, checkout) }).toThrow('Cannot copy selected fixture author src/author.ts')
  expect(existsSync(join(checkout, 'src', 'author.ts'))).toBe(false)
  removeFixtureSafely(source)
  removeFixtureSafely(checkout)
  expect(readFileSync(join(external, 'author.ts'), 'utf8')).toBe('external bytes\n')
})

it('uses distributed ignore rules without borrowing the enclosing repository index', () => {
  const temporary = mkdtempSync(join(tmpdir(), 'dsh-fixture-distribution-'))
  const source = join(temporary, 'distribution')
  const checkout = join(temporary, 'checkout')
  onTestFinished(() => { removeFixtureSafely(temporary) })
  execFileSync('git', ['init', '--quiet', '--template=', temporary])
  mkdirSync(join(source, '.claude'), { recursive: true })
  mkdirSync(join(source, 'nested'), { recursive: true })
  writeFileSync(join(temporary, '.gitignore'), 'distribution/\n')
  writeFileSync(join(source, 'gitignore'), 'generated-probe.ts\nnode_modules/\n')
  writeFileSync(join(source, 'author.ts'), 'distributed author\n')
  writeFileSync(join(source, 'generated-probe.ts'), 'transient\n')
  writeFileSync(join(source, '.claude', 'skills'), '../.agents/skills\n')
  writeFileSync(join(source, 'nested', 'gitignore'), 'transient.yaml\n')
  writeFileSync(join(source, 'nested', 'author.ts'), 'nested author\n')
  writeFileSync(join(source, 'nested', 'transient.yaml'), 'transient\n')
  mkdirSync(join(source, 'node_modules'))
  writeFileSync(join(source, 'node_modules', 'dependency.txt'), 'dependency\n')

  copyWorkspaceFixture(source, checkout)

  expect(readFileSync(join(checkout, 'author.ts'), 'utf8')).toBe('distributed author\n')
  expect(readFileSync(join(checkout, 'nested', 'author.ts'), 'utf8')).toBe('nested author\n')
  expect(readFileSync(join(checkout, '.claude', 'skills'), 'utf8')).toBe('../.agents/skills\n')
  expect(existsSync(join(checkout, 'generated-probe.ts'))).toBe(false)
  expect(existsSync(join(checkout, 'nested', 'transient.yaml'))).toBe(false)
  expect(existsSync(join(checkout, 'node_modules'))).toBe(false)
})

it('honors both ignore layouts and refuses to borrow a host-wide excludes file', () => {
  const root = mkdtempSync(join(tmpdir(), 'dsh-fixture-both-layouts-'))
  const source = join(root, 'project')
  const checkout = join(root, 'checkout')
  onTestFinished(() => { removeFixtureSafely(root) })
  mkdirSync(join(source, 'nested'), { recursive: true })
  writeFileSync(join(source, '.gitignore'), 'node_modules/\n')
  writeFileSync(join(source, 'gitignore'), 'generated-probe.ts\n')
  writeFileSync(join(source, 'nested', 'gitignore'), 'transient.yaml\n')
  writeFileSync(join(source, 'author.ts'), 'both-layout author\n')
  writeFileSync(join(source, 'generated-probe.ts'), 'transient\n')
  writeFileSync(join(source, 'nested', 'transient.yaml'), 'transient\n')
  writeFileSync(join(source, 'host-excluded.ts'), 'host ignore must not decide author inputs\n')
  writeFileSync(join(root, 'host-excludes'), 'host-excluded.ts\n')
  writeFileSync(join(root, 'global.gitconfig'), `[core]\n\texcludesFile = ${join(root, 'host-excludes').replaceAll('\\', '/')}\n`)
  const previous = process.env.GIT_CONFIG_GLOBAL
  process.env.GIT_CONFIG_GLOBAL = join(root, 'global.gitconfig')
  try {
    copyWorkspaceFixture(source, checkout)
  } finally {
    if (previous === undefined) delete process.env.GIT_CONFIG_GLOBAL
    else process.env.GIT_CONFIG_GLOBAL = previous
  }

  expect(readFileSync(join(checkout, 'author.ts'), 'utf8')).toBe('both-layout author\n')
  expect(readFileSync(join(checkout, 'host-excluded.ts'), 'utf8')).toBe('host ignore must not decide author inputs\n')
  expect(existsSync(join(checkout, 'generated-probe.ts'))).toBe(false)
  expect(existsSync(join(checkout, 'nested', 'transient.yaml'))).toBe(false)
})

it('refuses to prepare a checkout from a tree without author inputs', () => {
  const source = mkdtempSync(join(tmpdir(), 'dsh-fixture-empty-'))
  const checkout = source + '-checkout'
  onTestFinished(() => { removeFixtureSafely(checkout); removeFixtureSafely(source) })

  expect(() => { copyWorkspaceFixture(source, checkout) }).toThrow(/No author inputs selected/u)
  expect(existsSync(checkout)).toBe(false)
})

it('refuses tracked ignored authors rather than copying private data', () => {
  const source = mkdtempSync(join(tmpdir(), 'dsh-fixture-ignored-author-'))
  const checkout = source + '-checkout'
  onTestFinished(() => { removeFixtureSafely(checkout); removeFixtureSafely(source) })
  execFileSync('git', ['init', '--quiet', '--template=', source])
  writeFileSync(join(source, '.gitignore'), '.env\n')
  writeFileSync(join(source, '.env'), 'synthetic private data\n')
  execFileSync('git', ['add', '--force', '.env'], { cwd: source })

  expect(() => { copyWorkspaceFixture(source, checkout) }).toThrow(/tracked files are ignored: \.env/u)
  expect(existsSync(join(checkout, '.env'))).toBe(false)
})

it('copies exported skill authors while excluding their linked client entry points', () => {
  const source = mkdtempSync(join(tmpdir(), 'dsh-fixture-export-links-'))
  const checkout = source + '-checkout'
  onTestFinished(() => { removeFixtureSafely(checkout); removeFixtureSafely(source) })
  const skills = join(source, '.agents', 'skills')
  mkdirSync(join(skills, 'author'), { recursive: true })
  mkdirSync(join(source, '.claude'))
  writeFileSync(join(source, 'gitignore'), 'node_modules/\n')
  writeFileSync(join(skills, 'author', 'marker.txt'), 'exported skill author\n')
  symlinkSync(process.platform === 'win32' ? skills : '../.agents/skills', join(source, '.claude', 'skills'),
    process.platform === 'win32' ? 'junction' : 'dir')

  copyWorkspaceFixture(source, checkout)

  expect(readFileSync(join(checkout, '.agents', 'skills', 'author', 'marker.txt'), 'utf8')).toBe('exported skill author\n')
  expect(existsSync(join(checkout, '.claude', 'skills'))).toBe(false)
  removeFixtureSafely(checkout)
  expect(readFileSync(join(skills, 'author', 'marker.txt'), 'utf8')).toBe('exported skill author\n')
})
