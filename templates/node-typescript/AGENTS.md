# AGENTS.md

This Node.js/TypeScript governance template starts without business applications or libraries. Follow [Start a project](docs/cookbook/starting-a-project.md) for the first user-requested behavior, [the architecture](docs/architecture.md) before changing workspaces, and [the documentation standard](docs/AGENTS.md) before changing prose.

## Standing orders

- **One behavior, one change.** Update every consumer, test, and owning document the behavior reaches. Preserve source behavior unless the request explicitly changes it.
- **One owner for each contract.** Define each real data format and shared type at its owning module or decision record; consumers import the shared definitions rather than redeclaring them.
- **Validate at untrusted boundaries.** Validate JSON documents, registry responses, tarball entries, Git trees, manifests, command-line input, and file contents. Trust TypeScript at typed same-process boundaries; do not add runtime checks or hostile-input tests only for values the static interface already requires.
- **Typed failures.** Expected failures use declared error types and stable discriminants; never route handling by parsing a message. Preserve causes, keep machine identity separate from display text, and stop dependent work when state is unknown. An empty `catch` names the error and why, and its `try` holds one statement.
- **One source of truth.** One read path for a fact, one owner for shared state. A module-level cache, singleton, `globalThis` field, or `Symbol.for` key hides its owner; put shared state on an object with a lifecycle.
- **One value states one fact.** "Not queried", "emptied", and "absent" take distinct representations. An optional input states what happens when it is present and when it is absent; a chain of `?.`+`??` is a decision left unstated.
- **Timing does not carry correctness.** Correctness comes from explicit call points and explicit state, not from a microtask, timer, or callback order.
- **Make bounds complete.** Enforce byte, count, and time limits where the complete emitted or retained value is known, including wrappers and metadata. Test tiny limits, exact limits, one oversized item, and multibyte counts.
- **Dispose to quiescence.** Await child exit after killing or aborting; await work you can still observe before reporting teardown complete.
- **Migrations preserve behavior.** A move or split keeps observable behavior, error codes, ordering, and output equal; compare item by item. Fix a discovered defect as its own change.
- **Report orthogonal outcomes independently.** A process can time out and exit 0; surface `timedOut`, `signal`, and `exitCode` separately.
- **Never give untrusted output the ambient environment or a predictable path.** Spawned commands get a scrubbed environment; temporary and cache files use private exclusive paths.
- **Unlink link-shaped paths.** Remove a possible symlink or Windows junction with `lstatSync().isSymbolicLink()` then `unlinkSync`; reserve recursive removal for a known real directory.
- **Prefer a maintained dependency over hand-rolling** when it genuinely deletes owned code and tests.
- **No abstraction without a current consumer.** Tie every option, state machine, defensive copy, compatibility path, and public operation to a current contract or caller; otherwise defer it.
- **ESM only.** Every workspace is `"type": "module"`; use package names across workspaces and explicit source extensions (`.ts` or `.tsx`) in source-relative imports. Emitted imports must resolve to the corresponding built JavaScript.
- **Source plane and artifact plane stay distinct.** Source tests and source launchers resolve workspace imports through the root tsconfig `paths` map to `src`. Packed consumers use the declared built exports under `lib/`; do not expose source subpaths or ship source as a workaround.
- **Errors and reports are actionable.** Name the JSON path or source that failed, the violated rule, and what remains safe. Do not suppress a failure into a partial success.
- **Tests describe behavior.** Change obsolete behavior with its tests and say why. Every new source line needs a behavior test; package runtime code carries a per-file coverage gate at 100%, while applications are proven by behavior specs and real entry-point checks.
- **Keep comments local and complete.** State the contract, failure mode, timing, ownership, or non-obvious reason; delete narration, test walkthroughs, review history, and code restatement.
- **Document current state.** History belongs in commits, Agent Notes, or post-mortems. Docs and comments name live mechanisms.
- **Create Agent Notes only for durable decision rationale;** mechanical and local edits are exempt. Archived notes are frozen history, never current authority ([rules](.agents/notes/README.md)).
- **Bilingual pairs update together.** Both languages carry equal authority; re-record with `pnpm run verify-translation-pairing --write <pair>`.
- **Files end with exactly one trailing newline;** `git diff --cached --check` gates it.
- **Do not commit** credentials, local caches, build output, or generated indexes. Do not add remote or CI assertions that this checkout has not verified.

## Repository layout

```text
apps/<app>/                     Application source and owned tests, when needed
packages/<group>/<package>/     Library source and owned tests, when needed
.agents/                        Agent skills and Agent Notes
docs/                           Development, architecture, testing, review rules, cookbook
scripts/                        Node build, gate, and documentation scripts
.github/                        Inherited review and workflow configuration
```

