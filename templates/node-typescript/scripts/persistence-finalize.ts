/** Capture an explicitly requested accepted format checkpoint; publication is separate. */
import { existsSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { verifyPersistenceChanges } from './persistence-changes.ts'
import { createPersistenceFinalizationCheckpoint } from './persistence-finalization.ts'
import { extractPersistenceSchema } from './persistence-schema.ts'

/** Archive the current fully acknowledged graph without overwriting an earlier checkpoint.
 * @param args - --id ROOT, with optional --root; acceptance must be authorized separately.
 * @returns created checkpoint path and the paired status update still required.
 */
export function runPersistenceFinalization(args: readonly string[]): string {
  const { values } = parseArgs({ args: [...args], options: { root: { type: 'string' }, id: { type: 'string' } } })
  if (values.id === undefined || !/^[a-z][a-z0-9-]*$/u.test(values.id)) throw new Error('--id requires a declared root id')
  const root = resolve(values.root ?? resolve(import.meta.dirname, '..'))
  const current = extractPersistenceSchema(root)
  const history = verifyPersistenceChanges(root, current)
  const checkpoint = createPersistenceFinalizationCheckpoint(history, current, values.id)
  const directory = resolve(root, 'docs/persistence-changes/finalized', values.id)
  const path = resolve(directory, `${checkpoint.recordId}.json`)
  if (existsSync(path)) throw new Error(`refusing to replace accepted checkpoint ${path}`)
  mkdirSync(directory, { recursive: true })
  writeFileSync(path, JSON.stringify(checkpoint, null, 2) + '\n', { flag: 'wx' })
  return `Captured ${path}. Update the persistence-finalization roots mapping for ${values.id} to ${checkpoint.recordId} in both persistence-changes README languages, then run ordinary verification. This does not record publication or prove human review.`
}

if (process.argv[1] !== undefined && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(import.meta.filename)) {
  try { console.log(runPersistenceFinalization(process.argv.slice(2))) }
  catch (error: unknown) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1 }
}
