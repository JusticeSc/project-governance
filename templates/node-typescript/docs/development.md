# Development guide

English | [中文](development.zh.md)

The setup tutorial takes a new contributor from prerequisites to a checked checkout. The contributor reference that follows covers repository layout, the TypeScript layout, daily workflow, and CI organization. The [architecture](architecture.md) owns workspace boundaries; [testing](testing.md) owns required evidence; `package.json` and `scripts/run-gates.ts` own the current script inventory.

For a new business, use [Start a different project](cookbook/starting-a-project.md) to replace the complete example and set project-owned parameters before continuing ordinary development.

## Setup tutorial

### Prerequisites

- Node.js `>=24.0.0 <25`; `package.json` owns the exact range.
- pnpm `11.28.5` through Corepack. If no shell shim exists, use `corepack pnpm` in place of `pnpm`; a global shim is optional.
- Git 2.26 or newer. Git is required for the hooks and whenever the source list contains Git repositories.
- Python 3.10 or newer for the complete check: `pnpm run check:ci` runs the review-ownership history tests, which need `python -m pip install -r .github/review-ownership/requirements.txt`. Without the interpreter that gate fails rather than reporting a pass; every other gate runs without it. Two cases explicitly skip on Windows because their fixtures require capabilities Windows lacks. Run the complete suite, including those POSIX filesystem and executable-script fixtures, in the Linux environment the workflow declares or in WSL 2 on Windows.
- Network access to the npm registry and each listed Git host for a generation run; no API key is required.
- On Windows, WSL 2 supplies the Linux environment when you need the complete check or the suite's POSIX fixtures. Keep the checkout, dependencies, and toolchain in the same operating system environment and store the checkout on that environment's filesystem.
- The `.claude/skills` directory is a relative symlink to `.agents/skills`. On Windows, use a filesystem and account that can create symbolic links, and configure Git to materialize them (`core.symlinks=true`) before checking out the project.

### Bootstrap a new export

An exported author tree is not a Git clone. Before installing hooks, initialize this directory as its own repository, review the exported inputs, and record an initial import with your configured Git identity:

```sh
git init
git config --local core.symlinks true
git add --all
git commit -m "Import template inputs"
```

The import records the reviewed inputs, not passing checks or governance acceptance. Install hooks only afterward: the archive verifier needs a committed baseline, so installing hooks before the first full import can block that commit. Do not bypass hooks or invent archive seals to create the baseline. An existing clone already has history and uses the common setup below.

### First-time setup

Install from the repository root:

```sh
corepack pnpm install
corepack pnpm run hooks:install
corepack pnpm run typecheck
```

pnpm uses its strict symlinked linker, so an undeclared dependency fails instead of resolving through hoisting. Dependency lifecycle scripts are deny-by-default in `pnpm-workspace.yaml`; only the explicitly allowed build dependencies run. The repository has no root `postinstall`: `pnpm run hooks:install` explicitly installs the worktree-local Lefthook configuration from this project's own Git root and fails if Git or the local executable is unavailable. It refuses an enclosing repository. `CI=true` and `GITHUB_ACTIONS=true` deliberately skip installation without changing Git configuration.

Local setup is complete when hooks are installed and `pnpm run typecheck` succeeds. For a new export, also run `pnpm run verify-archived-agent-notes` after setup to verify its committed baseline. An automated-job skip is not evidence that hooks were installed.

### Daily workflow

