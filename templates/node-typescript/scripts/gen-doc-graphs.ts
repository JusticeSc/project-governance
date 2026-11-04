/**
 * Generate the workspace package relationship diagram from actual manifests.
 *
 * The diagram is an enumeration, not an authored explanation: nodes are the
 * workspace members selected by policy, and edges are the runtime dependency
 * sections the policy names. Regenerating after a manifest change updates the
 * declared fact; `--check` fails when an owned page kept an older enumeration.
 * Authored prose, curated flows, and type-only edges remain outside the region.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { readWorkspaceManifests } from './check-workspace-constraints.ts'
import { generatedRegions, renderGeneratedRegion, spliceGeneratedRegion } from './translation-pairing.ts'
import { isRecord, readManifestObject } from './manifest-json.ts'

const GATE = 'gen-doc-graphs'
const root = resolve(import.meta.dirname, '..')
const POLICY = 'scripts/doc-graphs.manifest.json'
const SCOPES = ['packages', 'apps'] as const
const EDGE_SECTIONS = ['dependencies', 'optionalDependencies', 'peerDependencies'] as const

/** One generated page pair and the graph it enumerates. */
export interface DocGraphOutput {
  readonly slug: string
  readonly english: string
  readonly chinese: string
  readonly reason: string
  readonly scope: readonly (typeof SCOPES)[number][]
  readonly edges: readonly (typeof EDGE_SECTIONS)[number][]
}


/** Narrow a parsed value to a list of allowed labels. */
function isLabelList<T extends string>(value: unknown, allowed: readonly T[]): value is T[] {
  return Array.isArray(value) && value.length > 0 && value.every(item => typeof item === 'string' && (allowed as readonly string[]).includes(item))
}

/**
 * Read and validate the doc-graph policy.
 * @returns one validated output per generated page pair.
 * @throws on a missing slug, page, reason, scope, or edge section, or on duplicates.
 */
export function readDocGraphPolicy(): DocGraphOutput[] {
  const parsed = readManifestObject(root, POLICY, GATE)
  const rawOutputs = 'outputs' in parsed ? parsed.outputs : undefined
  if (!Array.isArray(rawOutputs) || rawOutputs.length === 0) {
    throw new Error(`${GATE}: outputs must be a non-empty list`)
  }
  const outputs: DocGraphOutput[] = []
  const slugs = new Set<string>()
  for (const item of rawOutputs) {
    if (!isRecord(item)) {
      throw new Error(`${GATE}: every output must hold slug, pages, reason, scope, and edges`)
    }
    const slug = 'slug' in item ? item.slug : undefined
    const english = 'english' in item ? item.english : undefined
    const chinese = 'chinese' in item ? item.chinese : undefined
    const reason = 'reason' in item ? item.reason : undefined
    const scope = 'scope' in item ? item.scope : undefined
    const edges = 'edges' in item ? item.edges : undefined
    if (typeof slug !== 'string' || !/^[a-z0-9-]+$/u.test(slug)) throw new Error(`${GATE}: output slug must be lowercase kebab-case`)
    if (slugs.has(slug)) throw new Error(`${GATE}: duplicate output slug ${slug}`)
    slugs.add(slug)
    if (typeof english !== 'string' || typeof chinese !== 'string' || english === chinese) {
      throw new Error(`${GATE}: ${slug} needs distinct English and Chinese page paths`)
    }
    if (typeof reason !== 'string' || reason.trim() === '') throw new Error(`${GATE}: ${slug} needs the reason this enumeration is maintained`)
    if (!isLabelList(scope, SCOPES)) throw new Error(`${GATE}: ${slug}.scope must list ${SCOPES.join(', ')}`)
    if (!isLabelList(edges, EDGE_SECTIONS)) throw new Error(`${GATE}: ${slug}.edges must list ${EDGE_SECTIONS.join(', ')}`)
    outputs.push({ slug, english, chinese, reason, scope, edges })
  }
  return outputs
}

/**
 * Render one relationship diagram from actual workspace members.
 * @param scope - workspace roots whose members are nodes.
 * @param edges - manifest sections followed as edges.
 * @returns a fenced Mermaid graph with every node and runtime edge.
 */
export function renderRelationships(
  scope: readonly string[],
  edges: readonly string[],
): string {
  const members = readWorkspaceManifests(root)
    .filter(entry => entry.dir !== '.' && scope.some(prefix => entry.dir.startsWith(`${prefix}/`)))
    .filter(entry => entry.manifest.name !== undefined)
  const names = new Set(members.map(entry => entry.manifest.name as string))
  const ids = new Map([...names].sort().map((name, index) => [name, `n${String(index)}`]))
  const lines = ['```mermaid', 'graph TD']
  for (const [name, id] of ids) lines.push(`  ${id}["${name.replaceAll('"', '\\"')}"]`)
  const edgeLines: string[] = []
  for (const entry of members) {
    const from = entry.manifest.name as string
    for (const section of edges) {
      const declared = section === 'dependencies'
        ? entry.manifest.dependencies
        : section === 'optionalDependencies' ? entry.manifest.optionalDependencies : entry.manifest.peerDependencies
      for (const target of Object.keys(declared ?? {})) {
        if (!names.has(target)) continue
        edgeLines.push(`  ${ids.get(from) as string} --> ${ids.get(target) as string}`)
      }
    }
  }
  lines.push(...[...new Set(edgeLines)].sort())
  lines.push('```')
  return lines.join('\n')
}

/** CLI entry: regenerate both pages of each output, or check freshness. */
export function main(): void {
  const check = process.argv.includes('--check')
  const outputs = readDocGraphPolicy()
  const errors: string[] = []
  const written: string[] = []
  for (const output of outputs) {
    const body = renderRelationships(output.scope, output.edges)
    const region = renderGeneratedRegion(output.slug, body)
    for (const path of [output.english, output.chinese]) {
      const destination = resolve(root, path)
      if (!existsSync(destination)) {
        errors.push(`${path}: missing page; add its authored prose and the ${output.slug} generated region`)
        continue
      }
      try {
        const current = readFileSync(destination, 'utf8')
        if (generatedRegions(current).filter(candidate => candidate.slug === output.slug).length !== 1) {
          errors.push(`${path}: expected exactly one ${output.slug} generated region`)
          continue
        }
        const next = spliceGeneratedRegion(current, region)
        if (next === current) continue
        if (check) {
          errors.push(`${path}: stale ${output.slug} region — run pnpm run gen-doc-graphs`)
          continue
        }
        writeFileSync(destination, next)
        written.push(path)
      } catch (error) {
        errors.push(`${path}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }
  if (errors.length > 0) {
    for (const error of errors) console.error(`${GATE}: ${error}`)
    process.exit(1)
  }
  console.log(`${GATE}: ${outputs.length} relationship region pair(s) ${check ? 'are current' : `updated (${written.length} file(s))`}.`)
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main()
