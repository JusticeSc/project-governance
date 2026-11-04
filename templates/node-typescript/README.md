# Node/TypeScript governance template

English | [中文](README.zh.md)

A source-derived pnpm engineering template with a complete, replaceable plugin market example:

- [`apps/plugin-market-generator`](apps/plugin-market-generator/README.md) reads a list of npm package names and Git repository URLs and writes one `index.json` plus its icon files. It reads package files without running package code.
- [`packages/util/plugin-market-index`](packages/util/plugin-market-index/README.md) validates format 1 of that index and builds the exact install arguments a client uses for one listed version.

The workspaces, names, and format semantics are copied from the DeepSeek Harness repository; [SOURCE-LICENSE.txt](SOURCE-LICENSE.txt) records the source and the changes made here. This repository is not the DeepSeek Harness product and does not include its agent runtime, Web UI, or plugin host.

## Start a project

For a different business, follow [Start a different project](docs/cookbook/starting-a-project.md): establish the checkout, replace the complete example, set project-owned parameters, and verify the actual application and published library. The project's own materials govern later development; an external adoption Skill does not supply missing daily rules or tool wiring.

## Status

Developer preview. Public APIs are pre-stable; a change updates every consumer in the same change. The GitHub workflows and review configuration in `.github/` are inherited source material: this checkout has not run them against a remote, and nothing here claims that remote enforcement or the full governance system has been exercised.

The format-1 contract is defined by [the plugin market index format Agent Note](.agents/notes/implemented/feature/2026-10-02-plugin-market-index-format.md); the validator checks the document rules before the generator writes an index.

## Requirements

- Node.js `>=24.0.0 <25`.
- pnpm `11.28.5` through Corepack (`corepack enable`).
- Git on `PATH` when the source list contains Git repositories.
- Network access to the npm registry and each listed Git host is attempted on every run; a warm cache can supply the last successful result when a source is unreadable.
- No API key is required. Registry tokens from `.npmrc` are not applied; private Git repositories need a credential helper or SSH agent.

## Install

Follow the [development setup](docs/development.md#setup-tutorial), including the Git bootstrap for a new export before hooks are installed. That guide owns prerequisites, installation and completion checks. Installation uses the locked, strict pnpm workspace; lifecycle scripts are deny-by-default, and hook installation is explicit rather than a root `postinstall`.

## Generate an index

Write a source list, one entry per line. Blank lines and lines starting with `#` are ignored.

```text
# npm packages: every non-deprecated bundle version is listed
@scope/example-plugin
example-plugin
# Git repositories: release tags and the default branch are listed
https://github.com/author/example-plugins
```

Run the generator from source:

```sh
pnpm start --input plugins.txt --output site/index.json --title "Example Market"
```

`--input`, `--output`, and the default cache directory are resolved against the directory where the command runs. A successful run writes:

- the index file, only when its contents changed;
- icon files under `icons/` next to the index, for icons too large to inline, and removes stale generated icon files it owns;
- a result cache under `.plugin-market-cache` beside the input list by default.

It reads registry documents, downloads npm tarballs in memory, and fetches Git objects into a private temporary bare repository. It never runs package scripts, installs packages, or checks out a working tree. Publish the output directory over HTTPS; the cache directory is not part of the published output.

Exit status is `0` when every source was read, `1` when at least one source could not be read (a valid last successful result is reused if available; otherwise that source contributes no plugins), and `2` for invalid arguments or an invalid source list. Git sources need a server that serves a commit by SHA or, failing that, refs by name; Git never prompts for credentials, so a private repository needs a credential helper or an SSH agent. Registry tokens from `.npmrc` are not applied.

## Build and run the built app

```sh
pnpm run build
pnpm start:built --input plugins.txt --output site/index.json --title "Example Market"
```

`pnpm run build` compiles the validator and the app and checks the aggregate test/script program against the emitted declarations. `pnpm start:built` runs `apps/plugin-market-generator/lib/types/bin.js` under plain Node; it does not rebuild. `pnpm start` runs the same CLI from `src` through `tsx`.

## Commands

```sh
pnpm install                 # install the workspace
pnpm run hooks:install       # install Git hooks explicitly
pnpm run build               # build:artifacts, then build:check
pnpm run build:artifacts     # emit lib/ and declarations
pnpm run build:check         # check tests and scripts against emitted declarations
pnpm run typecheck           # typecheck both workspaces and the aggregate program
pnpm run lint                # Oxlint, type-aware
pnpm run lint:fix            # apply Oxlint fixes
pnpm run test                # Vitest unit tests
pnpm run test:coverage       # Vitest with V8 coverage: per-file 100%
pnpm run test:coverage:partitioned # the coverage gate split into partitions
pnpm run duplication         # cross-file TypeScript clone detection
pnpm run doc-sync            # documentation gates
pnpm run test:docs           # quick documentation checks
pnpm run hygiene             # publint, workspace constraints, package and dependency checks
pnpm run check:all           # complete local gate set; the same aggregation as check:ci
pnpm start                   # run the generator from source
pnpm start:built             # run the built generator
```

`check:all` and `check:ci` run the same registered gate groups; the individual `check:ci:static`, `check:ci:coverage`, `check:ci:unit`, and `check:ci:artifacts` scripts select one group. `package.json` and `scripts/run-gates.ts` own the current script and gate inventory.

Required evidence for a change matches its surface: focused unit tests for behavior, the coverage gate for package runtime code, `doc-sync` for documentation, `build` plus a built-app run for published paths. Do not default to the complete suite for a commit or push; CI owns the exhaustive matrix. The coverage gate covers `packages/*/*/src/**/*.ts` runtime implementation with per-file 100% statements, branches, functions, and lines and no exemptions; the app is proven by behavior specs, real CLI acceptance/refusal, and its built-entry smoke, not by an app V8 threshold.

## Documentation

- [Development guide](docs/development.md) — setup, daily workflow, TypeScript layout, and checks.
- [Architecture](docs/architecture.md) — the two workspaces, data flow, and the format contract.
- [Testing policy](docs/testing.md) — test tiers, real entry paths, and coverage.
- [Documentation standard](docs/AGENTS.md) — tiers, writing rules, budgets, and bilingual pairing.
- [Agent Notes](.agents/notes/README.md) — decision records and their lifecycle.
- [Contributing](CONTRIBUTING.md) and [Safety](SAFETY.md).

## License

MIT. The copied source and the changes made in this repository are recorded in [SOURCE-LICENSE.txt](SOURCE-LICENSE.txt); third-party dependency licenses remain with their packages.
