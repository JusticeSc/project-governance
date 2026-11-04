import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const source = fileURLToPath(new URL('../', import.meta.url))
const npm = process.env.npm_execpath
if (!npm) throw new Error('Run this packaged-consumer check with npm run smoke')
const temporary = mkdtempSync(join(tmpdir(), 'project-governance-smoke-'))
const env = { ...process.env }
delete env.NODE_OPTIONS
delete env.NODE_PATH
const npmOptions = ['--offline', '--ignore-scripts', '--no-audit', '--no-fund']

function run(label, executable, args, cwd, expected = 0, timeout = 180_000, childEnv = env) {
  console.log('\n=== ' + label + ' ===')
  const result = spawnSync(executable, args, { cwd, env: childEnv, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout })
  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  if (result.error) throw result.error
  assert.equal(result.signal, null, label + ' terminated by signal')
  assert.equal(result.status, expected, label + ': unexpected exit status')
  return result
}

try {
  const packed = JSON.parse(run('pack selected product', process.execPath, [npm, 'pack', '--json', '--ignore-scripts', '--pack-destination', temporary], source).stdout)[0]
  assert(packed.files.some(file => file.path === 'npm-shrinkwrap.json'), 'The distributable lock must travel in the actual tarball')
  assert(packed.files.some(file => file.path === 'SOURCE-LICENSE.txt'), 'Source attribution must travel with the product')
  assert(packed.files.some(file => file.path === 'templates/node-typescript/pnpm-lock.yaml'), 'The independent template lock must travel in the actual tarball')
  assert(packed.files.some(file => file.path === 'skills/project-governance/assets/template.json.gz'), 'The Skill payload must travel in the actual tarball')
  assert(packed.files.some(file => file.path === 'skills/project-governance/scripts/install-template.mjs'), 'The Skill installer must travel in the actual tarball')
  assert(packed.files.some(file => file.path === 'templates/node-typescript/lefthook.yml'), 'The template hook configuration must travel in the actual tarball')
  assert(packed.files.some(file => file.path === 'templates/node-typescript/gitignore'), 'The npm-safe ignore source must travel in the actual tarball')
  assert(packed.files.some(file => file.path === 'templates/node-typescript/apps/plugin-market-generator/src/cli.ts'), 'Template application source must travel in the actual tarball')
  assert(packed.files.some(file => file.path === 'templates/node-typescript/packages/util/plugin-market-index/src/index.ts'), 'Template capability source must travel in the actual tarball')
  assert(packed.files.some(file => file.path === 'templates/node-typescript/.agents/skills/dsh-code-review/SKILL.md'), 'The template workflow guidance must travel in the actual tarball')
  assert(packed.files.some(file => file.path === 'templates/node-typescript/.claude/skills'), 'The Claude skills link marker must travel in the actual tarball')
  assert(!packed.files.some(file => file.path.startsWith('templates/node-typescript/.claude/') && file.path !== 'templates/node-typescript/.claude/skills'), 'Template local Claude settings must not enter the actual tarball')
  for (const file of packed.files) {
    assert(!/(^|\/)(?:node_modules|\.git|_working|research|knowledge|runs|__pycache__)(?:\/|$)/u.test(file.path), 'Private/history/dependency payload: ' + file.path)
    if (file.path.startsWith('templates/')) assert(!/(^|\/)(?:lib|\.cache)(?:\/|$)/u.test(file.path), 'Generated template output: ' + file.path)
  }
  const publicationProbe = join(temporary, 'publication rules')
  const reviewPath = 'templates/node-typescript/.github/review-ownership'
  mkdirSync(join(publicationProbe, reviewPath, '__pycache__'), { recursive: true })
  writeFileSync(join(publicationProbe, 'package.json'), JSON.stringify({
    name: 'governance-publication-probe', version: '0.0.0',
    files: JSON.parse(readFileSync(join(source, 'package.json'), 'utf8')).files,
  }))
  for (const name of ['blame-production.py', 'gitignore']) {
    writeFileSync(join(publicationProbe, reviewPath, name), readFileSync(join(source, reviewPath, name)))
  }
  writeFileSync(join(publicationProbe, reviewPath, '__pycache__', 'private-probe.pyc'), 'private generated cache sentinel\n')
  const claudePath = 'templates/node-typescript/.claude'
  mkdirSync(join(publicationProbe, claudePath), { recursive: true })
  writeFileSync(join(publicationProbe, claudePath, 'skills'), readFileSync(join(source, claudePath, 'skills')))
  for (const name of ['settings.json', 'settings.local.json']) {
    writeFileSync(join(publicationProbe, claudePath, name), 'local settings sentinel\n')
  }
  const workspaceProbes = [
    ['templates/node-typescript/apps/plugin-market-generator', 'src/cli.ts'],
    ['templates/node-typescript/packages/util/plugin-market-index', 'src/index.ts'],
  ]
  for (const [directory, authored] of workspaceProbes) {
    mkdirSync(join(publicationProbe, directory, 'src'), { recursive: true })
    writeFileSync(join(publicationProbe, directory, authored), readFileSync(join(source, directory, authored)))
    for (const generated of ['node_modules/.bin/tool', 'node_modules/.bin/tool.CMD', 'node_modules/.bin/tool.ps1', 'lib/index.js', 'lib/types/index.d.ts']) {
      mkdirSync(dirname(join(publicationProbe, directory, generated)), { recursive: true })
      writeFileSync(join(publicationProbe, directory, generated), 'generated workspace sentinel\n')
    }
  }
  const probed = JSON.parse(run('publication retains author sources while excluding caches, installed workspace shims and emitted outputs', process.execPath, [npm, 'pack', '--json', '--ignore-scripts', '--pack-destination', temporary], publicationProbe).stdout)[0]
  assert(probed.files.some(file => file.path === reviewPath + '/blame-production.py'), 'Review source must remain distributable')
  assert(probed.files.some(file => file.path === reviewPath + '/gitignore'), 'Review ignore rules must remain distributable')
  assert(!probed.files.some(file => /(^|\/)__pycache__(\/|$)/u.test(file.path)), 'Generated Python caches must not enter publication')
  for (const [directory, authored] of workspaceProbes) assert(probed.files.some(file => file.path === `${directory}/${authored}`), 'Workspace source must remain distributable')
  assert(!probed.files.some(file => /(^|\/)(?:node_modules|lib)(\/|$)/u.test(file.path)), 'Installed workspace dependencies and build outputs must not enter publication')
  assert(probed.files.some(file => file.path === `${claudePath}/skills`), 'The Claude skills link marker must remain distributable')
  assert(!probed.files.some(file => file.path.startsWith(`${claudePath}/`) && file.path !== `${claudePath}/skills`), 'Template local Claude settings must not enter publication')
  const consumer = join(temporary, 'packed consumer')
  mkdirSync(consumer)
  writeFileSync(join(consumer, 'package.json'), JSON.stringify({ name: 'governance-consumer', private: true }))
  run('install actual tarball', process.execPath, [npm, 'install', ...npmOptions, '--package-lock=false', join(temporary, packed.filename)], consumer)
  const packedRoot = join(consumer, 'node_modules', 'project-governance')
  run('prepare packed workspaces', process.execPath, [npm, 'ci', ...npmOptions], packedRoot)
  const packedCli = join(packedRoot, 'apps', 'cli', 'bin', 'governance.mjs')
  run('packed CLI help', process.execPath, [packedCli, '--help'], consumer)

  const target = join(temporary, 'existing project 空间')
  mkdirSync(target)
  const state = '# Existing owner\n\nCurrent task and permissions stay here.\n'
  writeFileSync(join(target, 'PROJECT.md'), state)
  writeFileSync(join(target, 'README.md'), '# Consumer\n\n[Current state](PROJECT.md)\n')
  writeFileSync(join(target, 'settings.json'), JSON.stringify({ mode: 'safe' }))
  writeFileSync(join(target, 'validate.cjs'), "const {readFileSync}=require('node:fs');const settings=JSON.parse(readFileSync('settings.json','utf8'));if(settings.mode!=='safe'){console.error('unsafe consumer mode');process.exit(1)}console.log('consumer mode accepted')\n")
  run('install Skill from packed product', process.execPath, [packedCli, 'install', target], consumer)
  const seat = join(target, '.agents', 'skills', 'project-governance')
  const skillBefore = readFileSync(join(seat, 'SKILL.md'))
  run('Skill refuses conflicting existing project before writing', process.execPath, [join(seat, 'scripts/install-template.mjs'), target], consumer, 1)
  assert.equal(readFileSync(join(target, 'PROJECT.md'), 'utf8'), state)
  run('packed product accepts its declared package graph', process.execPath, [npm, 'run', 'check:structure'], packedRoot)
  const boundaryEntry = join(packedRoot, 'apps', 'cli', 'bin', 'governance.mjs')
  const boundarySource = readFileSync(boundaryEntry)
  const boundaryOffset = boundarySource.toString().startsWith('#!') ? boundarySource.indexOf(10) + 1 : 0
  try {
    writeFileSync(boundaryEntry, Buffer.concat([
      boundarySource.subarray(0, boundaryOffset),
      Buffer.from("import { runChecks as privateBoundaryProbe } from '../../../packages/governance/checks/src/index.mjs'\n"),
      boundarySource.subarray(boundaryOffset),
    ]))
    run('packed product refuses a real cross-package private import', process.execPath, [npm, 'run', 'check:structure'], packedRoot, 1)
  } finally {
    writeFileSync(boundaryEntry, boundarySource)
  }
  run('packed product accepts exact boundary restoration', process.execPath, [npm, 'run', 'check:structure'], packedRoot)
  const ignoreFixture = join(temporary, 'installed template and Skill')
  const copiedSeat = join(ignoreFixture, '.agents/skills/project-governance')
  mkdirSync(join(ignoreFixture, '.agents/skills'), { recursive: true })
  cpSync(seat, copiedSeat, { recursive: true })
  run('copied Skill installs inside its own target without dependencies', process.execPath, [join(copiedSeat, 'scripts/install-template.mjs'), ignoreFixture], consumer)
  assert.deepEqual(readFileSync(join(copiedSeat, 'SKILL.md')), skillBefore)
  run('copied Skill refuses conflicting reinstallation', process.execPath, [join(copiedSeat, 'scripts/install-template.mjs'), ignoreFixture], consumer, 1)
  const gitEnv = {
    ...Object.fromEntries(Object.entries(env).filter(([key]) => !key.toUpperCase().startsWith('GIT_'))),
    GIT_CONFIG_GLOBAL: join(temporary, 'isolated.gitconfig'),
    GIT_CONFIG_NOSYSTEM: '1',
  }
  run('initialize owned ignore-rule consumer', 'git', ['init'], ignoreFixture, 0, 30_000, gitEnv)
  const ignoredPaths = ['.agents/skills/dsh-code-review/agents/openai.yaml', '.github/review-ownership/__pycache__/probe.pyc']
  for (const path of ignoredPaths) {
    mkdirSync(join(ignoreFixture, dirname(path)), { recursive: true })
    writeFileSync(join(ignoreFixture, path), 'owned ignore-rule probe\n')
  }
  const ignored = run('exported nested rules ignore local agent metadata and Python caches', 'git', ['check-ignore', '--no-index', '--verbose', ...ignoredPaths], ignoreFixture, 0, 30_000, gitEnv)
  const matchingRules = ignored.stdout.trim().split(/\r?\n/u).map(line => {
    const [rule, path] = line.split('\t')
    const [file, , pattern] = rule.split(':')
    return [file, pattern, path]
  })
  assert.deepEqual(matchingRules, [
    ['.agents/skills/.gitignore', '*/agents/openai.yaml', ignoredPaths[0]],
    ['.github/review-ownership/.gitignore', '__pycache__/', ignoredPaths[1]],
  ])
  run('packed product exports and verifies its independent template', process.execPath, [npm, 'run', 'check:template'], packedRoot, 0, 1_800_000)
  run('linked pairing command refuses an undeclared consumer corpus', process.execPath, [npm, 'exec', '--offline', '--yes=false', '--', 'verify-translation-pairing', '--repo', target, '--config', 'missing-pairs.json'], packedRoot, 2)
  run('linked subsystem command refuses missing consumer configuration', process.execPath, [npm, 'exec', '--offline', '--yes=false', '--', 'verify-subsystem-pages', '--root', target, '--config', 'missing-subsystems.json'], packedRoot, 2)
  const guide = join(target, 'docs', 'upgrade-guide', 'v1.0.0', 'renamed-flag', 'guide.md')
  mkdirSync(join(guide, '..'), { recursive: true })
  const guideSource = '---\nkind: upgrade-guide\ndescription: Rename the consumer flag.\n---\n\n# Flag rename\n\n## Change\n\nThe old flag is replaced.\n\n## Migration\n\nUse the new flag and confirm the command output.\n'
  writeFileSync(guide, guideSource.replace('## Migration', '## Migrations'))
  run('linked upgrade command rejects the invalid consumer guide', process.execPath, [npm, 'exec', '--offline', '--yes=false', '--', 'verify-upgrade-guides', '--root', target], packedRoot, 1)
  writeFileSync(guide, guideSource)
  run('linked upgrade command accepts the corrected guide', process.execPath, [npm, 'exec', '--offline', '--yes=false', '--', 'verify-upgrade-guides', '--root', target], packedRoot)
  const cli = packedCli
  const quotedNode = '"' + process.execPath + '"'
  writeFileSync(join(target, 'governance-checks.json'), JSON.stringify({ checks: { settings: quotedNode + ' validate.cjs' } }))
  run('installed consumer accepts valid state', process.execPath, [cli, 'check', target], consumer)
  writeFileSync(join(target, 'settings.json'), JSON.stringify({ mode: 'unsafe' }))
  const rejected = run('installed consumer rejects invalid state', process.execPath, [cli, 'check', target], consumer, 1)
  assert.match(rejected.stderr, /unsafe consumer mode/u)
  writeFileSync(join(target, 'settings.json'), JSON.stringify({ mode: 'safe' }))
  run('installed consumer recovers after correction', process.execPath, [cli, 'check', target], consumer)
  run('packed product reference graph is self-contained', process.execPath, [join(packedRoot, 'packages', 'governance', 'documentation', 'src', 'verify-md-links.mjs')], packedRoot)
  run('refuse to overwrite existing Skill', process.execPath, [packedCli, 'install', target], consumer, 1)
  assert.deepEqual(readFileSync(join(seat, 'SKILL.md')), skillBefore)
  assert.equal(readFileSync(join(target, 'PROJECT.md'), 'utf8'), state)
  console.log('\nSMOKE PASSED: actual tarball, standalone Skill and template installation, consumer acceptance/rejection/recovery, self-contained product references, overwrite refusal and preserved state')
} finally {
  rmSync(temporary, { recursive: true, force: true })
}
