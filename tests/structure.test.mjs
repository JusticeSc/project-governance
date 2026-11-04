import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { verifyStructure } from '../scripts/verify-structure.mjs'

const readme = '# Fixture package\n\nEnglish summary.\n'
const readmeZh = '# 夹具包\n\n中文摘要。\n'
const placeholderTest = "import test from 'node:test'\n\ntest('placeholder', () => {})\n"

function writeTree(root, files) {
  for (const [path, content] of Object.entries(files)) {
    const full = join(root, path)
    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, typeof content === 'string' ? content : `${JSON.stringify(content, null, 2)}\n`)
  }
}

function createProject(t, files) {
  const root = mkdtempSync(join(tmpdir(), 'governance-structure-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  writeTree(root, files)
  return root
}

function redirectManifest(t, root, path) {
  const external = mkdtempSync(join(tmpdir(), 'governance-external-manifest-'))
  t.after(() => rmSync(external, { recursive: true, force: true }))
  const source = join(root, path)
  const target = join(external, 'package.json')
  writeFileSync(target, readFileSync(source))
  unlinkSync(source)
  symlinkSync(target, source, 'file')
}

function rootManifest(extra = {}) {
  return { name: 'fixture-root', version: '1.0.0', private: true, type: 'module', workspaces: ['apps/*', 'packages/*/*'], ...extra }
}

function capabilityFiles(directory, manifest, { source = { 'index.mjs': "export const value = 'ok'\n" }, tests = {}, exports = { '.': './src/index.mjs' }, dependencies = {}, devDependencies = {} } = {}) {
  const files = {
    [`${directory}/package.json`]: { version: '1.0.0', type: 'module', exports, dependencies, devDependencies, ...manifest },
    [`${directory}/README.md`]: readme,
    [`${directory}/README.zh.md`]: readmeZh,
    [`${directory}/tests/placeholder.test.mjs`]: placeholderTest,
  }
  for (const [path, content] of Object.entries(source)) files[`${directory}/src/${path}`] = content
  for (const [path, content] of Object.entries(tests)) files[`${directory}/tests/${path}`] = content
  return files
}

function applicationFiles(directory, manifest, { bin = { 'fixture-app': 'bin/cli.mjs' }, entry = "#!/usr/bin/env node\nconsole.log('fixture')\n", dependencies = {}, devDependencies = {} } = {}) {
  return {
    [`${directory}/package.json`]: { version: '1.0.0', type: 'module', bin, dependencies, devDependencies, ...manifest },
    [`${directory}/README.md`]: readme,
    [`${directory}/README.zh.md`]: readmeZh,
    [`${directory}/tests/placeholder.test.mjs`]: placeholderTest,
    [`${directory}/bin/cli.mjs`]: entry,
  }
}

/** A graph that satisfies every declared structural obligation. */
function validProject(t, overrides = {}) {
  return createProject(t, {
    'package.json': rootManifest({ devDependencies: { '@fixture/core': '*' } }),
    'scripts/tool.mjs': "import { createRequire } from 'node:module'\nimport { value } from '@fixture/core'\nexport { value }\nexport const dynamic = await import('@fixture/core')\nconst require = createRequire(import.meta.url)\nexport const loaded = require('@fixture/core')\n",
    ...capabilityFiles('packages/core/main', { name: '@fixture/core' }),
    ...applicationFiles('apps/cli', { name: '@fixture/cli', dependencies: { '@fixture/core': '*' } }, { entry: "#!/usr/bin/env node\nimport { value } from '@fixture/core'\nexport { value }\nexport const dynamic = await import('@fixture/core')\nconsole.log(value, dynamic)\n" }),
    ...overrides,
  })
}

function diagnostics(errors, pattern) {
  return errors.filter(error => pattern.test(error))
}

function assertDiagnostic(errors, pattern, description) {
  assert(diagnostics(errors, pattern).length > 0, `${description}\nactual diagnostics:\n${errors.join('\n') || '(none)'}`)
}

test('accepts a native ESM graph with a public app bin entry and root tooling', t => {
  const root = validProject(t)
  assert.deepEqual(verifyStructure(root), [])
})

test('rejects an undeclared dependency even when Node can resolve it', t => {
  const root = createProject(t, {
    'package.json': rootManifest(),
    ...capabilityFiles('packages/core/main', { name: '@fixture/core' }),
    ...applicationFiles('apps/cli', { name: '@fixture/cli' }, { entry: "import { value } from '@fixture/core'\nconsole.log(value)\n" }),
    'node_modules/@fixture/core/package.json': { name: '@fixture/core', version: '1.0.0', type: 'module', exports: { '.': './index.mjs' } },
    'node_modules/@fixture/core/index.mjs': "export const value = 'resolvable'\n",
  })
  assert.equal(createRequire(join(root, 'apps/cli/bin/cli.mjs')).resolve('@fixture/core'), join(root, 'node_modules/@fixture/core/index.mjs'))
  const errors = verifyStructure(root)
  assertDiagnostic(errors, /undeclared dependency @fixture\/core/u, 'an import that Node resolves must still require a declaration')
})

test('rejects a relative import that bypasses package declarations', t => {
  const root = validProject(t, {
    ...applicationFiles('apps/cli', { name: '@fixture/cli', dependencies: { '@fixture/core': '*' } }, { entry: "import { value } from '../../../packages/core/main/src/index.mjs'\nconsole.log(value)\n" }),
  })
  const errors = verifyStructure(root)
  assertDiagnostic(errors, /cross-package or non-source relative import/u, 'a relative path into another package is a bypass')
  assertDiagnostic(errors, /\.\.\/\.\.\/\.\.\/packages\/core\/main\/src\/index\.mjs/u, 'the diagnostic must name the bypassing specifier')
})

test('rejects a capability that depends on an application', t => {
  const root = createProject(t, {
    'package.json': rootManifest(),
    ...capabilityFiles('packages/core/main', { name: '@fixture/core', dependencies: { '@fixture/cli': '*' } }),
    ...applicationFiles('apps/cli', { name: '@fixture/cli' }),
  })
  const errors = verifyStructure(root)
  assertDiagnostic(errors, /capability must not depend on application @fixture\/cli/u, 'capabilities cannot depend on applications')
})

test('rejects a workspace dependency cycle', t => {
  const root = createProject(t, {
    'package.json': rootManifest(),
    ...capabilityFiles('packages/core/alpha', { name: '@fixture/alpha', dependencies: { '@fixture/beta': '*' } }),
    ...capabilityFiles('packages/core/beta', { name: '@fixture/beta', dependencies: { '@fixture/alpha': '*' } }),
    ...applicationFiles('apps/cli', { name: '@fixture/cli', dependencies: { '@fixture/alpha': '*' } }),
  })
  const errors = verifyStructure(root)
  assertDiagnostic(errors, /dependency cycle: .*@fixture\/alpha.*@fixture\/beta/u, 'a cycle among workspace packages must be reported')
})

test('accepts a dependency declared only for the owning package tests', t => {
  const root = createProject(t, {
    'package.json': rootManifest(),
    ...capabilityFiles('packages/core/main', { name: '@fixture/core', devDependencies: { 'fixture-parser': '1.0.0' } }, { tests: { 'parser.test.mjs': "import parser from 'fixture-parser'\nparser()\n" } }),
    ...applicationFiles('apps/cli', { name: '@fixture/cli' }),
  })
  assert.deepEqual(verifyStructure(root), [])
})

test('rejects a test-only devDependency used by production source', t => {
  const root = createProject(t, {
    'package.json': rootManifest(),
    ...capabilityFiles('packages/core/main', { name: '@fixture/core', devDependencies: { 'fixture-parser': '1.0.0' } }, { source: { 'index.mjs': "import parser from 'fixture-parser'\nexport const value = parser()\n" }, tests: { 'parser.test.mjs': "import parser from 'fixture-parser'\nparser()\n" } }),
    ...applicationFiles('apps/cli', { name: '@fixture/cli' }),
  })
  const errors = verifyStructure(root)
  assert.equal(diagnostics(errors, /packages\/core\/main\/src\/index\.mjs/u).length, 1, `only the production import is a violation:\n${errors.join('\n')}`)
  assertDiagnostic(errors, /undeclared dependency fixture-parser/u, 'a devDependency is not available to production source')
})

test('rejects public entries whose targets are missing or outside the package', t => {
  const root = createProject(t, {
    'package.json': rootManifest(),
    ...capabilityFiles('packages/core/missing', { name: '@fixture/missing', exports: { '.': './src/absent.mjs' } }),
    ...capabilityFiles('packages/core/escaping', { name: '@fixture/escaping', exports: { '.': '../outside.mjs' } }),
    'packages/core/outside.mjs': "export const value = 'existing external public-entry target'\n",
    ...applicationFiles('apps/cli', { name: '@fixture/cli', bin: { 'fixture-app': 'bin/absent.mjs' } }),
  })
  const errors = verifyStructure(root)
  assertDiagnostic(errors, /src\/absent\.mjs/u, 'a public target must exist')
  assertDiagnostic(errors, /bin\/absent\.mjs/u, 'an app bin target must exist')
  assertDiagnostic(errors, /\.\.\/outside\.mjs/u, 'a public target must stay inside its package')
})

test('accepts conditional root exports and a declared public subpath', t => {
  const root = createProject(t, {
    'package.json': rootManifest(),
    ...capabilityFiles('packages/core/main', { name: '@fixture/core', exports: { '.': { import: './src/index.mjs', default: './src/index.mjs' }, './feature': './src/feature.mjs' } }, { source: { 'index.mjs': "export const value = 'ok'\n", 'feature.mjs': "export const feature = 'ok'\n" } }),
    ...applicationFiles('apps/cli', { name: '@fixture/cli', dependencies: { '@fixture/core': '*' } }, { entry: "import { value } from '@fixture/core'\nimport { feature } from '@fixture/core/feature'\nconsole.log(value, feature)\n" }),
  })
  assert.deepEqual(verifyStructure(root), [])
})

test('rejects a subpath when only conditional root exports are published', t => {
  const root = createProject(t, {
    'package.json': rootManifest(),
    ...capabilityFiles('packages/core/main', { name: '@fixture/core', exports: { import: './src/index.mjs', default: './src/index.mjs' } }),
    ...applicationFiles('apps/cli', { name: '@fixture/cli', dependencies: { '@fixture/core': '*' } }, { entry: "import { feature } from '@fixture/core/feature'\nconsole.log(feature)\n" }),
  })
  const errors = verifyStructure(root)
  assertDiagnostic(errors, /private or missing export @fixture\/core\/feature/u, 'condition-only exports publish the bare root alone')
})

test('rejects private subpaths in static import, re-export, dynamic import and require', t => {
  const root = createProject(t, {
    'package.json': rootManifest(),
    ...capabilityFiles('packages/core/main', { name: '@fixture/core' }),
    ...applicationFiles('apps/cli', { name: '@fixture/cli', dependencies: { '@fixture/core': '*' } }),
    'apps/cli/bin/static.mjs': "import { value } from '@fixture/core/src/index.mjs'\nconsole.log(value)\n",
    'apps/cli/bin/reexport.mjs': "export { value } from '@fixture/core/src/index.mjs'\n",
    'apps/cli/bin/dynamic.mjs': "const { value } = await import('@fixture/core/src/index.mjs')\nconsole.log(value)\n",
    'apps/cli/bin/required.mjs': "import { createRequire } from 'node:module'\nconst require = createRequire(import.meta.url)\nconst { value } = require('@fixture/core/src/index.mjs')\nconsole.log(value)\n",
  })
  const errors = verifyStructure(root)
  for (const file of ['static', 'reexport', 'dynamic', 'required']) {
    assertDiagnostic(errors, new RegExp(`bin/${file}\\.mjs: private or missing export @fixture/core/src/index\\.mjs`, 'u'), `the ${file} form must be checked`)
  }
})

test('rejects a null export subpath as unpublished', t => {
  const root = createProject(t, {
    'package.json': rootManifest(),
    ...capabilityFiles('packages/core/main', { name: '@fixture/core', exports: { '.': './src/index.mjs', './blocked': null } }),
    ...applicationFiles('apps/cli', { name: '@fixture/cli', dependencies: { '@fixture/core': '*' } }, { entry: "import { value } from '@fixture/core/blocked'\nconsole.log(value)\n" }),
  })
  const errors = verifyStructure(root)
  assertDiagnostic(errors, /private or missing export @fixture\/core\/blocked/u, 'a null subpath is not a published entry')
})

test('does not prove computed specifiers, aliased loaders or dynamic resolution', t => {
  const root = validProject(t, {
    ...applicationFiles('apps/cli', { name: '@fixture/cli', dependencies: { '@fixture/core': '*' } }, { entry: "import { createRequire } from 'node:module'\nconst name = '@fixture/core'\nconst loaded = await import(name)\nconst load = createRequire(import.meta.url)\nconst resolved = load.resolve('@fixture/core')\nexport const viaAlias = load(resolved)\nexport const meta = import.meta.resolve('@fixture/core')\nexport const viaComputed = loaded\n" }),
  })
  assert.deepEqual(verifyStructure(root), [], 'computed specifiers, aliased loaders and dynamic resolution stay unproven')
})

test('rejects a junction that redirects a relative import outside the package', t => {
  const outside = mkdtempSync(join(tmpdir(), 'governance-outside-'))
  t.after(() => rmSync(outside, { recursive: true, force: true }))
  writeTree(outside, { 'secret.mjs': "export const secret = 'outside'\n" })
  const root = validProject(t, {
    ...capabilityFiles('packages/core/main', { name: '@fixture/core' }, { source: { 'index.mjs': "import { secret } from './vendor/secret.mjs'\nexport const value = secret\n" } }),
  })
  try {
    symlinkSync(outside, join(root, 'packages/core/main/src/vendor'), process.platform === 'win32' ? 'junction' : 'dir')
  } catch (error) {
    t.skip(`this host cannot create a directory link: ${error.message}`)
    return
  }
  const errors = verifyStructure(root)
  assertDiagnostic(errors, /packages\/core\/main\/src\/vendor: authored source links are forbidden/u, 'an authored link is not a source file')
  assertDiagnostic(errors, /redirected import escapes package: \.\/vendor\/secret\.mjs/u, 'a link must not resolve an import outside its package')
})

test('rejects a junction alias even when its target stays inside the package', t => {
  const root = validProject(t, {
    ...capabilityFiles('packages/core/main', { name: '@fixture/core' }, { source: { 'index.mjs': "import { helper } from './alias/helper.mjs'\nexport const value = helper\n", 'lib/helper.mjs': "export const helper = 'inside'\n" } }),
  })
  try {
    symlinkSync(join(root, 'packages/core/main/src/lib'), join(root, 'packages/core/main/src/alias'), process.platform === 'win32' ? 'junction' : 'dir')
  } catch (error) {
    t.skip(`this host cannot create a directory link: ${error.message}`)
    return
  }
  const errors = verifyStructure(root)
  assertDiagnostic(errors, /packages\/core\/main\/src\/alias: authored source links are forbidden/u, 'authored source links are forbidden even when their target is in-package')
})

test('accepts a legitimate alias of the repository root', t => {
  const root = validProject(t)
  const aliases = mkdtempSync(join(tmpdir(), 'governance-root-alias-'))
  t.after(() => rmSync(aliases, { recursive: true, force: true }))
  const alias = join(aliases, 'project')
  symlinkSync(root, alias, process.platform === 'win32' ? 'junction' : 'dir')
  assert.deepEqual(verifyStructure(alias), [])
})

test('rejects a workspace package outside the declared workspace patterns', t => {
  const root = createProject(t, {
    'package.json': rootManifest({ workspaces: ['apps/*'] }),
    ...capabilityFiles('packages/core/alpha', { name: '@fixture/alpha' }),
    ...applicationFiles('apps/cli', { name: '@fixture/cli' }),
  })
  const errors = verifyStructure(root)
  assertDiagnostic(errors, /packages\/core\/alpha: package is not covered by root workspaces/u, 'npm would not link a package outside the workspace declarations')
})

test('reports an unusable root as a prerequisite failure', t => {
  const empty = mkdtempSync(join(tmpdir(), 'governance-empty-'))
  t.after(() => rmSync(empty, { recursive: true, force: true }))
  assert.throws(() => verifyStructure(join(empty, 'absent')), 'a missing directory is not a valid root')
  assert.throws(() => verifyStructure(empty), 'a root without the declared graph is not usable')
})

test('rejects a valid workspace manifest redirected outside its package', t => {
  const root = validProject(t)
  redirectManifest(t, root, 'packages/core/main/package.json')
  assertDiagnostic(verifyStructure(root), /package\.json escapes its package/u, 'external declarations cannot supply the package contract')
})

test('refuses a valid root manifest redirected outside the repository', t => {
  const root = validProject(t)
  redirectManifest(t, root, 'package.json')
  assert.throws(() => verifyStructure(root), /package\.json escapes the repository/u)
})

test('rejects broad workspace discovery that includes an independent project', t => {
  const root = validProject(t, {
    'package.json': rootManifest({ workspaces: ['**'], devDependencies: { '@fixture/core': '*' } }),
    'templates/reference/package.json': { name: 'independent-template', private: true, type: 'module' },
  })
  assertDiagnostic(verifyStructure(root), /templates\/reference: root workspaces includes a non-product package/u, 'the independent template must not join root workspace discovery')
})

test('rejects a null-only export array even when a valid bin remains', t => {
  const root = validProject(t, {
    ...capabilityFiles('packages/core/main', { name: '@fixture/core', exports: [null], bin: { 'fixture-tool': 'src/index.mjs' } }),
  })
  assertDiagnostic(verifyStructure(root), /private or missing export @fixture\/core/u, 'a command entry does not publish a bare package export')
})

test('refuses an application helper outside its checked production area', t => {
  const root = validProject(t, {
    ...applicationFiles('apps/cli', { name: '@fixture/cli', dependencies: { '@fixture/core': '*' } }, { entry: "import '../helper.mjs'\n" }),
    'apps/cli/helper.mjs': "export { value } from '../../packages/core/main/src/index.mjs'\n",
  })
  assertDiagnostic(verifyStructure(root), /cross-package or non-source relative import \.\.\/helper\.mjs/u, 'a private import cannot hide in an unscanned helper')
})

test('refuses an unchecked helper imported by root tooling', t => {
  const root = validProject(t, {
    'scripts/tool.mjs': "import '../helper.mjs'\n",
    'helper.mjs': "export { value } from './packages/core/main/src/index.mjs'\n",
  })
  assertDiagnostic(verifyStructure(root), /relative import is outside the checked source areas/u, 'root tools cannot hide a private dependency outside the corpus')
})

test('refuses a public entry outside the production source area', t => {
  const root = validProject(t, {
    ...capabilityFiles('packages/core/main', { name: '@fixture/core', exports: { '.': './entry.mjs' } }),
    'packages/core/main/entry.mjs': "export { value } from './src/index.mjs'\n",
  })
  assertDiagnostic(verifyStructure(root), /public entry is outside the checked production source areas/u, 'public entries must remain in the checked production plane')
})

test('application production code cannot pull a test-only dependency through a test helper', t => {
  const root = validProject(t, {
    ...applicationFiles('apps/cli', { name: '@fixture/cli', devDependencies: { 'test-parser': '1.0.0' } }, { entry: "import '../tests/loader.mjs'\n" }),
    'apps/cli/tests/loader.mjs': "import parser from 'test-parser'\nexport { parser }\n",
  })
  assertDiagnostic(verifyStructure(root), /cross-package or non-source relative import \.\.\/tests\/loader\.mjs/u, 'production cannot gain test dependency permissions through a test helper')
})

test('CLI dispatch through a root alias still refuses an invalid project', t => {
  const root = validProject(t, {
    ...applicationFiles('apps/cli', { name: '@fixture/cli' }, { entry: "import { value } from '@fixture/core'\nconsole.log(value)\n" }),
  })
  const aliases = mkdtempSync(join(tmpdir(), 'governance-aliased-checker-'))
  t.after(() => rmSync(aliases, { recursive: true, force: true }))
  const alias = join(aliases, 'product')
  symlinkSync(fileURLToPath(new URL('../', import.meta.url)), alias, process.platform === 'win32' ? 'junction' : 'dir')
  const result = spawnSync(process.execPath, [join(alias, 'scripts/verify-structure.mjs')], { cwd: root, encoding: 'utf8' })
  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`)
  assert.match(result.stderr, /undeclared dependency @fixture\/core/u)
})

for (const name of ['canonical', 'alias']) {
  test(`template export CLI dispatches through the ${name} product path`, t => {
    const temporary = mkdtempSync(join(tmpdir(), 'governance-export-cli-'))
    t.after(() => rmSync(temporary, { recursive: true, force: true }))
    const product = fileURLToPath(new URL('../', import.meta.url))
    let root = product
    if (name === 'alias') {
      root = join(temporary, 'product')
      try {
        symlinkSync(product, root, process.platform === 'win32' ? 'junction' : 'dir')
      } catch (error) {
        if (process.platform === 'win32' && ['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) {
          t.skip(`Cannot create a directory junction: ${error.code}`)
          return
        }
        throw error
      }
    }

    const originalManifest = readFileSync(join(product, 'templates/node-typescript/package.json'))
    const originalEntry = readFileSync(join(product, 'templates/node-typescript/apps/plugin-market-generator/src/bin.ts'))
    const script = join(root, 'scripts/export-template.mjs')
    const destination = join(temporary, 'export')
    const run = (...args) => spawnSync(process.execPath, [script, ...args], { cwd: temporary, encoding: 'utf8' })
    const success = run(destination)
    assert.equal(success.status, 0, `${success.stdout}\n${success.stderr}`)
    assert.match(success.stdout, /Exported \d+ author files/u)
    assert.deepEqual(readFileSync(join(destination, 'package.json')), originalManifest)
    assert.deepEqual(readFileSync(join(destination, 'apps/plugin-market-generator/src/bin.ts')), originalEntry)

    const missing = run()
    assert.equal(missing.status, 1, `${missing.stdout}\n${missing.stderr}`)
    assert.match(missing.stderr, /usage: npm run export-template/u)

    const sentinel = join(destination, 'owner-sentinel.txt')
    writeFileSync(sentinel, 'owner content\n')
    const occupied = run(destination)
    assert.equal(occupied.status, 1, `${occupied.stdout}\n${occupied.stderr}`)
    assert.match(occupied.stderr, /export-template:/u)
    assert.equal(readFileSync(sentinel, 'utf8'), 'owner content\n')
    assert.deepEqual(readFileSync(join(destination, 'package.json')), originalManifest)
    assert.deepEqual(readFileSync(join(destination, 'apps/plugin-market-generator/src/bin.ts')), originalEntry)
  })
}

test('importing the template exporter does not run its CLI', t => {
  const temporary = mkdtempSync(join(tmpdir(), 'governance-export-import-'))
  t.after(() => rmSync(temporary, { recursive: true, force: true }))
  const destination = join(temporary, 'not-created')
  const url = new URL('../scripts/export-template.mjs', import.meta.url).href
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify(url)})`, destination], { cwd: temporary, encoding: 'utf8' })
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
  assert.equal(result.stdout, '')
  assert.equal(result.stderr, '')
  assert.equal(existsSync(destination), false)
})
