/** Create a typed-lint test project for one existing workspace member. */

import { globSync, lstatSync, writeFileSync } from 'node:fs'
import { isAbsolute, join, relative, resolve } from 'node:path'
import { readWorkspaceManifests } from './check-workspace-constraints.ts'

const root = resolve(import.meta.dirname, '..')
const usage = 'gen-test-tsconfig: expected one existing workspace member, for example apps/console'
const [input, ...extra] = process.argv.slice(2)
if (input === undefined || extra.length !== 0 || isAbsolute(input)) throw new Error(usage)
const member = input.replaceAll('\\', '/').replace(/^\.\//u, '')
const parts = member.split('/')
const validLayout = (parts.length === 2 && parts[0] === 'apps') || (parts.length === 3 && parts[0] === 'packages')
if (!validLayout || parts.some(part => part === '' || part === '.' || part === '..' || /[:\0]/u.test(part))) throw new Error(usage)

for (const part of [parts.slice(0, 1), parts.slice(0, 2), ...(parts.length === 3 ? [parts] : []), [...parts, 'tests']]) {
  const path = join(root, ...part)
  const entry = lstatSync(path)
  if (entry.isSymbolicLink() || !entry.isDirectory()) throw new Error(`gen-test-tsconfig: ${path} is not an unredirected directory`)
}
const sourceConfig = join(root, member, 'tsconfig.json')
const sourceEntry = lstatSync(sourceConfig)
if (sourceEntry.isSymbolicLink() || !sourceEntry.isFile()) throw new Error(`gen-test-tsconfig: ${sourceConfig} is not a regular project config`)
if (!readWorkspaceManifests(root).some(({ dir }) => dir === member)) throw new Error(`gen-test-tsconfig: ${member} is not a declared workspace member`)
const tests = join(root, member, 'tests')
if (globSync('**/*.{ts,tsx}', { cwd: tests, exclude: ['**/node_modules/**'] }).length === 0) {
  throw new Error(`gen-test-tsconfig: ${member}/tests has no TypeScript tests`)
}
const target = join(tests, 'tsconfig.json')
const config = {
  extends: [relative(tests, join(root, 'tsconfig.node.base.json')).replaceAll('\\', '/'), '../tsconfig.json'],
  compilerOptions: {
    noEmit: true,
    rewriteRelativeImportExtensions: false,
    composite: false,
    incremental: false,
    rootDir: relative(tests, root).replaceAll('\\', '/'),
  },
  files: [],
  include: ['**/*.ts', '**/*.tsx'],
  exclude: ['**/node_modules/**'],
  references: [{ path: '..' }],
}
try {
  writeFileSync(target, `${JSON.stringify(config, null, 2)}\n`, { flag: 'wx' })
} catch (error: unknown) {
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'EEXIST') {
    throw new Error(`gen-test-tsconfig: ${target} already exists; no existing config was changed`, { cause: error })
  }
  throw new Error(`gen-test-tsconfig: could not create ${target}; inspect any newly created file before retrying`, { cause: error })
}
console.log(`gen-test-tsconfig: created ${member}/tests/tsconfig.json`)
