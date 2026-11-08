import { spawnSync } from 'node:child_process'
import { copyFileSync, cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { describe, expect, it, onTestFinished } from 'vitest'
import { pnpmInvocation } from './pnpm-invocation.ts'
import { runGate, type GateResult } from './run-gates.ts'
import { readWorkspaceManifests } from './check-workspace-constraints.ts'

const root = resolve(import.meta.dirname, '..')
const hasWorkspaceLibrary = readWorkspaceManifests(root).some(({ dir }) => /^packages\/[^/]+\/[^/]+$/.test(dir))

function copyHygieneFixture(source: string, checkout: string, artifactDirectories: readonly string[]): void {
  const sourceRoot = resolve(source)
  const top = spawnSync('git', ['-C', source, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' })
  const canonical = (path: string): string => {
    const resolved = realpathSync.native(path)
    return process.platform === 'win32' ? resolved.toLowerCase() : resolved
  }
  const ownRepository = top.status === 0 && canonical(top.stdout.replace(/\r?\n$/u, '')) === canonical(source)
  const temporaryGit = ownRepository ? undefined : mkdtempSync(join(tmpdir(), 'built-hygiene-index-'))
  try {
    if (temporaryGit) {
      const init = spawnSync('git', ['init', '--bare', '--quiet', '--template=', temporaryGit], { encoding: 'utf8' })
      if (init.status !== 0) throw new Error(`Cannot initialize fixture index: ${init.stderr}`)
    }
    const gitRoot = temporaryGit ? [`--git-dir=${temporaryGit}`, `--work-tree=${source}`] : ['-C', source]
    const fallbackIgnore = !existsSync(join(source, '.gitignore')) && existsSync(join(source, 'gitignore'))
      ? [`--exclude-from=${join(source, 'gitignore')}`] : []
    const list = (args: string[]): string[] => {
      const result = spawnSync('git', [...gitRoot, 'ls-files', '-z', ...args, '--exclude-standard', ...fallbackIgnore],
        { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
      if (result.status !== 0) throw new Error(`Cannot list fixture inputs: ${result.stderr || result.error?.message}`)
      return result.stdout.split('\0').filter(Boolean)
    }
    if (list(['--cached', '--ignored']).length > 0) {
      throw new Error('Cannot copy hygiene fixture: tracked files are ignored; resolve the Git index and ignore rules first')
    }
    const allowed = (path: string): boolean => {
      let current = resolve(path)
      while (current !== sourceRoot) {
        const name = basename(current)
        if (name === '.git' || name === 'node_modules' || name === 'coverage'
          || name.startsWith('oxlint-contract-') || lstatSync(current).isSymbolicLink()) return false
        const parent = dirname(current)
        if (parent === current) return false
        current = parent
      }
      return true
    }
    for (const path of list(['--cached', '--others'])) {
      const input = join(source, path)
      if (!existsSync(input) || !allowed(input)) continue
      const output = join(checkout, path)
      mkdirSync(resolve(output, '..'), { recursive: true })
      copyFileSync(input, output)
    }
    for (const directory of artifactDirectories) {
      const input = join(source, directory)
      if (existsSync(input)) cpSync(input, join(checkout, directory), { recursive: true, filter: allowed })
    }
  } finally {
    if (temporaryGit) rmSync(temporaryGit, { recursive: true, force: true })
  }
}

function createIgnoredTrackedAuthor(source: string): void {
  const init = spawnSync('git', ['init', '--quiet', '--template=', source], { encoding: 'utf8' })
  expect(init.status, init.stdout + init.stderr).toBe(0)
  writeFileSync(join(source, '.gitignore'), '.env\n')
  writeFileSync(join(source, '.env'), 'synthetic private data\n')
  const add = spawnSync('git', ['-C', source, 'add', '--force', '.env'], { encoding: 'utf8' })
  expect(add.status, add.stdout + add.stderr).toBe(0)
}

describe('plain Node artifact consumers', () => {
  it('does not follow a linked parent for tracked files or declared artifacts', () => {
    const temporary = mkdtempSync(join(tmpdir(), 'built-hygiene-parent-link-'))
    onTestFinished(() => { rmSync(temporary, { recursive: true, force: true }) })
    const source = join(temporary, 'source')
    const external = join(temporary, 'external')
    const checkout = join(temporary, 'checkout')
    mkdirSync(join(source, 'src'), { recursive: true })
    mkdirSync(join(external, 'lib'), { recursive: true })
    const init = spawnSync('git', ['init', '--quiet', '--template=', source], { encoding: 'utf8' })
    expect(init.status, init.stdout + init.stderr).toBe(0)
    writeFileSync(join(source, 'src', 'tracked.ts'), 'export const authored = true\n')
    const add = spawnSync('git', ['-C', source, 'add', 'src/tracked.ts'], { encoding: 'utf8' })
    expect(add.status, add.stdout + add.stderr).toBe(0)
    writeFileSync(join(external, 'tracked.ts'), 'synthetic external data\n')
    writeFileSync(join(external, 'lib', 'index.js'), 'synthetic external artifact\n')
    rmSync(join(source, 'src'), { recursive: true })
    symlinkSync(external, join(source, 'src'), process.platform === 'win32' ? 'junction' : 'dir')

    copyHygieneFixture(source, checkout, ['src/lib'])

    expect(existsSync(join(checkout, 'src', 'tracked.ts'))).toBe(false)
    expect(existsSync(join(checkout, 'src', 'lib', 'index.js'))).toBe(false)
  })

  it('copies authored files and declared artifacts without ignored local data', () => {
    const temporary = mkdtempSync(join(tmpdir(), 'built-hygiene-copy-'))
    onTestFinished(() => { rmSync(temporary, { recursive: true, force: true }) })
    const source = join(temporary, 'source')
    const checkout = join(temporary, 'checkout')
    mkdirSync(join(source, 'src'), { recursive: true })
    mkdirSync(join(source, 'packages', 'util', 'example', 'lib'), { recursive: true })
    const init = spawnSync('git', ['init', '--quiet', '--template=', source], { encoding: 'utf8' })
    expect(init.status, init.stdout + init.stderr).toBe(0)
    writeFileSync(join(source, '.gitignore'), '.env\ncalendar.sqlite\nlib/\n')
    writeFileSync(join(source, 'src', 'tracked.ts'), 'export const tracked = true\n')
    const add = spawnSync('git', ['-C', source, 'add', '.gitignore', 'src/tracked.ts'], { encoding: 'utf8' })
    expect(add.status, add.stdout + add.stderr).toBe(0)
    writeFileSync(join(source, 'src', 'pending.ts'), 'export const pending = true\n')
    writeFileSync(join(source, '.env'), 'synthetic private data\n')
    writeFileSync(join(source, 'calendar.sqlite'), 'synthetic database\n')
    writeFileSync(join(source, 'packages', 'util', 'example', 'lib', 'index.js'), 'export const built = true\n')

    copyHygieneFixture(source, checkout, ['packages/util/example/lib'])

    expect(existsSync(join(checkout, '.env'))).toBe(false)
    expect(existsSync(join(checkout, 'calendar.sqlite'))).toBe(false)
    expect(readFileSync(join(checkout, 'src', 'tracked.ts'), 'utf8')).toBe('export const tracked = true\n')
    expect(readFileSync(join(checkout, 'src', 'pending.ts'), 'utf8')).toBe('export const pending = true\n')
    expect(readFileSync(join(checkout, 'packages', 'util', 'example', 'lib', 'index.js'), 'utf8')).toBe('export const built = true\n')
  })
  it('honors the exported ignore rules before a project has its own Git repository', () => {
    const temporary = mkdtempSync(join(tmpdir(), 'built-hygiene-export-'))
    onTestFinished(() => { rmSync(temporary, { recursive: true, force: true }) })
    const source = join(temporary, 'source')
    const checkout = join(temporary, 'checkout')
    mkdirSync(source, { recursive: true })
    writeFileSync(join(source, 'gitignore'), '.env\ncalendar.sqlite\n')
    writeFileSync(join(source, 'pending.ts'), 'export const pending = true\n')
    writeFileSync(join(source, '.env'), 'synthetic private data\n')
    writeFileSync(join(source, 'calendar.sqlite'), 'synthetic database\n')

    copyHygieneFixture(source, checkout, [])

    expect(existsSync(join(checkout, '.env'))).toBe(false)
    expect(existsSync(join(checkout, 'calendar.sqlite'))).toBe(false)
    expect(readFileSync(join(checkout, 'pending.ts'), 'utf8')).toBe('export const pending = true\n')
  })

  it('refuses tracked files that are now ignored instead of omitting or copying them', () => {
    const temporary = mkdtempSync(join(tmpdir(), 'built-hygiene-tracked-'))
    onTestFinished(() => { rmSync(temporary, { recursive: true, force: true }) })
    const source = join(temporary, 'source')
    const checkout = join(temporary, 'checkout')
    mkdirSync(source, { recursive: true })
    createIgnoredTrackedAuthor(source)

    expect(() => { copyHygieneFixture(source, checkout, []) }).toThrow(/tracked files.*ignored/iu)
    expect(existsSync(join(checkout, '.env'))).toBe(false)
  })

  it.skipIf(process.platform !== 'win32')('refuses an ignored tracked author through an available Windows short path', (test) => {
    const temporary = mkdtempSync(join(tmpdir(), 'built hygiene long directory name - '))
    onTestFinished(() => { rmSync(temporary, { recursive: true, force: true }) })
    const source = join(temporary, 'source directory long')
    const checkout = join(temporary, 'checkout')
    mkdirSync(source)
    const alias = spawnSync('cmd.exe', ['/d', '/c', 'for %I in (.) do @echo %~sI'], { cwd: source, encoding: 'utf8' })
    expect(alias.status, alias.stderr).toBe(0)
    const short = alias.stdout.trim()
    if (short.toLowerCase() === source.toLowerCase()) test.skip()
    createIgnoredTrackedAuthor(source)

    expect(() => { copyHygieneFixture(short, checkout, []) }).toThrow(/tracked files.*ignored/iu)
    expect(existsSync(join(checkout, '.env'))).toBe(false)
  })


  it.skipIf(!hasWorkspaceLibrary)('rejects a missing published artifact through hygiene and accepts its exact restoration', async ({ signal }) => {
    const temporary = mkdtempSync(join(tmpdir(), 'built-hygiene-'))
    const checkout = join(temporary, 'checkout')
    const dependencyLink = join(checkout, 'node_modules')
    const controller = new AbortController()
    let active: Promise<GateResult> | undefined
    onTestFinished(async () => {
      controller.abort()
      await active
      if (existsSync(dependencyLink)) unlinkSync(dependencyLink)
      rmSync(temporary, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
    })

    const artifactDirectories = readWorkspaceManifests(root)
      .filter(({ dir }) => dir !== '.')
      .map(({ dir }) => join(dir, 'lib'))
    copyHygieneFixture(root, checkout, artifactDirectories)
    if (!existsSync(join(checkout, '.gitignore'))) copyFileSync(join(checkout, 'gitignore'), join(checkout, '.gitignore'))
    symlinkSync(join(root, 'node_modules'), dependencyLink, process.platform === 'win32' ? 'junction' : 'dir')
    const git = spawnSync('git', ['init', '--quiet', '--template=', checkout], { encoding: 'utf8' })
    expect(git.status, git.stdout + git.stderr).toBe(0)

    const invocation = pnpmInvocation(['--dir', checkout, 'run', 'hygiene'])
    async function hygiene() {
      active = runGate({
        id: 'hygiene', label: 'hygiene', displayCommand: 'pnpm run hygiene',
        ...invocation,
        env: { NODE_OPTIONS: '', DSH_GATE_CONCURRENCY: '1', DSH_PUBLINT_CONCURRENCY: '1' },
      }, AbortSignal.any([signal, controller.signal]))
      const result = await active
      active = undefined
      const output = result.output.map(chunk => chunk.text).join('')
      expect(result.aborted, output).not.toBe(true)
      expect(result.signalCode, output).toBeNull()
      return { result, output }
    }

    const original = await hygiene()
    expect(original.result.exitCode, original.output).toBe(0)
    expect(original.output).toContain('PASS publint')
    const owner = readWorkspaceManifests(root).find(({ dir }) => /^packages\/[^/]+\/[^/]+$/.test(dir))
    if (owner === undefined || owner.manifest.main === undefined) throw new Error('built hygiene requires a published workspace library')
    const artifact = join(checkout, owner.dir, owner.manifest.main)
    const bytes = readFileSync(artifact)
    rmSync(artifact)
    const rejected = await hygiene()
    expect(rejected.result.exitCode, rejected.output).toBe(1)
    expect(rejected.output).toContain('FAILED publint')
    expect(rejected.output).toContain(owner.manifest.main)
    writeFileSync(artifact, bytes)
    const restored = await hygiene()
    expect(restored.result.exitCode, restored.output).toBe(0)
    expect(restored.output).toContain('PASS publint')
  }, 240_000)
})
