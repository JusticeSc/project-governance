/** Compile and bundle the Node package projects before checking aggregate programs. */

import { spawn, spawnSync } from 'node:child_process'
import { existsSync, globSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import ts from 'typescript'
import { readWorkspaceManifests } from './check-workspace-constraints.ts'
import { pnpmInvocation } from './pnpm-invocation.ts'
import { faceConfigs } from './ts-project.ts'

type CompilationMode = 'checked' | 'benchmark-emit'

/** Identifier of one package-library build step. */
export type LibraryStepId = 'host-src' | 'host-bundle'

/** One package-library build step as a shell-free child-process invocation. */
export interface LibraryStep {
  readonly id: LibraryStepId
  /** Name used in progress and failure reports. */
  readonly label: string
  /** Short command shown in failure reports; reference lists are summarized. */
  readonly displayCommand: string
  readonly command: string
  readonly args: readonly string[]
  /** Steps that must succeed first; together they repeat the serial library order. */
  readonly needs: readonly LibraryStepId[]
}

/**
 * Run one package-manager command serially with the inherited build environment.
 * @param root - Repository root supplying the command's working directory.
 * @param args - Package-manager arguments, without shell quoting.
 * @throws If the command cannot start or exits unsuccessfully.
 */
export function runPnpmCommand(root: string, args: readonly string[]): void {
  const { command, args: invocation } = compilerPnpmInvocation(args)
  const result = spawnSync(command, invocation, { cwd: root, stdio: 'inherit' })
  if (result.error !== undefined) throw result.error
  if (result.status !== 0) {
    throw new Error(`compile-referenced-projects: pnpm ${args.join(' ')} exited with ${String(result.status ?? result.signal)}`)
  }
}

/**
 * Resolve the Node arguments that compile one aggregate's project references with the serial TypeScript builder.
 * @param root - Repository root containing the aggregate tsconfig.
 * @param face - Independent compiler face whose package projects are emitted.
 * @param mode - Check package types by default; benchmark emission defers diagnostics to required full builds.
 * @returns Arguments for `process.execPath`, including the heap limit the Host face needs.
 * @throws If the aggregate configuration is invalid, omits a workspace member, or can emit files.
 */
export function referencedProjectsCompilerArgs(
  root: string,
  face: 'host',
  mode: CompilationMode = 'checked',
): string[] {
  const configPath = resolve(root, `tsconfig.${face}.json`)
  const config = ts.getParsedCommandLineOfConfigFile(configPath, {}, {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic(diagnostic) {
      throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
    },
  })
  if (config === undefined) throw new Error(`compile-referenced-projects: cannot read ${configPath}`)
  const references = config.projectReferences ?? []
  if (existsSync(resolve(root, 'pnpm-workspace.yaml'))) {
    const referenced = new Set(references.map(reference => resolve(ts.resolveProjectReferencePath(reference))))
    const members = readWorkspaceManifests(root).filter(({ dir }) => dir !== '.')
    for (const { dir } of members) {
      if (!referenced.has(resolve(root, dir, 'tsconfig.json'))) {
        throw new Error(`compile-referenced-projects: ${dir} is a workspace member missing from ${configPath} references`)
      }
    }
    const graph = faceConfigs(root, face)
    const included = new Set([...graph.byPath.values()].flatMap(project => project.fileNames.map(file => resolve(file))))
    for (const { dir } of members) {
      for (const file of globSync(['src/**/*.{ts,tsx,mts,cts,js,mjs,cjs}', 'tests/**/*.{ts,tsx,mts,cts,js,mjs,cjs}'], {
        cwd: resolve(root, dir), exclude: ['**/node_modules/**'],
      })) {
        if (!included.has(resolve(root, dir, file))) {
          throw new Error(`compile-referenced-projects: ${dir}/${file} is omitted by the compiler project graph`)
        }
      }
    }
  }
  if (config.errors.length > 0) {
    throw new Error(config.errors
      .map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
      .join('\n'))
  }
  if (config.options.noEmit !== true) {
    throw new Error(`compile-referenced-projects: ${configPath} requires noEmit: true to exclude its aggregate program`)
  }
  if (references.length === 0) return []
  return [
    ...hostHeapArgs(face),
    fileURLToPath(import.meta.resolve('typescript/bin/tsc')),
    '-b',
    ...mode === 'benchmark-emit' ? ['--noCheck'] : [],
    // Relative arguments keep the complete workspace graph below Windows' command-line limit.
    ...references.map(reference => relative(root, reference.path)),
  ]
}

/**
 * Resolve the Node arguments that type-check one aggregate's own test and script program in project mode.
 * Project mode reads the declarations that its references already emitted and never compiles a reference,
 * so missing package outputs surface as compiler diagnostics.
 * @param face - Compiler face whose aggregate program is checked.
 * @returns Arguments for `process.execPath`, run from the repository root.
 */
export function aggregateCheckArgs(face: 'host'): string[] {
  return [...hostHeapArgs(face), fileURLToPath(import.meta.resolve('typescript/bin/tsc')), '-p', `tsconfig.${face}.json`]
}

/**
 * Resolve the Node arguments that type-check one aggregate's own test and script program in build mode.
 * Build mode skips the program when its tsbuildinfo is current; callers run it only after the
 * aggregate's references are compiled, so it finds every reference up to date and compiles none.
 * @param face - Compiler face whose aggregate program is checked.
 * @returns Arguments for `process.execPath`, run from the repository root.
 */
export function aggregateBuildArgs(face: 'host'): string[] {
  return [...hostHeapArgs(face), fileURLToPath(import.meta.resolve('typescript/bin/tsc')), '-b', `tsconfig.${face}.json`]
}

function hostHeapArgs(_face: 'host'): string[] {
  return ['--max-old-space-size=4096']
}

/**
 * Compile one aggregate's project references with the serial TypeScript builder.
 * @param root - Repository root containing the aggregate tsconfig.
 * @param face - Independent compiler face whose package projects are emitted.
 * @param mode - Check package types by default; benchmark emission defers diagnostics to required full builds.
 * @throws If the aggregate emits files, its configuration is invalid, or package compilation fails.
 */
export function compileReferencedProjects(
  root: string,
  face: 'host',
  mode: CompilationMode = 'checked',
): void {
  if (referencedProjectsCompilerArgs(root, face, mode).length > 0) runStep(root, compilerStep(root, face, mode, []))
}

function compilerStep(
  root: string,
  face: 'host',
  mode: CompilationMode,
  needs: readonly LibraryStepId[],
): LibraryStep {
  return {
    id: 'host-src',
    label: `${face} compiler`,
    displayCommand: `tsc -b${mode === 'benchmark-emit' ? ' --noCheck' : ''} <tsconfig.${face}.json references>`,
    command: process.execPath,
    args: referencedProjectsCompilerArgs(root, face, mode),
    needs,
  }
}

function compilerPnpmInvocation(args: readonly string[]): { command: string; args: string[] } {
  return pnpmInvocation(args, {
    npm_execpath: process.env.npm_execpath
      || fileURLToPath(new URL('bin/pnpm.mjs', import.meta.resolve('pnpm'))),
  })
}

function pnpmStep(id: LibraryStepId, label: string, args: readonly string[], needs: readonly LibraryStepId[]): LibraryStep {
  const { command, args: invocation } = compilerPnpmInvocation(args)
  return { id, label, displayCommand: `pnpm ${args.join(' ')}`, command, args: invocation, needs }
}

/** List Node compilation and bundling in artifact dependency order. */
export function libraryBuildSteps(root: string, mode: CompilationMode = 'checked'): LibraryStep[] {
  const args = referencedProjectsCompilerArgs(root, 'host', mode)
  if (args.length === 0) return []
  const bundle = !existsSync(resolve(root, 'pnpm-workspace.yaml'))
    || readWorkspaceManifests(root).some(({ dir }) => /^packages\/[^/]+\/[^/]+$/u.test(dir))
  return [
    compilerStep(root, 'host', mode, []),
    ...bundle ? [pnpmStep('host-bundle', 'Node bundle', ['exec', 'tsdown', '--config-loader', 'native'], ['host-src'])] : [],
  ]
}

/** Produce package declarations without bundling runnable artifacts. */
export function contractSteps(root: string): LibraryStep[] {
  return referencedProjectsCompilerArgs(root, 'host').length === 0 ? [] : [compilerStep(root, 'host', 'checked', [])]
}

function runStep(root: string, step: LibraryStep): void {
  const result = spawnSync(step.command, step.args, { cwd: root, stdio: 'inherit' })
  if (result.error !== undefined) throw result.error
  if (result.status !== 0) throw stepFailure(step, result.status ?? result.signal)
}

function runStepConcurrently(root: string, step: LibraryStep): Promise<void> {
  return new Promise((settle, fail) => {
    const child = spawn(step.command, step.args, { cwd: root, stdio: 'inherit' })
    child.once('error', fail)
    child.once('close', (code, signal) => {
      if (code === 0) settle()
      else fail(stepFailure(step, code ?? signal))
    })
  })
}

function stepFailure(step: LibraryStep, exit: number | NodeJS.Signals | null): Error {
  return new Error(`compile-referenced-projects: ${step.label} exited with ${String(exit)}`)
}

/**
 * Emit package libraries serially in Node compiler-before-bundler order.
 * @param root - Repository root containing the compiler and bundle configurations.
 * @param mode - Check package types by default; emit-only remains an explicit compiler adapter mode.
 * @throws If any compiler or bundler fails.
 */
export function buildLibraryArtifacts(root: string, mode: CompilationMode = 'checked'): void {
  for (const step of libraryBuildSteps(root, mode)) runStep(root, step)
}

/** Compile the Node package contracts without bundling. */
export async function buildHostContracts(root: string): Promise<void> {
  for (const step of contractSteps(root)) await runStepConcurrently(root, step)
}

if (import.meta.main) {
  const usage = 'compile-referenced-projects: expected exactly one mode: host, host-contracts, or host-libraries'
  const { positionals } = parseArgs({ allowPositionals: true })
  const [mode] = positionals
  if (positionals.length !== 1) throw new Error(usage)
  const root = resolve(import.meta.dirname, '..')
  switch (mode) {
    case 'host':
      compileReferencedProjects(root, mode)
      break
    case 'host-contracts':
      await buildHostContracts(root)
      break
    case 'host-libraries':
      buildLibraryArtifacts(root)
      break
    default:
      throw new Error(usage)
  }
}
