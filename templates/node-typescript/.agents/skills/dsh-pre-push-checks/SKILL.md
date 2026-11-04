---
name: dsh-pre-push-checks
description: Use before pushing, force-pushing, marking ready for review, or claiming checks pass on a branch, and immediately after a history rewrite publishes branches, to select the smallest tests and checks that cover the outgoing diff without reflexively running the full repository suite.
---

# Pre-push checks

Use this skill to run relevant local evidence once before a push. Git hooks are intentionally narrow: `pre-commit` verifies staged translation records and archived notes, runs staged lint without type-aware rules, and checks whitespace; `pre-push` runs only `pnpm run typecheck`. Read the actual CI workflows for exhaustive scope and supported environments; two Ubuntu jobs are not a platform matrix. OS-owned semantics still need relevant tests even with single-platform CI, and an unrun platform remains unverified. Nothing here proves remote enforcement.

## Inspect the outgoing change

1. Confirm the checkout and branch.

```sh
git status --short --branch
git rev-parse --show-toplevel
```

2. Verify the live base or stack parent, fetch that ref, and inspect the complete scope against it.

```sh
pnpm --silent run change-scope --base <verified-base-ref>
```

The command never guesses or fetches a base. Supply the ref verified from current remote or stack state; use `--head <ref>` when inspecting a commit other than `HEAD`. Its JSON records committed paths relative to the resolved merge base, while staged, unstaged, and untracked paths describe the current worktree. After merging a changed base, rerun the report, reassess what the combined scope can affect, and rerun only checks invalidated by the merge.

## Select relevant evidence

There is no universal local baseline beyond the hooks. Every behavior change needs the narrowest available test or purpose-built check that would fail for its regression; add broader checks only for surfaces the diff actually reaches.

When the outgoing change adds or changes a resource-owning or asynchronous test, fixture, helper, or CI execution path, use [dsh-ci-test-reliability](../dsh-ci-test-reliability/SKILL.md) first to decide whether restoration, negative-control, quiescent-teardown, or concurrent-process evidence applies. This skill still selects the commands and avoids repeating evidence that already passed.

- **Validator behavior:** run the owning Vitest file or focused test name. Add adjacent package tests when a shared rule changes; leave repository-wide coverage to CI unless the change is genuinely cross-cutting or the user requests it.
- **Generation or output behavior:** run the owning spec; Git cases use the test-only `file` transport. Changes to fetching, caching, or output writing also need assertions against affected files or cache, not only returned objects.
- **Documentation, Agent Notes, or doc-linked comments:** run `pnpm run doc-sync`; run `pnpm run lint` when a code block or comment changed.
- **CLI-visible output or exit status:** run the focused CLI spec, and run the built binary after `pnpm run build` when the packaged entry path changed.
- **Package manifests, public exports, build configuration, or built entry paths:** run `pnpm run build`, `pnpm run hygiene`, and the owning built-artifact check. A packed consumer uses only the root export; verify that no source subpath or `src/**` publication leaked in.
- **Repository test and script types:** `pnpm run build:artifacts` checks package projects only. Before claiming completion of TypeScript changes, run `pnpm run build:check` after the latest `build:artifacts`, or run `pnpm run build`; `build:check` reads existing output and never rebuilds it.
- **Coverage:** `pnpm run test:coverage` enforces per-file 100% statements, branches, functions, and lines over `.ts` and `.tsx` package runtime sources under `packages/*/*/src/`, with no product-file exemptions. It does not impose an app V8 threshold; select the app's required evidence under the [testing policy](../../../docs/testing.md).

Do not manually repeat a passing check merely because commit or push follows. In particular, do not run typecheck immediately before pushing solely to duplicate the `pre-push` hook.

Pass Vitest file and name filters directly after the script name with `pnpm run`; do not insert a standalone `--`, which reaches Vitest and can disable `-t` filtering. Check the reported selected test count before treating a filtered run as focused evidence.

