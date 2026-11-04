/** Extract declared project persistence types with the source graph engine. */

import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import ts from 'typescript'
import {
  canonicalizeSchema,
  schemaChildren,
  schemaDigest,
  type PersistenceSchemaInventory,
  type PersistenceType,
  type SchemaNode,
  type SchemaProperty,
} from './persistence-schema-model.ts'

interface DeclarationMetadata {
  readonly names: Set<string>
  readonly sources: Set<string>
}

interface RootInput {
  readonly key: string
  readonly versionField?: string
  readonly node: number
}

/** A reachable TypeScript type that cannot be represented as a persisted JSON type. */
export class PersistenceSchemaError extends Error {
  override name = 'PersistenceSchemaError'
}

/** Extract all explicitly declared project persistence types and reachable types.
 * @param root - independent project checkout or source fixture.
 * @returns canonical source inventory, or an empty inventory when no roots are declared.
 */
export function extractPersistenceSchema(root: string): PersistenceSchemaInventory {
  root = resolve(root)
  const configPathname = resolve(root, 'persistence.config.json')
  let present = true
  try { lstatSync(configPathname) } catch (error: unknown) {
    if (error === null || typeof error !== 'object' || !('code' in error) || error.code !== 'ENOENT') throw error
    present = false
  }
  if (!present) return { formatVersion: 1, roots: [], types: [] }
  const input: unknown = JSON.parse(readFileSync(configPathname, 'utf8'))
  if (input === null || typeof input !== 'object' || Array.isArray(input)
    || Object.keys(input).join(',') !== 'roots' || !('roots' in input) || !Array.isArray(input.roots)) {
    throw new PersistenceSchemaError('persistence.config.json: expected a roots array')
  }
  const roots: { id: string; owner: string; type: string; versionField?: string; filename: string }[] = []
  const ids = new Set<string>()
  const owners = new Set<string>()
  const actualRoot = realpathSync(root)
  for (const value of input.roots) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new PersistenceSchemaError('persistence.config.json: invalid root')
    const item = value as Record<string, unknown>
    if (Object.keys(item).some(key => !['id', 'owner', 'type', 'versionField'].includes(key))
      || typeof item.id !== 'string' || !/^[a-z][a-z0-9-]*$/u.test(item.id)
      || typeof item.owner !== 'string' || !/^(?:apps\/[^/]+|packages\/[^/]+\/[^/]+)\/src\/(?:[^/]+\/)*[^/]+\.ts$/u.test(item.owner)
      || item.owner.split('/').some(part => part === '.' || part === '..')
      || typeof item.type !== 'string' || !/^[A-Za-z_$][\w$]*$/u.test(item.type)
      || (item.versionField !== undefined && (typeof item.versionField !== 'string' || !/^[A-Za-z_$][\w$]*$/u.test(item.versionField)))) {
      throw new PersistenceSchemaError('persistence.config.json: invalid root id, owner, type or versionField')
    }
    const filename = resolve(root, item.owner)
    if (!existsSync(filename)) throw new PersistenceSchemaError(`persistence schema: missing declared owner ${item.owner}`)
    const actualFile = realpathSync(filename)
    const actual = relative(actualRoot, actualFile)
    if (actual === '..' || actual.startsWith(`..${sep}`) || isAbsolute(actual)) throw new PersistenceSchemaError(`persistence schema: owner ${item.owner} resolves outside project`)
    const binding = `${actualFile}#${item.type}`
    if (ids.has(item.id) || owners.has(binding)) throw new PersistenceSchemaError(`persistence.config.json: duplicate root ${item.id} or owner ${binding}`)
    ids.add(item.id)
    owners.add(binding)
    roots.push({ id: item.id, owner: item.owner, type: item.type, filename,
      ...(item.versionField === undefined ? {} : { versionField: item.versionField as string }) })
  }
  roots.sort((left, right) => compare(left.id, right.id))
  const configPath = resolve(root, 'tsconfig.base.json')
  const config = ts.readConfigFile(configPath, file => readFileSync(file, 'utf8'))
  if (config.error !== undefined) throw new PersistenceSchemaError(diagnosticText(config.error))
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root)
  const errors = parsed.errors.filter(error => error.code !== 18003)
  if (errors.length > 0) throw new PersistenceSchemaError(errors.map(diagnosticText).join('\n'))
  const options: ts.CompilerOptions = { ...parsed.options, composite: false, incremental: false,
    noEmit: true, rootDir: root, skipLibCheck: false, strict: true, exactOptionalPropertyTypes: true }
  const program = ts.createProgram({ rootNames: [...new Set(roots.map(item => item.filename))], options })
  const declarations = roots.map((item) => {
    const source = program.getSourceFile(item.filename)
    if (source === undefined) throw new PersistenceSchemaError(`persistence schema: missing declared owner ${item.owner}`)
    const matches = source.statements.filter((node): node is ts.InterfaceDeclaration | ts.TypeAliasDeclaration =>
      (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) && node.name.text === item.type
        && node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword) === true)
    if (matches.length !== 1) throw new PersistenceSchemaError(`persistence schema: expected one exported ${item.type} declaration in ${item.owner}`)
    return matches[0] as ts.InterfaceDeclaration | ts.TypeAliasDeclaration
  })
  const diagnostics = [...program.getOptionsDiagnostics(), ...program.getSyntacticDiagnostics()]
  if (diagnostics.length > 0) throw new PersistenceSchemaError(diagnostics.map(diagnosticText).join('\n'))
  const extraction = new SchemaExtractor(root, program, validateReachableDeclarations(program, root, declarations))
  const inventory = extraction.inventory(roots.map((item, index) => {
    const declaration = declarations[index] as ts.InterfaceDeclaration | ts.TypeAliasDeclaration
    return { key: item.id, kind: 'header', ...(item.versionField === undefined ? {} : { versionField: item.versionField }),
      node: extraction.convert(program.getTypeChecker().getTypeAtLocation(declaration), declaration) }
  }))
  for (const item of inventory.roots) if (item.versionField !== undefined) {
    const node = item.schema.nodes[0]
    const property = node?.kind === 'object' ? node.properties.find(property => property.name === item.versionField) : undefined
    const version = property === undefined ? undefined : item.schema.nodes[property.type]
    if (property?.optional !== false || version?.kind !== 'literal' || typeof version.value !== 'number' || !Number.isSafeInteger(version.value) || version.value < 0) {
      throw new PersistenceSchemaError(`${item.key}: declared versionField ${item.versionField} must be a required non-negative integer literal`)
    }
  }
  return inventory
}

