import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdtempSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it, onTestFinished } from 'vitest'
import { removeFixtureSafely } from './test-fixture-cleanup.ts'
import { findUnavailableRepositoryReferences } from './verify-public-repository-links.ts'
import { copyWorkspaceFixture } from './workspace-fixture.ts'

describe('repository link policy', () => {
  it('rejects encoded and case-varied references to the unavailable repository', () => {
    const unavailableOwner = 'retired-example'
    const unavailableName = 'old-service'
    const unavailableRepository = `${unavailableOwner}/${unavailableName}`
    const encodedRepository = unavailableRepository.replaceAll('-', '%2D').replace('/', '%2F')
    const htmlEncodedRepository = unavailableRepository.replace('/', '&#x2f;')
    const jsonEscapedRepository = unavailableRepository.replace('/', '\\/')
    const unicodeEscapedRepository = unavailableRepository.replace('/', String.raw`\u002f`)
    const source = [
      'https://github.com/example/project',
      `https://github.com/${unavailableRepository.toUpperCase()}/issues/1`,
      `https://github.com/${encodedRepository}/issues/2`,
      `https://github.com/${htmlEncodedRepository}/issues/3`,
      `"https:\\/\\/github.com\\/${jsonEscapedRepository}\\/issues\\/4"`,
      `"https:\\/\\/github.com\\/${unicodeEscapedRepository}\\/issues\\/5"`,
      `https://github.com/${unavailableOwner}/cordis`,
      `https://github.com/example/${unavailableName}`,
    ].join('\n')

    expect(findUnavailableRepositoryReferences('subject.md', source, [unavailableRepository])).toEqual([
      { file: 'subject.md', line: 2 },
      { file: 'subject.md', line: 3 },
      { file: 'subject.md', line: 4 },
      { file: 'subject.md', line: 5 },
      { file: 'subject.md', line: 6 },
    ])
  })

  it('preserves frozen archived Agent Notes', () => {
    const unavailableRepository = 'retired-example/old-service'

    expect(findUnavailableRepositoryReferences(
      '.agents/notes/archived/process/historical-record.md',
      `https://github.com/${unavailableRepository}`,
      [unavailableRepository],
    )).toEqual([])
    expect(findUnavailableRepositoryReferences(
      '.agents/notes/implemented/process/active-record.md',
      `https://github.com/${unavailableRepository}`,
      [unavailableRepository],
    )).toEqual([{ file: '.agents/notes/implemented/process/active-record.md', line: 1 }])
  })

  it('does not impose an unavailable-repository restriction when none is configured', () => {
    expect(findUnavailableRepositoryReferences('subject.md', 'https://github.com/example/old-service', [])).toEqual([])
  })
})

describe('configured unavailable repositories through the documentation aggregate', () => {
  it('accepts a different repository, rejects a tracked unavailable reference, and accepts its restoration', () => {
    const sourceRoot = resolve(import.meta.dirname, '..')
    const temporary = mkdtempSync(join(tmpdir(), 'dsh-unavailable-repository-'))
    const checkout = join(temporary, 'checkout')
    onTestFinished(() => { removeFixtureSafely(temporary) })

    copyWorkspaceFixture(sourceRoot, checkout)
    if (!existsSync(join(checkout, '.gitignore'))) copyFileSync(join(checkout, 'gitignore'), join(checkout, '.gitignore'))
    symlinkSync(join(sourceRoot, 'node_modules'), join(checkout, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir')
    for (const [base, depth] of [['apps', 1], ['packages', 2]] as const) {
      if (!existsSync(join(sourceRoot, base))) continue
      let directories: string[] = [base]
      for (let level = 0; level < depth; level++) {
        directories = directories.flatMap(directory =>
          readdirSync(join(sourceRoot, directory), { withFileTypes: true })
            .filter(entry => entry.isDirectory() && entry.name !== 'node_modules')
            .map(entry => join(directory, entry.name)))
      }
      for (const directory of directories) {
        const dependency = join(sourceRoot, directory, 'node_modules')
        if (existsSync(dependency)) symlinkSync(dependency, join(checkout, directory, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir')
      }
    }

    const unavailable = ['retired-fixture-731', 'unavailable-project'].join('/')
    const policy = join(checkout, 'scripts/project-policy.ts')
    const originalPolicy = readFileSync(policy, 'utf8')
    const policyDeclaration = /export const unavailableRepositories: readonly string\[\] = \[[\s\S]*?\]/u
    expect(originalPolicy).toMatch(policyDeclaration)
    writeFileSync(policy, originalPolicy.replace(policyDeclaration, `export const unavailableRepositories: readonly string[] = ['${unavailable}']`))
    const subject = join(checkout, 'repository-reference-fixture.txt')
    const permitted = 'https://github.com/retired-fixture-731/another-project\n'
    writeFileSync(subject, permitted)

    const env = {
      ...process.env,
      NODE_OPTIONS: '',
      DSH_ARCHIVE_BASE_REF: undefined,
      GIT_CONFIG_GLOBAL: join(temporary, 'global.gitconfig'),
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_AUTHOR_NAME: 'Repository policy fixture',
      GIT_AUTHOR_EMAIL: 'repository-policy@example.invalid',
      GIT_COMMITTER_NAME: 'Repository policy fixture',
      GIT_COMMITTER_EMAIL: 'repository-policy@example.invalid',
    }
    function git(args: string[]): string {
      const result = spawnSync('git', args, { cwd: checkout, env, encoding: 'utf8' })
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
      return result.stdout.trim()
    }
    git(['init', '--quiet', '--template='])
    git(['add', '--all'])
    const tree = git(['write-tree'])
    const commit = git(['commit-tree', tree, '-m', 'isolated fixture'])
    git(['update-ref', 'HEAD', commit])
    expect(git(['ls-files', '--', 'scripts/project-policy.ts', 'repository-reference-fixture.txt']).split('\n'))
      .toEqual(['repository-reference-fixture.txt', 'scripts/project-policy.ts'])

    function documentationChecks() {
      return spawnSync(process.execPath, [join(sourceRoot, 'node_modules/pnpm/bin/pnpm.cjs'), '--dir', checkout, 'run', 'test:docs'], {
        cwd: checkout, env, encoding: 'utf8', timeout: 300_000, maxBuffer: 32 * 1024 * 1024,
      })
    }

    const baseline = documentationChecks()
    expect(baseline.status, `${baseline.stdout}\n${baseline.stderr}`).toBe(0)

    writeFileSync(subject, `${permitted}https://github.com/${unavailable}/issues/1\n`)
    const rejected = documentationChecks()
    const rejectionOutput = `${rejected.stdout}\n${rejected.stderr}`
    expect(rejected.status, rejectionOutput).toBe(1)
    expect(rejectionOutput).toContain('repository-reference-fixture.txt:2')

    writeFileSync(subject, permitted)
    const restored = documentationChecks()
    expect(restored.status, `${restored.stdout}\n${restored.stderr}`).toBe(0)
  }, 950_000)
})
