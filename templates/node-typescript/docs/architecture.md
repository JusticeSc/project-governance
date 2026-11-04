# Architecture

English | [中文](architecture.zh.md)

Read this before changing anything under `apps/` or `packages/`. The workspaces implement one format and one producer for it; the [format Agent Note](../.agents/notes/implemented/feature/2026-10-02-plugin-market-index-format.md) owns the data contract, and this page owns how the code is arranged around it.

This is the included example's architecture. For a new business, [Start a different project](cookbook/starting-a-project.md) defines the replacement closure and project parameters; update this map to the actual implementation rather than retaining the example as current authority.

## Workspaces

| Workspace | Role | Entry |
|---|---|---|
| [`apps/plugin-market-generator`](../apps/plugin-market-generator/README.md) | Reads a source list of npm packages and Git repositories and writes a validated format-1 index plus icon files. | `src/bin.ts` → `src/cli.ts` |
| [`packages/util/plugin-market-index`](../packages/util/plugin-market-index/README.md) | Validates a format-1 document and builds the exact install arguments for one version. | `src/index.ts` |

The app is a Node program, not a plugin host. The package is a library: no I/O, no state, no registration, and no dependency on the app. The app depends on the package, never the reverse.

The [package relationship graph](package-relationships.md) projects real workspace runtime dependencies from manifests and is freshness-checked; it does not replace this behavioral map. The [CLI help reference](cli-help.md) projects the actual entry's help rather than maintaining another option catalog.

## Data flow

```text
source list
  -> source normalization and line validation            src/sources.ts
  -> per-source read (registry / Git refs)               src/fetchers.ts, src/generate.ts
  -> package discovery and manifest reading              src/packages.ts
  -> display fields and icons                            src/metadata.ts
  -> format-1 document                                   src/generate.ts
  -> parseMarketIndex validation                         @deepseek-ai/dsh-plugin-market-index
  -> atomic index and icon writes                        src/files.ts, src/cli.ts
```

Generation is deterministic: entries follow the normalized source-list order, and identical inputs produce identical index bytes. Cached results are reused only for an input identity — listed registry versions and channels, or a Git commit and package directory. An unreadable source reuses a valid current-format last-success entry when available and produces exit status `1`; invalid arguments or an invalid list produce `2`.

The app reads remote data but never executes package code. npm tarballs are streamed under a size limit, checked against registry integrity, and unpacked in memory. Git objects are fetched into a private temporary bare repository with hooks, the file-system monitor, submodules, and unsupported transports disabled, and files are read as blobs; no working tree exists.

## Format ownership

- The [format Agent Note](../.agents/notes/implemented/feature/2026-10-02-plugin-market-index-format.md) defines format 1. [SOURCE-LICENSE.txt](../SOURCE-LICENSE.txt) owns copied-source provenance.
- `packages/util/plugin-market-index/src/types.ts` owns the validated TypeScript records. `LocalizedText` is defined there and nowhere else; the app imports it from the package.
- `parseMarketIndex(value, indexUrl)` validates the rules it implements. The generator validates every finished document with it before writing.
- `marketInstallTarget(name, version)` builds the pinned npm or Git install argument, including an explicit registry when the version records one.
- An unknown `source.type`, undeclared metadata reference, duplicate plugin name or version, missing or invalid `engines.dsh`, or invalid `dist-tags` target rejects the whole document.

The package publishes only its root export (`lib/index.js` plus declarations). It deliberately has no `./src/*` subpath: the source plane is a development concern, not a consumer contract.

## Module map

The app keeps each stage in one module; a change should extend the owning stage instead of adding a branch to the CLI.

| Module | Owns |
|---|---|
| `src/bin.ts` | Process entry; delegates to the CLI. |
| `src/cli.ts` | Option parsing, path resolution, cache directory, output pruning, exit status. |
| `src/sources.ts` | Source-list parsing and per-line format validation. |
| `src/fetchers.ts` | npm registry documents and tarballs, Git refs and objects, fetch limits, cache keys. |
| `src/packages.ts` | Bundle discovery, workspace/glob scanning, manifest fields, `engines.dsh` derivation. |
| `src/metadata.ts` | Locale text, icons, author, homepage, repository, keywords. |
| `src/generate.ts` | Version selection, tags, per-source caching, document assembly, validation. |
| `src/files.ts` | Atomic writes and the read-only file tree abstraction. |

The package exposes only the root entry: `parseMarketIndex`, `marketInstallTarget`, `MarketIndexError`, `MAX_INLINE_ICON_BYTES`, and the exported record types.

## Source plane and artifact plane

- Source tests and `pnpm start` resolve workspace imports through the root tsconfig `paths` map to `src`; they run through Vitest or `tsx`.
- `pnpm run build` emits `lib/` and declarations. `pnpm start:built` and any packed consumer use the root `exports`, which points at `lib/`.
- A source-plane module may rely on TypeScript syntax that plain Node cannot execute; that is not part of the packed contract. Never add a source subpath export or source files to a package's published `files` to make such an import work.

## Where new behavior goes

| Goal | Owner |
|---|---|
| Accept another source kind | `src/sources.ts` for the line and `src/fetchers.ts` for the read; extend `generate.ts` selection and the format only if the index cannot express it. |
| Change display metadata | The format Agent Note and validator types first; then `src/metadata.ts` and its tests. |
| Change version/tag selection | `src/generate.ts` and `src/packages.ts`; keep the format and cache keys consistent. |
| Change an output option | `src/cli.ts` for parsing and `src/generate.ts` for behavior; document the option and its side effects. |
| Change a format rule | The Agent Note, `plugin-market-index/src`, its tests, and every generator path that must satisfy it — in one change. |
| Change fetch limits or trust boundaries | `src/fetchers.ts`; keep the limits explicit in options and README. |

## Boundaries this repository does not have

There is no agent runtime, browser UI, plugin host, installer, or session store here. Documentation and code must not present those as available. The packed validator is usable on its own; the app is a private reference producer, not a market service.

When such an object is introduced, its package owns its contract and follows the [conditional domain rules](defensive-patterns/conditional-domains.md). Those rules do not prescribe a plugin host, global client runtime or Session format for an unrelated application.
