# Architecture

English | [中文](architecture.zh.md)

## Ownership and layout

Applications compose capabilities; packages own stable contracts and their tests. The root owns workspace orchestration, a single distribution allowlist and explicit self-check configuration. Rules and executable predicates are deliberately different owners.

| Path | Owns |
|---|---|
| apps/cli/ | Command parsing and user output. |
| packages/README.md | Family map. |
| packages/governance/README.md | Immediate package map. |
| packages/governance/checks/ | Policy validation and shell execution. |
| packages/governance/documentation/ | Declared-corpus documentation predicates. |
| packages/governance/distribution/ | Selected-file installation. |
| references/ | Normative rules by responsibility. |
| references/methods/ | Method navigation and source coverage. |
| docs/ | Architecture, development, testing and provenance. |
| scripts/ | Repository-only checks, including the static package-structure gate, and packaged smoke composition. |
| templates/node-typescript/ | Independent pnpm/TypeScript reference engineering tree; acquisition and its own source/artifact planes. |

Each product package has a manifest, README pair, src/ and tests/. The product CLI uses bin/ as its executable application entry and owns tests/. Cross-package imports use declared package names and exports, never another package's private paths. No capability depends on the CLI. `scripts/verify-structure.mjs` checks that declared graph: public entry targets exist inside their package, static imports, re-exports and literal dynamic import/require use declared names and published subpaths, authored source links are forbidden, workspace declarations cover the actual packages, dependency cycles are absent, and only the owning package's tests may use its devDependencies. Root tooling imports workspace packages by their public names and declares its own dependencies instead of relying on workspace hoisting. TypeScript is a parser dependency of this gate; the product emits no code from it and its npm runtime is unchanged. Product Node ESM executes directly and npm workspaces link package names; it has no bundler or generated library output. The separate template workspace instead owns its actual TypeScript src-to-lib build; [template design](template-design.md) fixes that contract, and the root distribution allowlist selects its author files without joining the workspaces.

Root workspace patterns are resolved against actual manifests, so they cannot absorb the independent template. Manifests are checked for canonical containment before their declarations are read. Public JavaScript entries stay in production source areas; relative module imports stay in the checked production/test corpus, preventing an unchecked helper or test-only dependency from becoming a production bypass. A legitimate alias of the repository root is canonicalized without disabling the CLI check.

## Runtime boundaries

The CLI owns argument errors. The checks package resolves an existing repository and policy to real paths, validates the entire command map, then executes those trusted commands inside the repository. Shell commands are code with the caller's authority, not sandboxed input. Neither a successful policy nor a symlink-containment check grants permission to run an untrusted repository.

Distribution reads package.json files as the sole selection contract. Installation into an existing target creates one exclusive .agents/skills/project-governance seat, rejects redirected parents or an existing seat, and removes only its own partial output after failure. It does not prepare dependencies, rewrite business configuration or migrate old installations.

Documentation gates load an explicitly declared corpus and their own predicate configuration. Compiler-backed gates use the target's TypeScript compiler and project. Their exact limitations belong to the [documentation package](../packages/governance/documentation/README.md).

## Document and state ownership

[Skill](../SKILL.md) guides template acquisition, setup and existing-project integration; the [adoption procedure](../references/adoption.md) owns protected migration and handoff. After acquisition, new projects follow the exported [start-a-project tutorial](../templates/node-typescript/docs/cookbook/starting-a-project.md). After integration, daily development, fixes, review and continuation use the target project's AGENTS.md, project-local Skills and owning documentation, not the installed adoption seat.

This product's maintenance starts from [AGENTS.md](../AGENTS.md). [Project structure](../references/project-structure.md) owns establishment and evolution, not this project's directory example. [Development](development.md) owns commands and [testing](testing.md) owns evidence boundaries. [Provenance](provenance.md) owns attribution. Persistent execution state uses the target's existing owner under the [state rule](../references/state-owner.md); maintainer session progress and raw migration receipts are not product dependencies.

## Change boundaries

A package split needs a real independent contract, lifecycle or consumer. Do not split one script into a package merely to fill a directory. A new language or layout changes actual bindings and tests, not the project-standard obligations. Export and dependency changes must migrate both producers and consumers in the same change.
