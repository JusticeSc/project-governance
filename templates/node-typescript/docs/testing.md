# Testing policy

English | [中文](testing.zh.md)

How this repository tests, tier by tier, and the rules that keep a green suite meaningful. Commands live in root [AGENTS.md](../AGENTS.md); [development.md](development.md) owns check selection and the TypeScript layout.

## Tiers

- **Unit** (`pnpm run test`): Vitest over package and app specs under their `tests/**` directories plus repository script specs under `scripts/**/*.spec.ts`. Tests stay with the code area they exercise. Prefer edge cases, error paths, ordering, concurrency races, and permanent regressions for contract defects.
- **Coverage gate** (`pnpm run test:coverage`): the gating run for package runtime code. V8 coverage applies to `.ts` and `.tsx` runtime sources under `packages/*/*/src/` with per-file 100% statements, branches, functions, and lines and no exemptions. Type-only declaration files carry no runtime semantics and are not behavior obligations. Apps are proven by behavior specs, real CLI acceptance/refusal, and the built-entry smoke, not by an app per-file V8 threshold. An uncovered runtime line is often dead code the gate flags for deletion, not a missing test to bolt on. Line coverage is necessary, never sufficient: it proves lines ran, not that the behavior is correct.
- **Partitioned coverage** (`pnpm run test:coverage:partitioned`): use for slow runs; the same gate runs in parallel partitions, with unchanged thresholds.
- **Built-artifact tests** (`pnpm run test:built`): business-owned `tests/**/*.built.spec.ts` consume the built app or library exports; the script-owned suite rejects a missing published artifact and accepts exact restoration. These suites run only in the artifact lane, never in source tests or coverage. They exercise artifact entries, not the source launcher or a separate tarball installation; verify packed consumers separately.
- **Approval policy** (`pnpm run test:approval-policy`): Node test specs for `.github/review-ownership` approval and author-weight rules. This is inherited configuration; a green run proves the scripts, not a remote enforcement.
- **Approval ownership** (`pnpm run test:approval-ownership`): Python 3.10 unittest specs over real Git histories for production-line attribution, rename detection, shallow-history rejection and the publisher's fetch path. The fixtures need a POSIX filesystem and executable scripts, so two cases carry an explicit Windows skip naming the capability they need; the workflow declares a Linux runner only.

Fixtures that copy a project tree select it through `scripts/workspace-fixture.ts`: the current tree's tracked and non-ignored untracked authors; a selected author that disappears or is unreadable fails by path; linked entries are skipped without being followed; a tracked file matching an ignore rule is refused. The artifact fixture adds each declared workspace member's `lib/` under its own selection, and lint probes write only into their own checkout. Keep private data ignored and outside `lib/`; unignored files and files inside build-output directories are still copied. Before Git initialization, the exported `gitignore` supplies the ignore rules.

## How specs execute

Vitest runs several spec files at once in forked workers, and the coverage gate splits into partitions beside other gate processes. Only the process is isolated: ports, predictable paths, temporary files, Git repositories and inherited children are not, so own every resource you acquire through teardown. A spec that passes only when run alone is a defect in the spec, not an unstable runner. [dsh-ci-test-reliability](../.agents/skills/dsh-ci-test-reliability/SKILL.md) owns the allocation, restoration, synchronization, timeout-budget, platform and teardown rules, and its [flake diagnosis workflow](../.agents/skills/dsh-ci-test-reliability/references/ci-flake-diagnosis.md) classifies an existing failure.

## Prefer the real implementation over a mock

Mock only the expensive or non-deterministic boundary — network, clock or a remote Git host — and keep everything downstream real. A local repository reached through the test-only `file` transport has real refs and objects; a hand-rolled fetcher proves the bridge moves bytes, not that the shipped reader behaves as asserted.

Exercise a real parser or validator through its actual consumer where their contracts interact; mocks must not hide a mismatch between them.

## Verify the world, not the self-report

An end-to-end assertion re-reads relevant output files, persistent state, or caches from outside the code under test. A test that only inspects a returned object or a log line lets a producer claim success while writing nothing. Assert protection and recovery behavior against the actual contract.

