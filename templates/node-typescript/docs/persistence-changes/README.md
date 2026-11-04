# Persistence type changes

English | [中文](README.zh.md)

The plugin-market index is this template's current durable JSON contract. Its single type owner is `packages/util/plugin-market-index/src/types.ts`: `MarketIndex.format` is the writer discriminator, currently 1. The actual reader is `parseMarketIndex` in the same package. The [current inventory](current/schema.json) covers `MarketIndex` and every reachable declared type. The schema engine calls this top-level version-owning record a `header`; it is not a Session header. There is no Session, historical release inventory, database schema, or accepted human-review checkpoint in this initial binding. A future database owns its own schema and monotonic version policy; it does not inherit Session generations.

## Ownership and evidence

`scripts/persistence-schema.ts` binds the source-derived compiler graph engine to the real type owner. `gen-persistence-catalog.ts` owns the current inventory and bilingual catalog. Ordinary comments, aliases, source positions, readonly markers and harmless declaration ordering do not change structural digests. A catalog may need refreshing without any new acknowledgement.

Each dated change owns four files: English and Chinese Markdown, its complete self-contained `.schema.json` after snapshot, and its `.i18n.yaml` pairing record. Both Markdown files contain the identical `yaml persistence-change` declaration. Each affected root records its predecessor, after digest (or null tombstone), and `same-version` or `version-bump` decision. Independent roots can evolve independently; predecessors, not filename dates, determine history order. The initial baseline captures only current declared structure. It is not a release, an acceptance decision, or evidence that runtime checks were executed.

## Review and record

1. Preserve base and head inventories and their actual commit identities. Run `pnpm exec tsx scripts/persistence-review.ts --before BASE --after HEAD --json`. Review every affected root, graph path and classifier observation. The classifier cannot decide semantic safety.
2. Inspect actual reader behavior in both directions: old input in the new reader and new input in the old reader. The validator drops unknown members and rejects unsupported format numbers; dropping a member is safe only if its required meaning is preserved. A new source variant is not an ignorable attribution-only Session source. Do not activate Session source annotation promises on this format.
3. Execute the relevant reader, writer and migration behavior checks. Write a JSON file containing `en` and `zh`, each with nonempty `summary`, `compatibility` and `verification` strings. State the actual transition, both reading directions and checks actually executed; disclose unverified behavior. The generator cannot prove these statements or invent them.
4. Record with `pnpm exec tsx scripts/persistence-changes.ts --record ID --decision same-version --prose FILE --json`. Use a `YYYY-MM-DD-slug` ID. Version bumps require this record's own increasing `MarketIndex.format` transition; a previous record's bump cannot be reused. Unsafe interpretation without a safe discriminator requires a new format and real reader support, not merely a type edit.
5. For an unaccepted tail, use `--update ID --decision same-version --prose FILE`. Baselines, records with successors and accepted records cannot be updated. Reassess the complete transition; never reuse an explanation for a different change. Competing tails must be reconciled into one ordered root history.
6. Run `pnpm exec tsx scripts/gen-persistence-catalog.ts --check` and `pnpm exec tsx scripts/persistence-changes.ts --check --json`, plus the owning behavior tests and documentation gates. A check only proves current-tree consistency; it cannot replace base/head review or demonstrate human review.

Initial binding uses `--baseline ID --prose FILE --json` once, before a history exists. It extracts the real source; it must not fabricate historical formats. No mutation command accepts omitted prose or silently supplies validation facts. Generation is explicit: `pnpm exec tsx scripts/gen-persistence-catalog.ts`.

## Accepted checkpoints

After explicit acceptance, `pnpm exec tsx scripts/persistence-finalize.ts --version N` captures a new `finalized/vN.json` from fully acknowledged current source and refuses overwrite. In the same authorized change, add an identical `yaml market-format-finalization` block with `latestFinalizedVersion: N` to both README languages. Run ordinary verification after that status update. Do not create this block to claim review that has not happened.

A checkpoint locks machine declarations and their after schemas, not prose, aliases or source locations. Keep every earlier checkpoint. Later compatible same-format changes remain possible, but accepted records and the baseline cannot be rewritten. Finalization is separate from publication; no release is claimed by this facility. Current-tree hash consistency cannot prove that an attacker did not edit an authoritative checkpoint and its locked data together; review the trusted base/head history as well.
