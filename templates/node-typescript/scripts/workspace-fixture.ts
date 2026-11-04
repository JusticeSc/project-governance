import { spawnSync } from 'node:child_process'
import { copyFileSync, lstatSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'

/** Selected author paths; bytes are read from the working tree only when copied. */
export interface WorkspaceFixtureInputs {
  /** Resolved project root the relative paths belong to. */
  readonly source: string
  /** Repository-relative author paths without link-shaped components. */
  readonly paths: readonly string[]
}

/**
 * Select tracked and nonignored untracked authors, excluding links without following them.
 * The author layout keeps ignore rules in `gitignore` (npm omits `.gitignore`), while an exported
 * or initialized tree uses `.gitignore`; a path ignored by either file is not an author input.
 * @param source - Project root with its own Git index or with distributed ignore files.
 * @returns Stable relative inputs; ignored transient files are never traversed by copying.
 */
export function selectWorkspaceFixtureInputs(source: string): WorkspaceFixtureInputs {
  const sourceRoot = resolve(source)
  const env = { ...process.env }
  delete env.GIT_DIR
  delete env.GIT_WORK_TREE
  delete env.GIT_INDEX_FILE
  delete env.GIT_COMMON_DIR
  delete env.GIT_OBJECT_DIRECTORY
  delete env.GIT_ALTERNATE_OBJECT_DIRECTORIES
  const top = spawnSync('git', ['-C', sourceRoot, 'rev-parse', '--show-toplevel'], { encoding: 'utf8', env })
  const canonical = (path: string): string => {
    const resolved = realpathSync.native(path)
    return process.platform === 'win32' ? resolved.toLowerCase() : resolved
  }
  const topPath = top.status === 0 ? top.stdout.trim() : ''
  const ownRepository = topPath !== '' && canonical(topPath) === canonical(sourceRoot)
  const temporaryGit = mkdtempSync(join(tmpdir(), 'workspace-fixture-index-'))
  try {
    // A host-wide `core.excludesFile` must not shrink the selected authors.
    const globalExcludes = join(temporaryGit, 'host-excludes')
    writeFileSync(globalExcludes, '')
    if (!ownRepository) {
      const init = spawnSync('git', ['init', '--bare', '--quiet', '--template=', join(temporaryGit, 'git')], { encoding: 'utf8', env })
      if (init.status !== 0) throw new Error(`Cannot initialize fixture index: ${init.stderr || init.error?.message}`)
    }
    const gitRoot = ownRepository
      ? ['-C', sourceRoot]
      : [`--git-dir=${join(temporaryGit, 'git')}`, `--work-tree=${sourceRoot}`]
    const bothLayouts = ['--exclude-per-directory=gitignore'] as const
    // `--exclude-standard` resets the per-directory filename, so `gitignore` must follow it.
    const list = (mode: readonly string[], distributedLayout = false): string[] => {
      const result = spawnSync('git', [...gitRoot, '-c', `core.excludesFile=${globalExcludes}`, 'ls-files', '-z', ...mode,
        '--exclude-standard', ...(distributedLayout ? bothLayouts : [])],
      { encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024 })
      if (result.status !== 0) throw new Error(`Cannot select fixture inputs from ${sourceRoot}: ${result.stderr || result.error?.message}`)
      return result.stdout.split('\0').filter(Boolean)
    }
    const ignoredAuthors = new Set([...list(['--cached', '--ignored']), ...list(['--cached', '--ignored'], true)])
    if (ignoredAuthors.size > 0) throw new Error(`Cannot copy fixture: tracked files are ignored: ${[...ignoredAuthors].join(', ')}`)
    const distributed = new Set(list(['--cached', '--others'], true))
    const paths = list(['--cached', '--others']).filter((path) => {
      if (!distributed.has(path)) return false
      let current = sourceRoot
      for (const part of ['', ...path.split('/')]) {
        current = join(current, part)
        const stat = lstatSync(current, { throwIfNoEntry: false })
        if (stat === undefined) return true // Keep missing authors selected so copying fails with their path.
        if (stat.isSymbolicLink()) return false
      }
      return true
    })
    if (paths.length === 0) throw new Error(`No author inputs selected from ${sourceRoot}`)
    return { source: sourceRoot, paths }
  } finally {
    rmSync(temporaryGit, { recursive: true, force: true })
  }
}

/**
 * Copy selected current bytes, failing on missing, unreadable, or linked author inputs.
 * @param inputs - Selection made before copying; disappearing ignored files are irrelevant.
 * @param checkout - Test-owned destination, with no preexisting links.
 * @returns Nothing; failures identify the selected author path and preserve their cause.
 */
export function copySelectedWorkspaceFixture(inputs: WorkspaceFixtureInputs, checkout: string): void {
  for (const path of inputs.paths) {
    try {
      const input = resolve(inputs.source, path)
      const local = relative(inputs.source, input)
      if (isAbsolute(local) || local === '..' || local.startsWith('..' + sep)) throw new Error('Author path escapes fixture root')
      let current = inputs.source
      for (const part of ['', ...local.split(sep)]) {
        current = join(current, part)
        const stat = lstatSync(current)
        if (stat.isSymbolicLink()) throw new Error(`Linked author input: ${current}`)
        if (current !== input && !stat.isDirectory()) throw new Error('Non-directory author parent: ' + current)
        if (current === input && !stat.isFile()) throw new Error(`Author input is not a regular file: ${current}`)
      }
      const output = join(checkout, path)
      mkdirSync(dirname(output), { recursive: true })
      copyFileSync(input, output)
    } catch (error) {
      throw new Error(`Cannot copy selected fixture author ${path}`, { cause: error })
    }
  }
}

/**
 * Prepare a test-owned checkout from current tracked and nonignored untracked authors.
 * @param source - Project root, with its own Git index or distributed ignore rules.
 * @param checkout - Test-owned destination, with no preexisting links.
 * @returns Nothing; selected missing, unreadable, or linked inputs fail with their path.
 */
export function copyWorkspaceFixture(source: string, checkout: string): void {
  copySelectedWorkspaceFixture(selectWorkspaceFixtureInputs(source), checkout)
}
