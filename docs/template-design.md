# Node/TypeScript governance template contract

English | [中文](template-design.zh.md)

This page owns the Node/TypeScript template binding and acceptance contract, not execution progress. The template lives at `templates/node-typescript/`, outside the product's npm workspace. It is a source-derived engineering tree with a complete, replaceable plugin-market example, not an empty skeleton. The copied source and recorded modifications travel with it in `SOURCE-LICENSE.txt`.

## Workspaces and runtime contract

| Owner | Responsibility and public entry | Allowed dependency |
|---|---|---|
| `apps/plugin-market-generator`, `@deepseek-ai/dsh-plugin-market-generator` | Source list to validated format-1 index plus icons; `src/bin.ts` → `src/cli.ts`, exit `0` written, `1` unreadable source, `2` invalid arguments or list | The validator package |
| `packages/util/plugin-market-index`, `@deepseek-ai/dsh-plugin-market-index` | `parseMarketIndex`, `marketInstallTarget`, `MarketIndexError`, the record types; root export only, no I/O | Declared npm parsing libraries |
| Template `scripts/` | Gate graph, coverage partitioning, build orchestration, documentation and Note executors | Explicit development dependencies |

The app depends on the package and never the reverse. Generation is deterministic: entries follow the normalized source order, identical inputs produce identical bytes, and cached results are reused only for the same input identity. An unreadable source reuses its last successful entry when a valid current-format record exists. The app reads remote data but never executes package code.

The format contract, not this page, owns the data rules: [the format Agent Note](../templates/node-typescript/.agents/notes/implemented/feature/2026-10-02-plugin-market-index-format.md) defines format 1 and `packages/util/plugin-market-index/src/types.ts` owns the validated records. The generator validates every finished document through the package before writing. An unknown `source.type`, an undeclared metadata reference, a duplicate name or version, a missing or invalid `engines.dsh`, or an invalid distribution-tag target rejects the whole document.

## Direct new-project starting point

The exported project's new-project tutorial ([English](../templates/node-typescript/docs/cookbook/starting-a-project.md) | [中文](../templates/node-typescript/docs/cookbook/starting-a-project.zh.md)) owns setup, the complete example-replacement closure and project parameters. Daily governance is delivered inside that engineering tree; an external adoption Skill is not a second rule source or a way to repair missing wiring.

Declared pnpm members own package discovery. Source aliases accept actual package names and directories rather than an example prefix; the root manifest owns the shared version and license. Reviewed launcher, subsystem, typed-import, translation and repository-reference classifications live in `scripts/project-policy.ts`; runtime export classification remains in `scripts/package-dependency-policy.ts`. Business artifact specs live with the owning app and library and are discovered only in the built lane. Stable hook protocols and source notices are not business parameters.

Acceptance of a different-business starting point additionally requires acquisition from an actual tarball, complete example replacement, first and later features, a real cross-module change, packed consumption and another executor continuing from public project materials alone. Preserve initial failures and author interventions; a default-example smoke or an earlier bounded development case does not establish this result.


## Toolchain and source/artifact planes

The template pins pnpm 11.28.5 through Corepack, requires Node `>=24 <25` as declared in its manifest, and locks TypeScript, tsdown, vitest, oxlint, jscpd and publint in its own `pnpm-lock.yaml`. Its manifests own the current script and gate inventory; this page does not restate them. The workflow's Linux runner is declared there and is not a pass until observed.

Sources are ESM with explicit `.ts` relative imports. Source tests and `pnpm start` resolve workspace names through the root `paths` map to `src` and run through Vitest or tsx. `pnpm run build` emits each package's `lib/` and declarations; `pnpm start:built` and every packed consumer read the root `exports`, which points at `lib/`. A source-plane module may use TypeScript syntax plain Node cannot execute; the packed contract never includes a source subpath. Ignore rules keep `node_modules/`, `lib/` and `coverage/` out of the author tree. Because npm omits `.gitignore` at every depth, each ignore file is authored as `gitignore`; export restores `.gitignore` in that same directory byte for byte, including skill metadata and review-ownership cache rules, and recreates the relative Claude skills directory link.

