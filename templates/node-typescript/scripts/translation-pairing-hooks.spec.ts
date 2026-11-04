import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { removeFixtureSafely } from './test-fixture-cleanup.ts'

const templateRoot = resolve(import.meta.dirname, '..')
const fixtures: string[] = []
const pair = ['docs/with space.md', 'docs/with space.zh.md', 'docs/with space.i18n.yaml']

interface Fixture {
  root: string
  env: NodeJS.ProcessEnv
}

function command(fixture: Fixture, executable: string, args: string[]) {
  return spawnSync(executable, args, { cwd: fixture.root, env: fixture.env, encoding: 'utf8' })
}

function git(fixture: Fixture, ...args: string[]): string {
  const result = command(fixture, 'git', args)
  if (result.status !== 0) throw new Error(`git ${args.join(' ')}: ${result.stderr}\n${result.stdout}`)
  return result.stdout
}

function put(fixture: Fixture, file: string, text: string): void {
  writeFileSync(join(fixture.root, file), text)
}

function pairContents(stem: string, english = 'Original.', chinese = '原文。'): [string, string] {
  return [
    `# Guide\n\nEnglish | [中文](<${stem}.zh.md>)\n\n${english}\n`,
    `# 指南\n\n[English](<${stem}.md>) | 中文\n\n${chinese}\n`,
  ]
}

function record(fixture: Fixture, file: string): void {
  const result = command(fixture, process.execPath, ['--import', 'tsx', 'scripts/verify-translation-pairing.ts', '--write', file])
  if (result.status !== 0) throw new Error(`recording pair: ${result.stderr}\n${result.stdout}`)
}

