/**
 * Generate CLI help reference regions from the actual launcher output.
 *
 * The policy names the real source launcher and arguments; the generator runs
 * it and records the exact `--help` text. Generated regions are the only
 * authoritative copy: `--check` fails when the launcher changed and a page kept
 * older text. Authored prose around the region stays with its document owner.
 */

import { execFile } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { generatedRegions, renderGeneratedRegion, spliceGeneratedRegion } from './translation-pairing.ts'
import { isRecord, isStringArray, readManifestObject } from './manifest-json.ts'

const GATE = 'gen-cli-help'
const root = resolve(import.meta.dirname, '..')
const POLICY = 'scripts/cli-help.manifest.json'
const execFileAsync = promisify(execFile)

/** One launcher whose help is documented. */
export interface CliHelpCommand {
  readonly id: string
  readonly script: string
  readonly args: readonly string[]
  readonly display: string
  readonly reason: string
}

/** The declared CLI-help pages and commands. */
export interface CliHelpPolicy {
  readonly slug: string
  readonly english: string
  readonly chinese: string
  readonly commands: readonly CliHelpCommand[]
}


/**
 * Read and validate the CLI-help policy.
 * @param repositoryRoot - repository root holding the policy manifest.
 * @returns the page pair and commands.
 * @throws on a malformed slug, missing page, or a command without its actual launcher.
 */
export function readCliHelpPolicy(repositoryRoot: string): CliHelpPolicy {
  const parsed = readManifestObject(repositoryRoot, POLICY, GATE)
  const slug = 'slug' in parsed ? parsed.slug : undefined
  const english = 'english' in parsed ? parsed.english : undefined
  const chinese = 'chinese' in parsed ? parsed.chinese : undefined
  const rawCommands = 'commands' in parsed ? parsed.commands : undefined
  if (typeof slug !== 'string' || !/^[a-z0-9-]+$/u.test(slug)) throw new Error(`${GATE}: slug must be lowercase kebab-case`)
  if (typeof english !== 'string' || typeof chinese !== 'string' || english === chinese) {
    throw new Error(`${GATE}: the policy needs distinct English and Chinese page paths`)
  }
  if (!Array.isArray(rawCommands) || rawCommands.length === 0) throw new Error(`${GATE}: commands must be a non-empty list`)
  const commands: CliHelpCommand[] = []
  const ids = new Set<string>()
  for (const item of rawCommands) {
    if (!isRecord(item)) {
      throw new Error(`${GATE}: every command must hold id, script, args, display, and reason`)
    }
    const id = 'id' in item ? item.id : undefined
    const script = 'script' in item ? item.script : undefined
    const args = 'args' in item ? item.args : undefined
    const display = 'display' in item ? item.display : undefined
    const reason = 'reason' in item ? item.reason : undefined
    if (typeof id !== 'string' || id.trim() === '') throw new Error(`${GATE}: a command id is empty`)
    if (ids.has(id)) throw new Error(`${GATE}: duplicate command id ${id}`)
    ids.add(id)
    if (typeof script !== 'string' || !existsSync(resolve(repositoryRoot, script))) {
      throw new Error(`${GATE}: ${id}.script must name an existing launcher source`)
    }
    if (!isStringArray(args)) throw new Error(`${GATE}: ${id}.args must be a list`)
    if (typeof display !== 'string' || display.trim() === '') throw new Error(`${GATE}: ${id}.display must show the documented invocation`)
    if (typeof reason !== 'string' || reason.trim() === '') throw new Error(`${GATE}: ${id}.reason must state why this launcher is documented`)
    commands.push({ id, script, args, display, reason })
  }
  return { slug, english, chinese, commands }
}

/**
 * Run one launcher's help through the workspace TypeScript loader.
 * @param command - validated command.
 * @returns stdout with LF line endings.
 * @throws when the process exits nonzero, writes diagnostics, or prints nothing.
 */
async function collectHelp(command: CliHelpCommand): Promise<string> {
  const environment: NodeJS.ProcessEnv = { ...process.env, NO_COLOR: '1' }
  delete environment.NODE_OPTIONS
  delete environment.FORCE_COLOR
  const result = await execFileAsync(process.execPath, ['--import', 'tsx/esm', command.script, ...command.args], {
    cwd: root,
    env: environment,
    encoding: 'utf8',
    timeout: 30_000,
    maxBuffer: 2 * 1024 * 1024,
  })
  if (result.stderr !== '') throw new Error(`${GATE}: ${command.display} wrote diagnostics: ${result.stderr.trim()}`)
  const output = result.stdout.replaceAll('\r\n', '\n')
  if (output.trim() === '') throw new Error(`${GATE}: ${command.display} returned empty output`)
  return output.endsWith('\n') ? output : `${output}\n`
}

/**
 * Render the generated region for all configured launchers.
 * @param entries - command and captured help pairs.
 * @returns Markdown with one fenced block per launcher.
 */
function renderRegion(entries: readonly { command: CliHelpCommand; output: string }[]): string {
  const blocks = entries.map(({ command, output }) => [
    `### \`${command.id}\``,
    '',
    '```text',
    `$ ${command.display}`,
    output.replace(/\n$/u, ''),
    '```',
  ].join('\n'))
  return blocks.join('\n\n')
}

/** CLI entry: write both pages from live help, or check freshness with --check. */
export async function main(): Promise<void> {
  const check = process.argv.includes('--check')
  const policy = readCliHelpPolicy(root)
  const region = renderGeneratedRegion(policy.slug, renderRegion(await Promise.all(
    policy.commands.map(async command => ({ command, output: await collectHelp(command) })),
  )))
  const errors: string[] = []
  const written: string[] = []
  for (const path of [policy.english, policy.chinese]) {
    const destination = resolve(root, path)
    if (!existsSync(destination)) {
      errors.push(`${path}: missing page; add its authored prose and the ${policy.slug} generated region`)
      continue
    }
    const current = readFileSync(destination, 'utf8')
    if (generatedRegions(current).filter(candidate => candidate.slug === policy.slug).length !== 1) {
      errors.push(`${path}: expected exactly one ${policy.slug} generated region`)
      continue
    }
    const next = spliceGeneratedRegion(current, region)
    if (next === current) continue
    if (check) {
      errors.push(`${path}: stale ${policy.slug} region — run pnpm run gen-cli-help`)
      continue
    }
    writeFileSync(destination, next)
    written.push(path)
  }
  if (errors.length > 0) {
    for (const error of errors) console.error(`${GATE}: ${error}`)
    process.exit(1)
  }
  console.log(`${GATE}: ${policy.commands.length} launcher help block(s) ${check ? 'are current' : `written (${written.length} file(s))`}.`)
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main()
