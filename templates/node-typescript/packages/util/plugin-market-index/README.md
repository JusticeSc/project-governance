---
description: "Plugin market index format 1 validation and pinned install arguments for index readers and generators."
kind: "package-library"
---

# dsh-plugin-market-index

English | [中文](README.zh.md)

## Summary

Validator for format 1 of the plugin market index, the single JSON file that lists installable bundles with their display metadata. [The format Agent Note](../../../.agents/notes/implemented/feature/2026-10-02-plugin-market-index-format.md) defines the document; this package is its executable rule set. [SOURCE-LICENSE.txt](../../../SOURCE-LICENSE.txt) owns source provenance. Index generators validate their output with it, and any client that shows or installs from an index can read the document through it.

## Table of Contents

- [Use this package](#use-this-package)
- [API](#api)
- [Source and artifact plane](#source-and-artifact-plane)
- [Verify](#verify)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

It is a library, not a service or a host plugin: no state and no I/O.

Parse a fetched document as JSON, then pass the value and the URL it was read from to `parseMarketIndex`. The first violated rule throws `MarketIndexError` with the JSON path of the offending value. A successful result preserves valid `dist-tags` and required `engines.dsh` declarations, drops members the format does not define, fills absent `metadata` groups, `keywords`, `labels`, and `sortKeys` with empty values, orders each plugin's `versions` by descending SemVer precedence, and replaces each relative `icon` reference with its absolute URL.

Plugin names must pass npm's new-package-name validation. Exact versions must be parseable by node-semver; npm versions must also equal its canonical result, while Git version strings and build metadata are preserved in full.

`marketInstallTarget(name, version)` builds the exact pnpm spec for one version: `name@version` for npm, or a commit-pinned `git+https` URL with an optional `path:` parameter for Git, plus the registry to ask first when the version names one.

<a id="api"></a>
## API

```ts
import { MarketIndexError, marketInstallTarget, parseMarketIndex } from '@deepseek-ai/dsh-plugin-market-index'
```

| Export | Role |
|---|---|
| `parseMarketIndex(value, indexUrl)` | Validated `MarketIndex`; throws `MarketIndexError` for the first violated rule. |
| `marketInstallTarget(name, version)` | `{ spec, registry? }` that installs that exact version. |
| `MarketIndexError` | Validation failure carrying `path` and `reason`. |
| `MAX_INLINE_ICON_BYTES` | Largest decoded payload of an inline `data:` icon, 32 KiB. |
| `MarketIndex`, `MarketPlugin`, `MarketVersion`, `MarketEngines`, `MarketSource`, `MarketRepository`, `MarketIndexMetadata`, `MarketPluginMetadata`, `MarketDeclaration`, `MarketSortKeyDeclaration`, `MarketInstallTarget`, `LocalizedText` | Validated record types; `LocalizedText` is defined only here. |

<a id="source-and-artifact-plane"></a>
## Source and artifact plane

Workspace consumers and tests resolve this package's name to `src/index.ts` through the root `paths` map. The packed package exposes only the root export (`lib/index.js` and declarations) plus `./package.json`; it deliberately has no `./src/*` subpath, so a packed consumer cannot import TypeScript source.

## Verify

From the workspace root, `pnpm exec vitest run packages/util/plugin-market-index/tests` exercises the actual parser and install-argument builder. `pnpm run test:coverage` proves the package's runtime coverage thresholds, not semantic completeness. After `pnpm run build`, `pnpm run verify-node-next-types` checks the built declarations in an external NodeNext consumer; a real tarball install is separate evidence for publication. This pure library owns no model context, token or KV-cache behavior; its reasoned no-Model-Experience classification belongs to `scripts/package-readme-policy.manifest.json`.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **Generator obligations are unchecked** — the validator cannot verify that `name`, `version`, `publishTimestamp`, `engines.dsh`, or display fields match the package they describe, or that the package declares a bundle.
- **No size bound** — the caller bounds the document before parsing it.
- **No install or download** — the package validates and builds an argument; it never fetches, installs, or executes a package.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
