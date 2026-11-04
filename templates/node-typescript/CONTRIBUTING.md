# Contributing

English | [中文](CONTRIBUTING.zh.md)

This Node.js/TypeScript project starts with governance infrastructure and no business applications or libraries. Whoever hosts it owns its contribution policy, release process, and remote settings. The rules below describe how a change is developed and verified inside the repository.

## Before you change code

Read the root [AGENTS.md](AGENTS.md), then the owner of the area you will touch: [architecture](docs/architecture.md) for workspace boundaries, [development](docs/development.md) for setup and checks, [testing](docs/testing.md) for required evidence, and [the documentation standard](docs/AGENTS.md) for Markdown and bilingual pairs.

## Workflow

- Keep one change to one observable behavior. Update every consumer, test, and document that the behavior reaches in the same change.
- Preserve current behavior and owning contracts unless the request explicitly changes them. A contract change updates its implementation, consumers, tests, and documentation together.
- Record durable decision rationale in an [Agent Note](.agents/notes/README.md); mechanical or local edits do not need one. Never rewrite an old decision into its opposite.
- Update both sides of a bilingual pair and re-record it with `pnpm run verify-translation-pairing --write <pair>`.
- Keep credentials, local cache directories, and build output out of commits. `.gitignore` lists the repository's own exclusions.
- Do not add a dependency, package, or configuration knob without a current consumer that needs it.

## Verify

Complete the [development setup](docs/development.md#setup-tutorial) once; it includes Git bootstrap for a new project and worktree-local hooks. Use [Start a project](docs/cookbook/starting-a-project.md) to introduce the first requested behavior and its real owners. Then select only the checks required by the actual change through the development guide's verification section.

Documentation changes use `pnpm run doc-sync` (or `pnpm run test:docs` for the quick subset). Changes to published paths also need `pnpm run build` and real built-entry or packed-consumer checks where applicable. Report only the commands you ran and their results. The coverage gate covers package runtime sources with per-file 100%; application behavior is proven by specs and real entry-point evidence rather than an app V8 threshold. An uncovered runtime path is usually a reason to delete it or write the behavior test, not to add an exemption.

Git hooks are a local checkpoint, not the full gate set: `pre-commit` verifies staged translation records, archived notes, staged lint, and whitespace; `pre-push` runs `typecheck`. Run the remaining evidence yourself before requesting review.

## Review

A reviewer checks the change against the owning documents and the [defensive patterns](docs/defensive-patterns/README.md), not only the diff. Substantiate findings with a location, a trigger, and a failure mechanism. A fix belongs to the change that introduced the issue, with its own commit.

## License and provenance

Contributions are accepted under the repository's MIT [license](LICENSE). Do not copy code, assets, or documentation whose license is incompatible. Record the source of imported material in the change, and keep [SOURCE-LICENSE.txt](SOURCE-LICENSE.txt) accurate when the imported surface changes.
