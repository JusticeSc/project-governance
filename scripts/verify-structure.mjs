// Repository-owned structure gate for the native-ESM product: actual workspace packages,
// public entries and the statically visible import graph. The independently governed
// templates/ tree is deliberately outside this graph.
//
// Static proof limits: literal static imports/exports, literal import()/require() and
// literal import-equals are checked. Computed specifiers, aliased loaders (for example
// `const load = createRequire(...)`), `require.resolve`, `import.meta.resolve` and other
// dynamic assembly are not statically proven. Target-owned compiler loading stays intact.
import { createRequire, isBuiltin } from 'node:module'
import { existsSync, globSync, lstatSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
let typescript
function compiler() {
  if (typescript) return typescript
  try {
    typescript = require('typescript')
  } catch (error) {
    throw new Error(`TypeScript is required to parse authored modules; install the root devDependencies (${error.message})`)
  }
  return typescript
}

const posix = value => value.split(sep).join('/')
const inside = (root, path) => { const rel = relative(root, path); return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel) }
const isFile = path => existsSync(path) && statSync(path).isFile()
const isDirectory = path => existsSync(path) && statSync(path).isDirectory()

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    throw new Error(`${path}: ${error.message}`)
  }
}

function manifestObject(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${path}: manifest must contain a JSON object`)
  return value
}

function declared(manifest, field) {
  const value = manifest[field]
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function targets(value) {
  if (typeof value === 'string') return [value]
  if (value && typeof value === 'object') return Object.values(value).flatMap(targets)
  return []
}

/** Keys a package actually publishes: string/array shorthand and root condition objects mean the bare root only. */
function publicKeys(exportsField) {
  if (typeof exportsField === 'string' || Array.isArray(exportsField)) return new Set(targets(exportsField).length ? ['.'] : [])
  const keys = Object.keys(exportsField ?? {})
  if (!keys.length) return new Set()
  return keys.every(key => key.startsWith('.'))
    ? new Set(keys.filter(key => targets(exportsField[key]).length))
    : new Set(targets(exportsField).length ? ['.'] : [])
}

function packageNameOf(specifier) {
  if (!specifier.startsWith('@')) return specifier.split('/')[0]
  return specifier.split('/').slice(0, 2).join('/')
}

function workspacePatterns(manifest) {
  const value = manifest.workspaces
  if (Array.isArray(value)) return value
  if (value && typeof value === 'object' && Array.isArray(value.packages)) return value.packages
  return null
}

/** Check the actual declared package/import graph, without requiring a build plane. */
export function verifyStructure(directory) {
  const requested = resolve(directory)
  if (!isDirectory(requested)) throw new Error(`root directory is not a directory: ${requested}`)
  const root = realpathSync(requested)
  const realRoot = root
  const rootManifestPath = join(root, 'package.json')
  if (!existsSync(rootManifestPath)) throw new Error(`root package.json is missing: ${rootManifestPath}`)
  if (!inside(root, realpathSync(rootManifestPath))) throw new Error('root package.json escapes the repository through a link')
  const rootManifest = manifestObject(readJson(rootManifestPath), rootManifestPath)
  const errors = []
  const fail = message => errors.push(message)
  const ts = compiler()

  function childDirectories(parent) {
    if (!isDirectory(parent)) return []
    if (!inside(root, realpathSync(parent))) { fail(`${posix(relative(root, parent))}: directory escapes the repository through a link`); return [] }
    const names = []
    for (const entry of readdirSync(parent, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      const path = join(parent, entry.name)
      if (entry.isSymbolicLink()) { fail(`${posix(relative(root, path))}: authored source links are forbidden`); continue }
      if (entry.isDirectory()) names.push(entry.name)
    }
    return names.sort()
  }

  const packages = []
  for (const app of childDirectories(join(root, 'apps'))) packages.push(`apps/${app}`)
  for (const group of childDirectories(join(root, 'packages'))) {
    const groupPath = join(root, 'packages', group)
    if (existsSync(join(groupPath, 'package.json'))) fail(`packages/${group}: capability group must not be a package`)
    for (const name of childDirectories(groupPath)) packages.push(`packages/${group}/${name}`)
  }

  const byName = new Map()
  for (const path of packages) {
    const full = join(root, path)
    const manifestPath = join(full, 'package.json')
    if (!existsSync(manifestPath)) { fail(`${path}: missing package.json`); continue }
    const realFull = realpathSync(full)
    if (!inside(realRoot, realFull)) { fail(`${path}: package root escapes the repository through a link`); continue }
    if (!inside(realFull, realpathSync(manifestPath))) { fail(`${path}: package.json escapes its package through a link`); continue }
    const manifest = manifestObject(readJson(manifestPath), manifestPath)
    if (typeof manifest.name !== 'string' || !manifest.name) { fail(`${path}: missing package name`); continue }
    if (byName.has(manifest.name)) { fail(`${path}: duplicate package name ${manifest.name} (also ${byName.get(manifest.name).path})`); continue }
    const entry = { path, full, realFull, manifest, edges: new Set(), publicTargets: [] }
    byName.set(manifest.name, entry)
    for (const required of path.startsWith('apps/') ? ['bin', 'tests'] : ['src', 'tests']) {
      if (!isDirectory(join(full, required))) fail(`${path}: missing required directory ${required}/`)
    }
    for (const required of ['README.md', 'README.zh.md']) {
      if (!isFile(join(full, required))) fail(`${path}: missing required file ${required}`)
    }
    const publicTargets = [...targets(manifest.exports), ...targets(manifest.bin)]
    if (!publicTargets.length) fail(`${path}: package has no public entry (exports or bin)`)
    for (const target of publicTargets) {
      if (isAbsolute(target)) { fail(`${path}: public entry target must be package-relative: ${target}`); continue }
      const resolved = resolve(full, target)
      if (!inside(full, resolved)) { fail(`${path}: public entry target escapes the package: ${target}`); continue }
      if (!existsSync(resolved)) { fail(`${path}: public entry target does not exist: ${target}`); continue }
      if (!statSync(resolved).isFile()) { fail(`${path}: public entry target is not a file: ${target}`); continue }
      if (!inside(realFull, realpathSync(resolved))) { fail(`${path}: public entry target escapes the package through a link: ${target}`); continue }
      entry.publicTargets.push(resolved)
    }
  }

  const patterns = workspacePatterns(rootManifest)
  if (!patterns) {
    fail('package.json: workspaces must be an array of directory patterns')
  } else {
    const normalized = []
    for (const pattern of patterns) {
      if (typeof pattern !== 'string' || !pattern) { fail('package.json: workspace patterns must be non-empty strings'); continue }
      const value = pattern.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '')
      if (isAbsolute(value) || value.split('/').includes('..')) { fail(`package.json: workspace pattern must stay inside the repository: ${pattern}`); continue }
      normalized.push(value)
    }
    const actual = new Set(packages)
    const covered = new Set()
    for (const pattern of normalized) {
      const matched = globSync(`${pattern}/package.json`, {
        cwd: root,
        exclude: ['**/node_modules', '**/node_modules/**', '**/.git', '**/.git/**'],
      }).map(file => posix(dirname(file))).filter(path => path !== '.')
      if (!matched.length) fail(`package.json: workspace pattern matches no package: ${pattern}`)
      for (const path of matched) {
        if (!actual.has(path)) fail(`${path}: root workspaces includes a non-product package`)
        else covered.add(path)
      }
    }
    for (const path of actual) if (!covered.has(path)) fail(`${path}: package is not covered by root workspaces`)
  }

  const forbidden = new Set()
  for (const [name, entry] of byName) {
    for (const field of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
      for (const dependency of Object.keys(declared(entry.manifest, field))) {
        if (!byName.has(dependency)) continue
        entry.edges.add(dependency)
        const key = `${name}\0${dependency}`
        if (entry.path.startsWith('packages/') && byName.get(dependency).path.startsWith('apps/') && !forbidden.has(key)) {
          forbidden.add(key)
          fail(`${name}: capability must not depend on application ${dependency}`)
        }
      }
    }
  }

  function collect(directory, pkg, area) {
    const result = []
    if (!existsSync(directory)) return result
    if (lstatSync(directory).isSymbolicLink()) { fail(`${posix(relative(root, directory))}: authored source links are forbidden`); return result }
    if (!statSync(directory).isDirectory()) return result
    function walk(current) {
      for (const entry of readdirSync(current, { withFileTypes: true })) {
        const path = join(current, entry.name)
        if (entry.isSymbolicLink()) { fail(`${posix(relative(root, path))}: authored source links are forbidden`); continue }
        if (entry.isDirectory()) { if (entry.name !== 'node_modules') walk(path) }
        else if (/\.[cm]?js$/.test(entry.name)) result.push({ file: path, pkg, area })
      }
    }
    walk(directory)
    return result.sort((left, right) => left.file.localeCompare(right.file))
  }

  const corpus = []
  for (const entry of byName.values()) {
    if (entry.path.startsWith('apps/')) {
      corpus.push(...collect(join(entry.full, 'bin'), entry, 'bin'))
      corpus.push(...collect(join(entry.full, 'tests'), entry, 'tests'))
    } else {
      corpus.push(...collect(join(entry.full, 'src'), entry, 'src'))
      corpus.push(...collect(join(entry.full, 'tests'), entry, 'tests'))
    }
  }
  corpus.push(...collect(join(root, 'scripts'), null, 'root'))
  corpus.push(...collect(join(root, 'skills'), null, 'root'))
  corpus.push(...collect(join(root, 'tests'), null, 'root'))
  corpus.sort((left, right) => left.file.localeCompare(right.file))
  const checkedModules = new Set(corpus.map(entry => entry.file))
  for (const entry of byName.values()) {
    const production = join(entry.full, entry.path.startsWith('apps/') ? 'bin' : 'src')
    for (const target of entry.publicTargets) {
      if (!target.endsWith('.json') && (!inside(production, target) || !checkedModules.has(target))) fail(`${entry.path}: public entry is outside the checked production source areas: ${posix(relative(entry.full, target))}`)
    }
  }

  const rootDev = declared(rootManifest, 'devDependencies')
  const workspaceEntries = [...byName.values()]

  function allowedRoot(entry) {
    if (!entry.pkg) return { path: root, real: realRoot, kind: 'root' }
    if (entry.area === 'src' || entry.area === 'bin') {
      const path = join(entry.pkg.full, entry.area)
      return { path, real: realpathSync(path), kind: entry.area }
    }
    return { path: entry.pkg.full, real: entry.pkg.realFull, kind: entry.area }
  }

  function checkRelative(entry, specifier, label) {
    if (isAbsolute(specifier)) { fail(`${label}: absolute import path is not allowed: ${specifier}`); return }
    const candidate = resolve(dirname(entry.file), specifier)
    const allowed = allowedRoot(entry)
    if (!inside(allowed.path, candidate)) { fail(`${label}: cross-package or non-source relative import ${specifier}`); return }
    const parts = posix(relative(allowed.path, candidate)).split('/')
    if (parts.includes('node_modules')) { fail(`${label}: cross-package or non-source relative import ${specifier}`); return }
    if (!entry.pkg) {
      if (inside(join(root, 'templates'), candidate)) { fail(`${label}: cross-package or non-source relative import ${specifier}`); return }
      if (workspaceEntries.some(pkg => inside(pkg.full, candidate))) { fail(`${label}: cross-package or non-source relative import ${specifier}`); return }
    }
    if (!existsSync(candidate)) { fail(`${label}: unresolved relative import ${specifier}`); return }
    if (lstatSync(candidate).isSymbolicLink()) {
      if (!inside(allowed.real, realpathSync(candidate))) fail(`${label}: redirected import escapes package: ${specifier}`)
      else fail(`${label}: authored source links are forbidden: ${specifier}`)
      return
    }
    const realCandidate = realpathSync(candidate)
    if (!inside(allowed.real, realCandidate)) { fail(`${label}: redirected import escapes package: ${specifier}`); return }
    if (!entry.pkg) {
      if (workspaceEntries.some(pkg => inside(pkg.realFull, realCandidate))) { fail(`${label}: cross-package or non-source relative import ${specifier}`); return }
      if (inside(join(realRoot, 'templates'), realCandidate)) { fail(`${label}: cross-package or non-source relative import ${specifier}`); return }
      if (posix(relative(realRoot, realCandidate)).split('/').includes('node_modules')) { fail(`${label}: cross-package or non-source relative import ${specifier}`); return }
    }
    if (!statSync(candidate).isFile()) { fail(`${label}: relative import target is not a file: ${specifier}`); return }
    if (!candidate.endsWith('.json') && !checkedModules.has(candidate)) fail(`${label}: relative import is outside the checked source areas: ${specifier}`)
  }

  function checkBare(entry, specifier, label) {
    const dependency = packageNameOf(specifier)
    if (!entry.pkg) {
      if (!Object.hasOwn(rootDev, dependency)) { fail(`${label}: undeclared dependency ${dependency}; declare it in package.json devDependencies`); return }
    } else {
      const manifest = entry.pkg.manifest
      const runtime = Object.hasOwn(declared(manifest, 'dependencies'), dependency)
        || Object.hasOwn(declared(manifest, 'optionalDependencies'), dependency)
        || Object.hasOwn(declared(manifest, 'peerDependencies'), dependency)
      const allowed = dependency === manifest.name || runtime || (entry.area === 'tests' && Object.hasOwn(declared(manifest, 'devDependencies'), dependency))
      if (!allowed) {
        const where = entry.area === 'tests' ? `${entry.pkg.path}/package.json dependencies or devDependencies` : `${entry.pkg.path}/package.json dependencies`
        fail(`${label}: undeclared dependency ${dependency}; declare it in ${where}`)
        return
      }
    }
    if (!byName.has(dependency)) return
    const target = byName.get(dependency)
    const suffix = specifier.slice(dependency.length)
    const key = suffix ? `.${suffix}` : '.'
    if (!publicKeys(target.manifest.exports).has(key)) fail(`${label}: private or missing export ${specifier} (declared by ${target.path})`)
  }

  for (const entry of corpus) {
    const label = posix(relative(root, entry.file))
    const ast = ts.createSourceFile(entry.file, readFileSync(entry.file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
    function check(specifier) {
      if (isBuiltin(specifier)) return
      if (specifier.startsWith('.') || isAbsolute(specifier)) checkRelative(entry, specifier, label)
      else checkBare(entry, specifier, label)
    }
    function visit(node) {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) check(node.moduleSpecifier.text)
      if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) check(node.argument.literal.text)
      if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference) && ts.isStringLiteral(node.moduleReference.expression)) check(node.moduleReference.expression.text)
      if (ts.isCallExpression(node)) {
        const dynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword
        const directRequire = ts.isIdentifier(node.expression) && node.expression.text === 'require'
        if (dynamicImport || directRequire) {
          const argument = node.arguments[0]
          if (argument && (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument))) check(argument.text)
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(ast)
  }

  const active = new Set(), done = new Set()
  function visitCycle(name, trail) {
    if (active.has(name)) { fail(`dependency cycle: ${[...trail, name].join(' -> ')}`); return }
    if (done.has(name)) return
    active.add(name)
    for (const dependency of byName.get(name).edges) visitCycle(dependency, [...trail, name])
    active.delete(name)
    done.add(name)
  }
  for (const name of byName.keys()) visitCycle(name, [])
  return errors
}

if (process.argv[1] && existsSync(process.argv[1]) && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  try {
    const errors = verifyStructure(process.cwd())
    if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1 }
    else console.log('structure: declared workspaces, public entries and static import graph consistent')
  } catch (error) {
    console.error(`structure: ${error.message}`)
    process.exitCode = 2
  }
}
