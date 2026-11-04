import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { findPackagePathViolations } from './verify-package-paths.ts'

const removedReference = 'packages/fs/tool-present/src/types.ts'
const currentReference = 'packages/deliverables/tool-present/src/types.ts'

function scan(file: string, source: string) {
  const root = mkdtempSync(join(tmpdir(), 'dsh-package-paths-'))
  try {
    const current = join(root, currentReference)
    mkdirSync(dirname(current), { recursive: true })
    writeFileSync(current, 'export {}\n')
    const path = join(root, file)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, source)
    return findPackagePathViolations(root, path, new Set(['tool-present']))
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

describe('package path references', () => {
  it('reports a missing path that names a live package at its own line', () => {
    const file = 'docs/current.md'
    expect(scan(file, [currentReference, 'packages/hypothetical/unpublished/src/types.ts', removedReference].join('\n')))
      .toEqual([{ file, line: 3, ref: removedReference }])
  })

  it('reports the same drift with Windows line endings', () => {
    const file = 'docs/current.md'
    expect(scan(file, [currentReference, removedReference].join('\r\n')))
      .toEqual([{ file, line: 2, ref: removedReference }])
  })
})
