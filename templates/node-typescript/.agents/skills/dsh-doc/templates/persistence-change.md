# Template: persistence-change

Use for actual records at `docs/persistence-changes/YYYY-MM-DD-slug.md` and the Chinese sibling, with `.schema.json` and `.i18n.yaml` companions. This is a mechanically detected persisted-type acknowledgement, not a release observation, historical-format checkpoint, or migration success certificate. The current format is the actual `MarketIndex.format` contract, not Session data.

## Frontmatter and structure

Use `kind: persistence-change` and a concrete description of the detected transition. Sections in order: `Summary`, `Table of Contents`, `Declaration`, `Compatibility`, `Verification`, `Dev Note`. Both languages preserve identical machine blocks and semantic structure.

The generator owns declaration fields, digests, complete after schemas, and consistency records. The author supplies reviewed bilingual explanations; it must not generate a compatibility claim or a successful test result. The real `persistence-changes` command and [record owner](../../../../docs/persistence-changes/README.md) own operational details. An explicit creation invocation is `pnpm exec tsx scripts/persistence-changes.ts --record <YYYY-MM-DD-slug> --decision same-version --prose <file>`; inspect that command's current input schema before writing the prose file.

Run the catalog tool through its declared TypeScript runtime: `pnpm exec tsx scripts/gen-persistence-catalog.ts` (equivalently `tsx scripts/gen-persistence-catalog.ts` when resolving the workspace binary). Do not invoke this entry with bare `node`: the persistence engine uses TypeScript constructor parameter properties, unsupported by Node's strip-only execution. Read the script and package manifest for its current arguments; this runtime requirement does not establish catalog freshness or compatibility.

## Declaration

Exactly one `yaml persistence-change` block:

```yaml
schemaVersion: 1
id: YYYY-MM-DD-slug
baseline: false
changes:
  - root: MarketIndex
    previous: null
    after: <generated-sha256>
    decision: same-version
```

The filename and ID agree. `previous` is the actual predecessor record ID or `null` for introduction; `after` is the generated schema digest or `null` for deletion. A baseline covers the real inventory, not an invented historic release. Routine records preserve predecessors. `same-version` and `version-bump` are compatibility decisions tied to the actual format and version owner; an acknowledgement cannot waive required version changes or runtime migration safety. Do not hand-maintain schema nodes or digests.

## Authored sections

- **Summary:** explain only detected persisted-type changes and the declared decision.
- **Compatibility:** explain both reader directions and all affected roots: preserved historical meaning, ignored optional data, or rejection before execution/recovery. Describe mixed representations where present. A version bump links real migration behavior and its verification owner; do not infer safety from structural similarity.
- **Verification:** record exact commands actually run, their results and evidence supporting the compatibility explanation. Missing operational proof is a named gap, never generated green.
- **Dev Note:** non-authoritative working context only; durable decisions belong above. Use `None.` when empty.

Review the complete bilingual record and generated companions together. A direct prose edit still requires semantic review and scoped pair confirmation. Accepted history receives a successor, not a rewrite; only an explicitly supported unaccepted terminal-record update may change an existing record under the owner’s rules.
