/** Business-owned data used by the repository gates; update when replacing the example business. */

/** An npm executable declaration, keyed by its owning manifest in the policy below. */
export type ManifestBin = string | Readonly<Record<string, string>>

/** A launcher selects either authored source or its built artifact, with explicit source ownership. */
export interface RootLauncherClassification {
  readonly path: string
  readonly source: string
  readonly kind: 'source' | 'artifact'
}

/** Explicit classifications for application launchers, manifest bins, and shebang sources. */
export interface ApplicationEntrypointPolicy {
  readonly rootLaunchers: Readonly<Record<string, RootLauncherClassification>>
  readonly manifestBins: Readonly<Record<string, ManifestBin>>
  readonly executableSources: Readonly<Record<string, string>>
}

export const applicationEntrypointPolicy: ApplicationEntrypointPolicy = {
  rootLaunchers: {
    start: { path: 'apps/plugin-market-generator/src/bin.ts', source: 'apps/plugin-market-generator/src/bin.ts', kind: 'source' },
    'start:built': { path: 'apps/plugin-market-generator/lib/types/bin.js', source: 'apps/plugin-market-generator/src/bin.ts', kind: 'artifact' },
  },
  manifestBins: {},
  executableSources: {},
}

export const subsystemGroupsWithoutPage: Readonly<Record<string, string>> = {
  util: 'Low-level primitives whose business semantics remain with their consuming subsystems.',
}

/** A real non-thenable runtime public export consumed through a package-root import. */
export interface TypedImportProbe {
  readonly consumerDirectory: string
  readonly specifier: string
  readonly exportName: string
}

export const typedImportProbe: TypedImportProbe = {
  consumerDirectory: 'apps/plugin-market-generator/tests',
  specifier: '@deepseek-ai/dsh-plugin-market-index',
  exportName: 'MAX_INLINE_ICON_BYTES',
}

export const publicRepositoryBlobRoot: string = 'https://github.com/deepseek-ai/deepseek-harness/blob/master/'
export const generatedEnglishSources: readonly string[] = []

/** Organization names and owner/repository exemptions for maintained-reference checks. */
export interface RepositoryReferencePolicy {
  readonly forbiddenOrganizations: readonly string[]
  readonly exemptRepositories: readonly string[]
}

export const forbiddenOrganizations: readonly string[] = []
export const exemptRepositories: readonly string[] = []
export const unavailableRepositories: readonly string[] = []
