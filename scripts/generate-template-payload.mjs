import { lstatSync, mkdtempSync, readFileSync, readlinkSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { exportTemplate } from './export-template.mjs'

// Generate from the exporter itself so restored ignore names and the directory link are identical.
const temporary = mkdtempSync(join(tmpdir(), 'project-governance-payload-'))
try {
  const exported = exportTemplate(join(temporary, 'template'))
  const entries = exported.files.map(name => {
    const path = join(exported.destination, ...name.split('/'))
    const stat = lstatSync(path)
    if (stat.isSymbolicLink()) return [name, 'link', readlinkSync(path).replaceAll('\\', '/')]
    if (!stat.isFile()) throw new Error(`Unexpected exported entry: ${name}`)
    return [name, 'file', readFileSync(path).toString('base64')]
  })
  const payload = gzipSync(Buffer.from(JSON.stringify(entries)), { level: 9 })
  writeFileSync(new URL('../skills/project-governance/assets/template.json.gz', import.meta.url), payload)
  console.log(`Generated payload with ${entries.length} exported template entries`)
} finally {
  rmSync(temporary, { recursive: true, force: true })
}
