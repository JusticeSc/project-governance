# Testing and evidence

English | [中文](testing.zh.md)

## Package regressions

npm test executes each workspace's own test script and then the root tests. Checks tests cover real command validation, execution failure and real-path containment; distribution tests exercise real files, overwrite refusal and redirected installation paths. Documentation tests preserve actual parser and compiler behaviours, bilingual records, archive restrictions, boundaries and malformed input. Missing declared parser/compiler prerequisites fail rather than skip.

Root tests/structure.test.mjs exercises temporary npm/ESM graphs: package discovery, public export visibility, declaration ownership, production/test separation, dependency direction and cycles, public-entry placement, redirected manifests and source paths, and CLI dispatch through a legitimate root alias. Negative fixtures use existing targets where containment matters; the undeclared dependency is independently resolved by Node. Fixtures are removed after each test. Real product-graph acceptance belongs to the common structure check and installed-seat smoke below, not to this fixture suite.

Tests assert consumer-visible acceptance, rejection, state transitions and side effects. They do not certify that a rule is correct because its text or command string exists. Temporary consumer files are isolated under the operating system temporary directory and are removed after the run.

## Actual product smoke

`npm run smoke` packs the product and installs the tarball in an isolated consumer, then prepares its workspace offline. The packed CLI installs the standalone Skill into an existing project and checks conflict protection. A copied Skill installs the template into its own project without workspace dependencies and refuses reinstallation. The packed product's structure check accepts, rejects a private cross-package import, and accepts after exact restoration; consumer checks likewise accept, reject invalid configuration, and recover. Existing consumer state is preserved.

The smoke prepares the consumer with dependencies already made available by the initial npm ci. Its template fixture may contact the configured registry for workspace metadata. A missing cache or unavailable registry is a prerequisite failure, not proof of a product regression or success. Tarball structure and an installed invocation do not alone prove every interactive task, OS, remote service or consumer-specific policy.

## Self-check corpus

Root npm run check uses the single governance-checks.json definition. Syntax checks authored modules. The structure gate checks the declared apps/packages graph and the imports those packages declare; it verifies literal static imports and exports plus literal dynamic import and require, forbids authored source links, and leaves computed import()/require() calls, aliased loaders, require.resolve, import.meta.resolve and other dynamic assembly unproven. It says nothing about semantic quality, and an unavailable TypeScript parser is a prerequisite failure rather than an acceptance. The separate templates/node-typescript workspace keeps its own structure predicate and is not covered by this product's gate. Documentation checks explicitly include root entries, references, docs, applications and packages; they validate links, single-line prose, entry budgets, declared bilingual pairs, package summaries and limitations. Archive exclusions affect source enumeration, not whether an inbound link resolves.

Compiler and type-equivalence gates are separately target-configured: target TypeScript project/declarations and bindings are prerequisites. Subsystem pages, upgrade guides and repository-reference policy also require their own actual target contract. Package tests prove their behaviours; no empty/default scan is reported as consumer activation. Existing Markdown examples and source citations are not automatically claimed as executable product APIs.

## Template verification

`npm run check:template` exports only the allowlisted files, installs from the frozen lock, and initializes an isolated Git index. It checks that an empty business workspace passes the unknown-cast command, then that new application and library assertions are each rejected and exact removal restores acceptance. It builds the empty workspace and runs its test suite. In its disposable copy it adds a library and an app that consumes it, proves missing host references fail, restores them with `pnpm run gen-host-references` and verifies freshness with `pnpm run gen-host-references --check`. It runs the existing `pnpm run gen-tsconfig-paths` source-alias generator before building and consuming both artifacts, exercises the library's invalid-input error, then cleans and rebuilds. Node 24, Git, the package manager and the initial offline cache are prerequisites; the workspace fixture may need registry access to update its temporary lockfile. The template's full gate graph and CI workflow are separate; its [testing guide](../templates/node-typescript/docs/testing.md) owns those predicates and evidence boundaries.

The app fixture also checks both supported source-entry forms through the dependency command, including rejection of undeclared runtime dependencies from either entry and recovery.

A template result establishes only its predicates. It does not prove B-stage governance effects on later development, C-stage Agent reproduction or independent adoption. Linux coverage for the template is declared through the template's own CI workflow and is not observed by a local Windows Node 24 run; remote execution, required checks and branch protection need their own evidence.

## CI and unverified layers

`.github/workflows/check.yml` declares locked installation, the root checks and the actual smoke on hosted Windows/Linux with Node 22.19 and 24. The root check includes the template export and isolated workspace exercise; the template's shipped workflow runs its own complete gate graph. A workflow file or local run does not establish a remote run, branch protection, human approval, release or independent Agent adoption. Note archive and weighted approval executors belong to the exported template, not the product runtime; triggered responsibilities still apply.

Report the command, actual exit state, changed inputs, relevant consumer state and remaining limitations. Preserve first failures and fix causes; never overwrite failure evidence or infer broader assurance from test counts.