Tests own their resources: a temporary directory is removed in teardown, even on failure or retry. A shared fixture lives in a plain `tests/support.ts`, never another `*.spec.ts`, whose import would re-register its `describe` and duplicate side effects.

## Test the real entry path

- Exercise real entry-point parsing and missing or invalid configuration; assert the specified failure and diagnostic.
- When an application publishes a built entry, run that actual artifact under plain Node after a build; this exposes resolution and declaration failures a source launcher can mask.
- A guard only guards if the regression fails it. Introduce the regression, watch the test fail, revert. A test that passes both before and after does not guard the behavior.

## Test resolution: source plane only

Source-plane Vitest configs point vite-tsconfig-paths at `tsconfig.base.json`; bare workspace imports resolve to `src`, never through package `exports` to built `lib/`. Stale artifacts there would load a second copy of module singletons. The built-artifact config deliberately has no source-alias plugin; consume actual built entries explicitly.

## Subprocess launch modes

- Tests and the source launcher run TypeScript through `tsx` so the root `paths` map applies.
- A built app runs its declared artifact under plain Node with no TypeScript loader.
- Git fixtures run the real `git` binary against a temporary repository; SSH is not required and the test-only `file` transport is explicit. A source-path test may select `src`; state that contract in the test.

## Documentation compilation

`pnpm run doc-typecheck` compiles `ts` fences against the workspace API; it neither executes examples nor replaces behavior tests. The corpus is the root README, documentation, package Markdown and non-archived Agent Notes. Byte-identical fenced blocks in a paired `.zh.md` reuse the sibling's check; changed translated blocks compile independently. `ts ignore-check` marks an unchecked sketch, and opting out of more than 50% fails once at least four compile-eligible blocks exist. Archived Agent Notes stay excluded rather than repaired. [Development](development.md#verify-a-change) owns preparation and scheduling; `test:docs` stays build-free and excludes this compiler.

## Repository reference checks

`verify-doc-refs` checks repository-root documentation paths cited in `packages/**/*.ts`, and `verify-package-paths` checks package paths there. Neither covers every app or script source, so a green reference gate does not mean all source strings were checked; app prose stays a semantic-review obligation backed by real entry-path checks. Markdown links are checked across the corpus under the root, `docs/`, `apps/`, `packages/`, `scripts/`, `.agents/` and `.github/`.

## Workspace export keys

`pnpm run verify-package-export-keys` is a supplemental template check over declared `packages/*/*` and `apps/*` workspace members. Libraries require an export map; apps may omit it. The check rejects keys outside the standard set or recorded additions, and rejects recorded additions whose key or member no longer exists. The [policy manifest](../scripts/package-export-keys.manifest.json) owns the checked key set and addition records; the [package rules](../packages/AGENTS.md) own their repository-wide meaning and the procedure for a new key.

An entry in the manifest does not prove the domain owner confirmed the addition; review establishes necessity, shared meaning and confirmation. Provenance is recorded in [SOURCE-LICENSE.txt](../SOURCE-LICENSE.txt).

## Persistence verification

`pnpm run verify-persistence` checks current declared roots against acknowledged history and frozen checkpoints. It runs within hygiene, the complete local graph, and CI; the checker decides applicability rather than an aggregate skipping empty configuration. No configuration and no history is an explicit no-declared-roots result. Existing history without configuration fails; `roots: []` retains retirement history and its checks. See [declaring actual persistence](cookbook/starting-a-project.md#3-declare-actual-persistence) for setup. Passing structural checks does not prove runtime reader or migration compatibility; test those actual consumers separately.

## Coverage and exclusions

The coverage gate takes no product-file exemptions: an environment-bound line is a reason to make the code testable or delete it, not to exempt the file, and no app file joins the V8 threshold merely to raise a number. Partitions change scheduling, not thresholds. `pnpm run check:all` is the complete local gate set; CI runs the registered groups through `check:ci`.

## Conditional evidence

For harness doubles, browser UI, generated clients, migration oracles, authorization environments, real API recordings, platform or performance claims, read [conditional testing evidence](testing-conditional.md). Select only triggered evidence, state each tool's limits, and retain failures and missing permissions rather than claiming a broader pass.
