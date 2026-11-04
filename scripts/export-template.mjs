import { constants, copyFileSync, existsSync, mkdirSync, realpathSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { packageFiles } from '@project-governance/distribution'

const source = fileURLToPath(new URL('../', import.meta.url))
const prefix = 'templates/node-typescript/'

// npm omits .gitignore at any depth; restore each distributable source in its own directory.
const exportedPath = path => path.slice(prefix.length).replace(/(^|\/)gitignore$/u, '$1.gitignore')

// The product's files allowlist is also the export list: no competing template inventory.
export function exportTemplate(output) {
  if (typeof output !== 'string' || output.trim() === '') {
    throw new Error('usage: npm run export-template -- <new-output-directory>')
  }
  const files = packageFiles(source).filter(path => path.startsWith(prefix))
  if (!files.some(path => path === `${prefix}package.json`)) throw new Error('The product payload has no template manifest')
  const destination = resolve(output)
  let created = false
  try {
    mkdirSync(destination)
    created = true
    for (const path of files) {
      const target = resolve(destination, exportedPath(path))
      mkdirSync(dirname(target), { recursive: true })
      copyFileSync(resolve(source, path), target, constants.COPYFILE_EXCL)
    }
  } catch (error) {
    if (created) rmSync(destination, { recursive: true, force: true })
    throw error
  }
  return { destination, files: files.map(exportedPath) }
}

if (process.argv[1] && existsSync(process.argv[1]) && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  try {
    if (process.argv.length !== 3) throw new Error('usage: npm run export-template -- <new-output-directory>')
    const result = exportTemplate(process.argv[2])
    console.log(`Exported ${result.files.length} author files to ${result.destination}; no dependencies or build outputs.`)
  } catch (error) {
    console.error(`export-template: ${error.message}`)
    process.exitCode = 1
  }
}