The publication allowlist retains GitHub source and configuration formats, not generated Python caches. Template workspace metadata/configuration, `src/` and `tests/` are selected separately instead of including entire workspace directories. Installed `node_modules/.bin` shims and emitted `lib/` trees stay out of the raw npm tarball and installed Skill even when the author template has been installed or built locally.

## Gates, documentation and review

`scripts/run-gates.ts` owns the aggregate. Its primary aggregate orders lint before the instrumented coverage lane; selected source-tree scanning gates and duplication wait for coverage to settle. Lint contract probes run in private checkouts rather than the author tree. The coverage gate requires per-file 100% statements, branches, functions and lines over `packages/*/*/src/**/*.ts` and admits no product-file exemption; the application is proven by behaviour specs, the built CLI and its entry checks instead of a per-file V8 threshold. The review-ownership history suite needs Python 3.10 with `.github/review-ownership/requirements.txt`; without it the gate fails rather than reporting a pass.

Template `docs/architecture.md` owns placement, dependency direction, the module map and where new behaviour goes. Manifests own public entries and distribution; implementation and JSDoc own interfaces; package READMEs own usage contracts; the development and testing pages own commands, prerequisites and verification limits; the defensive-patterns pages own semantic review. Long-lived decisions and incidents use the Note lifecycle under `.agents/notes/`, and the development Skills under `.agents/skills/` carry the code-review, prose, simplification, reliability and pre-push procedures. Every page and Skill states the obligation its own repository can actually exercise; an instruction that names a removed object is a defect, not history.

Externally observable CLI, data-format or published API breaks follow the template's [upgrade-guide workflow](../templates/node-typescript/.agents/skills/dsh-create-upgrade-guide/SKILL.md). The guide belongs to the change that introduces the break; its owner defines the internal-API exemption and release maintenance, while the documentation aggregates check its layout and content structure.

## What the product verifies, and what it does not

`npm run check:template` exports the author payload from the product's own allowlist into a directory that does not exist yet, checks regular file bytes and the restored Claude skills link, and refuses an occupied destination without touching its content. It then installs with the committed lock in the exported copy, builds the artifact plane there and drives the built CLI: an empty source list writes `{ "format": 1, "title": …, "plugins": [] }`, and a refused `--concurrency 0` exits `2` while leaving the previous index unchanged.

It also seeds stale probe declarations in both built workspaces, runs `clean`, and proves that their entire `lib/` trees disappear while authored entry sources remain unchanged. The source launcher then runs without recreating artifacts; rebuilding and running the built launcher must retain the same report bytes. The root TypeScript solution explicitly references `tsconfig.host.json`, whose project references own the emitted workspace graph; `extends` alone does not inherit those references.

That entry proves acquisition and the built artifact from the delivered files. It does not run the template's complete gate graph, which is the template's own contract and runs from `templates/node-typescript/.github/workflows/ci.yml`; a local run here does not observe that workflow. Template dependencies, package-manager caches and `lib/` never ship as author files, and installation never nests inside the product.

These are A-stage implementation conditions. They do not prove B-stage governance effects on later development, C-stage Agent reproduction, or remote enforcement. A gate result establishes only its own predicate; an unavailable prerequisite is a failure, not an acceptance.

## Acceptance for this binding

- The exported payload contains the manifest, lockfile, workspace definition, ignore rules, CI workflow, both workspace sources with their tests, the gate scripts and the development Skills; it contains no `lib/`, `node_modules/` or cache directory.
- A fresh export installs from the committed lock alone and builds the CLI entry it declares for `start:built`.
- The built CLI writes a validated format-1 index for a real source list, reports a refused argument as exit `2`, and preserves the previous index bytes on that refusal.
- The validator package's own tests and the packed consumer reject a source-plane subpath import and accept only the root export.
- Recorded runs apply only to their actual inputs and environment. Changed predicates need invalid-consumer rejection and valid recovery; a local Windows run does not observe the template's Linux CI workflow or remote enforcement.
