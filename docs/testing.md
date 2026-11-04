# Testing and evidence

English | [中文](testing.zh.md)

## Package regressions

npm test executes each workspace's own test script and then the root tests. Checks tests cover real command validation, execution failure and real-path containment; distribution tests exercise real files, overwrite refusal and redirected installation paths. Documentation tests preserve actual parser and compiler behaviours, bilingual records, archive restrictions, boundaries and malformed input. Missing declared parser/compiler prerequisites fail rather than skip.

Root tests/structure.test.mjs exercises temporary npm/ESM graphs: package discovery, public export visibility, declaration ownership, production/test separation, dependency direction and cycles, public-entry placement, redirected manifests and source paths, and CLI dispatch through a legitimate root alias. Negative fixtures use existing targets where containment matters; the undeclared dependency is independently resolved by Node. Fixtures are removed after each test. Real product-graph acceptance belongs to the common structure check and installed-seat smoke below, not to this fixture suite.

Tests assert consumer-visible acceptance, rejection, state transitions and side effects. They do not certify that a rule is correct because its text or command string exists. Temporary consumer files are isolated under the operating system temporary directory and are removed after the run.

## Actual product smoke

npm run smoke uses npm pack, installs that tarball in a separate consumer, then runs npm ci --offline --ignore-scripts in its workspace root. It invokes the actual CLI, installs the Skill into an existing project with a space/Unicode path, prepares the installed seat, and exercises declared consumer checks. It then runs npm run check:structure in the installed seat and expects acceptance, injects a real relative private import of packages/governance/checks/src/index.mjs into apps/cli/bin/governance.mjs after its shebang, expects the gate to reject it, restores the exact bytes and expects acceptance again. A real invalid configuration fails; restoring it succeeds. Reinstallation is refused and pre-existing consumer state remains byte-identical. Installed documentation is checked without a sibling source checkout.

The smoke uses dependencies already made available by the initial npm ci. Offline cache failure is a prerequisite failure, not proof of a product regression or success. Tarball structure and an installed invocation do not alone prove every interactive task, OS, remote service or consumer-specific policy.

## Self-check corpus

Root npm run check uses the single governance-checks.json definition. Syntax checks authored modules. The structure gate checks the declared apps/packages graph and the imports those packages declare; it verifies literal static imports and exports plus literal dynamic import and require, forbids authored source links, and leaves computed import()/require() calls, aliased loaders, require.resolve, import.meta.resolve and other dynamic assembly unproven. It says nothing about semantic quality, and an unavailable TypeScript parser is a prerequisite failure rather than an acceptance. The separate templates/node-typescript workspace keeps its own structure predicate and is not covered by this product's gate. Documentation checks explicitly include root entries, references, docs, applications and packages; they validate links, single-line prose, entry budgets, declared bilingual pairs, package summaries and limitations. Archive exclusions affect source enumeration, not whether an inbound link resolves.

Compiler and type-equivalence gates are separately target-configured: target TypeScript project/declarations and bindings are prerequisites. Subsystem pages, upgrade guides and repository-reference policy also require their own actual target contract. Package tests prove their behaviours; no empty/default scan is reported as consumer activation. Existing Markdown examples and source citations are not automatically claimed as executable product APIs.

## Template verification

npm run check:template exports the authored template tree into an isolated directory, runs corepack pnpm install --frozen-lockfile --ignore-scripts there, builds the artifact plane and drives the built CLI on an empty source list and on a refused argument. The template's complete gate graph — structure, source typecheck and regressions, documentation predicates, Agent Note format and archive checks, lint, per-file coverage, build and the built-plane smoke — is the template's own contract and runs from its own CI workflow. It exercises the acquisition a consumer gets — a new output directory, no outer node_modules and no nested dependency installation. The entry needs Corepack and access to the pinned pnpm and the template's locked dependencies; an unavailable package manager, registry or lock entry is a prerequisite failure, not a template rejection. The root check list invokes this entry, so local runs and the product's CI share one definition without a second product workflow. The template page `templates/node-typescript/docs/testing.md` owns what each template predicate proves, which target violations it rejects and how restoration behaves; this page does not restate that contract.

A template result establishes only its predicates. It does not prove B-stage governance effects on later development, C-stage Agent reproduction or independent adoption. Linux coverage for the template is declared through the template's own CI workflow and is not observed by a local Windows Node 24 run; remote execution, required checks and branch protection need their own evidence.

## CI and unverified layers

.github/workflows/check.yml declares locked installation, the root checks and the actual smoke on hosted Windows/Linux with Node 22.19 and 24; the root check list includes the template export, locked install, source build and built CLI run, so that job covers acquisition without a second product workflow; the template's own shipped workflow runs its complete gate graph, which is a separate declaration. A workflow file or local run does not establish a remote run, branch protection, human approval, release or stable independent Agent adoption. Note archive execution, weighted approval execution and old host preflight are not supplied as working executors by this product's own runtime; the template's archive executor belongs to an exported copy. Their triggered rules remain duties rather than exempt checks.

Report the command, actual exit state, changed inputs, relevant consumer state and remaining limitations. Preserve first failures and fix causes; never overwrite failure evidence or infer broader assurance from test counts.
