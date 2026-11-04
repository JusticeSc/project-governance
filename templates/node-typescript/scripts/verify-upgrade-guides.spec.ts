import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { collectUpgradeGuideViolations } from './verify-upgrade-guides.ts'

const roots: string[] = []
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})
const VALID = '---\nkind: upgrade-guide\ndescription: "The output flag is renamed."\n---\n\n# Output flag\n\n## Change\n\nOld and new behavior.\n\n### Detail\n\n```md\n# not a heading\n```\n\n## Migration\n\n1. Rename the flag and verify the written index.\n'
const VALID_ZH = VALID.replace('## Change', '## 变更').replace('## Migration', '## 迁移')
const GUIDE = 'v0.2.1-rc.2/output-flag/guide.md'
function fixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'dsh-upgrade-guides-'))
  roots.push(root)
  for (const [file, source] of Object.entries(files)) {
    const path = join(root, 'docs/upgrade-guide', file)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, source)
  }
  return root
}
function refusedFiles(files: Record<string, string>): string[] {
  return collectUpgradeGuideViolations(fixture(files)).map(violation => violation.slice(0, violation.indexOf(': ')))
}

describe('upgrade guide contract', () => {
  it('accepts no triggered guide and conforming bilingual, prerelease and CRLF guides', () => {
    expect(collectUpgradeGuideViolations(fixture({}))).toEqual([])
    expect(collectUpgradeGuideViolations(fixture({
      [GUIDE]: VALID,
      'v0.2.1-rc.2/output-flag/guide.zh.md': VALID_ZH,
      'v0.2.1-rc.2/output-flag/guide.i18n.yaml': 'owned by the pairing check\n',
      'v1.0.0/crlf/guide.md': VALID.replaceAll('\n', '\r\n'),
    }))).toEqual([])
  })

  it('refuses files outside the version/item/bilingual-guide layout', () => {
    const invalid = ['README.md', '0.1.7/item/guide.md', 'v0.1/item/guide.md', 'v0.1.7/Item_Name/guide.md', 'v0.1.7/item/notes.md', 'v0.1.7/item/extra/guide.md']
    expect(refusedFiles(Object.fromEntries(invalid.map(path => [path, VALID])))).toEqual(invalid.map(path => 'docs/upgrade-guide/' + path).sort())
  })

  it.each([
    ['missing frontmatter', VALID.slice(VALID.indexOf('# '))],
    ['non-object metadata', VALID.replace('kind: upgrade-guide\ndescription: "The output flag is renamed."', '- a')],
    ['extra metadata key', VALID.replace('kind: upgrade-guide', 'kind: upgrade-guide\nversion: v0.2.1')],
    ['wrong kind', VALID.replace('kind: upgrade-guide', 'kind: reference')],
    ['empty description', VALID.replace('description: "The output flag is renamed."', 'description: ""')],
  ])('refuses %s', (_name, source) => {
    expect(refusedFiles({ [GUIDE]: source })).toEqual(['docs/upgrade-guide/' + GUIDE])
  })

  it.each([
    ['missing title', VALID.replace('# Output flag\n', '')],
    ['second title', VALID.replace('## Migration', '# Migration')],
    ['renamed section', VALID.replace('## Migration', '## Migrations')],
    ['extra section', VALID + '\n## References\n'],
    ['reordered sections', VALID.replace('## Change', '## Placeholder').replace('## Migration', '## Change').replace('## Placeholder', '## Migration')],
  ])('refuses %s', (_name, source) => {
    expect(refusedFiles({ [GUIDE]: source })).toEqual(['docs/upgrade-guide/' + GUIDE])
  })

  it.each([
    ['English section names', VALID],
    ['wrong kind', VALID_ZH.replace('kind: upgrade-guide', 'kind: reference')],
  ])('checks Chinese guides for %s', (_name, source) => {
    const path = GUIDE.replace('guide.md', 'guide.zh.md')
    expect(refusedFiles({ [path]: source })).toEqual(['docs/upgrade-guide/' + path])
  })

  it('allows exactly 500 English words, rejects 501 and does not impose that ceiling on Chinese', () => {
    const words = VALID.split(/\s+/u).filter(Boolean).length
    expect(refusedFiles({
      'v1.0.0/at-limit/guide.md': VALID + 'word '.repeat(500 - words),
      'v1.0.0/over-limit/guide.md': VALID + 'word '.repeat(501 - words),
      'v1.0.0/chinese/guide.zh.md': VALID_ZH + '词 '.repeat(600),
    })).toEqual(['docs/upgrade-guide/v1.0.0/over-limit/guide.md'])
  })
})
