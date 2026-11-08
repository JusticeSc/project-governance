// Exercise the delivered empty template, then add an isolated workspace consumer.
// No business fixture is copied back into the authored template.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { availableParallelism, tmpdir } from 'node:os'
import { delimiter, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { exportTemplate } from './export-template.mjs'
import { resolveCorepack } from './template-corepack.mjs'

const templateNode = process.env.PROJECT_GOVERNANCE_TEMPLATE_NODE ?? process.execPath
if (!isAbsolute(templateNode)) throw new Error('check-template: template Node executable must be an absolute path')
const probeEnv = { ...process.env }
delete probeEnv.NODE_OPTIONS
delete probeEnv.NODE_PATH
const nodeVersion = spawnSync(templateNode, ['-p', 'process.versions.node'], { env: probeEnv, encoding: 'utf8', timeout: 10_000 })
if (nodeVersion.error) throw new Error('check-template: template Node executable is unavailable', { cause: nodeVersion.error })
if (nodeVersion.status !== 0 || !/^24\.\d+\.\d+$/u.test(nodeVersion.stdout.trim())) {
  throw new Error('check-template: template requires Node >=24 <25; set PROJECT_GOVERNANCE_TEMPLATE_NODE to a Node 24 executable')
}

const source = fileURLToPath(new URL('../', import.meta.url))
const templateSource = join(source, 'templates', 'node-typescript')
const temporary = mkdtempSync(join(tmpdir(), 'project-governance-template-'))
const exported = join(temporary, 'exported template 空间')
const TIMEOUT = 1_800_000

// A smoke run must not inherit loader hooks, an ambient archive baseline or an enclosing Git
// repository: the exported project is judged on its own content only.
const env = { ...process.env }
const pathKey = Object.keys(env).find(key => key.toUpperCase() === 'PATH') ?? 'PATH'
env[pathKey] = [dirname(templateNode), env[pathKey] ?? ''].join(delimiter)
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
env.COREPACK_ENABLE_NETWORK = '0'

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
    '.agents/skills/pg-code-review/SKILL.md',
    'scripts/run-gates.ts',
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

  // A fresh empty project builds the governance tooling without domain artifacts.
  const corepack = resolveCorepack(templateNode, env)
  // pnpm selects a store per filesystem by default; the exported project may be on a different drive.
  const sourceStore = run('pnpm store path in template source', corepack.command, [...corepack.prefix, 'pnpm', 'store', 'path'], templateSource, 0, true).stdout.trim()
  assert(isAbsolute(sourceStore), 'pnpm store path must return an absolute path')
  const pnpm = (args, expected = 0, capture = false, cwd = exported) =>
    run(`pnpm ${args.join(' ')}`, corepack.command, [...corepack.prefix, 'pnpm', ...args], cwd, expected, capture)
  pnpm(['install', '--offline', '--frozen-lockfile', '--ignore-scripts', '--store-dir', sourceStore])
  pnpm(['run', 'build'])
  pnpm(['run', 'constraints'])
  // Keep the acquisition check's real Git and process fixtures within a bounded worker budget.
  pnpm(['run', 'test', `--maxWorkers=${String(Math.min(4, availableParallelism()))}`])
  assert(!payload.some(path => path.startsWith('apps/') || /^packages\/[^/]+\/[^/]+\//u.test(path)), 'the template must not ship business members')

  // Only this temporary export gains a real library and application; omitted references must fail.
  const member = 'packages/math/statistics'
  const memberRoot = join(exported, member)
  const application = 'apps/console'
  const applicationRoot = join(exported, application)
  mkdirSync(join(memberRoot, 'src'), { recursive: true })
  mkdirSync(join(applicationRoot, 'src'), { recursive: true })
  const manifest = JSON.parse(readFileSync(join(exported, 'package.json'), 'utf8'))
  writeFileSync(join(memberRoot, 'package.json'), JSON.stringify({
    name: '@template-smoke/statistics', version: manifest.version, license: manifest.license,
    type: 'module', main: 'lib/index.js', types: 'lib/types/index.d.ts',
    exports: { '.': { types: './lib/types/index.d.ts', default: './lib/index.js' } },
    files: ['lib/index.js', 'lib/types/**/*.d.ts'], publishConfig: { access: 'public' },
    repository: { type: 'git', url: 'https://github.com/example/statistics.git', directory: member },
  }, null, 2) + '\n')
  writeFileSync(join(memberRoot, 'tsconfig.json'), JSON.stringify({
    extends: '../../../tsconfig.node.base.json',
    compilerOptions: { rootDir: 'src', outDir: 'lib/types' }, include: ['src/**/*.ts'],
  }, null, 2) + '\n')
  const entry = join(memberRoot, 'src/index.ts')
  const sourceBytes = Buffer.from('export function mean(values: readonly number[]): number {\n  if (values.length === 0) throw new RangeError("mean requires values")\n  return values.reduce((sum, value) => sum + value, 0) / values.length\n}\n')
  writeFileSync(entry, sourceBytes)
  writeFileSync(join(applicationRoot, 'package.json'), JSON.stringify({
    name: '@template-smoke/console', version: manifest.version, license: manifest.license,
    private: true, type: 'module', dependencies: { '@template-smoke/statistics': 'workspace:*' },
  }, null, 2) + '\n')
  writeFileSync(join(applicationRoot, 'tsconfig.json'), JSON.stringify({
    extends: '../../tsconfig.node.base.json',
    compilerOptions: { rootDir: 'src', outDir: 'lib/types' }, include: ['src/**/*.ts'],
    references: [{ path: `../../${member}` }],
  }, null, 2) + '\n')
  const applicationEntry = join(applicationRoot, 'src/index.ts')
  const applicationSource = Buffer.from('import { mean } from "@template-smoke/statistics"\nif (mean([3, 9, 12]) !== 8) throw new Error("workspace library result changed")\nconsole.log("application consumed library artifact")\n')
  writeFileSync(applicationEntry, applicationSource)
  // Updating the temporary workspace lock may require registry metadata not present in a fresh store.
  pnpm(['install', '--no-frozen-lockfile', '--ignore-scripts', '--store-dir', sourceStore])
  const omitted = pnpm(['run', 'build'], 1, true)
  assert.match(omitted.stderr + omitted.stdout, /workspace member missing.*references/u)
  const hostPath = join(exported, 'tsconfig.host.json')
  const host = JSON.parse(readFileSync(hostPath, 'utf8'))
  host.references = [{ path: `./${member}` }, { path: `./${application}` }]
  writeFileSync(hostPath, JSON.stringify(host, null, 2) + '\n')
  pnpm(['run', 'build'])
  pnpm(['run', 'constraints'])

  // Consume the actual public artifact, including its error behavior.
  const consumer = join(temporary, 'artifact consumer')
  mkdirSync(consumer)
  const probe = join(consumer, 'probe.mjs')
  writeFileSync(probe, `import assert from 'node:assert/strict'\nimport { mean } from ${JSON.stringify(pathToFileURL(join(memberRoot, 'lib/index.js')).href)}\nassert.equal(mean([3, 9, 12]), 8)\nassert.throws(() => mean([]), RangeError)\nconsole.log('public artifact mean=8; empty input rejected')\n`)
  run('actual artifact consumer', templateNode, [probe], consumer)
  run('actual application artifact consumer', templateNode, [join(applicationRoot, 'lib/types/index.js')], applicationRoot)

  writeFileSync(join(memberRoot, 'lib/types/stale-probe.d.ts'), 'export declare const stale: unique symbol\n')
  pnpm(['run', 'clean'])
  assert(!existsSync(join(memberRoot, 'lib')), 'clean must remove the whole library artifact tree')
  assert(!existsSync(join(applicationRoot, 'lib')), 'clean must remove the whole application artifact tree')
  assert.deepEqual(readFileSync(entry), sourceBytes, 'clean must preserve library source')
  assert.deepEqual(readFileSync(applicationEntry), applicationSource, 'clean must preserve application source')
  pnpm(['run', 'build'])
  run('artifact consumer after rebuild', templateNode, [probe], consumer)
  run('application artifact consumer after rebuild', templateNode, [join(applicationRoot, 'lib/types/index.js')], applicationRoot)
  console.log('\nTEMPLATE CHECK PASSED: regular-file payload, preserved existing destination, empty project build, discovered app/library rejection and recovery, library artifact behavior, app-to-library consumption, and clean rebuild')
} finally {
  rmSync(temporary, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
}
