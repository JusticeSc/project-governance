// End-to-end check of the exported template: export the author payload into a fresh temporary
// directory, install with the committed lock, build the artifact plane from source, then drive the
// built CLI on a real empty source list and on a refused argument that must preserve the index.
// The template's own gate graph is its own contract and runs from its CI workflow; this entry proves
// acquisition and the built artifact, not the template's complete check. The export and every file
// this check writes stay in the temporary directory (the package manager and Corepack may use their
// own caches), and no ambient Git repository or Node loader option is allowed to leak into the
// exported project.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { exportTemplate } from './export-template.mjs'

const source = fileURLToPath(new URL('../', import.meta.url))
const templateSource = join(source, 'templates', 'node-typescript')
const temporary = mkdtempSync(join(tmpdir(), 'project-governance-template-'))
const exported = join(temporary, 'exported template 空间')
const TIMEOUT = 1_800_000

// A smoke run must not inherit loader hooks, an ambient archive baseline or an enclosing Git
// repository: the exported project is judged on its own content only.
const env = { ...process.env }
for (const name of [
  'NODE_PATH',
  'NODE_OPTIONS',
  'GOVERNANCE_ARCHIVE_BASE_REF',
  'GIT_DIR',
  'GIT_WORK_TREE',
  'GIT_INDEX_FILE',
  'GIT_COMMON_DIR',
  'GIT_OBJECT_DIRECTORY',
  'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  'GIT_NAMESPACE',
]) {
  delete env[name]
}
env.GIT_CEILING_DIRECTORIES = temporary
env.COREPACK_ENABLE_DOWNLOAD_PROMPT = '0'

// Node ships Corepack as a sibling module of the Node executable; other installations expose a
// `corepack` program on PATH. A JavaScript entry point is preferred because it is handed to Node
// unchanged, while a .cmd/.bat shim would need a shell that reinterprets the fixed arguments.
function resolveCorepack() {
  const local = dirname(process.execPath)
  for (const candidate of [
    join(local, 'node_modules', 'corepack', 'dist', 'corepack.js'),
    join(local, '..', 'lib', 'node_modules', 'corepack', 'dist', 'corepack.js'),
  ]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return { command: process.execPath, prefix: [candidate] }
  }
  const names = process.platform === 'win32'
    ? (process.env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean).map(extension => `corepack${extension.toLowerCase()}`)
    : ['corepack']
  for (const directory of (process.env.PATH ?? '').split(delimiter)) {
    if (directory === '') continue
    for (const candidate of [join(directory, 'node_modules', 'corepack', 'dist', 'corepack.js'), ...names.map(name => join(directory, name))]) {
      if (!existsSync(candidate) || !statSync(candidate).isFile()) continue
      // A Windows command shim is never handed to a shell; its JavaScript module is used instead.
      if (/\.(?:cmd|bat)$/iu.test(candidate)) continue
      if (/\.js$/iu.test(candidate)) return { command: process.execPath, prefix: [candidate] }
      return { command: candidate, prefix: [] }
    }
  }
  throw new Error('corepack was not found next to the Node executable or on PATH')
}

function run(label, command, args, cwd, expected = 0, capture = false) {
  console.log(`\n=== ${label} ===`)
  const result = spawnSync(command, args, {
    cwd,
    env,
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    encoding: capture ? 'utf8' : undefined,
    maxBuffer: 8 * 1024 * 1024,
    timeout: TIMEOUT,
  })
  if (result.error) throw result.error
  if (capture) {
    if (result.stdout) process.stdout.write(result.stdout)
    if (result.stderr) process.stderr.write(result.stderr)
  }
  assert.equal(result.signal, null, `${label} was terminated by ${result.signal}`)
  assert.equal(result.status, expected, `${label}: expected exit ${expected}, observed ${result.status}`)
  return result
}

function walk(directory) {
  const files = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...walk(path))
    else files.push(path)
  }
  return files
}