function validateReachableDeclarations(
  program: ts.Program,
  root: string,
  roots: readonly ts.Node[],
): ReadonlyMap<ts.Type, readonly ts.Node[]> {
  const checker = program.getTypeChecker()
  const visited = new Set<ts.Node>()
  const declarations = new Map<ts.SourceFile, ts.Node[]>()
  const definitions = new Map<ts.Type, ts.Node[]>()
  const visit = (node: ts.Node): void => {
    if (visited.has(node)) return
    visited.add(node)
    const file = node.getSourceFile()
    if (trackedSource(slash(relative(root, file.fileName)))) {
      const scopes = declarations.get(file) ?? []
      scopes.push(node)
      declarations.set(file, scopes)
      if (isNamedTypeDeclaration(node) || ts.isTypeLiteralNode(node)) {
        // Primitive aliases share checker types with unaliased properties.
        const type = checker.getTypeAtLocation(node)
        const entries = definitions.get(type) ?? []
        entries.push(node)
        definitions.set(type, entries)
      }
    }
    const target = ts.isTypeReferenceNode(node) ? node.typeName
      : ts.isExpressionWithTypeArguments(node) ? node.expression
        : ts.isTypeQueryNode(node) ? node.exprName
          : ts.isImportTypeNode(node) ? node.qualifier
            : undefined
    if (target !== undefined) {
      let symbol = checker.getSymbolAtLocation(target)
      if (symbol !== undefined && (symbol.flags & ts.SymbolFlags.Alias)) symbol = checker.getAliasedSymbol(symbol)
      for (const declaration of symbol?.declarations ?? []) {
        if (trackedSource(slash(relative(root, declaration.getSourceFile().fileName)))) visit(declaration)
      }
    }
    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) return
    ts.forEachChild(node, visit)
  }
  for (const root of roots) visit(root)
  const errors = [...declarations].flatMap(([file, scopes]) => program.getSemanticDiagnostics(file)
    .filter((error) => {
      const start = error.start
      return start !== undefined && scopes.some(scope => start >= scope.getStart() && start < scope.end)
    }))
  if (errors.length > 0) throw new PersistenceSchemaError(errors.map(diagnosticText).join('\n'))
  return definitions
}

function isNeverOrUndefined(type: ts.Type): boolean {
  return (type.isUnion() ? type.types : [type])
    .every(member => (member.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Never)) !== 0)
}


class SchemaExtractor {
  readonly nodes: SchemaNode[] = []
  private readonly cache = new Map<ts.Type, number>()
  private readonly declarationMetadata = new Map<number, DeclarationMetadata>()

  private readonly checker: ts.TypeChecker

  constructor(
    private readonly root: string,
    program: ts.Program,
    private readonly declarationSources: ReadonlyMap<ts.Type, readonly ts.Node[]>,
  ) {
    this.checker = program.getTypeChecker()
  }