function createFixture(): Fixture {
  const root = mkdtempSync(join(tmpdir(), 'dsh-pair-hook-'))
  fixtures.push(root)
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    CI: 'false',
    GITHUB_ACTIONS: 'false',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: join(root, 'global.gitconfig'),
    GIT_DEFAULT_HASH: 'sha1',
    GIT_AUTHOR_NAME: 'Pair Test',
    GIT_AUTHOR_EMAIL: 'pair@example.test',
    GIT_COMMITTER_NAME: 'Pair Test',
    GIT_COMMITTER_EMAIL: 'pair@example.test',
    HOME: root,
    XDG_CONFIG_HOME: join(root, '.config'),
  }
  delete env.GIT_INDEX_FILE
  delete env.GIT_DIR
  delete env.GIT_WORK_TREE
  delete env.GIT_CONFIG_COUNT
  delete env.LEFTHOOK
  delete env.DSH_ARCHIVE_BASE_REF
  const fixture = { root, env }
  cpSync(join(templateRoot, 'scripts'), join(root, 'scripts'), { recursive: true })
  cpSync(join(templateRoot, 'lefthook.yml'), join(root, 'lefthook.yml'))
  cpSync(join(templateRoot, 'package.json'), join(root, 'package.json'))
  mkdirSync(join(root, '.agents/notes'), { recursive: true })
  cpSync(join(templateRoot, '.agents/notes/archived'), join(root, '.agents/notes/archived'), { recursive: true })
  symlinkSync(join(templateRoot, 'node_modules'), join(root, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir')
  mkdirSync(join(root, 'docs'))
  git(fixture, 'init', '--quiet', '-b', 'main')
  git(fixture, 'config', 'user.name', 'Pair Test')
  git(fixture, 'config', 'user.email', 'pair@example.test')
  const [en, zh] = pairContents('with space')
  put(fixture, pair[0]!, en)
  put(fixture, pair[1]!, zh)
  record(fixture, pair[0]!)
  git(fixture, 'add', '--', 'lefthook.yml', 'package.json', 'scripts/translation-pairing.manifest.json', '.agents/notes/archived', ...pair)
  git(fixture, 'commit', '--quiet', '-m', 'baseline')
  const installed = command(fixture, process.execPath, ['scripts/install-lefthook.mjs'])
  if (installed.status !== 0) throw new Error(`installing hooks: ${installed.stderr}\n${installed.stdout}`)
  expect(git(fixture, 'config', '--get', 'core.hooksPath')).toContain('dsh-hooks')
  return fixture
}

afterEach(() => {
  for (const root of fixtures.splice(0)) removeFixtureSafely(root)
})

describe('installed translation pairing hooks', () => {
  it('checks staged pairs, preserves partial staging, and handles complete and incomplete renames and deletions', () => {
    const fixture = createFixture()
    put(fixture, 'docs/unstaged orphan.md', '# Unstaged\n')
    put(fixture, 'source.js', 'export const value = 1\n')
    git(fixture, 'add', '--', 'source.js')
    git(fixture, 'commit', '--quiet', '-m', 'source')

    put(fixture, 'docs/new.md', '# New\n')
    git(fixture, 'add', '--', 'docs/new.md')
    const newPair = command(fixture, 'git', ['commit', '-m', 'incomplete new pair'])
    expect(newPair.status).not.toBe(0)
    expect(newPair.stdout + newPair.stderr).toContain('in-scope documentation must merge bilingual')
    git(fixture, 'rm', '--cached', '--', 'docs/new.md')
    unlinkSync(join(fixture.root, 'docs/new.md'))
    put(fixture, 'docs/AGENTS.md', '# Excluded\n')
    git(fixture, 'add', '--', 'docs/AGENTS.md')
    git(fixture, 'commit', '--quiet', '-m', 'excluded document')

    const [originalEn] = pairContents('with space')
    put(fixture, pair[0]!, originalEn.replace('Original.', 'Staged change.'))
    git(fixture, 'add', '--', pair[0]!)
    put(fixture, pair[0]!, originalEn)
    const indexBefore = git(fixture, 'diff', '--cached', '--binary')
    const rejected = command(fixture, 'git', ['commit', '-m', 'invalid staged pair'])
    expect(rejected.status).not.toBe(0)
    expect(rejected.stdout + rejected.stderr).toContain('out of sync')
    expect(git(fixture, 'diff', '--cached', '--binary')).toBe(indexBefore)
    expect(readFileSync(join(fixture.root, pair[0]!), 'utf8')).toBe(originalEn)

    const [en, zh] = pairContents('with space', 'Updated.', '更新。')
    put(fixture, pair[0]!, en)
    put(fixture, pair[1]!, zh)
    record(fixture, pair[0]!)
    git(fixture, 'add', '--', ...pair)
    const unstaged = en.replace('Updated.', 'Unstaged change.')
    put(fixture, pair[0]!, unstaged)
    git(fixture, 'commit', '--quiet', '-m', 'valid staged pair')
    expect(git(fixture, 'show', `HEAD:${pair[0]}`)).toBe(en)
    expect(readFileSync(join(fixture.root, pair[0]!), 'utf8')).toBe(unstaged)
    put(fixture, pair[0]!, en)

    git(fixture, 'mv', '--', pair[0]!, 'docs/renamed.md')
    const partialRename = command(fixture, 'git', ['commit', '-m', 'partial rename'])
    expect(partialRename.status).not.toBe(0)
    expect(partialRename.stdout + partialRename.stderr).toMatch(/missing|incomplete pair/)
    git(fixture, 'mv', '--', pair[1]!, 'docs/renamed.zh.md')
    git(fixture, 'mv', '--', pair[2]!, 'docs/renamed.i18n.yaml')
    const [renamedEn, renamedZh] = pairContents('renamed', 'Updated.', '更新。')
    put(fixture, 'docs/renamed.md', renamedEn)
    put(fixture, 'docs/renamed.zh.md', renamedZh)
    record(fixture, 'docs/renamed.md')
    git(fixture, 'add', '--', 'docs/renamed.md', 'docs/renamed.zh.md', 'docs/renamed.i18n.yaml')
    git(fixture, 'commit', '--quiet', '-m', 'complete rename')

    git(fixture, 'rm', '--', 'docs/renamed.zh.md')
    const partialDelete = command(fixture, 'git', ['commit', '-m', 'partial delete'])
    expect(partialDelete.status).not.toBe(0)
    expect(partialDelete.stdout + partialDelete.stderr).toMatch(/missing|incomplete pair/)
    git(fixture, 'rm', '--', 'docs/renamed.md', 'docs/renamed.i18n.yaml')
    git(fixture, 'commit', '--quiet', '-m', 'complete delete')
    expect(git(fixture, 'ls-tree', '-r', '--name-only', 'HEAD', '--', 'docs/renamed.md', 'docs/renamed.zh.md', 'docs/renamed.i18n.yaml')).toBe('')
  }, 120_000)

  it('refuses an invalid automatic merge and accepts the repaired merge', () => {
    const fixture = createFixture()
    git(fixture, 'checkout', '--quiet', '-b', 'feature')
    const [en] = pairContents('with space', 'Invalid feature.', '原文。')
    put(fixture, pair[0]!, en)
    git(fixture, 'add', '--', pair[0]!)
    git(fixture, '-c', 'core.hooksPath=.no-hooks', 'commit', '--quiet', '-m', 'invalid feature')
    git(fixture, 'checkout', '--quiet', 'main')
    put(fixture, 'source.js', 'export const base = 1\n')
    git(fixture, 'add', '--', 'source.js')
    git(fixture, 'commit', '--quiet', '-m', 'base')
    const rejected = command(fixture, 'git', ['merge', '--no-ff', 'feature', '-m', 'invalid merge'])
    expect(rejected.status).not.toBe(0)
    expect(rejected.stdout + rejected.stderr).toContain('out of sync')
    git(fixture, 'merge', '--abort')
    git(fixture, 'checkout', '--quiet', 'feature')
    const [, zh] = pairContents('with space', 'Invalid feature.', '特性。')
    put(fixture, pair[1]!, zh)
    record(fixture, pair[0]!)
    git(fixture, 'add', '--', ...pair)
    git(fixture, 'commit', '--quiet', '-m', 'repair pair')
    git(fixture, 'checkout', '--quiet', 'main')
    git(fixture, 'merge', '--no-ff', 'feature', '-m', 'valid merge')
    expect(git(fixture, 'show', `HEAD:${pair[0]}`)).toBe(en)
    expect(git(fixture, 'show', `HEAD:${pair[1]}`)).toBe(zh)
  }, 120_000)
})