1. Read the owning document for the area: [architecture](architecture.md) for workspace boundaries, the package or app README for its contract, [defensive patterns](defensive-patterns/README.md) for generation and output rules, and [the documentation standard](AGENTS.md) for prose.
2. Make one behavior change and update its consumers, tests, and documents in the same change.
3. Run the smallest checks that cover the change (see [Verify a change](#verify-a-change)).
4. Before requesting review, run the missing evidence once and report the commands actually run.

## Contributor reference

### Repository layout

```text
apps/plugin-market-generator/       CLI application
packages/util/plugin-market-index/  format validator library
  src/                              source
  tests/                            package-owned Vitest specs
.agents/skills/                     agent workflows
.agents/notes/                      decision records
docs/                               developer documentation
scripts/                            build, gate, and documentation scripts
.github/                            inherited review and workflow configuration
```

A new package lives at `packages/<group>/<package>/` and reuses an existing group; a new group is a container with its own README and a row in [packages/README.md](../packages/README.md). A new app lives under `apps/`.

### TypeScript project layout

| File | Role | Forms a program? |
|---|---|---|
| `tsconfig.json` | Solution entry; extends shared base options, has no own files, and explicitly references `tsconfig.host.json`. | No |
| `tsconfig.host.json` | Node aggregate: workspace package references, app and package tests, scripts, and test configs. | Yes |
| `tsconfig.base.json` | Shared compiler options and the source `paths` map. Vitest points vite-tsconfig-paths at it. | No |
| `tsconfig.node.base.json` | Node-specific compiler settings extended by the aggregate. | No |
| `packages/<group>/<package>/tsconfig.json` | Extends `tsconfig.base.json`, sets `rootDir: src` and `outDir: lib/types`, includes `src`, and references workspace dependencies. | Yes |
| `apps/plugin-market-generator/tsconfig.json` | Same shape; references the validator package. | Yes |

`tsconfig.base.json` owns the `paths` map that resolves workspace package names to `src`. That map is why source tests and the `tsx` launcher see TypeScript source, and why a stale `lib/` cannot silently load a second copy of a module:

- Static checks, Vitest, and `pnpm start` resolve workspace imports to `src`.
- `build:artifacts` compiles each project in dependency order and emits `lib/` and declarations.
- `build:check` runs the aggregate check against declarations already on disk; missing or stale output appears as a compiler error. It neither compiles package projects nor rebuilds artifacts.
- `build` runs artifacts and the aggregate check as one ordered graph.
- `typecheck` compiles the aggregate without emitting packed artifacts.

Choose the command by what the change needs:

| Situation | Command |
|---|---|
| Iterating on sources and needing runnable output | `pnpm run build:artifacts` |
| Checking tests or scripts after source changes | `pnpm run build:check` after the latest `build:artifacts` |
| Before declaring TypeScript work complete | `pnpm run build:check` after the latest `build:artifacts`, or `pnpm run build` |
| Type checks without emitting package output | `pnpm run typecheck` |
| Lint-only change | `pnpm run lint` |

`scripts/build.ts` owns the scopes. A gate or script that consumes built `lib/` declares that dependency; source-plane gates and tests must pass on a clean tree.

### Source plane and packed artifact plane

- Developer commands, tests, and the source launcher use the `paths` map and TypeScript source. The app's `start` script runs `tsx src/bin.ts`.
- The packed validator exposes only `lib/index.js`, `lib/types/index.d.ts`, and `./package.json`. Its source subpath is intentionally not exported; a packed consumer cannot import TypeScript source.
- The built app entry is `apps/plugin-market-generator/lib/types/bin.js`, run by `pnpm start:built` under plain Node.
- A source-only module may use TypeScript syntax that plain Node cannot execute. Do not treat that as a packed contract, add a source subpath, or add source files to `files`.

### Verify a change

Match evidence to the surface; do not default to the complete suite for a commit or push.

- Behavior: `pnpm run test` with a focused spec. A new package runtime line needs a behavior test; the coverage gate requires per-file 100% statements, branches, functions, and lines for `packages/*/*/src` runtime implementation, with no exemptions. App behavior is proven by its specs, real CLI acceptance/refusal, and the built-app smoke rather than an app V8 threshold; type-only declarations carry no runtime obligation.
- Coverage: `pnpm run test:coverage`, or `pnpm run test:coverage:partitioned` for the split gate.
- Types: `pnpm run typecheck`, or `build:check`/`build` when the change touches emitted declarations.
- Prose: `pnpm run doc-sync` includes compilation of TypeScript examples; `pnpm run doc-typecheck` selects that compiler alone. `pnpm run test:docs` retains the build-free documentation subset and does not compile examples ([scope](testing.md#documentation-compilation)).
- Package metadata: run `pnpm run build` before `pnpm run hygiene` (publint, workspace constraints, package and dependency checks). Hygiene checks the existing artifacts; it does not build them.
- Published paths: `pnpm run build`, then a run of the built app with a real source list.
- Complete local set: `pnpm run check:all`; it aggregates the same gate groups as `check:ci`. `check:ci`, `check:ci:static`, `check:ci:coverage`, `check:ci:unit`, and `check:ci:artifacts` select the CI-shaped groups.

Standalone `doc-typecheck`, `doc-sync`, and `check:ci:static` prepare the required project contracts and compile examples through project references; they do not require a preceding build. `check:all`, `check:ci`, and `check:ci:artifacts` instead run `doc-typecheck:contracts-ready` after their existing build with `DSH_DOC_TYPECHECK_USE_BUILD_OUTPUT=1`, consuming those declarations without emitting or starting another compiler writer. In the primary graph the build follows coverage. `doc-typecheck:contracts-ready` alone assumes contracts are already current; it is not the standalone setup command.

`pnpm run duplication` measures cross-file TypeScript clones; a reported clone is a design signal, not an automatic failure.

### Git integrations

Translation records (`.i18n.yaml`) use Git's default text merge. A record conflicts only when both branches changed language-specific content in the same heading section; resolve the Markdown, then rerun `pnpm run verify-translation-pairing --write <pair>`.

Lefthook is installed explicitly and is a fast local checkpoint, not the complete gate set:

- `pre-commit` verifies staged translation records against the staged blobs, verifies archived Agent Notes, runs staged lint with the project-free `.oxlintrc.staged.json` profile, and checks the staged diff for whitespace errors. It does not fix or restage partially staged files.
- `pre-merge-commit` performs the same index-backed pairing and archived-note checks before Git creates an automatic merge commit.
- `pre-push` runs `pnpm run typecheck`.

The hooks intentionally run no tests, coverage, documentation gates, builds, or hygiene. Run the evidence your change needs once; CI owns exhaustive coverage and the compatibility matrix.

### CI gates

The workflows and review-ownership configuration under `.github/` are inherited source material. `check:ci`, `scripts/run-gates.ts`, and the workflow files own their current job inventory. This checkout has not run those workflows against a remote; configuration presence is not evidence that CI passed.

### Generator commands and side effects

Run the app from source:

```sh
pnpm start --input plugins.txt --output site/index.json --title "Example Market"
```

Run the built app after `pnpm run build`:

```sh
pnpm start:built --input plugins.txt --output site/index.json --title "Example Market"
```

Both forms resolve `--input`, `--output`, and the default cache directory against the current working directory. They write the index only when it changed, write large icons under `icons/` beside the output, remove only stale generated icons they recognize, and keep the cache out of the output directory. They attempt network access for each source on every run; Git sources also require Git. Exit status `0` means every source was read, `1` means at least one source could not be read (a valid last successful result is reused if available; otherwise it contributes no plugins), and `2` means invalid arguments or an invalid source list.

The generator never installs a package, runs a package script, or checks out a working tree. Registry credentials from `.npmrc` are not applied, and Git does not prompt for credentials; a private repository needs a credential helper or an SSH agent. See the [app README](../apps/plugin-market-generator/README.md#security) for the fetch limits.

### Environment variables

No application variable is required. `GIT_SSH_COMMAND` and `GIT_SSH` are the only inherited `GIT_*` variables passed to Git; other Git variables are dropped. Do not commit credentials or a populated `.env`.

### TODO markers

Use one of three comment tags, ordered by urgency:

- `FIXME` — should block a release unless reviewers explicitly agree otherwise.
- `TODO` — should be fixed soon, once resources allow.
- `XXX` — may be fixed someday; no commitment.

### Documenting source contracts

When a subsystem reference pastes a source declaration, use `ts type-equiv` with its attached original JSDoc and register `{ "doc": "docs/subsystems/example.md", "symbol": "Example", "source": "packages/group/package/src/types.ts" }` in `scripts/type-equiv.manifest.json`. For a body-stripped public class, use `ts public-api` and set `"projection": "public-api"`. The projection retains public fields, constructors, accessors, methods and class/member JSDoc, omitting bodies and private/protected members. `pnpm run verify-type-equiv` compares source declarations and JSDoc, ignoring whitespace and non-JSDoc comments, and enforces one manifest entry per document/symbol/projection and one registered fence. Update the declaring group's owning page with the source; the checker cannot discover never-documented new contracts.

`pnpm run verify-export-jsdoc` checks public documentation form, `pnpm run gen-doc-graphs --check` checks source-derived relationship freshness, and `pnpm run gen-cli-help --check` checks declared CLI-help projections. Regenerate from their real source owners instead of hand-editing generated regions. `pnpm run verify-node-next-types` needs current build output and checks declarations in an external NodeNext ESM consumer; it is not a source-alias test. None of these commands replaces behavioral review or a real packed install.

### Replacing maintained code with a dependency

Prefer a maintained dependency when it actually removes owned implementation and tests. Read the current owner, consumer contract, dependency policy and relevant prior art; compare semantics, failures, lifecycle, bounds, supported platforms, license, maintenance and publication impact. Prove the replacement through real consumers and remove obsolete code and tests only where the dependency takes responsibility. Keep regression coverage for this project's integration and contract; do not keep a second implementation or add a wrapper without a current need. A scan or policy relaxation needs the domain owner's confirmation rather than being a way to obtain green.

Install dependencies separately in each operating-system environment; never reuse Windows dependencies in WSL or Linux. Local platform evidence does not prove the other platform. Budget, concurrency, timing data and CI policy belong to their actual configuration owners; do not tune global host settings or restore paused remote services without authorization.

### Package boundary verification

Importable package modules remain ESM and never top-level-await; executable shebang/bin source is the narrowly defined exception in [package rules](../packages/AGENTS.md). Do not add a Node loader `resolve` hook, including a wrapper that rewrites the same specifier, to repair source/artifact mixing. A genuine replacement first re-audits resolution, hot reload and plugin management where present, and needs the domain owner's confirmation before landing. The source launcher does not prove dependency declarations are complete; the dependency scan owns that check.

A possibly absent optional dependency or peer is not a module-top-level static value import. Type-only imports are allowed; use a missing-aware dynamic import only at a genuinely optional operation, or the owning host's supported lazy-require mechanism where required. Absence means the capability is unavailable, not successful empty output. Keep optional and experimental capabilities out of default products and release dependencies; an explicit optional composition or test/example opt-in is not a default. Real product-entry reachability or a category and reason in policy accounts for every package; an undocumented orphan or stale exemption is not acceptance. No experimental group or plugin composition is required when absent.

Publication `files` contains the declared built artifacts and resources, never source passthroughs or source maps. Standard NodeNext declarations and a manifest check do not establish the actual tarball payload: install the real generated tarball in a clean external layout, use its built root, verify declared dependencies and forbidden source subpaths, and preserve frozen-lockfile reproducibility. Packed installation proves installability, not interactive behavior or registry publication. A multi-package release derives its order from actual install and peer edges, reports cycles and unsatisfied peer edges explicitly, and treats the full release set as one pack/upload unit; a single package has no invented family-order object.