  convert(type: ts.Type, site: ts.Node): number {
    const cached = this.cache.get(type)
    if (cached !== undefined) {
      this.record(cached, type)
      return cached
    }
    const id = this.nodes.length
    this.nodes.push({ kind: 'primitive', type: 'never' })
    this.cache.set(type, id)
    this.record(id, type)
    const add = (node: SchemaNode): number => { this.nodes[id] = node; return id }
    const flags = type.flags
    if (flags & ts.TypeFlags.Any) {
      if ((type as ts.Type & { intrinsicName?: string }).intrinsicName === 'error') this.fail(type, site, 'unresolved compiler type')
      return add({ kind: 'opaque', reason: 'any' })
    }
    if (flags & ts.TypeFlags.Unknown) return add({ kind: 'opaque', reason: 'unknown' })
    if (flags & ts.TypeFlags.Never) return add({ kind: 'primitive', type: 'never' })
    if (flags & ts.TypeFlags.Null) return add({ kind: 'primitive', type: 'null' })
    if (flags & ts.TypeFlags.String) return add({ kind: 'primitive', type: 'string' })
    if (flags & ts.TypeFlags.Number) return add({ kind: 'primitive', type: 'number' })
    if (flags & ts.TypeFlags.Boolean) return add({ kind: 'primitive', type: 'boolean' })
    if (flags & ts.TypeFlags.StringLiteral) return add({ kind: 'literal', value: (type as ts.StringLiteralType).value })
    if (flags & ts.TypeFlags.NumberLiteral) return add({ kind: 'literal', value: (type as ts.NumberLiteralType).value })
    if (flags & ts.TypeFlags.BooleanLiteral) return add({ kind: 'literal', value: this.checker.typeToString(type) === 'true' })
    if (type.isUnion()) return add(this.unionNode(type.types.map(member => this.convert(member, site))))
    if (type.isIntersection()) {
      const material = type.types.filter(member => !this.phantom(member))
      for (const member of material) this.rejectClass(member, site)
      if (material.length === 1) {
        const target = this.convert(material[0] as ts.Type, site)
        return add({ kind: 'union', types: [target] })
      }
      if (material.length === 0 || material.some(member => (member.flags & ts.TypeFlags.Object) === 0)) {
        this.fail(type, site, 'unsupported material intersection')
      }
      return add(this.object(type, site))
    }
    if (this.checker.isTupleType(type)) {
      const reference = type as ts.TypeReference
      const target = reference.target as ts.TupleType
      return add({
        kind: 'tuple',
        elements: this.checker.getTypeArguments(reference).map((element, index) => {
          const flags = target.elementFlags[index] ?? ts.ElementFlags.Required
          const optional = (flags & ts.ElementFlags.Optional) !== 0
          const rest = (flags & (ts.ElementFlags.Rest | ts.ElementFlags.Variadic)) !== 0
          return { type: this.valueType(element, site, optional), optional, rest }
        }),
      })
    }
    if (this.checker.isArrayType(type) || this.checker.isArrayLikeType(type)) {
      const element = this.checker.getIndexTypeOfType(type, ts.IndexKind.Number)
      if (element === undefined) this.fail(type, site, 'array element is unavailable')
      return add({ kind: 'array', element: this.convert(element, site) })
    }
    if (flags & ts.TypeFlags.Object) return add(this.object(type, site))
    this.fail(type, site, 'type has no supported JSON representation')
  }

  private valueType(type: ts.Type, site: ts.Node, optional: boolean): number {
    if (!optional) return this.convert(type, site)
    const members = (type.isUnion() ? type.types : [type]).filter(member => !(member.flags & ts.TypeFlags.Undefined))
    return this.union(members.map(member => this.convert(member, site)))
  }

  private object(type: ts.Type, site: ts.Node): SchemaNode {
    this.rejectClass(type, site)
    if (type.getCallSignatures().length > 0 || type.getConstructSignatures().length > 0) this.fail(type, site, 'callable data is not JSON')
    const properties: SchemaProperty[] = []
    for (const property of this.checker.getPropertiesOfType(type).sort((left, right) => compare(left.name, right.name))) {
      if (property.getName().startsWith('__@')) this.fail(type, site, 'symbol-keyed data is not a JSON field')
      const declaration = property.valueDeclaration ?? property.declarations?.[0] ?? site
      const propertyType = this.checker.getTypeOfSymbolAtLocation(property, declaration)
      const optional = (property.flags & ts.SymbolFlags.Optional) !== 0
      if (optional && isNeverOrUndefined(propertyType)) continue
      const child = this.valueType(propertyType, declaration, optional)
      properties.push({ name: property.getName(), type: child, optional })
    }
    const indices = this.checker.getIndexInfosOfType(type).map(info => ({
      key: this.convert(info.keyType, site),
      value: this.convert(info.type, site),
    }))
    if (properties.length === 0 && indices.length === 0) this.fail(type, site, 'unconstrained empty object type is not an explicit JSON record')
    return { kind: 'object', properties, indices }
  }


