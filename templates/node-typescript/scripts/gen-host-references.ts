/** Synchronize the host aggregate's generated workspace references without changing authored configuration. */

import { lstatSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import ts from 'typescript'
import { readWorkspaceManifests } from './check-workspace-constraints.ts'

const root = resolve(import.meta.dirname, '..')
const configPath = join(root, 'tsconfig.host.json')
const beginMarker = '// BEGIN generated workspace references — pnpm run gen-host-references'
const endMarker = '// END generated workspace references'
const { values } = parseArgs({ options: { check: { type: 'boolean' } }, allowPositionals: false })

function referenceArray(text: string): { source: ts.JsonSourceFile; array: ts.ArrayLiteralExpression } {
  const filename = configPath.replaceAll('\\', '/')
  const parsed = ts.parseConfigFileTextToJson(filename, text)
  if (parsed.error !== undefined) throw new Error(`gen-host-references: ${ts.flattenDiagnosticMessageText(parsed.error.messageText, '\n')}`)
  const source = ts.parseJsonText(filename, text)
  const statement = source.statements[0]
  if (statement === undefined || !ts.isExpressionStatement(statement) || !ts.isObjectLiteralExpression(statement.expression)) {
    throw new Error('gen-host-references: tsconfig.host.json must contain a config object')
  }
  const properties = statement.expression.properties.filter(property =>
    ts.isPropertyAssignment(property) && ts.isStringLiteral(property.name) && property.name.text === 'references')
  const property = properties[0]
  if (properties.length !== 1 || property === undefined || !ts.isPropertyAssignment(property)
    || !ts.isArrayLiteralExpression(property.initializer)) {
    throw new Error('gen-host-references: tsconfig.host.json must contain exactly one references array')
  }
  return { source, array: property.initializer }
}

function generatedRegion(text: string, source: ts.JsonSourceFile, array: ts.ArrayLiteralExpression): { start: number; end: number } {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, text)
  const markers: { text: string; start: number; end: number }[] = []
  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
    if (token !== ts.SyntaxKind.SingleLineCommentTrivia) continue
    const comment = scanner.getTokenText().trimEnd()
    if (comment === beginMarker || comment === endMarker) {
      markers.push({ text: comment, start: scanner.getTokenStart(), end: scanner.getTokenEnd() })
    }
  }
  const begin = markers[0]
  const end = markers[1]
  if (markers.length !== 2 || begin === undefined || end === undefined || begin.text !== beginMarker || end.text !== endMarker
    || begin.start <= array.getStart(source) || end.end >= array.end) {
    throw new Error('gen-host-references: expected one ordered generated-region marker pair inside the references array; no config was changed')
  }
  if (array.elements.some(element => (element.getStart(source) < begin.start && element.end > begin.start)
    || (element.getStart(source) < end.start && element.end > end.start))) {
    throw new Error('gen-host-references: generated-region markers must sit between complete references; no config was changed')
  }
  for (const marker of markers) {
    const lineStart = text.lastIndexOf('\n', marker.start - 1) + 1
    if (text.slice(lineStart, marker.start).trim() !== '') {
      throw new Error('gen-host-references: generated-region markers must occupy their own lines; no config was changed')
    }
  }
  return { start: begin.end, end: text.lastIndexOf('\n', end.start - 1) + 1 }
}

function requireDirectory(path: string): void {
  const entry = lstatSync(path)
  if (entry.isSymbolicLink() || !entry.isDirectory()) throw new Error(`gen-host-references: ${path} is not an unredirected directory`)
}

function requireConfig(path: string): void {
  const entry = lstatSync(path)
  if (entry.isSymbolicLink() || !entry.isFile()) throw new Error(`gen-host-references: ${path} is not a regular project config`)
}

requireConfig(configPath)
const current = readFileSync(configPath, 'utf8')
const { source, array } = referenceArray(current)
const region = generatedRegion(current, source, array)
const authored = new Set<string>()
for (const element of array.elements) {
  if (!ts.isObjectLiteralExpression(element)) throw new Error('gen-host-references: each reference must be an object with a nonempty path')
  const paths = element.properties.filter(property => ts.isPropertyAssignment(property) && ts.isStringLiteral(property.name) && property.name.text === 'path')
  const path = paths[0]
  if (paths.length !== 1 || path === undefined || !ts.isPropertyAssignment(path)
    || !ts.isStringLiteral(path.initializer) || path.initializer.text.length === 0) {
    throw new Error('gen-host-references: each reference must have exactly one nonempty string path')
  }
  if (element.getStart(source) < region.start || element.getStart(source) >= region.end) {
    authored.add(resolve(ts.resolveProjectReferencePath({ path: resolve(root, path.initializer.text) })))
  }
}
function hasComma(start: number, end: number): boolean {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, current.slice(start, end))
  return scanner.scan() === ts.SyntaxKind.CommaToken
}

const members = readWorkspaceManifests(root).filter(({ dir }) => dir !== '.')
const generated: string[] = []
for (const { dir } of members) {
  const parts = dir.split('/')
  for (let count = 1; count <= parts.length; count++) requireDirectory(join(root, ...parts.slice(0, count)))
  const memberConfig = join(root, dir, 'tsconfig.json')
  requireConfig(memberConfig)
  if (!authored.has(memberConfig)) generated.push(`    { "path": ${JSON.stringify(`./${dir}`)} }`)
}
const preceding = array.elements.filter(element => element.end <= region.start).at(-1)
const following = array.elements.find(element => element.getStart(source) >= region.end)
const prefixComma = preceding !== undefined && !hasComma(preceding.end, region.start)
const suffixComma = hasComma(region.end, following === undefined ? array.end - 1 : following.getStart(source))
function renderReferences(references: readonly string[]): string {
  const separator = prefixComma && (references.length > 0 || (following !== undefined && !suffixComma)) ? ',\n' : ''
  const body = references.length === 0 ? '' : `${references.join(',\n')}${suffixComma ? '' : ','}`
  return `${current.slice(0, region.start)}\n${separator}${body}\n${current.slice(region.end)}`
}

const next = renderReferences(generated)
try {
  const projected = referenceArray(generated.length === 0 ? next : renderReferences([])).array
  if (projected.elements.some(ts.isOmittedExpression)) throw new Error('references must not contain empty elements')
} catch (cause) {
  throw new Error('gen-host-references: move the separator comma inside the generated region before takeover; removing all generated references must leave a valid references array; no config was changed', { cause })
}
if (generated.length > 0) referenceArray(next)
if (current === next) {
  console.log('gen-host-references: tsconfig.host.json workspace references are current.')
} else if (values.check === true) {
  console.error('gen-host-references: tsconfig.host.json workspace references are stale; run `pnpm run gen-host-references`.')
  process.exitCode = 1
} else {
  writeFileSync(configPath, next)
  console.log('gen-host-references: updated tsconfig.host.json workspace references.')
}
