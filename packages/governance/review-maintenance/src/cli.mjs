#!/usr/bin/env node
// Behaviour adapted from DeepSeek Harness 687f282e docs/cookbook/maintaining-dsh-code-review.md
// and .agents/notes/proposed/process/2026-07-13-human-review-skill-maintenance.md.
// License: ../../../../SOURCE-LICENSE.txt.
// Operator entry point. Runs one maintenance pass or promotes a saved bundle; it never runs
// unattended by itself and never merges or changes repository settings.
import { realpath } from 'node:fs/promises'
import { isAbsolute, relative, resolve } from 'node:path'
import { loadConfig } from './config.mjs'
import { runMaintenance } from './orchestrate.mjs'
import { promote } from './promote.mjs'

const usage = `Usage:
  review-maintenance run --config <file> [--json]
  review-maintenance promote --config <file> --bundle <dir> [--open-pr]
`

function parseArguments(argv) {
  const [commandName, ...rest] = argv
  if (commandName !== 'run' && commandName !== 'promote') throw new Error('unknown command')
  const options = { command: commandName, json: false, openPr: false }
  for (let index = 0; index < rest.length; index += 1) {
    const flag = rest[index]
    if (flag === '--json') options.json = true
    else if (flag === '--open-pr') options.openPr = true
    else if (flag === '--config' || flag === '--bundle') {
      const value = rest[index + 1]
      if (value === undefined || value.startsWith('--')) throw new Error(`${flag} requires a value`)
      options[flag.slice(2)] = value
      index += 1
    } else throw new Error(`unknown option ${flag}`)
  }
  if (options.config === undefined) throw new Error('--config is required')
  if (commandName === 'promote' && options.bundle === undefined) throw new Error('--bundle is required for promote')
  return options
}

async function assertSeparate(checkout, stateDirectory) {
  const [repositoryRoot, state] = await Promise.all([realpath(checkout), realpath(stateDirectory).catch(() => resolve(stateDirectory))])
  const inside = relative(repositoryRoot, state)
  if (!isAbsolute(inside) && inside !== '' && !inside.startsWith('..')) {
    throw new Error('stateDirectory must be outside the maintained checkout')
  }
}

async function main(argv) {
  let options
  try {
    options = parseArguments(argv)
  } catch (error) {
    process.stderr.write(`${error.message}\n\n${usage}`)
    return 2
  }
  let config
  try {
    config = await loadConfig(options.config)
    await assertSeparate(config.checkout, config.stateDirectory)
  } catch (error) {
    process.stderr.write(`${error.message}\n`)
    return 2
  }

  if (options.command === 'promote') {
    try {
      const result = await promote({ config, bundle: resolve(options.bundle), openPr: options.openPr, log: line => process.stdout.write(`${line}\n`) })
      process.stdout.write(`${JSON.stringify(result)}\n`)
      return 0
    } catch (error) {
      process.stderr.write(`${error.message}\n`)
      return 1
    }
  }

  const log = line => process.stderr.write(`${line}\n`)
  const result = await runMaintenance({ config, log })
  if (options.json) process.stdout.write(`${JSON.stringify(result)}\n`)
  else {
    process.stdout.write(`run ${result.runId}: ${result.outcome}\n`)
    process.stdout.write(`artifacts: ${result.artifacts}\n`)
    if (result.failure !== undefined) process.stdout.write(`failure: ${result.failure}\n`)
    if (result.unresolved.length > 0) process.stdout.write(`unresolved disagreements: ${result.unresolved.join(', ')}\n`)
    if (result.excluded.length > 0) process.stdout.write(`excluded items: ${String(result.excluded.length)}\n`)
  }
  return result.outcome === 'failed' ? 1 : 0
}

process.exitCode = await main(process.argv.slice(2))