### Focus coverage on the affected source

Test selection and coverage selection are separate. A Vitest file filter chooses which tests run, while the repository configuration otherwise measures every source file. When focused coverage is relevant, name both the owning tests and the source files they must prove:

```sh
pnpm exec vitest run 'packages/<group>/<package>/tests/<behavior>.spec.ts' \
  --coverage \
  --coverage.include='packages/<group>/<package>/src/**/*.ts'
```

Use an exact source file when the behavior is confined to one module. Repeat `--coverage.include` for multiple affected files or packages, and pass every owning test file needed to exercise that scope. The per-file 100% thresholds still apply inside the selected scope. Do not use `--passWithNoTests`, lower thresholds, or narrow the include merely to hide an uncovered affected file.

`vitest related` may discover a candidate test set but cannot establish coverage for dynamic loading, configuration, subprocesses, workers, built artifacts, or installed consumers. Select those actual owning tests explicitly. Real external-provider/agent evidence needs the actual relevant flow and available credentials, never printed secrets; a local or model-free case does not acquire a model-key prerequisite.

## Full local rehearsal

Run `pnpm run check:all` only when the user explicitly requests it, while diagnosing a CI failure, or when the change spans the repository so broadly that no narrower set is credible. It aggregates the same groups as `check:ci`; the individual `check:ci:static`, `check:ci:coverage`, `check:ci:unit`, and `check:ci:artifacts` scripts select one group.

## Protect history-rewriting pushes

Rebase is allowed for standalone and stacked branches, including after review. Before a standalone history rewrite, fetch the current remote branch and record its exact OID; publish with `--force-with-lease=<branch>:<observed-oid>` so a concurrent update aborts the push. `gh stack push` and `gh stack sync` supply lease protection for their managed branches. Raw `--force` is never allowed.

After any rewritten push, fetch the live heads again and re-audit unresolved review threads, approvals, mergeability, and checks. Commit hashes and inline-comment anchors from before the rewrite are not current evidence.

### Post-sync validation

`gh stack sync` fetches, cascade-rebases, and pushes as one operation, so local validation cannot run between rewrite and publication. Before running it, require a clean worktree and record the official stack order and exact remote heads. After it returns:

1. Re-query every branch head and the official GitHub stack order.
2. Inspect the changed scope of every rewritten layer against its live PR base.
3. Run the relevant evidence selected by this skill for each affected layer.
4. Keep every PR unmerged and report validation as pending until all selected checks pass.

If post-sync evidence fails, leave the lease-protected published heads in place, repair the failure, validate the repair, and publish the correction. A successful sync alone does not make the stack ready.

## Handle failures

If a relevant check fails before an ordinary push, stop and fix or explain the blocker. Do not push and hope CI differs. For the post-sync exception, block merging and follow the [post-sync repair procedure](#post-sync-validation).

If a failure looks environment-specific, prove it:

- Record the exact command, failing test, and platform-specific mismatch.
- Confirm the relevant non-platform evidence.
- Prefer fixing cross-platform nondeterminism when the check is required.
- Bypass a local hook only when the user explicitly asks or agrees, and report exactly what failed and why CI is expected to differ.

## Push procedure

For ordinary and standalone rebase pushes:

1. Run the selected relevant checks once.
2. Commit normally; the installed pre-commit checks do not fix or restage files.
3. Push normally, or use the exact lease for an authorized rewritten branch, so the incremental typecheck hook runs.
4. Verify the remote ref matches local `HEAD`.

```sh
git rev-parse HEAD origin/$(git branch --show-current)
```

For GitHub pull requests, inspect remote CI after the push:

```sh
gh pr checks
```

Report pending checks as pending. Inspect failures before attributing them to the branch or the environment. A `CONFLICTING` pull request may produce no workflow runs; resolving the conflict is the fix, not an empty commit.

For `gh stack sync`, use [post-sync validation](#post-sync-validation) instead of the ordinary validate-before-publish order.
