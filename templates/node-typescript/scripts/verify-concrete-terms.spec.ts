import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it, onTestFinished } from 'vitest'

const repositoryRoot = resolve(import.meta.dirname, '..')

describe('concrete terms gate', () => {
  it('ignores pnpm cache metadata while rejecting the same term in maintained documentation', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'concrete-terms-'))
    onTestFinished(() => { rmSync(fixture, { recursive: true, force: true }) })
    for (const directory of ['scripts', 'packages', 'docs', '.pnpm-cache/v12/metadata']) {
      mkdirSync(join(fixture, directory), { recursive: true })
    }
    for (const file of ['verify-concrete-terms.ts', 'manifest-json.ts', 'concrete-terms.manifest.json']) {
      copyFileSync(join(repositoryRoot, 'scripts', file), join(fixture, 'scripts', file))
    }
    const policy = JSON.parse(readFileSync(join(fixture, 'scripts/concrete-terms.manifest.json'), 'utf8')) as { blockedTerms: { term: string }[] }
    const term = policy.blockedTerms[0]!.term
    writeFileSync(join(fixture, 'package.json'), '{"type":"module"}\n')
    writeFileSync(join(fixture, 'AGENTS.md'), 'Maintained instructions.\n')
    writeFileSync(join(fixture, 'packages/README.md'), 'Maintained packages.\n')
    writeFileSync(join(fixture, 'docs/guide.md'), 'Maintained guidance.\n')
    writeFileSync(join(fixture, '.pnpm-cache/v12/metadata/example.jsonl'), JSON.stringify({ name: term }) + '\n')
    const run = () => spawnSync(process.execPath, ['--import', 'tsx', join(fixture, 'scripts/verify-concrete-terms.ts')], {
      cwd: repositoryRoot, encoding: 'utf8', env: { ...process.env, NODE_OPTIONS: '' },
    })

    const clean = run()
    expect(clean.status, clean.stderr).toBe(0)
    writeFileSync(join(fixture, 'docs/guide.md'), `Unresolved: ${term}\n`)
    const rejected = run()
    expect(rejected.status, rejected.stderr).toBe(1)
    expect(rejected.stderr).toContain(`docs/guide.md:1 (${term})`)
    writeFileSync(join(fixture, 'docs/guide.md'), 'Maintained guidance.\n')
    const restored = run()
    expect(restored.status, restored.stderr).toBe(0)
  })
})
