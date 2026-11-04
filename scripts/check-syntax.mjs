import { globSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../', import.meta.url))
const files = [...new Set(globSync(['apps/*/bin/*.mjs', 'apps/*/tests/**/*.mjs', 'packages/*/*/src/**/*.mjs', 'packages/*/*/tests/**/*.mjs', 'scripts/*.mjs', 'tests/**/*.mjs'], { cwd: root }))].sort()
if (files.length === 0) throw new Error('No authored JavaScript files discovered')
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { cwd: root, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
console.log('syntax: ' + files.length + ' authored modules checked')