The workspace starts without business members. Root manifest version and license apply to all declared workspace members. Libraries are publishable and apps private in this binding. New libraries belong under `packages/<group>/<package>/` and join their group README; new apps belong under `apps/`.

## Commands

```sh
pnpm install                  # workspaces; lifecycle scripts deny-by-default
pnpm run hooks:install        # explicit Lefthook install; no root postinstall
pnpm run build                # artifacts + aggregate check
pnpm run build:artifacts      # emit lib/ and declarations
pnpm run build:check          # check tests/scripts against emitted declarations
pnpm run typecheck
pnpm run lint
pnpm run lint:fix
pnpm run test
pnpm run test:coverage        # per-file 100% over packages/*/*/src
pnpm run test:coverage:partitioned
pnpm run duplication
pnpm run doc-sync
pnpm run doc-typecheck         # compile documentation TypeScript examples
pnpm run test:docs
pnpm run hygiene
pnpm run check:all            # same gate aggregation as check:ci
```

`package.json` and `scripts/run-gates.ts` own the current script and gate inventory. Match evidence to the surface: focused behavior tests, coverage for package runtime code, `doc-sync` for documentation, and built-entry checks when artifacts exist. Do not default to the full suite or repeat a passing check for a commit or push; CI owns the exhaustive matrix. Develop with `build:artifacts`; before claiming TypeScript completion run `build:check` after the latest artifacts, or `build`.

`doc-sync` includes `doc-typecheck` and may compile project contracts; `test:docs` retains the build-free documentation checks and does not compile examples. See [testing policy](docs/testing.md#documentation-compilation) for snippet scope and [development](docs/development.md#verify-a-change) for compiler scheduling.

## Secrets

Never commit credentials or a populated `.env`. Introduce and document credentials only for actual integrations and authorized use.

## Conventions

- **Package READMEs** follow the [kind, Summary, limitations and Model Experience contract](docs/cookbook/adding-a-package.md#4-write-the-package-readme); generated catalogs remain at their owner.
- **Tests live under the owning package's `tests/`,** never `src/__tests__/`; `src/types.ts` contains types only.
- **Package tsconfigs** extend `tsconfig.base.json`, set `rootDir: src` and `outDir: lib/types`, and reference workspace dependencies. The root `tsconfig.json` is the aggregate solution.
- **TODO markers:** `FIXME` (release blocker), `TODO` (soon), `XXX` (someday), by urgency.
- **Review local changes and PRs** with [pg-code-review](.agents/skills/pg-code-review/SKILL.md), using the original request and actual change scope. Select missing evidence through [pg-pre-push-checks](.agents/skills/pg-pre-push-checks/SKILL.md). PR approval ownership separately follows [.github/review-ownership/README.md](.github/review-ownership/README.md); inherited configuration does not prove remote enforcement.

## Defensive patterns

Read [docs/defensive-patterns/README.md](docs/defensive-patterns/README.md) before changing generation, caching, fetching, output writing, or error handling. [general.md](docs/defensive-patterns/general.md) carries the rules and their boundaries.

## Type safety and documentation

Everything compiles under `strict: true`. Every remaining `any` explains why narrowing is infeasible. Every module and non-obvious export carries concise JSDoc; function-like exports document `@param` and `@returns`, with complete behavior, failures, timing, ownership and optional-input branches where applicable. Inherited member contracts stay at their declaration. See [package rules](packages/AGENTS.md) for the public-entry, export-key and top-level-await contracts.

Comments and docs state complete contracts rather than reasoning transcripts. Name exact rules, fields, errors, and operations; avoid metaphor. Docs accompany code: update the owning README, JSDoc, and bilingual counterpart in the same change. Routine translation follows [docs/AGENTS.md](docs/AGENTS.md); record an edited pair with `pnpm run verify-translation-pairing --write <pair>`.

For externally observable CLI, data-format or published API breaks, or changes to a surface covered by an unreleased guide, follow [pg-create-upgrade-guide](.agents/skills/pg-create-upgrade-guide/SKILL.md) in the same change.

For browser UI, remote APIs, shared resources or derived persistent views, read [conditional domain rules](docs/defensive-patterns/conditional-domains.md) and the [testing evidence boundaries](docs/testing.md#conditional-evidence). These rules activate on real objects; they do not require a plugin host, model runtime or Session architecture.

## Editing these instructions

`CLAUDE.md` stands in for this file at the root and in `packages/`; edit the real `AGENTS.md`. Keep each rule self-contained and link the owning document. Condense when clarity survives; raise a documentation budget only when the required content genuinely needs more space.
