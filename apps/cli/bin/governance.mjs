#!/usr/bin/env node
// Command entry for the project-governance Skill.
//
// This file owns argument parsing, command dispatch and exit codes only. The decisions live in the
// workspace packages it imports by package name: @project-governance/checks and
// @project-governance/distribution.
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runChecks } from '@project-governance/checks'
import { installSkill } from '@project-governance/distribution'

// apps/cli/bin -> product workspace root; when the Skill is seated, the same layout gives the
// installed seat root, so a seat installs a seat with the identical contract.
const TOOL_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

const USAGE = `usage:
  project-governance check [repository] [--policy path]   run the repository's configured checks
  project-governance install <existing-repository>        install this Skill into .agents/skills/project-governance
  project-governance --help                               show this message

check reads the policy file inside the target repository (default: governance-checks.json),
validates every configured command, then runs them in order with the repository as the working
directory. Exit codes: 0 all checks passed, 1 a check failed or was terminated by a signal,
2 the policy, a path or an argument could not be validated (nothing was executed).
check never creates .governance/, never derives commands from project files and never changes the
repository it checks.

install copies only the files the root package.json files allowlist selects into an existing
repository. It refuses an existing seat and redirected .agents parents, adds no hooks, changes no
project policy and touches no remote settings. Nothing is fetched from the network: the installed
seat imports its workspace packages by name, so prepare it yourself with
  npm ci --ignore-scripts
inside .agents/skills/project-governance before running its commands.`

const args = process.argv.slice(2)
const command = args[0]

if (command === undefined || command === '--help' || command === '-h' || command === 'help') {
  console.log(USAGE)
} else if (command === 'check') {
  process.exitCode = check(args.slice(1))
} else if (command === 'install') {
  process.exitCode = install(args.slice(1))
} else {
  console.error(`project-governance: unknown command: ${command}\n\n${USAGE}`)
  process.exitCode = 2
}

function usageError(message) {
  console.error(`project-governance: ${message}`)
  return 2
}

function check(argv) {
  let repository = null
  let policyPath = null
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--policy') {
      if (policyPath !== null) return usageError('--policy may be given only once')
      const value = argv[++index]
      if (value === undefined || value.trim() === '') return usageError('--policy requires a repository-relative path')
      policyPath = value
    } else if (arg.startsWith('-')) {
      return usageError(`unknown check option: ${arg}`)
    } else if (repository !== null) {
      return usageError(`unexpected check argument: ${arg}`)
    } else {
      repository = arg
    }
  }
  return runChecks(repository ?? '.', policyPath ?? 'governance-checks.json')
}

function install(argv) {
  if (argv.length === 0) return usageError('install requires an existing target repository')
  if (argv[0] === '--help' || argv[0] === '-h') {
    console.log(USAGE)
    return 0
  }
  if (argv.length > 1) return usageError(`unexpected install argument: ${argv[1]}`)
  let result
  try {
    result = installSkill(TOOL_ROOT, argv[0])
  } catch (error) {
    console.error(`project-governance: install: ${error.message}`)
    return 1
  }
  console.log(`Installed project-governance (${result.fileCount} files) at ${result.seat}`)
  console.log('Prepare the installed seat with: npm ci --ignore-scripts')
  console.log('Next: read SKILL.md in the installed seat. No project policy, hooks, remote settings or workflows were changed.')
  return 0
}
