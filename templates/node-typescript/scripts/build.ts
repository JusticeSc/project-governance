/** Build Node artifacts and check aggregate consumers as one ordered source-derived graph. */
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { aggregateBuildArgs, aggregateCheckArgs, contractSteps, libraryBuildSteps, referencedProjectsCompilerArgs } from './compile-referenced-projects.ts'
import type { LibraryStep } from './compile-referenced-projects.ts'
import { defaultParallelism, describeDefaultParallelism } from './parallelism.ts'
import { runAggregate } from './run-gates.ts'
import type { Gate } from './run-gates.ts'

/** Steps selected for one invocation. */
export type BuildScope = 'complete' | 'artifacts' | 'check' | 'typecheck'
/** Parsed command-line selection. */
export interface BuildArguments {
  readonly scope: BuildScope
}

/** Parse one build scope; unknown options fail before execution. */
export function parseBuildArguments(args: readonly string[]): BuildArguments {
  const { values } = parseArgs({ args: [...args], options: { scope: { type: 'string' } }, allowPositionals: false })
  if (values.scope !== undefined && values.scope !== 'artifacts' && values.scope !== 'check' && values.scope !== 'typecheck') {
    throw new Error('build: --scope must be artifacts, check, or typecheck; omit it for the complete build')
  }
  return { scope: values.scope ?? 'complete' }
}

/** Artifact and typecheck consumers wait for package compilation; check-only consumes existing declarations. */
export function buildGates(
  root: string,
  scope: BuildScope,
  environment: Readonly<Record<string, string | undefined>> = {},
): Gate[] {
  const env = { ...environment }
  const gates: Gate[] = []
  if (scope === 'check') referencedProjectsCompilerArgs(root, 'host')
  if (scope === 'complete' || scope === 'artifacts') {
    for (const step of libraryBuildSteps(root)) gates.push(libraryGate(step, env))
  }
  if (scope === 'typecheck') {
    for (const step of contractSteps(root)) gates.push(libraryGate(step, env))
  }
  if (scope !== 'artifacts') {
    gates.push({
      id: 'host-check',
      label: 'Node aggregate check',
      displayCommand: 'tsc ' + (scope === 'typecheck' ? '-b' : '-p') + ' tsconfig.host.json',
      command: process.execPath,
      args: scope === 'typecheck' ? aggregateBuildArgs('host') : aggregateCheckArgs('host'),
      needs: scope === 'check' || !gates.some(gate => gate.id === 'host-src') ? [] : ['host-src'],
      env,
    })
  }
  return gates
}

function libraryGate(step: LibraryStep, env: Record<string, string | undefined>): Gate {
  return { id: step.id, label: step.label, displayCommand: step.displayCommand, command: step.command,
    args: [...step.args], needs: [...step.needs], env }
}

async function main(): Promise<number> {
  if (!process.features.typescript) throw new Error('build: Node.js TypeScript type stripping is required by tsdown')
  const { scope } = parseBuildArguments(process.argv.slice(2))
  const gates = buildGates(resolve(import.meta.dirname, '..'), scope)
  if (gates.length === 0) {
    console.log('build: no workspace artifacts to build.')
    return 0
  }
  return runAggregate(scope === 'complete' ? 'build' : scope, gates, {
    workers: Math.min(gates.length, defaultParallelism()),
    source: describeDefaultParallelism(),
  })
}

if (import.meta.main) process.exitCode = await main()