const posix = value => value.split(sep).join('/')
const inside = (root, path) => {
  const nested = relative(root, path)
  return nested !== '..' && !nested.startsWith(`..${sep}`) && !isAbsolute(nested)
}

try {
  // 1. Export into a child that does not exist yet.
  const result = exportTemplate(exported)
  assert.equal(result.destination, resolve(exported))
  assert(inside(temporary, result.destination), 'the export destination must stay inside the temporary parent')
  assert.equal(result.files.length, new Set(result.files).size, 'the export must not repeat a payload file')

  const exportedFiles = walk(exported).map(path => posix(relative(exported, path))).sort()
  const payload = result.files.map(posix).sort()
  assert.deepEqual(exportedFiles, payload, 'the exported tree must equal the reported payload exactly')

  for (const path of payload) {
    const segments = path.split('/')
    for (const segment of segments) {
      assert(
        !['lib', 'node_modules', '.cache', '.git', '.turbo', '.nyc_output', '__pycache__', '.venv'].includes(segment),
        `build output, dependency or private directory in the payload: ${path}`,
      )
    }
    assert(!segments.includes('..'), `path traversal in the payload: ${path}`)
    const target = join(exported, ...segments)
    const stats = lstatSync(target)
    if (path === '.claude/skills') {
      assert(stats.isSymbolicLink(), 'Claude skills entry must be a directory symlink')
      assert.equal(resolve(dirname(target), readlinkSync(target)), resolve(exported, '.agents/skills'))
      assert(statSync(target).isDirectory(), 'Claude skills entry must resolve to the canonical skill directory')
      assert.deepEqual(
        readFileSync(join(target, 'dsh-code-review', 'SKILL.md')),
        readFileSync(join(exported, '.agents', 'skills', 'dsh-code-review', 'SKILL.md')),
      )
      continue
    }
    assert(!stats.isSymbolicLink(), `payload entry is a symbolic link: ${path}`)
    assert(stats.isFile(), `payload entry is not a regular file: ${path}`)
    assert.equal(stats.nlink, 1, `payload entry is hard-linked: ${path}`)
    const authorPath = path.replace(/(^|\/)\.gitignore$/u, '$1gitignore')
    assert.deepEqual(readFileSync(target), readFileSync(join(templateSource, ...authorPath.split('/'))), `payload bytes differ from the template source: ${path}`)
  }

  for (const required of [
    'LICENSE',
    'SOURCE-LICENSE.txt',
    'AGENTS.md',
    'CLAUDE.md',
    'packages/CLAUDE.md',
    '.agents/notes/implemented/CLAUDE.md',
    '.claude/skills',
    'README.md',
    'README.zh.md',
    'package.json',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    '.gitignore',
    '.gitattributes',
    '.oxlintrc.json',
    'vitest.config.ts',
    '.github/workflows/ci.yml',
    '.agents/skills/dsh-code-review/SKILL.md',
    'apps/plugin-market-generator/package.json',
    'apps/plugin-market-generator/src/cli.ts',
    'packages/util/plugin-market-index/package.json',
    'packages/util/plugin-market-index/src/index.ts',
    'scripts/run-gates.ts',
    'scripts/built-runtime.spec.ts',
  ]) {
    assert(payload.includes(required), `the payload is missing an expected file: ${required}`)
  }

  // 2. An existing destination is refused and whatever it already held is preserved.
  const occupied = join(temporary, 'occupied target')
  mkdirSync(occupied)
  const sentinel = join(occupied, 'sentinel.txt')
  writeFileSync(sentinel, 'pre-existing owner content\n')
  assert.throws(() => exportTemplate(occupied), /EEXIST|already exists/iu)
  assert.equal(readFileSync(sentinel, 'utf8'), 'pre-existing owner content\n')
  assert.deepEqual(walk(occupied), [sentinel], 'a refused export must not add or remove files')

  // 3. Install with the committed lock, then build the artifact plane in the exported copy.
  assert(!existsSync(join(exported, 'apps', 'plugin-market-generator', 'lib')), 'a fresh export must not carry build output')
  const corepack = resolveCorepack()
  const pnpm = (...args) => run(`pnpm ${args.join(' ')}`, corepack.command, [...corepack.prefix, 'pnpm', ...args], exported)
  pnpm('install', '--frozen-lockfile', '--ignore-scripts')
  pnpm('run', 'build')

  const cli = join(exported, 'apps', 'plugin-market-generator', 'lib', 'types', 'bin.js')
  assert(existsSync(cli), 'the exported project must build the CLI entry it ships')

  // 4. Drive the built CLI from the exported copy: a real index, then a refused argument that preserves it.
  const consumer = join(temporary, 'built consumer')
  mkdirSync(consumer)
  const sources = join(consumer, 'sources.txt')
  writeFileSync(sources, '# an intentionally empty source list\n')
  const output = join(consumer, 'index.json')
  const args = [cli, '--input', sources, '--output', output, '--title', 'Exported template']
  run('built CLI writes a format-1 index', process.execPath, args, consumer, 0, true)
  assert.deepEqual(JSON.parse(readFileSync(output, 'utf8')), { format: 1, title: 'Exported template', plugins: [] })

  const written = readFileSync(output)
  const refused = run('built CLI refuses an invalid concurrency', process.execPath, [...args, '--concurrency', '0'], consumer, 2, true)
  assert.match(refused.stderr, /must be a positive integer/u)
  assert(written.equals(readFileSync(output)), 'a refused argument must leave the previous index in place')

  // 5. Clean the actual emitted workspaces, including stale type-check probes, without
  // changing source; the source launcher must still work before artifacts are rebuilt.
  const workspaceRoots = ['apps/plugin-market-generator', 'packages/util/plugin-market-index']
  const sourceBytes = workspaceRoots.map(path => readFileSync(join(exported, path, 'src', path.startsWith('apps/') ? 'bin.ts' : 'index.ts')))
  for (const path of workspaceRoots) writeFileSync(join(exported, path, 'lib', 'types', 'oxlint-contract-sentinel.d.ts'), 'export declare const stale: unique symbol\n')
  pnpm('run', 'clean')
  for (const [index, path] of workspaceRoots.entries()) {
    assert(!existsSync(join(exported, path, 'lib')), `clean must remove the actual emitted workspace: ${path}`)
    assert.deepEqual(readFileSync(join(exported, path, 'src', path.startsWith('apps/') ? 'bin.ts' : 'index.ts')), sourceBytes[index], `clean must preserve authored source: ${path}`)
  }
  const sourceOutput = join(consumer, 'source-after-clean.json')
  assert(!existsSync(sourceOutput), 'source probe must begin without an output')
  pnpm('run', 'start', '--input', sources, '--output', sourceOutput, '--title', 'Exported template')
  assert(existsSync(sourceOutput), 'source launcher must create a fresh report')
  assert(written.equals(readFileSync(sourceOutput)), 'source execution after clean must produce the expected report')
  for (const path of workspaceRoots) assert(!existsSync(join(exported, path, 'lib')), 'source execution must not regenerate build artifacts')
  pnpm('run', 'build')
  const rebuiltOutput = join(consumer, 'rebuilt.json')
  assert(!existsSync(rebuiltOutput), 'rebuilt probe must begin without an output')
  run('rebuilt CLI creates the same output contract', process.execPath, [cli, '--input', sources, '--output', rebuiltOutput, '--title', 'Exported template'], consumer, 0, true)
  assert(existsSync(rebuiltOutput), 'rebuilt launcher must create a fresh report')
  assert(written.equals(readFileSync(rebuiltOutput)), 'rebuilding after clean must produce deterministic output')

  console.log('\nTEMPLATE CHECK PASSED: clean export payload, refusal preserves existing state, frozen-lock install, source build, built CLI refusal safety, workspace artifact cleanup, source execution without lib, and deterministic rebuild')
} finally {
  rmSync(temporary, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
}
