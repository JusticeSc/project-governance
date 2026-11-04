---
kind: upgrade-guide
description: "Correct invalid format-1 plugin names and versions before upgrading the validator."
---

# Format-1 name and version validation

English | [中文](guide.zh.md)

## Change

`parseMarketIndex` rejects plugin names that npm's new-package validator disallows, versions that node-semver cannot parse, and npm versions that differ from node-semver's canonical result. Previously some of these values were accepted or caused an uncaught `TypeError` during sorting. Parseable Git version strings, including build metadata, are preserved in full. Index producers and readers with affected documents must correct them; the [format rules](../../../../.agents/notes/implemented/feature/2026-10-02-plugin-market-index-format.md) are unchanged.

## Migration

1. In each index JSON, replace invalid `plugins[].name` and `plugins[].versions[].version` values with the actual valid package name and version of the installed source. Update any affected `dist-tags` targets to match exactly.
2. Pass the corrected document and its URL to `parseMarketIndex`; resolve any `MarketIndexError` at its reported JSON path before publishing or consuming the index.
