/** Capture an explicitly requested accepted format checkpoint; publication is separate. */
import { existsSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { verifyPersistenceChanges } from './persistence-changes.ts'
import { createPersistenceFinalizationCheckpoint } from './persistence-finalization.ts'
import { extractPersistenceSchema } from './persistence-schema.ts'

/** Archive the current fully acknowledged graph without overwriting an earlier checkpoint.
 * @param args - --version N, with optional --root; acceptance must be authorized separately.
 * @returns created checkpoint path and the paired status update still required.
 */
export function runPersistenceFinalization(args: readonly string[]): string {
  const { values } = parseArgs({ args: [...args], options: { root: { type: 'string' }, version: { type: 'string' } } })
  if (values.version === undefined || !/^(0|[1-9]\d*)$/u.test(values.version)) throw new Error('--version requires an integer format number')
  const version = Number(values.version)
  if (!Number.isSafeInteger(version)) throw new Error('--version exceeds the safe integer range')
  const root = resolve(values.root ?? resolve(import.meta.dirname, '..'))
  const current = extractPersistenceSchema(root)
  const history = verifyPersistenceChanges(root, current)
  const checkpoint = createPersistenceFinalizationCheckpoint(history, current)
  if (checkpoint.marketFormatVersion !== version) throw new Error('--version must equal the actual MarketIndex.format writer')
  const directory = resolve(root, 'docs/persistence-changes/finalized')
  const path = resolve(directory, `v${version}.json`)
  if (existsSync(path)) throw new Error(`refusing to replace accepted checkpoint ${path}`)
  mkdirSync(directory, { recursive: true })
  writeFileSync(path, JSON.stringify(checkpoint, null, 2) + '\n', { flag: 'wx' })
  return `Captured ${path}. Update market-format-finalization latestFinalizedVersion to ${version} in both persistence-changes README languages, then run ordinary verification. This does not record publication or prove human review.`
}

if (process.argv[1] !== undefined && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(import.meta.filename)) {
  try { console.log(runPersistenceFinalization(process.argv.slice(2))) }
  catch (error: unknown) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1 }
}
