import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, globSync, mkdtempSync, statSync, symlinkSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, onTestFinished } from 'vitest'
import { typedImportProbe } from './project-policy.ts'
import { readWorkspaceManifests } from './check-workspace-constraints.ts'
import { removeFixtureSafely } from './test-fixture-cleanup.ts'
import { copyWorkspaceFixture } from './workspace-fixture.ts'
import { generateConfig } from './gen-tsconfig-paths.ts'

const templateRoot = fileURLToPath(new URL('..', import.meta.url))
const oxlintCli = fileURLToPath(new URL('../node_modules/oxlint/bin/oxlint', import.meta.url))
const tsxCli = fileURLToPath(new URL('../node_modules/tsx/dist/cli.mjs', import.meta.url))


function runRepositoryOxlint(repositoryRoot: string, args: readonly string[], env: NodeJS.ProcessEnv = {}) {
  return spawnSync(process.execPath, [tsxCli, 'scripts/run-oxlint.ts', ...args], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1', ...env },
  })
}

function runOxlint(repositoryRoot: string, args: readonly string[], env: NodeJS.ProcessEnv = {}) {
  return spawnSync(process.execPath, [oxlintCli, ...args], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1', ...env },
  })
}

function normalizedOutput(result: ReturnType<typeof runOxlint>): string {
  return `${result.stdout}${result.stderr}`.replaceAll('\\', '/')
}

async function writeContractConfig(repositoryRoot: string, suffix: string): Promise<string> {
  const path = join(repositoryRoot, `.oxlintrc.contract-${suffix}.json`)
  await writeFile(path, JSON.stringify({ extends: ['./.oxlintrc.json'], ignorePatterns: [] }))
  return path
}

interface TypedFileClass {
  readonly label: string
  readonly directory: string
  readonly tsconfig: string
}

/** Discover every declared workspace class and every nearest config actually owning its files. */
function typedFileClasses(repositoryRoot: string): TypedFileClass[] {
  const owners = readWorkspaceManifests(repositoryRoot).filter(({ dir }) => dir !== '.')
  const roots = ['scripts', ...owners.flatMap(({ dir }) => [join(dir, 'src'), join(dir, 'tests')])]
    .map(path => path.replaceAll('\\', '/'))
  const classes: TypedFileClass[] = []
  for (const root of roots) {
    const absoluteRoot = join(repositoryRoot, root)
    if (!existsSync(absoluteRoot) || !statSync(absoluteRoot).isDirectory()) throw new Error('Missing typed file class: ' + root)
    const files = globSync('**/*.{ts,tsx}', { cwd: absoluteRoot, exclude: ['**/node_modules/**', '**/lib/**'] })
    if (files.length === 0) throw new Error('Typed file class has no TypeScript files: ' + root)
    const directories = new Set([absoluteRoot, ...files.map(file => dirname(join(absoluteRoot, file))),
      ...globSync('**/tsconfig.json', { cwd: absoluteRoot }).map(file => dirname(join(absoluteRoot, file)))])
    const seen = new Set<string>()
    for (const directory of directories) {
      let owner = directory
      while (!existsSync(join(owner, 'tsconfig.json'))) {
        if (owner === resolve(repositoryRoot)) throw new Error('No nearest tsconfig for ' + directory)
        const parent = dirname(owner)
        if (parent === owner) throw new Error('No repository tsconfig for ' + directory)
        owner = parent
      }
      const tsconfig = relative(repositoryRoot, join(owner, 'tsconfig.json'))
      if (seen.has(tsconfig)) continue
      seen.add(tsconfig)
      classes.push({ label: root + ' (' + tsconfig + ')', directory: relative(repositoryRoot, directory).replaceAll('\\', '/'), tsconfig })
    }
  }
  return classes
}

function prepareLintCheckout() {
  const repositoryRoot = mkdtempSync(join(tmpdir(), 'dsh-oxlint-checkout-'))
  onTestFinished(() => { removeFixtureSafely(repositoryRoot) })
  copyWorkspaceFixture(templateRoot, repositoryRoot)
  // Only lint executables read these dependency trees; no installer runs in this checkout.
  for (const { dir } of readWorkspaceManifests(templateRoot)) {
    const dependency = join(templateRoot, dir, 'node_modules')
    if (!existsSync(dependency)) continue
    const link = join(repositoryRoot, dir, 'node_modules')
    symlinkSync(dependency, link, process.platform === 'win32' ? 'junction' : 'dir')
  }
  return {
    repositoryRoot,
    runOxlint: (args: readonly string[], env?: NodeJS.ProcessEnv) => runOxlint(repositoryRoot, args, env),
    runRepositoryOxlint: (args: readonly string[], env?: NodeJS.ProcessEnv) => runRepositoryOxlint(repositoryRoot, args, env),
    writeContractConfig: (suffix: string) => writeContractConfig(repositoryRoot, suffix),
    typedFileClasses: () => typedFileClasses(repositoryRoot),
  }
}

