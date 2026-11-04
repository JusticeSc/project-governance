# Maintaining a review Skill

English | [中文](maintaining-review-skill.zh.md)

This operator tutorial runs one maintenance pass, inspects its evidence and optionally promotes a reviewed candidate. The [package contract](../../packages/governance/review-maintenance/README.md) owns outcomes and limitations. The operator supplies private adapters and credentials; the repository does not distribute them or claim a completed real-adapter run.

## 1. Prepare an isolated checkout

Use a dedicated clean Git checkout of the maintained repository. Keep the private JSON configuration and `stateDirectory` outside every maintained checkout; restrict them to the operator, including explicit Windows ACLs. Install the declared Node runtime, Git, authenticated `gh`, required gate tools and both private adapters. Do not put tokens in the configuration, command arguments, repository or saved evidence. Supply credentials through the operator's protected credential channel; verify each adapter's required access under its own policy.

Resolve the target revision before running. With `fetch` enabled the run fetches the configured remote; select `targetRef` to match the intended reviewed base. A schedule is operator-owned: invoke this one-shot command from an approved scheduler rather than assuming the package installs a daemon. Do not run two jobs against the same checkout; preserve any unexpected user change instead of cleaning it away.

## 2. Write private configuration

Configuration is JSON. Load it with `loadConfig(path)` or use the CLI's explicit `--config` argument. Command objects use an absolute `file` and an optional string-array `args`; they do not use shell command strings. Set meaningful gates even though an omitted `gates` field parses as an empty array: an empty list is no verification evidence.

| Field | Contract |
|---|---|
| `repository` | GitHub `owner/name` for review evidence and any PR creation. |
| `checkout` | Absolute dedicated checkout path; starts clean. |
| `targetSkill` | Repository-relative path to the single maintained Skill. |
| `stateDirectory` | Absolute operator-private directory outside the checkout; stores logs, bundles and private working directories. |
| `targetRef` | Revision to maintain; default `refs/remotes/origin/main`. Set explicitly for another default branch. |
| `fetch` | `null`, `false` or omitted disables fetch; `{ "remote": "origin" }` enables it. Align the remote with `targetRef`. |
| `windowDays` | Integer 1–90, default 2; evidence window, not a scheduler interval. |
| `maxRevisions` | Integer 0–5, default 2; revisions after the initial draft, not unlimited retries. |
| `adapters` | `primary` and `secondary` command objects, each with `identity: { "provider": "...", "model": "..." }`. Declare actual identities. For Node/Python adapters, optional absolute `program` names the first absolute script argument in `args`; it cannot hide an eval/preload command. |
| `gates` | Array of unique `{ "name": "...", "file": "...", "args": [] }` commands, executed in a private isolated checkout; prepare its ignored dependencies there and do not stage or change unrelated paths. |
| `notification` | Optional command object, otherwise `null`; genuine no-candidate runs do not notify. Keep notification credentials outside the public tree. |
| `promote` | Optional `{ "remote": "origin", "baseBranch": "main" }`; required for opening a draft PR, not for local apply. |

The adapters speak bounded JSON: `adoption` uses version 2 and supplies one feedback item with its before/landed patches and commit anchors; `classification`, `draft` and `review` use version 1. Upgrade version-1 adoption adapters before use. Treat bodies and patches as untrusted data and return schema-conforming JSON without extra stdout prose. Requests declare `access: "read-only"` and `tools: "none"`; enforce those restrictions in the private adapter environment because the declarations are not a sandbox. Distinct declared provider/model identities and byte-distinct programs are only mechanical minimums, not proof of model independence.

## 3. Run and interpret the result

From this product's root, use the package CLI directly or its installed `review-maintenance` executable:

```sh
node packages/governance/review-maintenance/src/cli.mjs run --config <private-config.json> --json
```

A malformed invocation or configuration exits 2. A run exits 0 for `no-candidate` or `candidate`, and 1 for `failed`; the outcome, not exit 0 alone, distinguishes a reviewed candidate from no work. Inspect the reported `artifacts` path, daily log, `excluded` and `unresolved` records. No candidate is not a claim that all feedback was usable. Total adapter failure must be `failed`, not no-candidate.

For `candidate`, inspect the saved `candidate.SKILL.md`, `candidate.diff`, `manifest.json` and `run.json` under `runs/<runId>`. Match feedback IDs/URLs, target commit, source Skill identity, gate results and both adapter reviews. Confirm the diff changes only the target and that the review covered the complete candidate rather than just the latest revision. These are review inputs, not proof that a human accepted the guidance. The operator working tree is not used to draft the candidate; the run does not commit, push or open a PR.

## 4. Recover from failure

Read the failure and run artifacts before retrying. The candidate and gates use a private isolated checkout, which does not inherit ignored dependencies from the operator checkout. Gates are trusted external commands, not sandboxed: inspect their actual effects, preserve user work, and repair missing prerequisites or gate behavior before retrying. Do not use a blanket reset or clean. Increasing revision limits is not a substitute for resolving a blocking finding.

The candidate bundle remains in private state; no reverse patch is needed before promotion. Use a clean dedicated checkout at the reviewed commit, keep other writers quiescent, and inspect the bundle before applying it. Do not overwrite newer Skill content with `candidate.SKILL.md`.

## 5. Promote and optionally open a draft PR

Promotion requires a clean checkout, the manifest's exact `targetCommit` at HEAD and the unchanged source Skill identity. It applies the saved patch and verifies the resulting target hash. A drift refusal means rerun maintenance on the intended new base, or manually rebase and obtain a new review; do not rewrite the manifest to bypass it.

```sh
node packages/governance/review-maintenance/src/cli.mjs promote --config <private-config.json> --bundle <private-run-directory>
```

The default applies locally only. After obtaining explicit push/PR authorization, setting `promote` and checking Git identity and access, append `--open-pr` to create a commit on a run-named branch, push it and open a draft PR. Review the actual remote head, PR state and checks; a local success does not prove CI or human approval. The package never merges or changes repository settings. If promotion fails after applying, committing or pushing, inspect those actual side effects before retrying; do not duplicate the branch or discard its evidence.
