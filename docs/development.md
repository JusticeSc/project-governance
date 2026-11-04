# Development

English | [中文](development.zh.md)

## Prepare

Use Node.js >=22.19.0 and npm. Run npm ci --ignore-scripts from the workspace root. The lock owns dependency versions. Do not use a sibling source tree, global parser, NODE_PATH or an undeclared relative package import as a missing-dependency workaround.

## Change

Read [AGENTS.md](../AGENTS.md), the actual task and the owning package README before changing code. Production code lives in the owning src/ (the executable application uses bin/); permanent behavioural regressions live in its tests/. Root tooling in scripts/ and its regressions in tests/ declare their own dependencies instead of relying on workspace hoisting. Change exported contracts and callers together. General source rules stay in [references](../references/index.md), not copied into package READMEs.

## Select verification

Run the narrow owning package test when that layer is sufficient, then exercise the real changed entry. Root npm run check executes governance-checks.json: syntax, the static package-structure gate, workspace and root tests, declared self-documentation predicates, and the template export/build check. npm run check:structure runs only the structure gate, and npm test runs each workspace's own test script and then the root tests. The gate parses authored source without building it: it checks declared public entries, package-name imports and published subpaths, workspace declarations and cycles, leaves computed specifiers, aliased loaders and dynamic resolution unproven, and forbids authored source links; it emits no code. npm run smoke packs this product, installs it in a separate consumer, prepares locked dependencies and exercises the installed consumer's success, refusal and recovery. See [testing](testing.md) for what these runs cannot prove.

The same check definition is used by local orchestration and CI. This does not require every focused edit to run the entire CI matrix. Existing valid evidence is reused until its inputs or prerequisites change. A hook, if deliberately configured by a consumer, is not a substitute for behaviour verification or a remote required check.

## Documentation and pairing

Root READMEs, docs and package maps/READMEs have English and Chinese counterparts. Edit and review both in the same change. Then explicitly regenerate the named pair records with the documentation package's verify-translation-pairing --write command; normal verification is read-only. Do not regenerate a record to hide an untranslated or structurally changed counterpart. Normative reference bodies retain their existing working language and are not silently exempted members of this bilingual corpus.

When changing a predicate, prove a plausible invalid consumer is rejected and a valid consumer remains accepted. Do not shrink a configured corpus or remove a meaningful assertion for a green run. An external service, secret, runner or approval that was not exercised remains unverified.

## Template workspace

`templates/node-typescript/` is a separate pnpm project, not a member of the root npm workspace. It has its own `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, TypeScript and build configurations, its gate scripts, development Skills and documentation; root `npm ci` and root workspace commands neither install nor execute it. Change it through its own owners — `templates/node-typescript/docs/architecture.md`, `docs/development.md` and `docs/testing.md` — and run its commands from the template directory through Corepack. Never add it to the root workspace, resolve its packages from the outer `node_modules` or bypass its lockfile.

`npm run check:template` exports the authored files into an isolated directory, installs the locked dependencies, builds the empty project and runs its test suite. It then creates a temporary workspace, verifies omitted compiler references are refused, builds and runs the real artifacts, checks input refusal, and verifies clean and rebuild. It does not run the template's complete gate graph, which is the template's own contract. The product check list calls this same entry locally and in CI. `npm run export-template -- <new-output-directory>` creates a reference copy without dependencies, build output or caches and refuses an occupied directory. The template pins pnpm 11.28.5 and has its own CI workflow; other platform combinations remain unverified until observed.

The template check requires Node `>=24 <25`. When the product uses another supported Node version, set `PROJECT_GOVERNANCE_TEMPLATE_NODE` to the absolute path of a Node 24 executable. Corepack and the initial frozen install use the prepared pnpm store offline; the disposable workspace fixture may contact the configured registry when its lockfile update needs metadata. CI prepares the pinned package manager and locked packages beforehand. This does not change offline Skill installation.

## Install and distribute

Copy the complete `skills/project-governance/` directory into the target's `.agents/skills/project-governance/` as described in the [README](../README.md). The Skill includes its fixed template asset and installs without npm workspace dependencies; the separate product workspace commands still require their own dependencies. Installation does not set up the template workspace or activate CI. Read [release responsibilities](../references/release.md) before any separately authorised release.
