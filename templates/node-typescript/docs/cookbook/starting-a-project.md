# Cookbook: start a project

English | [中文](starting-a-project.zh.md)

Use this guide to begin requested work in the installed Node.js/TypeScript governance project. It has engineering infrastructure but no business application or library. Retain [LICENSE](../../LICENSE) and [SOURCE-LICENSE.txt](../../SOURCE-LICENSE.txt) and use the project's own instructions for daily work.

## 1. Establish the checkout

Review the installed files and preserve existing project content. Follow [development setup](../development.md#bootstrap-a-new-export) when a new Git baseline is needed, then install dependencies and hooks as instructed there. A baseline records reviewed inputs, not passing checks. Leave remote settings and publication alone without separate authorization.

## 2. Implement the requested behavior

Identify real users or consumers, inputs, outputs, failure behavior, and files or data that must remain unchanged. Choose the smallest actual owner: an application under `apps/<app>/` for process and I/O responsibilities, or a library under `packages/<group>/<package>/` for reusable behavior. Add both only when the task needs both; a library does not depend on an application. Each member owns its source, tests, manifest, and documentation. Use [adding a package](adding-a-package.md) for libraries.

Register every real member in `tsconfig.host.json` and configure its real workspace dependencies, source aliases, product-use classification, and applicable launchers and bin policies. The workspace patterns already include `apps/*` and `packages/*/*`; no fake package is required. Set actual project identity and repository metadata without changing license or version obligations. A new group has a bilingual group README and navigation entry; its subsystem page or justified no-page classification reflects its real responsibility. Update [architecture](../architecture.md), the root README, and the relevant owner documents alongside behavior.

A multi-member project must configure `typedImportProbe` with a real cross-package consumer test and non-thenable runtime export; a missing or unresolved symbol does not prove type-aware lint. It may be absent only when the project lacks multiple members. Follow [the compiler and lint binding](../development.md#typescript-project-layout) for every real source and test. Never add an invented dependency or exempt real source merely to make a check pass. Keep tool protocol identifiers and hook ownership markers stable.

## 3. Declare actual persistence

When the project has persistent data, identify its real exported types and reader/writer and compatibility obligations. Declare them in root `persistence.config.json` with a `roots` array. Each object has a stable `id` (lowercase letter first, then lowercase letters, digits or hyphens), an `owner` path under `apps/<app>/src/**/*.ts` or `packages/<group>/<package>/src/**/*.ts`, a directly exported interface or type-alias name in `type`, and optional `versionField`. The real owner must stay inside the project, its reachable types must describe JSON-compatible data, and IDs and canonical owner/type pairs must be unique. A declared version field is a required nonnegative safe-integer numeric-literal property on the root; its declaration cannot be changed or removed while the root remains live. Missing or invalid declarations fail. Each affected root receives its own compatibility decision; `version-bump` requires its declared version field to actually increase.

No configuration and no history means no declared roots; existing history without configuration fails. For the first actual nonempty inventory, author a JSON prose file with `en` and `zh` each supplying summary, compatibility and verification, then run `pnpm exec tsx scripts/persistence-changes.ts --baseline <YYYY-MM-DD-slug> --prose <file>`. Review the generated bilingual baseline and schemas; do not pre-create empty history or an empty baseline. After the last root is retired, retain `roots: []` and its history: deletion still requires acknowledgement and frozen-history checks, not a skip. Inspect the command's current options for subsequent changes.

Use the [persistence-change template](../../.agents/skills/pg-doc/templates/persistence-change.md) and the tool's current command options; never invent prior history or migration success. Structural records do not prove runtime readers, migration, or historical data are compatible: exercise those real behaviors separately. Preserve existing data and accepted history.

## 4. Verify and hand off

Install after manifest changes and check a fresh installation with the frozen lockfile when relevant. Follow [development](../development.md#verify-a-change) and [testing](../testing.md) for applicable behavior, coverage, types, artifacts, publication, and documentation evidence. Run real success and rejection paths, protect existing user files, and verify built or packed consumers when those artifacts exist. Package runtime coverage remains per-file 100%; an actually empty workspace does not exempt later source.

Update both languages and their pairing records. Report commands actually run and environmental or permission limits; configured CI is not a remote pass. For future work, use current architecture and owner documents, migrate affected callers together, and follow the upgrade-guide workflow for applicable public breaks.
