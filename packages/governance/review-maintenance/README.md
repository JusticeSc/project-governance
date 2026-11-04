# `@project-governance/review-maintenance`

English | [中文](README.zh.md)

## Summary

Run a bounded maintenance pass over one review Skill using merged review evidence and two private reviewer adapters. The package owns evidence collection, protocol validation, gate wiring and orchestration; operators own adapter commands, identities, credentials and private configuration. A successful run saves a reviewed candidate bundle without writing the operator working tree or index, committing, pushing or opening a pull request; configured fetch may update Git refs.

## Public operations

`runMaintenance({ config, request?, clock?, log? })` collects evidence, asks both adapters to judge human authorship and adoption, reclassifies agreed guidance against the current Skill, and drafts, gates and reviews a candidate in a private isolated checkout. `request` supplies a GitHub GET transport instead of the default `gh api`; `clock` supplies the run clock; `log` receives progress lines. Use `validateConfig(raw)` or `loadConfig(path)` before passing configuration.

The outcome is `no-candidate`, `candidate` or `failed`. A genuine no-candidate outcome records the daily log without notification. Adapter outages and acquisition failures are not evidence that no guidance exists and fail the run. PRs outside the target or with unreconstructable landing history are recorded in `skippedPulls` without discarding eligible feedback; inspect those reasons as well as `excluded` and `unresolved`. Gate failure, staged or cross-target changes, unavailable review or remaining blocking findings also fail the run.

A candidate is saved as `runs/<runId>/candidate.SKILL.md`, `candidate.diff`, `manifest.json` and `run.json` under the private state directory. The manifest records the target commit, source Skill identity, candidate and diff hashes, adopted feedback and review evidence. Apply a reviewed candidate separately through `promote`. A run never commits, pushes, opens a PR, merges or changes repository settings.

`promote({ config, bundle, openPr?, log? })` reads a saved bundle, requires a clean checkout and `HEAD === manifest.targetCommit`, and checks the original Skill blob identity or fallback SHA-256 before `git apply --check -p1` and `git apply -p1`. It then checks that only the target changed and that its content matches the reviewed candidate hash. The default only applies the diff. With `openPr: true` and configured promotion settings, it creates a branch and commit, pushes and opens a **draft** PR; it never merges. Promotion failure after an apply, commit or push can leave that completed side effect in place; inspect before retrying.

The root export also provides `collectReviewEvidence`, `assertIndependentCommands`, `runCommand`, `runReviewer` and `untrusted` for explicit integration. The [operator cookbook](../../../docs/cookbook/maintaining-review-skill.md) owns configuration, invocation and recovery; these helpers do not supply a scheduler or an OS sandbox.

## Adapter boundary

Private adapters exchange bounded JSON on stdin/stdout: `adoption` uses version 2 with each feedback item's before and landed PR patches and commit anchors; `classification`, `draft` and `review` use version 1. Existing version-1 adoption adapters must be updated. The response must match the request version, operation and requested IDs. Requests carry `access: "read-only"` and `tools: "none"`; those are protocol declarations, not enforced operating-system isolation. Review text and patches are untrusted data, wrapped with a per-run nonce.

Each version-2 `adoption` item has `id`, `body`, `pullNumber`, `commitId`, `baselineCommit`, `targetParent`, `landingCommit`, `feedbackPatch` and `finalPatch`. The response has `version: 2`, `operation: "adoption"` and a `results` entry for each requested ID with `authorship`, `adoption` and `reason`. Commit IDs and patches are evidence, not a guarantee that either adapter makes a correct judgment.

## Requirements and verification

Use the Node version declared in [package.json](package.json), Git and authenticated `gh` for the default GitHub transport. The target is a clean dedicated Git checkout; private state and configuration stay outside it. Gate commands and both adapter executables must be available with the intended identity and permissions. `openPr` additionally needs push and PR-creation permission, configured promotion settings and Git author identity.

`npm test --workspace @project-governance/review-maintenance` runs the package's tests. A real independent-adapter run, scheduler integration, notification delivery, draft-PR creation and human adoption are separate evidence; this README does not assert any of them has run.

## Known Limitations and Deferred Work

- Evidence includes merged PR review evidence from non-author human reviewers, not conversation comments. Bot or ambiguous authorship is not silently treated as eligible human feedback.
- On Windows, descendants remaining after the root process exits are not guaranteed to be cleaned up.
- Windows ACL privacy for configuration, state, adapter programs and run artifacts is the operator's responsibility; POSIX mode requests do not establish Windows isolation.
- Two adapters are checked for a declared provider/model distinction and byte-distinct effective programs. That does not prove independent models, accounts, infrastructure or reasoning.
- Read-only/no-tools markers, scrubbed subprocess environments and private working directories are not an OS sandbox. Gate and adapter commands remain operator-trusted executables.
- Gates run in an isolated checkout without the operator checkout's ignored dependencies or generated files. Configure trusted gates to prepare any required prerequisites there; missing prerequisites fail rather than establishing gate success.
- The target Skill path must not traverse symbolic links or junctions; the `runs`, `private` and `log` state subdirectories must stay inside the state directory. These checks do not lock paths against concurrent replacement.
- Bundle hashes detect accidental changes, not an adversary able to rewrite both the bundle and manifest. Promotion is not an OS-level lock against unrelated writers; keep the dedicated checkout quiescent.
- A saved candidate is bound to its reviewed commit and Skill identity. A newer target requires a new reviewed run, not overwriting current content with a stale complete file.
