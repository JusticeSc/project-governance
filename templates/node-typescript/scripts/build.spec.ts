import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, onTestFinished } from 'vitest'
import { buildGates, parseBuildArguments } from './build.ts'

describe('Node build graph', () => {
  function root(): string {
    const root = mkdtempSync(join(tmpdir(), 'node-build-graph-'))
    onTestFinished(() => { rmSync(root, { recursive: true, force: true }) })
    mkdirSync(join(root, 'leaf'))
    writeFileSync(join(root, 'leaf/index.ts'), 'export const value = 1\n')
    writeFileSync(join(root, 'leaf/tsconfig.json'), JSON.stringify({ compilerOptions: { composite: true }, files: ['index.ts'] }))
    writeFileSync(join(root, 'tsconfig.host.json'), JSON.stringify({
      compilerOptions: { noEmit: true }, files: [], references: [{ path: './leaf' }],
    }))
    return root
  }
  it('parses scopes and rejects unsupported options before starting children', () => {
    expect(parseBuildArguments([])).toEqual({ scope: 'complete' })
    for (const scope of ['artifacts', 'check', 'typecheck']) expect(parseBuildArguments(['--scope', scope])).toEqual({ scope })
    expect(() => parseBuildArguments(['--scope', 'unknown'])).toThrow('build: --scope')
    expect(() => parseBuildArguments(['--profile', 'official'])).toThrow()
  })
  it('retains compiler-before-bundle ordering and aggregate declaration dependencies', () => {
    const gates = buildGates(root(), 'complete', { PROBE: 'retained' })
    expect(gates.map(gate => gate.id)).toEqual(['host-src', 'host-bundle', 'host-check'])
    expect(gates.find(gate => gate.id === 'host-bundle')?.needs).toEqual(['host-src'])
    expect(gates.find(gate => gate.id === 'host-check')?.needs).toEqual(['host-src'])
    expect(gates.every(gate => gate.env?.PROBE === 'retained')).toBe(true)
  })
  it('does not bundle during typecheck and check-only never compiles references', () => {
    const directory = root()
    expect(buildGates(directory, 'typecheck').map(gate => gate.id)).toEqual(['host-src', 'host-check'])
    expect(buildGates(directory, 'artifacts').map(gate => gate.id)).toEqual(['host-src', 'host-bundle'])
    const [check] = buildGates(directory, 'check')
    expect(check?.args).toContain('-p')
    expect(check?.needs).toEqual([])
  })
})
