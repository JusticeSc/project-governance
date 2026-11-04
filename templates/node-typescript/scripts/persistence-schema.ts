/** Extract complete format-1 JSON types with the source persistence graph engine. */

import { readFileSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'
import ts from 'typescript'
import { sourceCompatibilityAnnotations } from './persistence-source-annotations.ts'
import { validSourceCompatibility } from './persistence-source-policy.ts'
import {
  canonicalizeSchema,
  schemaChildren,
  schemaDigest,
  schemaHasCompatibility,
  type PersistenceRoot,
  type PersistenceSchemaInventory,
  type PersistenceType,
  type SchemaNode,
  type SchemaProperty,
  type SourceCompatibility,
} from './persistence-schema-model.ts'

interface DeclarationMetadata {
  readonly names: Set<string>
  readonly sources: Set<string>
}

interface RootInput {
  readonly key: string
  readonly kind: PersistenceRoot['kind']
  readonly event?: string
  readonly surface?: boolean
  readonly node: number
}

/** A reachable TypeScript type that cannot be represented as a persisted JSON type. */
export class PersistenceSchemaError extends Error {
  override name = 'PersistenceSchemaError'
}

/** Extract the actual format-owning MarketIndex type and its complete reachable graph.
 * @param root - independent template checkout or source fixture.
 * @returns canonical current declared JSON structure; not a runtime-validation claim.
 */
export function extractPersistenceSchema(root: string): PersistenceSchemaInventory {
  root = resolve(root)
  const filename = resolve(root, 'packages/util/plugin-market-index/src/types.ts')
  const configPath = resolve(root, 'tsconfig.base.json')
  const config = ts.readConfigFile(configPath, file => readFileSync(file, 'utf8'))
  if (config.error !== undefined) throw new PersistenceSchemaError(diagnosticText(config.error))
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root)
  const errors = parsed.errors.filter(error => error.code !== 18003)
  if (errors.length > 0) throw new PersistenceSchemaError(errors.map(diagnosticText).join('\n'))
  const options: ts.CompilerOptions = { ...parsed.options, composite: false, incremental: false,
    noEmit: true, rootDir: root, skipLibCheck: false, strict: true, exactOptionalPropertyTypes: true }
  const program = ts.createProgram({ rootNames: [filename], options })
  const source = program.getSourceFile(filename)
  if (source === undefined) throw new PersistenceSchemaError('persistence schema: missing format type owner')
  const declarations = source.statements.filter((node): node is ts.InterfaceDeclaration | ts.TypeAliasDeclaration =>
    (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) && node.name.text === 'MarketIndex')
  if (declarations.length !== 1) throw new PersistenceSchemaError('persistence schema: expected one MarketIndex declaration')
  const declaration = declarations[0] as ts.InterfaceDeclaration | ts.TypeAliasDeclaration
  const diagnostics = [...program.getOptionsDiagnostics(), ...program.getSyntacticDiagnostics()]
  if (diagnostics.length > 0) throw new PersistenceSchemaError(diagnostics.map(diagnosticText).join('\n'))
  const extraction = new SchemaExtractor(root, program, validateReachableDeclarations(program, root, [declaration]))
  return extraction.inventory([{ key: 'MarketIndex', kind: 'header',
    node: extraction.convert(program.getTypeChecker().getTypeAtLocation(declaration), declaration) }])
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

function reservedPropertyAnnotations(root: string, program: ts.Program): ReadonlySet<ts.Declaration> {
  const checker = program.getTypeChecker()
  const reserved = new Set<ts.Declaration>()
  for (const file of program.getSourceFiles()) {
    const path = slash(relative(root, file.fileName))
    if (!path.startsWith('packages/') || path.includes('/node_modules/')) continue
    const visit = (node: ts.Node): void => {
      const tags = ts.getJSDocTags(node).filter(tag => tag.tagName.text === 'persistenceReserved')
      if (tags.length > 0) {
        if (tags.length !== 1 || tags[0]?.comment !== undefined || !ts.isPropertySignature(node)
          || node.questionToken === undefined || !isNeverOrUndefined(checker.getTypeAtLocation(node))) {
          throw new PersistenceSchemaError(`persistence schema: ${path}: @persistenceReserved requires one argument-free marker on an optional never or undefined property`)
        }
        reserved.add(node)
      }
      ts.forEachChild(node, visit)
    }
    visit(file)
  }
  return reserved
}

class SchemaExtractor {
  readonly nodes: SchemaNode[] = []
  private readonly cache = new Map<ts.Type, number>()
  private readonly declarationMetadata = new Map<number, DeclarationMetadata>()

  private readonly checker: ts.TypeChecker
  private readonly sourcePolicies: ReadonlyMap<ts.Declaration, readonly SourceCompatibility[]>
  private readonly reservedProperties: ReadonlySet<ts.Declaration>

  constructor(
    private readonly root: string,
    program: ts.Program,
    private readonly declarationSources: ReadonlyMap<ts.Type, readonly ts.Node[]>,
  ) {
    this.checker = program.getTypeChecker()
    this.sourcePolicies = sourceCompatibilityAnnotations(root, program)
    this.reservedProperties = reservedPropertyAnnotations(root, program)
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
      const reserved = property.declarations?.some(declaration => this.reservedProperties.has(declaration)) === true
      if (reserved && (!optional || !isNeverOrUndefined(propertyType))) {
        this.fail(type, declaration, '@persistenceReserved must remain an optional never or undefined property')
      }
      if (optional && isNeverOrUndefined(propertyType) && !reserved) continue
      const child = this.valueType(propertyType, declaration, optional)
      const policies = this.propertyPolicies(type, property, declaration)
      if (policies.length > 1) this.fail(type, declaration, 'ambiguous source compatibility binding')
      properties.push({ name: property.getName(), type: child, optional,
        ...(policies[0] === undefined ? {} : { compatibility: policies[0] }),
      })
    }
    const indices = this.checker.getIndexInfosOfType(type).map(info => ({
      key: this.convert(info.keyType, site),
      value: this.convert(info.type, site),
    }))
    if (properties.length === 0 && indices.length === 0) this.fail(type, site, 'unconstrained empty object type is not an explicit JSON record')
    return { kind: 'object', properties, indices }
  }

  private propertyPolicies(type: ts.Type, property: ts.Symbol, site: ts.Node): readonly SourceCompatibility[] {
    const declared = (property.declarations ?? []).flatMap(declaration => this.sourcePolicies.get(declaration) ?? [])
    if (declared.length === 0) return []
    const roleProperty = this.checker.getPropertyOfType(type, 'role')
    if (roleProperty === undefined || (roleProperty.flags & ts.SymbolFlags.Optional) !== 0) return []
    const role = this.checker.getTypeOfSymbolAtLocation(roleProperty, site)
    if (!(role.flags & ts.TypeFlags.StringLiteral)) return []
    const binding = (role as ts.StringLiteralType).value === 'user' ? 'session.user-message.source'
      : (role as ts.StringLiteralType).value === 'developer' ? 'session.developer-message.source'
        : undefined
    return declared.filter(policy => policy.binding === binding)
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
    for (const node of this.nodes) {
      if (node.kind !== 'object') continue
      for (const property of node.properties) {
        if (property.compatibility !== undefined && !validSourceCompatibility(this.nodes, node, property)) {
          throw new PersistenceSchemaError('persistence schema: invalid source compatibility binding or attribution kinds')
        }
      }
    }
    const roots = inputs.map((input) => {
      const schema = canonicalizeSchema(this.nodes, input.node)
      return {
        key: input.key,
        kind: input.kind,
        ...(input.event === undefined ? {} : { event: input.event }),
        ...(input.surface === undefined ? {} : { surface: input.surface }),
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
      formatVersion: roots.some(root => schemaHasCompatibility(root.schema)) ? 2 : 1,
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
  return (file.startsWith('packages/') || file.startsWith('vendor/')) && !file.includes('/node_modules/')
}