describe('Oxlint executable contract', () => {
  it('discovers the owning TypeScript project for every file class', async () => {
    const { repositoryRoot, runOxlint, writeContractConfig, typedFileClasses } = prepareLintCheckout()
    const suffix = randomUUID()
    const probes = typedFileClasses()
    const configPath = await writeContractConfig(suffix)
    const source = `export function probePromise(): Promise<void> {
  return Promise.resolve()
}

probePromise()
`

    try {
      const paths: Array<readonly [label: string, path: string, tsconfig: string]> = []
      for (const { label, directory, tsconfig } of probes) {
        const path = join(repositoryRoot, directory, 'oxlint-contract-' + suffix + '.ts')
        await writeFile(path, source)
        paths.push([label, relative(repositoryRoot, path), tsconfig])
      }

      const result = runOxlint([
        '--config',
        relative(repositoryRoot, configPath),
        '--format',
        'unix',
        ...paths.map(([, path]) => path),
      ], { OXC_LOG: 'debug' })
      const output = normalizedOutput(result)

      expect(result.error).toBeUndefined()
      expect(result.status, output).toBe(1)
      for (const [label, path, tsconfig] of paths) {
        expect(output, label).toContain(`${path.replaceAll('\\', '/')}:5:1: Promises must be awaited`)
        expect(output, `${label} project`).toContain(
          `Got tsconfig for file ${join(repositoryRoot, path).replaceAll('\\', '/')}: ${join(repositoryRoot, tsconfig).replaceAll('\\', '/')}`,
        )
      }
      expect(output.match(/typescript\(no-floating-promises\)/g)).toHaveLength(probes.length)
      expect(output).not.toContain('Unmatched file:')
      for (const [, path] of paths) await writeFile(join(repositoryRoot, path), source.replace('probePromise()\n', 'void probePromise()\n'))
      const recovered = runOxlint(['--config', relative(repositoryRoot, configPath), '--format', 'unix', ...paths.map(([, path]) => path)])
      expect(recovered.status, normalizedOutput(recovered)).toBe(0)
      expect(normalizedOutput(recovered)).not.toContain('Unmatched file:')
    } finally {
      await Promise.all([
        ...probes.map(({ directory }) => rm(join(repositoryRoot, directory, 'oxlint-contract-' + suffix + '.ts'), { force: true })),
        rm(configPath, { force: true }),
      ])
    }
  }, 90_000)

  it('resolves a real workspace public API for typed rejection and exact recovery', async () => {
    const { repositoryRoot, runOxlint, writeContractConfig, typedFileClasses } = prepareLintCheckout()
    const suffix = randomUUID()
    if (typedImportProbe === null) {
      const members = readWorkspaceManifests(repositoryRoot).filter(({ dir }) => dir !== '.')
      if (members.length > 1) throw new Error('typedImportProbe is required when multiple workspace members exist')
      console.log('typed import probe: no cross-workspace consumer is declared.')
      return
    }
    const { consumerDirectory, specifier, exportName } = typedImportProbe
    if (!/^[a-zA-Z_$][\w$]*$/.test(exportName) || !/^(?:@[a-zA-Z0-9_.-]+\/)?[a-zA-Z0-9_.-]+$/.test(specifier)) {
      throw new Error('typedImportProbe must name a package-root runtime export')
    }
    const classes = typedFileClasses()
    expect(classes.some(probe => probe.directory === consumerDirectory || probe.label.startsWith(consumerDirectory + ' ('))).toBe(true)
    const path = join(repositoryRoot, consumerDirectory, 'oxlint-cross-package-' + suffix + '.ts')
    const configPath = await writeContractConfig(suffix)
    const imported = `import { ${exportName} as probeValue } from '${specifier}'\n`
    const args = ['--config', relative(repositoryRoot, configPath), '--format', 'unix', relative(repositoryRoot, path)]
    try {
      await writeFile(path, imported + 'export async function crossPackageProbe(): Promise<typeof probeValue> {\n  return await probeValue\n}\n')
      const rejected = runOxlint(args)
      expect(rejected.status, normalizedOutput(rejected)).toBe(1)
      expect(normalizedOutput(rejected)).toContain('typescript(await-thenable)')
      expect(normalizedOutput(rejected)).not.toContain('Unmatched file:')
      await writeFile(path, imported + 'export function crossPackageProbe(): typeof probeValue {\n  return probeValue\n}\n')
      const recovered = runOxlint(args)
      expect(recovered.status, normalizedOutput(recovered)).toBe(0)
      expect(normalizedOutput(recovered)).not.toContain('Unmatched file:')
    } finally {
      await Promise.all([rm(path, { force: true }), rm(configPath, { force: true })])
    }
  }, 90_000)

  it('rejects and recovers a cross-package typed violation in an isolated neutral workspace', async () => {
    const { repositoryRoot, runOxlint, writeContractConfig } = prepareLintCheckout()
    const library = join(repositoryRoot, 'packages/lint/probe/src')
    const consumer = join(repositoryRoot, 'apps/lint-probe/tests')
    await mkdir(library, { recursive: true })
    await mkdir(consumer, { recursive: true })
    await writeFile(join(library, 'index.ts'), 'export const value: number = 1\n')
    await writeFile(join(library, '../package.json'), JSON.stringify({ name: '@lint/probe', type: 'module' }))
    await writeFile(join(consumer, '../package.json'), JSON.stringify({ name: 'lint-probe', private: true, type: 'module' }))
    const base = join(repositoryRoot, 'tsconfig.base.json')
    await writeFile(base, generateConfig(await readFile(base, 'utf8'), [{ specifier: '@lint/probe', source: './packages/lint/probe/src' }]))
    await writeFile(join(consumer, 'tsconfig.json'), JSON.stringify({
      extends: base, compilerOptions: { noEmit: true, composite: false, incremental: false }, include: ['*.ts'],
    }))
    const config = await writeContractConfig(randomUUID())
    const path = join(consumer, 'cross-package.ts')
    const imported = "import { value } from '@lint/probe'\n"
    await writeFile(path, imported + 'export async function probe(): Promise<number> { return await value }\n')
    const args = ['--config', relative(repositoryRoot, config), '--format', 'unix', relative(repositoryRoot, path)]
    const rejected = runOxlint(args)
    expect(rejected.status, normalizedOutput(rejected)).toBe(1)
    expect(normalizedOutput(rejected)).toContain('typescript(await-thenable)')
    expect(normalizedOutput(rejected)).not.toContain('Unmatched file:')
    await writeFile(path, imported + 'export function probe(): number { return value }\n')
    const recovered = runOxlint(args)
    expect(recovered.status, normalizedOutput(recovered)).toBe(0)
    expect(normalizedOutput(recovered)).not.toContain('Unmatched file:')
  }, 90_000)

  it('runs JavaScript compatibility and nursery rules', async () => {
    const { repositoryRoot, runOxlint, writeContractConfig } = prepareLintCheckout()
    const suffix = randomUUID()
    const configPath = await writeContractConfig(suffix)
    const path = join(repositoryRoot, 'scripts', `oxlint-contract-${suffix}.ts`)
    const source = `export function firstProbe(): number {
  const first = 1
  const second = 2
  return first + second
}

export function secondProbe(): number {
  const first = 1
  const second = 2
  return first + second
}

export function hasValue(value: string): boolean {
  return value !== undefined
}

export const longProbe = 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1
`

    try {
      await writeFile(path, source)
      const result = runOxlint([
        '--config',
        relative(repositoryRoot, configPath),
        '--format',
        'unix',
        relative(repositoryRoot, path),
      ])
      const output = normalizedOutput(result)

      expect(result.error).toBeUndefined()
      expect(result.status, output).toBe(1)
      expect(output).toContain('@stylistic(max-len)')
      expect(output).toContain('sonarjs(no-identical-functions)')
      expect(output).toContain('typescript(no-unnecessary-condition)')
    } finally {
      await Promise.all([
        rm(path, { force: true }),
        rm(configPath, { force: true }),
      ])
    }
  }, 90_000)


  it('reports an unused suppression', async () => {
    const { repositoryRoot, runOxlint, writeContractConfig } = prepareLintCheckout()
    const suffix = randomUUID()
    const configPath = await writeContractConfig(suffix)
    const path = join(repositoryRoot, 'scripts', `oxlint-contract-${suffix}.ts`)

    try {
      await writeFile(path, '// oxlint-disable-next-line no-console\nexport const value = 1\n')
      const result = runOxlint([
        '--config',
        relative(repositoryRoot, configPath),
        '--format',
        'unix',
        relative(repositoryRoot, path),
      ])
      const output = normalizedOutput(result)

      expect(result.error).toBeUndefined()
      expect(result.status, output).toBe(0)
      expect(output).toContain('Unused oxlint-disable directive')
    } finally {
      await Promise.all([
        rm(path, { force: true }),
        rm(configPath, { force: true }),
      ])
    }
  }, 90_000)


  it('accepts an ignored-only staged selection', () => {
    const { runOxlint } = prepareLintCheckout()
    const result = runOxlint([
      '--fix',
      '--no-error-on-unmatched-pattern',
      'scripts/install-lefthook.mjs',
    ])

    expect(result.error).toBeUndefined()
    expect(result.status, normalizedOutput(result)).toBe(0)
  }, 90_000)

  it('keeps staged validation project-free while preserving source rules', async () => {
    const { repositoryRoot, runOxlint } = prepareLintCheckout()
    const configPath = join(repositoryRoot, '.oxlintrc.staged.json')
    const suffix = randomUUID()
    const path = join(repositoryRoot, 'scripts', `staged-lint-probe-${suffix}.ts`)
    try {
      await writeFile(path, 'export const value={answer:1};\n')
      const lint = runOxlint([
        '--config',
        relative(repositoryRoot, configPath),
        '--format',
        'unix',
        relative(repositoryRoot, path),
      ])
      const output = normalizedOutput(lint)

      expect(lint.error).toBeUndefined()
      expect(lint.status, output).toBe(1)
      expect(output).toContain('@stylistic')
      expect(output).not.toContain('typescript(')
    } finally {
      await rm(path, { force: true })
    }
  }, 90_000)

  it('preserves successful fix output channels', async () => {
    const { repositoryRoot, runRepositoryOxlint } = prepareLintCheckout()
    const suffix = randomUUID()
    const path = join(repositoryRoot, 'scripts', `staged-lint-probe-${suffix}.ts`)

    try {
      await writeFile(path, '// oxlint-disable-next-line no-console\nexport const value = 1\n')
      const result = runRepositoryOxlint([
        '--config',
        '.oxlintrc.staged.json',
        '--format',
        'unix',
        '--fix',
        relative(repositoryRoot, path),
      ])

      expect(result.error).toBeUndefined()
      expect(result.status, normalizedOutput(result)).toBe(0)
      expect(result.stdout).toContain('Unused oxlint-disable directive')
      expect(result.stderr).toBe('')
    } finally {
      await rm(path, { force: true })
    }
  }, 90_000)

  it('prints only the final diagnostics when a fix retry still fails', async () => {
    const { repositoryRoot, runRepositoryOxlint } = prepareLintCheckout()
    const suffix = randomUUID()
    const path = join(repositoryRoot, 'scripts', `staged-lint-probe-${suffix}.ts`)

    try {
      await writeFile(path, `export const longProbe = ${'1 + '.repeat(80)}1\n`)
      const result = runRepositoryOxlint([
        '--config',
        '.oxlintrc.staged.json',
        '--format',
        'unix',
        '--fix',
        relative(repositoryRoot, path),
      ])
      const output = normalizedOutput(result)

      expect(result.error).toBeUndefined()
      expect(result.status, output).toBe(1)
      expect(output.match(/@stylistic\(max-len\)/g)).toHaveLength(1)
    } finally {
      await rm(path, { force: true })
    }
  }, 90_000)

  it.each(['--fix', '--fix-suggestions', '--fix-dangerously'])(
    'converges overlapping staged stylistic fixes through Oxlint under %s',
    async (fixFlag) => {
      const { repositoryRoot, runRepositoryOxlint } = prepareLintCheckout()
      const suffix = randomUUID()
      const directory = join(repositoryRoot, 'scripts', `.oxlint-contract-${suffix}`)
      const path = join(directory, 'fix.ts')

      try {
        await mkdir(directory, { recursive: true })
        await writeFile(path, 'const value={answer:1};  \nconsole.log(value)\n')

        const relativePath = relative(repositoryRoot, path)
        const lintResult = runRepositoryOxlint(['--config', '.oxlintrc.staged.json', fixFlag, relativePath])

        expect(lintResult.error).toBeUndefined()
        expect(lintResult.status, normalizedOutput(lintResult)).toBe(0)
        expect(normalizedOutput(lintResult)).not.toContain('@stylistic')
        await expect(readFile(path, 'utf8')).resolves.toBe('const value={ answer:1 }\nconsole.log(value)\n')
      } finally {
        await rm(directory, { recursive: true, force: true })
      }
    },
    90_000,
  )
})
