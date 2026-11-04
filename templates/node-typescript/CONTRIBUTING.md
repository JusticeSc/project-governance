# Contributing

English | [中文](CONTRIBUTING.zh.md)

Thanks for helping maintain this toolkit. It is a standalone, source-derived project: whoever hosts a copy owns its contribution policy, release process, and remote settings. The rules below describe how a change is developed and verified inside the repository.

## Before you change code

Read the root [AGENTS.md](AGENTS.md), then the owner of the area you will touch: [architecture](docs/architecture.md) for workspace boundaries, [development](docs/development.md) for setup and checks, [testing](docs/testing.md) for required evidence, and [the documentation standard](docs/AGENTS.md) for Markdown and bilingual pairs.

## Workflow

- Keep one change to one observable behavior. Update every consumer, test, and document that the behavior reaches in the same change.
- Preserve the source behavior of the generator and validator unless the request explicitly changes it. A format change starts from the [format contract](.agents/notes/implemented/feature/2026-10-02-plugin-market-index-format.md).
- Record durable decision rationale in an [Agent Note](.agents/notes/README.md); mechanical or local edits do not need one. Never rewrite an old decision into its opposite.
- Update both sides of a bilingual pair and re-record it with `pnpm run verify-translation-pairing --write <pair>`.
- Keep credentials, local cache directories, build output, and generated index files out of commits. `.gitignore` lists the repository's own exclusions.
- Do not add a dependency, package, or configuration knob without a current consumer that needs it.

## Verify

Complete the [development setup](docs/development.md#setup-tutorial) once; it includes Git bootstrap for a new export and worktree-local hooks. For a different business, first follow [Start a different project](docs/cookbook/starting-a-project.md). Then select only the checks required by the actual change through the development guide's verification section.

Documentation changes use `pnpm run doc-sync` (or `pnpm run test:docs` for the quick subset). A change to published paths also needs `pnpm run build` and a run of the built app. Report only the commands you ran and their results. The coverage gate covers package runtime sources with per-file 100%; the app is proven by behavior specs, CLI acceptance/refusal, and the built-entry smoke rather than an app V8 threshold. An uncovered runtime path is usually a reason to delete it or to write the behavior test, not to add an exemption.

Git hooks are a local checkpoint, not the full gate set: `pre-commit` verifies staged translation records, archived notes, staged lint, and whitespace; `pre-push` runs `typecheck`. Run the remaining evidence yourself before requesting review.

## Review

A reviewer checks the change against the owning documents and the [defensive patterns](docs/defensive-patterns/README.md), not only the diff. Substantiate findings with a location, a trigger, and a failure mechanism. A fix belongs to the change that introduced the issue, with its own commit.

## License and provenance

Contributions are accepted under the repository's MIT [license](LICENSE). Do not copy code, assets, or documentation whose license is incompatible. Record the source of imported material in the change, and keep [SOURCE-LICENSE.txt](SOURCE-LICENSE.txt) accurate when the imported surface changes.