  private rejectClass(type: ts.Type, site: ts.Node): void {
    const symbol = type.getSymbol()
    if (symbol?.declarations?.some(declaration => ts.isClassDeclaration(declaration) || ts.isClassExpression(declaration))) {
      this.fail(type, site, 'class instances require an explicit persisted representation')
    }
  }

  private phantom(type: ts.Type): boolean {
    if (!(type.flags & ts.TypeFlags.Object)) return false
    const properties = this.checker.getPropertiesOfType(type)
    return properties.length > 0 && properties.every(property => property.getName().startsWith('__@'))
      && type.getCallSignatures().length === 0 && type.getConstructSignatures().length === 0
      && this.checker.getIndexInfosOfType(type).length === 0
  }

  union(types: readonly number[]): number {
    const node = this.unionNode(types)
    if (node.kind === 'union' && node.types.length === 1) return node.types[0] as number
    this.nodes.push(node)
    return this.nodes.length - 1
  }

  private unionNode(types: readonly number[]): SchemaNode {
    if (types.length === 0) return { kind: 'primitive', type: 'never' }
    return { kind: 'union', types: [...new Set(types)] }
  }


  inventory(inputs: readonly RootInput[]): PersistenceSchemaInventory {
    const roots = inputs.map((input) => {
      const schema = canonicalizeSchema(this.nodes, input.node)
      return {
        key: input.key,
        kind: 'header' as const,
        ...(input.versionField === undefined ? {} : { versionField: input.versionField }),
        digest: schemaDigest(schema),
        schema,
      }
    })
    const found = new Set<number>()
    const visit = (id: number): void => {
      if (found.has(id)) return
      found.add(id)
      const node = this.nodes[id] as SchemaNode
      for (const child of schemaChildren(node)) visit(child)
    }
    for (const input of inputs) visit(input.node)
    const types = new Map<string, { schema: PersistenceType['schema']; names: Set<string>; sources: Set<string> }>()
    for (const id of found) {
      const schema = canonicalizeSchema(this.nodes, id)
      const digest = schemaDigest(schema)
      const item = types.get(digest) ?? { schema, names: new Set<string>(), sources: new Set<string>() }
      const declarationMetadata = this.declarationMetadata.get(id)
      for (const name of declarationMetadata?.names ?? []) item.names.add(name)
      for (const source of declarationMetadata?.sources ?? []) item.sources.add(source)
      types.set(digest, item)
    }
    return {
      formatVersion: 1,
      roots,
      types: [...types].sort(([left], [right]) => compare(left, right)).map(([digest, item]) => ({
        digest,
        schema: item.schema,
        names: [...item.names].sort(compare),
        sources: [...item.sources].sort(compare),
      })),
    }
  }

  private record(id: number, type: ts.Type): void {
    const item = this.declarationMetadata.get(id) ?? { names: new Set<string>(), sources: new Set<string>() }
    const declarations = new Set([
      ...this.declarationSources.get(type) ?? [],
      ...type.aliasSymbol?.declarations ?? [],
      ...type.getSymbol()?.declarations ?? [],
    ])
    for (const declaration of declarations) {
      if (!isNamedTypeDeclaration(declaration) && !ts.isTypeLiteralNode(declaration) && !ts.isEnumMember(declaration)) continue
      const source = declaration.getSourceFile()
      const file = slash(relative(this.root, source.fileName))
      if (!trackedSource(file)) continue
      if (isNamedTypeDeclaration(declaration)) item.names.add(`${file}#${declaration.name.text}`)
      const position = source.getLineAndCharacterOfPosition(declaration.getStart())
      item.sources.add(`${file}:${String(position.line + 1)}`)
    }
    this.declarationMetadata.set(id, item)
  }

  private fail(type: ts.Type, site: ts.Node, reason: string): never {
    const source = slash(relative(this.root, site.getSourceFile().fileName))
    const position = site.getSourceFile().getLineAndCharacterOfPosition(site.getStart())
    throw new PersistenceSchemaError(`persistence schema: ${source}:${String(position.line + 1)}: ${reason}: ${this.checker.typeToString(type)}`)
  }
}

function isNamedTypeDeclaration(node: ts.Node): node is ts.TypeAliasDeclaration | ts.InterfaceDeclaration | ts.EnumDeclaration {
  return ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isEnumDeclaration(node)
}


function diagnosticText(diagnostic: ts.Diagnostic): string {
  return `persistence schema: TypeScript TS${String(diagnostic.code)}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`
}

function compare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function slash(path: string): string {
  return path.split(sep).join('/')
}

function trackedSource(file: string): boolean {
  return (file.startsWith('apps/') || file.startsWith('packages/') || file.startsWith('vendor/')) && !file.includes('/node_modules/')
}
