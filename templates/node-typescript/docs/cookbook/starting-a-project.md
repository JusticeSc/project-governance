# Cookbook: start a different project

English | [中文](starting-a-project.zh.md)

Use this tutorial when an exported template will become a new Node.js/TypeScript project rather than another plugin market. The included app and library are a complete working example, not required business functionality. The engineering rules, development workflows and checks belong to the project itself; no external adoption Skill is needed for daily work.

## 1. Establish the checkout

Start with the complete exported tree, including dot directories and the restored `.gitignore` files and `.claude/skills` link. Copying a raw npm package subdirectory is not an export. Keep `LICENSE` and `SOURCE-LICENSE.txt`: renaming the project does not remove the copied material's attribution.

Follow the [development setup](../development.md#bootstrap-a-new-export) to establish this directory's own Git baseline before installing hooks. Review the imported files; a baseline records their identity, not passing checks. Use `corepack pnpm` in place of `pnpm` if no shell shim is installed; enabling a global shim is not necessary. Keep dependencies and toolchain inside this environment, not an enclosing project.

Completion: the initial import exists, worktree-local hooks are installed, the archive baseline verifies, and the source typecheck succeeds. Leave remote settings and publication alone unless separately authorized.

## 2. Define the business and its owners

State the first behavior, real inputs and outputs, errors, user files that must stay untouched, and the real CLI or library consumer that will prove it. Place I/O and process lifecycle in `apps/<app>/`; reusable typed behavior belongs in `packages/<group>/<package>/`. A library never depends on the app. Keep one package unless current consumers require independently evolving roles.

Replace the example as one complete closure: `apps/plugin-market-generator/`, `packages/util/plugin-market-index/`, their tests and manifests, app/library maps, format and CLI documentation, sample terminology, safety claims, and launcher commands. Retain a group only if it still owns a package. Update root `AGENTS.md` (the existing `CLAUDE.md` remains its stand-in), package instructions, the architecture, development, testing, README and contribution pages to describe the actual project. Follow incoming references through the development workflows too: a reusable review procedure must not require the retired sample's format Note.

The format Note is a substantive implemented decision, not disposable boilerplate. When the format is retired, apply the [Note lifecycle](../../.agents/skills/dsh-archive-agent-notes/SKILL.md): archive the complete triplet without body edits, add only archival metadata, re-record its sidecar and seal against the real committed baseline. Repair active inbound references to current authority; frozen history is not a new business specification. Remove obsolete sample release guidance when no published consumer requires it. Do not invent release history or rewrite old decisions into their opposite.

Completion: every retained module has a current producer and consumer; active documentation and instructions describe the new business, while attribution and meaningful history remain intact. Do not keep an unused example beside the new implementation or clear it into empty stubs.

## 3. Set project parameters

| Owner | Set or maintain |
|---|---|
| Root and member `package.json` files | Actual names, descriptions, dependencies, repository metadata and launchers. The root owns the shared version and license for every pnpm member; changing scope does not bypass either rule. Preserve original notices separately. |
| `pnpm-workspace.yaml` | Declared members and exclusions; retain this binding's `apps/*` and `packages/*/*` organization. Keep root workspace declarations consistent for tooling that reads them. |
| `tsconfig.host.json`, member `tsconfig.json`, test configs | Actual compiler references and nearest source/test projects; no reference to a deleted example. A member references its real workspace dependencies. |
| `tsconfig.base.json` | Run `pnpm run gen-tsconfig-paths`; the generated region maps declared library names to their actual `src`, irrespective of scope or directory spelling. Handwritten aliases stay outside that region and must point to the correct source. Do not add group wildcards. |
| `scripts/project-policy.ts` | Reviewed launcher source/artifact classifications, executable and bin classifications, justified package-group page exemptions, the real cross-package typed lint import, translation repository root, actual generated English pages and applicable repository-reference restrictions. Remove stale entries; empty exception lists do not waive the underlying rule. |
| `scripts/package-dependency-policy.ts` | Review and classify the actual runtime exports used across packages. Remove retired exports; never broadly allow unreviewed dependencies to make a check pass. |
| Documentation manifests and `.gitignore` | Current bilingual corpus, justified budgets and exclusions for actual generated outputs, caches and private data. Do not exclude authored source to hide a failure. |

`typedImportProbe` selects an actual consumer test directory and a non-thenable runtime export from a real workspace root API. The lint contract must reject awaiting that value and accept exact recovery before built output exists. A missing package, unresolved type or dropped file class is not evidence that type-aware lint worked.

Keep the supported source/artifact contract: library `src/index.ts` compiles to `lib/types/index.js`, bundles to `lib/index.js`, and publishes its root entry and declarations, not a `src` subpath. Apps use `src/bin.ts`; root source and built launchers are classified separately. `scripts/` is engineering tooling, not a home for business behavior. A new package group links its owning `docs/subsystems/*.md` page from its group README, or has a current, justified no-page classification.

Keep stable hook ownership markers and tool protocol identifiers. They are not business names, and changing them can abandon installed hooks. Do not globally replace `dsh`: package identities and active contracts differ from source attribution, historical records and isolated fixtures.

Completion: the workspace manager, compiler graph, aliases, dependency classifications, launchers and documentation all name the same actual project. A business swap changes implementation and project-owned configuration, not generic checker algorithms.

## 4. Verify real behavior and delivery

Install after changing manifests so `pnpm-lock.yaml` records the actual graph; validate a later fresh checkout with `pnpm install --frozen-lockfile`. Run the smallest sufficient set for the change as described in [development](../development.md#verify-a-change). A complete business replacement touches the graph, behavior, types, artifacts, dependency/publication rules and documentation, so each of those needs evidence.

- Exercise source behavior before `lib/` exists. Run owning behavior specs and the package runtime coverage gate; each library runtime file still needs 100% statements, branches, functions and lines, without sample exemptions.
- Run type-aware lint, including source, test and real cross-package rejection/recovery. Run workspace constraints and `verify-package-licenses` after identity changes; a renamed member with a stale version or wrong license must still fail.
- Build with `pnpm run build`, then run `pnpm run hygiene` and `pnpm run test:built`. Business-owned `tests/**/*.built.spec.ts` run only in the artifact lane; keep a real success, an invalid request and preservation of existing user/output bytes. Plain Node and a separately packed library consumer must use the published root, with no source subpath or private checkout dependency.
- Update both languages, re-record named pairs and run `pnpm run doc-sync`. Recheck the Note archive after any retirement. Use the project's review procedures to check necessity, all affected consumers, omissions and unrelated changes; green tools do not replace that judgment.

Completion: the requested output is correct, invalid inputs fail for the intended reason, protected files are unchanged, the declared artifacts run outside the source tree, and the selected checks actually ran. Report environment limits and unobserved remote enforcement explicitly; a configured workflow is not a remote pass.

## 5. Continue from the project's own materials

Implement later requests through the actual architecture, package contracts, development and testing owners. A public API or module move migrates every source, test, type, launcher, resource and documentation consumer in the same change; obsolete paths exit rather than becoming shims. Follow the upgrade-guide workflow when its externally observable break conditions apply.

Before another contributor or agent continues, leave the current request, real changes, exercised commands and remaining limits with the project's existing state owner if one exists; do not introduce a second progress database. The next executor must be able to locate owners and run the real project without an external governance Skill, a template author's private note or an undistributed fix.
