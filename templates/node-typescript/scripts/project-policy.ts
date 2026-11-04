/** Project-owned classifications used by repository gates. */

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
  rootLaunchers: {},
  manifestBins: {},
  executableSources: {},
}

export const subsystemGroupsWithoutPage: Readonly<Record<string, string>> = {}

/** A real non-thenable runtime public export consumed through a package-root import. */
export interface TypedImportProbe {
  readonly consumerDirectory: string
  readonly specifier: string
  readonly exportName: string
}

export const typedImportProbe: TypedImportProbe | null = null

/** Empty keeps language switchers project-relative until the target repository is configured. */
export const publicRepositoryBlobRoot: string = ''
export const generatedEnglishSources: readonly string[] = []

/** Organization names and owner/repository exemptions for maintained-reference checks. */
export interface RepositoryReferencePolicy {
  readonly forbiddenOrganizations: readonly string[]
  readonly exemptRepositories: readonly string[]
}

export const forbiddenOrganizations: readonly string[] = []
export const exemptRepositories: readonly string[] = []
export const unavailableRepositories: readonly string[] = []
