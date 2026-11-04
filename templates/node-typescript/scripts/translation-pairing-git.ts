/** Git index reads owned by the bilingual pairing gate. */

import { spawnSync } from 'node:child_process'
import { realpathSync, statSync } from 'node:fs'

/**
 * Decide whether two paths name the same directory.
 *
 * @param left - First path.
 * @param right - Second path.
 * @returns True when both paths resolve to the same directory.
 */
export function sameDirectory(left: string, right: string): boolean {
  const canonicalLeft = realpathSync(left)
  const canonicalRight = realpathSync(right)
  if (canonicalLeft === canonicalRight) return true
  // A link or a Windows 8.3 short name keeps its own spelling through realpathSync, so identity falls
  // back to the device and file index. A filesystem that reports no index is compared by spelling only.
  const first = statSync(canonicalLeft)
  const second = statSync(canonicalRight)
  return first.ino !== 0 && first.ino === second.ino && first.dev === second.dev
}

/** Refuse Git discovery that silently borrows an enclosing repository's index or history. */
export function requireRepositoryRoot(root: string): void {
  const result = spawnSync('git', ['-C', root, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' })
  if (result.error !== undefined || result.status !== 0) {
    throw new Error('Git prerequisite: initialize this repository explicitly before running Git/index/history checks')
  }
  if (!sameDirectory(result.stdout.trim(), root)) {
    throw new Error('Git prerequisite: this tree must own its Git index and history; an enclosing repository is not accepted')
  }
}

/**
 * Run one Git subprocess and return its exact stdout bytes.
 *
 * @param root - Repository root used as Git's working directory.
 * @param args - Arguments following the `git` executable.
 * @param operation - Human-readable operation for failure diagnostics.
 * @returns Exact stdout bytes.
 * @throws Error when Git cannot start or exits unsuccessfully.
 */
function runGit(root: string, args: string[], operation: string): Buffer {
  const result = spawnSync('git', ['-C', root, ...args], { maxBuffer: 1 << 26 })
  if (result.error) {
    throw new Error(`${operation} failed: ${result.error.message}`, { cause: result.error })
  }
  if (result.status !== 0) {
    throw new Error(`${operation} failed with status ${String(result.status)}: ${result.stderr.toString('utf8').trim()}`)
  }
  return result.stdout
}

/** Paths changed in the index, including both sides of a rename and deleted paths. */
export function gitStagedPaths(root: string): string[] {
  requireRepositoryRoot(root)
  return runGit(root, ['diff', '--cached', '--name-only', '--no-renames', '-z', '--'], 'listing staged paths')
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
}

/** Every stage-zero path currently present in the Git index. */
export function gitIndexPaths(root: string): Set<string> {
  requireRepositoryRoot(root)
  const paths = new Set<string>()
  const entries = runGit(root, ['ls-files', '--stage', '-z'], 'listing Git index paths')
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
  for (const entry of entries) {
    const match = /^\d+ [0-9a-f]+ ([0-3])\t([\s\S]+)$/.exec(entry)
    if (!match?.[1] || match[2] === undefined) throw new Error('git ls-files --stage returned a malformed entry')
    if (match[1] === '0') paths.add(match[2])
  }
  return paths
}

/**
 * Read one path from the Git index without consulting working-tree bytes.
 *
 * @param root - Repository root.
 * @param path - Repository-relative path.
 * @returns The stage-zero blob bytes, or `undefined` when the path is absent.
 * @throws Error when the path is unmerged or its index entries are not a valid merge state.
 */
export function readGitIndexBlob(root: string, path: string): Buffer | undefined {
  requireRepositoryRoot(root)
  const output = runGit(
    root,
    ['ls-files', '--stage', '-z', '--', `:(literal)${path}`],
    `git ls-files --stage for ${path}`,
  ).toString('utf8')
  const entries = output.split('\0').filter(Boolean)
  if (entries.length === 0) return undefined
  if (entries.length !== 1) throw new Error(`${path} does not have exactly one resolved index entry`)
  const match = /^(?:\d+) ([0-9a-f]+) 0\t[\s\S]+$/.exec(entries[0] ?? '')
  if (!match?.[1]) throw new Error(`${path} remains unmerged or has an invalid index entry`)
  return runGit(root, ['cat-file', 'blob', match[1]], `reading staged ${path}`)
}
