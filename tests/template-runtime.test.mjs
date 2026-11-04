import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = fileURLToPath(new URL('../', import.meta.url))

test('template check refuses an unavailable explicitly selected Node runtime', () => {
  const temporary = mkdtempSync(join(tmpdir(), 'governance-template-node-'))
  try {
    const unavailable = join(temporary, process.platform === 'win32' ? 'missing-node.exe' : 'missing-node')
    const result = spawnSync(process.execPath, ['scripts/check-template.mjs'], {
      cwd: root,
      env: { ...process.env, COREPACK_HOME: join(temporary, 'empty-corepack'), PROJECT_GOVERNANCE_TEMPLATE_NODE: unavailable },
      encoding: 'utf8',
      timeout: 30_000,
    })
    assert.equal(result.status, 1)
    assert.match(result.stderr, /template Node executable is unavailable/u)
  } finally {
    rmSync(temporary, { recursive: true, force: true })
  }
})
