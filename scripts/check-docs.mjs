import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../', import.meta.url))
const gates = ['verify-md-links', 'verify-md-wrap', 'verify-doc-budgets', 'verify-translation-pairing', 'verify-package-readme-summaries', 'verify-package-readme-limitations']
for (const gate of gates) {
  const result = spawnSync(process.execPath, ['packages/governance/documentation/src/' + gate + '.mjs'], { cwd: root, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
console.log('documentation: all declared corpus gates passed')
