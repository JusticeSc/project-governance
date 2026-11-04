// Parser/compiler prerequisites for the documentation gates.
// The governance runtime (`@project-governance/checks`, `@project-governance/cli`) stays dependency-free;
// these gates need the same Markdown/YAML parsers and the TypeScript compiler the source verifiers use,
// so they are pinned in this package's package.json and installed from the workspace lockfile.
const INSTALL_COMMAND = 'npm ci --ignore-scripts'

/**
 * Report a gate module that could not be loaded and exit 2 (an unavailable prerequisite, never a pass).
 * @param command - Command name used as the diagnostic prefix.
 * @param error - Error thrown while importing the gate module.
 */
export function exitOnLoadFailure(command, error) {
  if (error?.code === 'ERR_MODULE_NOT_FOUND' || error?.code === 'ERR_UNKNOWN_FILE_EXTENSION') {
    console.error(`${command}: required Markdown/YAML parser or TypeScript compiler is not installed (${error.message})`)
    console.error(`${command}: install the workspace dependencies pinned by @project-governance/documentation:`)
    console.error(`  ${INSTALL_COMMAND}    # from the workspace root that owns npm-shrinkwrap.json`)
    process.exit(2)
  }
  console.error(`${command}: failed to load the gate module: ${error instanceof Error ? error.stack ?? error.message : String(error)}`)
  process.exit(2)
}
