/** Reviewed Node runtime dependency exports; additions require explicit human review. */
type HostDependencyExports = Readonly<Record<string, readonly string[]>>
export interface PackageDependencyPolicy {
  readonly configurationOnlyDevDependencies: Readonly<Record<string, readonly string[]>>
  readonly requiredServicePeers?: Readonly<Record<string, readonly string[]>>
  readonly duplicateSafePackages?: readonly string[]
  readonly safeHostDependencyExports: HostDependencyExports
  readonly peerRequiredHostExports: HostDependencyExports
}
export const PACKAGE_DEPENDENCY_POLICY: PackageDependencyPolicy = {
  configurationOnlyDevDependencies: {},
  safeHostDependencyExports: {
    '@deepseek-ai/dsh-plugin-market-index': ['MAX_INLINE_ICON_BYTES', 'parseMarketIndex'],
  },
  peerRequiredHostExports: {},
}
