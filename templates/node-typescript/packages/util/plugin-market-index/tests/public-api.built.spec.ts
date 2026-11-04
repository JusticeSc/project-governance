import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const packageRoot = resolve(import.meta.dirname, '..')
const env = { ...process.env, NODE_OPTIONS: '' }

describe('plain Node validator artifact', () => {
  it('uses the public built validator to preserve channels and reject invalid targets and missing engines', () => {
    const code = [
      "import assert from 'node:assert/strict'",
      "import { MarketIndexError, marketInstallTarget, parseMarketIndex } from '@deepseek-ai/dsh-plugin-market-index'",
      "assert.ok(import.meta.resolve('@deepseek-ai/dsh-plugin-market-index').endsWith('/lib/index.js'))",
      "const input = { format: 1, title: 'Built market', plugins: [{ name: '@scope/dsh-built', icon: 'icons/a.svg', 'dist-tags': { latest: '1.2.0' }, versions: [",
      "{ version: '1.2.0', publishTimestamp: 1, source: { type: 'npm' }, engines: { dsh: '*' } },",
      "{ version: '1.10.0', publishTimestamp: 2, source: { type: 'npm' }, engines: { dsh: '>=0.2.0' } } ] }] }",
      "const parsed = parseMarketIndex(input, 'https://example.test/market/index.json')",
      "assert.equal(parsed.plugins[0].icon, 'https://example.test/market/icons/a.svg')",
      "assert.deepEqual(parsed.plugins[0].versions.map(version => version.version), ['1.10.0', '1.2.0'])",
      "assert.deepEqual(parsed.plugins[0]['dist-tags'], { latest: '1.2.0' })",
      'const plugin = input.plugins[0]',
      "assert.throws(() => parseMarketIndex({ ...input, plugins: [{ ...plugin, 'dist-tags': { latest: '9.0.0' } }] }, 'https://example.test/index.json'), MarketIndexError)",
      'const { engines, ...missingEngine } = plugin.versions[0]',
      "assert.throws(() => parseMarketIndex({ ...input, plugins: [{ ...plugin, versions: [missingEngine] }] }, 'https://example.test/index.json'), MarketIndexError)",
      "assert.deepEqual(marketInstallTarget(parsed.plugins[0].name, parsed.plugins[0].versions[0]), { spec: '@scope/dsh-built@1.10.0' })",
      "assert.throws(() => parseMarketIndex({ ...input, format: 2 }, 'https://example.test/index.json'), MarketIndexError)",
      "console.log('built validator behavior accepted')",
    ].join('\n')
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], { cwd: packageRoot, env, encoding: 'utf8' })
    expect(result.status, result.stdout + result.stderr).toBe(0)
    expect(result.stdout).toContain('built validator behavior accepted')
  })
})
