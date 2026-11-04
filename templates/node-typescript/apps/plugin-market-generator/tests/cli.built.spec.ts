import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it, onTestFinished } from 'vitest'

const application = resolve(import.meta.dirname, '..')
const entry = join(application, 'lib/types/bin.js')
const env = { ...process.env, NODE_OPTIONS: '' }

describe('plain Node generator artifact', () => {
  it('runs the built CLI and preserves existing output when invalid arguments are rejected', () => {
    const temporary = mkdtempSync(join(tmpdir(), 'built-market-cli-'))
    onTestFinished(() => { rmSync(temporary, { recursive: true, force: true }) })
    const input = join(temporary, 'sources.txt')
    const output = join(temporary, 'index.json')
    writeFileSync(input, '# an intentionally empty source list\n')
    const args = [entry, '--input', input, '--output', output, '--title', 'Built smoke']
    const accepted = spawnSync(process.execPath, args, { cwd: temporary, env, encoding: 'utf8' })
    expect(accepted.status, accepted.stdout + accepted.stderr).toBe(0)
    const bytes = readFileSync(output)
    expect(JSON.parse(bytes.toString('utf8'))).toEqual({
      format: 1, title: 'Built smoke', plugins: [],
    })
    const refused = spawnSync(process.execPath, [...args, '--concurrency', '0'], { cwd: temporary, env, encoding: 'utf8' })
    expect(refused.status, refused.stdout + refused.stderr).toBe(2)
    expect(refused.stderr).toContain('must be a positive integer')
    expect(readFileSync(output).equals(bytes)).toBe(true)
  })
})
