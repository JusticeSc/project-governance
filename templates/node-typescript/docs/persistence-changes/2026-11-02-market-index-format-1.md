---
description: "Records a persistence type transition and its compatibility acknowledgement."
kind: persistence-change
---

# 2026-11-02-market-index-format-1

English | [中文](2026-11-02-market-index-format-1.zh.md)

## Summary

Initial structural capture of the current plugin-market format-1 MarketIndex declaration and every reachable declared type.

## Table of Contents

- [Declaration](#declaration)
- [Compatibility](#compatibility)
- [Verification](#verification)
- [Dev Note](#dev-note)

<a id="declaration"></a>
## Declaration

```yaml persistence-change
schemaVersion: 1
id: 2026-11-02-market-index-format-1
baseline: true
changes:
  - root: "MarketIndex"
    previous: null
    after: "957b79be6571f957b1b78b449f4ddeb2f249cdce5b810ee27c21073030a17c07"
    decision: same-version
```

<a id="compatibility"></a>
## Compatibility

This baseline records the current source, not a transition between reader versions. Its baseline same-version marker does not establish runtime compatibility, publication, human acceptance, or a finalized checkpoint. No historical release or Session generation is inferred.

<a id="verification"></a>
## Verification

Executed corepack pnpm exec vitest run scripts/persistence-changes.spec.ts scripts/persistence-schema-model.spec.ts: 15 tests passed. These tests exercise real declared type extraction, structural history, and checkpoint validation in isolated fixtures. The pre-generation catalog --check rejected the missing current inventory. Historical-reader interoperability and runtime format migration were not exercised.

<a id="dev-note"></a>
## Dev Note

None.
