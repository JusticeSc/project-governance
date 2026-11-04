/**
 * Require every declared workspace member to share the root package license.
 * Source copyright notices and provenance remain independent obligations.
 * @module scripts/verify-package-licenses
 */

import { resolve } from 'node:path'
import { readWorkspaceManifests } from './check-workspace-constraints.ts'

const ROOT = resolve(import.meta.dirname, '..')

/** Result of checking the root and all pnpm-declared workspace members. */
export interface WorkspaceLicenseReport {
  /** Number of manifests inspected, including the root. */
  packageCount: number
  /** Path-qualified missing or inconsistent license declarations. */
  failures: string[]
}

/**
 * Inspect shared license declarations without filtering package names.
 * @param root - repository or fixture root containing pnpm-workspace.yaml.
 * @returns The inspected manifest count and all declaration violations.
 */
export function inspectWorkspaceLicenses(root: string): WorkspaceLicenseReport {
  const manifests = readWorkspaceManifests(root)
  const expected = manifests.find(entry => entry.dir === '.')?.manifest.license
  const failures: string[] = []
  if (typeof expected !== 'string' || expected.trim().length === 0) {
    failures.push('package.json: root must declare a non-empty license.')
  } else {
    for (const { dir, manifest } of manifests) {
      if (manifest.license === expected) continue
      const file = dir === '.' ? 'package.json' : `${dir}/package.json`
      const actual = manifest.license === undefined ? 'undefined' : JSON.stringify(manifest.license)
      failures.push(`${file}: ${manifest.name ?? dir} must declare "license": ${JSON.stringify(expected)}; found ${actual}.`)
    }
  }
  return { packageCount: manifests.length, failures }
}

if (process.argv[1] && import.meta.filename === resolve(process.argv[1])) {
  const report = inspectWorkspaceLicenses(ROOT)
  if (report.failures.length > 0) {
    process.stderr.write('verify-package-licenses: inconsistent workspace license declarations found:\n')
    for (const failure of report.failures) process.stderr.write(`  ${failure}\n`)
    process.exitCode = 1
  } else {
    process.stdout.write(`verify-package-licenses: ${String(report.packageCount)} workspace package(s) checked; licenses match the root.\n`)
  }
}
