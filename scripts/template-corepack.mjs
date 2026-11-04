import { existsSync, statSync } from 'node:fs'
import { delimiter, dirname, join } from 'node:path'

// Prefer Corepack's JavaScript entry: a Windows command shim would require a shell.
export function resolveCorepack(templateNode, env) {
  const local = dirname(templateNode)
  for (const candidate of [
    join(local, 'node_modules', 'corepack', 'dist', 'corepack.js'),
    join(local, '..', 'lib', 'node_modules', 'corepack', 'dist', 'corepack.js'),
  ]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return { command: templateNode, prefix: [candidate] }
  }
  const names = process.platform === 'win32'
    ? (process.env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean).map(extension => `corepack${extension.toLowerCase()}`)
    : ['corepack']
  const pathKey = Object.keys(env).find(key => key.toUpperCase() === 'PATH') ?? 'PATH'
  for (const directory of (env[pathKey] ?? '').split(delimiter)) {
    if (directory === '') continue
    for (const candidate of [join(directory, 'node_modules', 'corepack', 'dist', 'corepack.js'), ...names.map(name => join(directory, name))]) {
      if (!existsSync(candidate) || !statSync(candidate).isFile()) continue
      if (/\.(?:cmd|bat)$/iu.test(candidate)) continue
      if (/\.js$/iu.test(candidate)) return { command: templateNode, prefix: [candidate] }
      return { command: candidate, prefix: [] }
    }
  }
  throw new Error('corepack was not found next to the Node executable or on PATH')
}
