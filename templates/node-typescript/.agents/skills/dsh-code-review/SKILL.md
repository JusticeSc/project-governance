---
name: dsh-code-review
description: Use when reviewing a pull request in this repository — orients the reviewer to the standing conventions, defensive patterns, documentation rules, and quality gates, and to the review-specific checks that code alone cannot show.
---

# Reviewing a change

**This skill is guidance, not a complete checklist.** Verify and fetch the change's live base and exact head, then run `pnpm --silent run change-scope --base <verified-base-ref> --head <verified-head-ref>` before reading the diff and enough surrounding code to understand the design. The report identifies paths and dirty layers but does not replace semantic review. Re-establish the base and rerun it after a retarget or merge. Prioritize correctness, security, and broken required behavior over style; a short review with one substantiated blocker is better than a list of nits.

**Read the requirements before judging the diff.** Map the changed paths to the artifacts below, open each owning page from [Sources of truth](#sources-of-truth), and only then read the diff against those requirements. Judging a diff against memory of the rules is how a violation passes review.

## Sources of truth

- [AGENTS.md](../../../AGENTS.md) and [packages/AGENTS.md](../../../packages/AGENTS.md): standing repository and package rules.
- [docs/defensive-patterns/](../../../docs/defensive-patterns/README.md): the architecture requirements a change must satisfy and the habits behind them. Read [general.md](../../../docs/defensive-patterns/general.md) for timing, value representation, shared ownership, migrations, disposal, callbacks, subprocesses, untrusted environments, link-shaped paths, and bounds.
- [docs/architecture.md](../../../docs/architecture.md): workspace boundaries, data flow, module ownership, and the source/artifact plane split.
- [The format Agent Note](../../notes/implemented/feature/2026-10-02-plugin-market-index-format.md): the index contract and its provenance. A format change updates the note, the validator, its tests, and the generator together.
- [docs/AGENTS.md](../../../docs/AGENTS.md): documentation placement and prose discipline.
- [dsh-prose-standard](../dsh-prose-standard/SKILL.md): required coverage and editorial judgment for comments, docs, and diagnostics.
- [dsh-ci-test-reliability](../dsh-ci-test-reliability/SKILL.md): isolation and regression-proof rules for resource-owning, asynchronous, or flaky tests and fixtures.
- [dsh-error-handling](../dsh-error-handling/SKILL.md): failure classification, handling ownership, containment, state guarantees, and actionable reports.
- [docs/testing.md](../../../docs/testing.md): required test tiers, real entry paths, and coverage.
- [Agent Notes](../../notes/README.md): design rationale. Treat disagreement with an Agent Note as a design discussion, not an automatic veto.
- For bilingual changes read [translation rules](../../../docs/i18n/translation-rules.md) and [terminology](../../../docs/i18n/terminology.md). Review remains lightweight; the manual-only extended translation workflow is not automatically selected or loaded.

## Blocking requirements

1. **New prose receives semantic review.** Use [dsh-prose-standard](../dsh-prose-standard/SKILL.md) to review every added or changed Markdown passage, JSDoc, comment, description, diagnostic, and visible string. Verify required coverage, accuracy, and placement against the owning code or behavior; automated checks do not establish those properties.
2. **Docs match the code.** Options, defaults, errors, exit statuses, public behavior, and file side effects update the package or app README and JSDoc in the same diff. Flag implementation narration, test walkthroughs, review history, and duplicated rationale for deletion or a link to their one home.
3. **One owner per fact.** The format is defined by its Agent Note and its types by `plugin-market-index/src/types.ts`; a diff must not redeclare `LocalizedText`, a market record, or a validation rule in another module.
4. **Source and artifact planes stay distinct.** Source tests and `pnpm start` resolve workspaces to `src` through the root `paths` map. A packed consumer uses only the root export from `lib/`; the validator has no `./src/*` subpath, and no source files belong in `files`. Reject a change that adds a source subpath or a shim to compensate.
5. **Required evidence exists.** Verify the author ran the [checks relevant to the change](../../../AGENTS.md#commands) and inspect the actual CI workflow's declared exhaustive scope. Pending, skipped, or failing CI is not passing evidence, and a workflow name or aggregate count does not establish coverage of a different surface.

## Manual checks

- **Intent and interface contracts:** trace both sides of every changed interface. Confirm the implementation matches the request and any Agent Note, including errors, cancellation, ownership, and disposal.
- **Enforcement reaches the executor:** trace every denial path through the operation that performs the effect. Schema, prompt, facade, wrapper, or listener order must not let direct or alternate callers bypass the enforced rule.
- **Borrowed and derived state:** identify the retention contract and authoritative successful commit point. Notifications, caches, prompts where present, UI, replay, and query results derive from that committed state, not a speculative update or a stale copy. Trace failed and unknown outcomes as well as success.
- **Published type documentation:** a documented core type or seam vocabulary change updates the subsystem owner and every published reproduction, including bilingual fences. Internal types need no exhaustive catalog, but a single source type owner alone does not prevent published-copy drift; use `pnpm run verify-type-equiv` when reproductions exist.
- **Conditional GUI and model surfaces:** read [UI/UX](../dsh-client-ui-ux/SKILL.md) for actual GUI wording and behavior, typed locale ownership and each affected locale's real evidence. Review exact model-facing schemas/prompts/results only when the application has those objects; ordinary CLI behavior does not need a model key.
- **Error handling:** apply [dsh-error-handling](../dsh-error-handling/SKILL.md) to changed failure paths, including their state guarantees and final reports. Reject catch-and-continue unless the state owner establishes that subsequent work's preconditions hold.
- **Lifecycle and concurrency:** for async setup, callbacks, subprocesses, or teardown, apply [defensive-patterns/general.md](../../../docs/defensive-patterns/general.md). Check races before publication, cancellation during awaits, independent error reporting, callback containment, ownership before reentry, complete detach cleanup, and quiescent disposal.
- **Generator behavior:** confirm the output is deterministic, caches are keyed by immutable inputs, writes are atomic, stale generated icons are removed only by their recognized pattern, and a failed source keeps its last successful entry with the documented exit status.
- **Trust boundaries:** confirm package code is never executed, tarballs are bounded and integrity-checked, Git uses a private bare repository with disabled hooks/submodules and scrubbed `GIT_*` variables, and no ambient credential or predictable temporary path reaches an untrusted process.
- **Consumer fit and necessity:** map each abstraction, state machine, option, defensive copy, and compatibility path to its current contract and caller. Challenge unrelated features and speculative generality; a new public method whose only caller is one internal path needs a private closure instead.
- **Configuration and public choices:** ask what current-consumer evidence or prior art supports each default, public operation, format change, or imported external concept. Require an explicit choice or deferral when that evidence is absent.
- **Bounds cover the complete result:** locate the owner of the complete emitted or retained value, including wrappers and metadata. Probe tiny and exact limits, oversized single chunks, and multibyte text for byte limits.
- **Real entry path:** tests exercise the built app or the real validator where relevant. A hand-built fake parser does not prove the shipped rule set; assert missing configuration exits non-zero and the built bin runs under plain Node.
- **Test strength:** assertions fail on the intended regression and verify external state — output files, cache contents, exit status — rather than restating the implementation or trusting a report. Coverage is necessary, never sufficient.
- **Test reliability:** for a resource-owning, asynchronous, platform-sensitive, or flaky test, apply [dsh-ci-test-reliability](../dsh-ci-test-reliability/SKILL.md) to the real worker topology, resource allocation, global-state restoration, synchronization, timeout budget, and quiescent teardown.
- **Negative controls:** verify a deliberately invalid case fails through the real runner for each changed acceptance rule.
- **Implemented Agent Notes match shipped reality:** when a change implements a proposed Agent Note, move and rewrite it as present-tense shipped state in the same diff, then verify paths, names, and mechanisms against the implementation.
- **Bilingual changes:** compare meaning and terminology on both sides; a green pairing hash does not prove translation quality.

## Reporting findings

State the defect, location, impact, and evidence. Place a localized defect inline on the tightest relevant diff range; use a PR-level comment for cross-cutting architecture, scope, or review-wide synthesis. Separate blockers from suggestions and omit issues already enforced by a green gate. Use the existing review thread for replies. When receiving review, verify each claim and fix or rebut it on technical grounds without performative agreement.
