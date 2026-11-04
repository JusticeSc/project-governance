---
description: "Package map for shared utilities: the plugin market index format-1 validator and pinned install-argument builder."
kind: "package-group"
---

# util/ — shared utilities

English | [中文](README.zh.md)

## Summary

The `util/` group gives capability packages shared mechanical primitives instead of duplicate implementations. This checkout contains one library: the format-1 validator that readers and generators use, and the install-argument builder that turns a listed version into an exact package spec. Every root entry here is a library: it registers no product service or event, and the consuming capability retains the business semantics.

## Table of Contents

- [Packages](#packages)
- [Related documentation](#related-documentation)
- [Dev Note](#dev-note)

-----

<a id="packages"></a>
## Packages

Each package provides one primitive; open a package page for how to use it.

| Package | Role |
|---|---|
| [`plugin-market-index/`](plugin-market-index/README.md) | Validates plugin market index format 1 and builds pinned install arguments |

-----

<a id="related-documentation"></a>
## Related documentation

- [Root package map](../README.md) — where `util/` sits among all package groups.
- [Format contract](../../.agents/notes/implemented/feature/2026-10-02-plugin-market-index-format.md) — the format itself and its source provenance.
- [Adding a package cookbook](../../docs/cookbook/adding-a-package.md) — how a new shared primitive lands in this group.
- [Package contract classifications](../../docs/cookbook/adding-a-package.md#4-write-the-package-readme) — kind, limitations and model-effect policy; this group map owns no model context or runtime behavior.

<a id="dev-note"></a>
## Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
