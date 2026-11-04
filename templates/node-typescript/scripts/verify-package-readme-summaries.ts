/** Enforce the English README Summary entry-length limit for every workspace package and group. */

import { existsSync, globSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { readWorkspaceManifests } from './check-workspace-constraints.ts'

const GATE = 'verify-package-readme-summaries'
const root = resolve(import.meta.dirname, '..')

/** Maximum `wc -w`-style length of an English README Summary. */
export const MAX_PACKAGE_README_SUMMARY_WORDS = 100

/** `wc -w` equivalent used by the documentation budget gate. */
function countWords(text: string): number {
  return text.split(/\s+/u).filter(Boolean).length
}

/** Extract one H2 section body without consuming the next H2. */
function h2Body(source: string, heading: string): string | undefined {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
  const match = new RegExp(`^## ${escaped}\\s*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'mu').exec(source)
  return match?.[1]?.trim()
}

/** Read the README kind for a diagnostic template link. */
function readKind(source: string): string | undefined {
  return /^kind:\s*["']?([a-z-]+)["']?\s*$/mu.exec(source)?.[1]
}

/**
 * Report Summary length violations for one English README.
 * @param file - repository-relative README path.
 * @param source - complete README source.
 * @returns diagnostics for a missing or oversized Summary.
 */
export function packageReadmeSummaryErrors(file: string, source: string): string[] {
  const summary = h2Body(source, 'Summary')
  if (summary === undefined) return [`${file}: missing \`## Summary\``]

  const words = countWords(summary)
  if (words <= MAX_PACKAGE_README_SUMMARY_WORDS) return []

  const kind = readKind(source)
  const template = kind === undefined ? 'the README kind template' : `the \`${kind}\` README template`
  return [
    `${file}: Summary has ${String(words)} words; the limit is ${String(MAX_PACKAGE_README_SUMMARY_WORDS)}. Read docs/AGENTS.md and ${template} before rewriting it.`,
  ]
}

/**
 * Find every authored English README covered by the package summary contract.
 * @returns repository-relative README paths, sorted.
 */
export function packageReadmes(): string[] {
  const files = new Set<string>()
  if (existsSync(resolve(root, 'packages/README.md'))) files.add('packages/README.md')
  for (const group of globSync('packages/*/README.md', { cwd: root })) files.add(group.replaceAll('\\', '/'))
  for (const entry of readWorkspaceManifests(root)) {
    if (!/^packages\/[^/]+\/[^/]+$/u.test(entry.dir)) continue
    const readme = `${entry.dir}/README.md`
    if (existsSync(resolve(root, readme))) files.add(readme)
  }
  return [...files].sort()
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const files = packageReadmes()
  const failures = files.length === 0
    ? [`${GATE}: no English package READMEs found; the scan is empty or narrowed`]
    : files.flatMap(file => packageReadmeSummaryErrors(file, readFileSync(resolve(root, file), 'utf8')))

  if (failures.length > 0) {
    console.error(`${GATE}: violations found:`)
    for (const failure of failures) console.error(`  ${failure}`)
    process.exitCode = 1
  } else {
    console.log(`${GATE}: ${String(files.length)} English package README Summaries are within ${String(MAX_PACKAGE_README_SUMMARY_WORDS)} words.`)
  }
}
