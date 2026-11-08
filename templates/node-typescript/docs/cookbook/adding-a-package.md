# Cookbook: adding a workspace package

English | [中文](adding-a-package.zh.md)

The file-by-file checklist for a new workspace library under `packages/`. Choose its name and role for the actual project. For initial project setup, use [Start a project](starting-a-project.md).

## 1. Create the package

```text
packages/<group>/<pkg>/
  package.json     # declared identity, dependencies and built exports
  tsconfig.json    # extends ../../../tsconfig.base.json, rootDir src,
                   # outDir lib/types, references each actual workspace dependency
  src/index.ts     # public entry
  src/types.ts     # exported types only; no runtime code
  tests/           # Vitest specs owned by this package
  tests/tsconfig.json # no-emit TypeScript project for type-aware lint
  README.md        # contract, API, side effects, limitations
  README.zh.md     # Chinese counterpart
  README.i18n.yaml # bilingual consistency record
```

Choose an existing group when one matches the package's role. A new group is a pure container: no `package.json`, no source files, and packages still sit exactly one level below it; the group gets its own `README.md`/`README.zh.md` pair and a row in [packages/README.md](../../packages/README.md). Its README links the owning `docs/subsystems/*.md` page, or `scripts/project-policy.ts` records a justified no-page classification.

After adding real tests, create their type-aware lint project with `pnpm run gen-test-tsconfig packages/<group>/<pkg>`. The host aggregate continues checking those tests, while the package source project still includes only `src`. See the [TypeScript project layout](../development.md#typescript-project-layout) for command prerequisites and existing configs.

`package.json` invariants:

- `type: "module"`; `version` and `license` match the root `package.json` regardless of scope.
- `main: "lib/index.js"` and `types: "lib/types/index.d.ts"`.
- `exports["."]` maps `types` to `./lib/types/index.d.ts` and `default` to `./lib/index.js`; export `./package.json` for metadata readers.
- `files` lists exactly the built artifacts the package publishes. Do not add `src/**`; a packed consumer uses the built root export.
- Workspace dependencies use `workspace:*`. A runtime validator or parser the package needs goes in `dependencies`; test-only and type-only tooling goes in `devDependencies`.
- A publishable library sets `publishConfig.access: "public"` and a `repository` entry; a private app sets `private: true`.

In-package relative imports use explicit `.ts` specifiers in source (for example, `export * from './types.ts'`). The compiler rewrites them to `.js` in emitted JavaScript and leaves them resolvable in declarations for NodeNext consumers.

## 2. Register it in the root configs

| File | Change |
|---|---|
| `tsconfig.base.json` | Run `pnpm run gen-tsconfig-paths`; it maps each declared library to its actual source and preserves handwritten aliases outside the generated region. Do not add group wildcards. |
| `tsconfig.host.json` | After the package manifest and source config exist, run `pnpm run gen-host-references` to derive actual-member references for the Node aggregate; follow the [TypeScript layout and reference ownership](../development.md#typescript-project-layout). |
| `scripts/product-use.manifest.json` | State the package's role and reason. Use `product` when a declared entry reaches it through runtime dependencies; otherwise choose `development-only` or `test-support` for its actual use. Run `pnpm run verify-product-use`. |
| `pnpm-workspace.yaml` | No edit: `packages/*/*` already includes the package. |

`pnpm install` registers the workspace and updates the lockfile. Classify actual cross-package runtime exports in `scripts/package-dependency-policy.ts`; update `scripts/project-policy.ts` only when launchers, group policy or the real typed-import probe changes. `pnpm run constraints` checks workspace and publication rules; `build:check` consumes the latest artifacts rather than building them.

## 3. Decide the package topology

Keep one package unless its roles genuinely evolve independently. When they do, separate a capability definition, an implementation, and a consumer, so replacing the implementation does not change the consumer. A single-purpose library stays one package.

### Name the role that exists

Name the stable current responsibility. Do not name the first implementation, a possible future expansion, or a base class. An interface package names the capability; an implementation package adds the mechanism, protocol, environment, or vendor that distinguishes it.

| Word | Use it when | Do not use it when |
|---|---|---|
| `Controller` | It accepts commands or user intent and changes one existing state. | It executes arbitrary work or owns a provider fleet. |
| `Store` | It owns one data set and mainly offers create, read, update, delete, snapshot, or subscription operations. | It validates a state machine, arbitrates authority, or dispatches work. A map does not make a class a store. |
| `Directory` | It exposes entries and metadata for discovery or selection. | Producers register implementations into it, or callers execute work through it. |
| `Presenter` | It is a pure conversion from domain values to render intent. | It performs I/O, subscribes, mutates state, or owns lifecycle. |
| `Registry` | It owns a dynamic set of named registrations, including lookup, duplicate or precedence rules, lifetime, and disposal. | Its main contract is dispatch, execution, cancellation, or policy. |
| `Runtime` | It runs live work and owns dispatch, cancellation, or operation lifecycle across calls. | It only stores records, returns a catalog, or resolves one value. |
| `Resolver` | It computes or locates one answer from supplied inputs without owning that answer's lifecycle. | It owns a mutable collection or long-running execution. |
| `Engine` | It implements a domain algorithm or stateful execution model. | It only selects a provider or forwards across a protocol boundary. |
| `Policy` | It decides what is allowed, selected, limited, or observed. | It performs the mechanism the decision permits. |
| `Executor` | It runs one explicit request or resolved specification in one capability. | It owns a broad application lifecycle or provider catalog. |
| `Gateway` | It adapts a process, network, RPC, or API boundary. | It only registers same-process services or stores metadata. |
| `Provider` | It supplies one implementation of a capability definition. Add a mechanism or vendor qualifier when several can exist. | It is the capability definition or the consumer runtime. |
| `Backend` | It implements replaceable lower-level persistence, transport, or execution behind a defined interface. | It is a user-facing service. |
| `Handle` | It refers to one live resource and controls or observes that resource. | It creates and manages the complete resource pool. |
| `Config` | It owns one resolved configuration value or one tightly bounded record and its update contract. | It stores a general collection or exposes unrelated settings. |
| `Service` | It owns a cohesive domain service that no sharper role above states honestly. | The name exists only because another library calls the class a service. |

Prefer a singular name for one engine, runtime, policy, controller, resolver, store, or current configuration, and a plural name for a registry or a service that owns multiple named members. The role and the name must agree.

## 4. Write the package README

The package README is the per-package contract. Keep it short and current:

- **Summary** — purpose, when to choose the package and its main cost, at most 100 English words; do not introduce implementation taxonomy as the reader's task.
- **Use this package / API** — the exported functions and types, with one line each on preconditions, failures, and side effects.
- **Limitations** — durable consumer gaps and non-obvious maintainer constraints. Ordinary cleanup stays in a source TODO or an Agent Note.
- **Verify** — the focused test command and any artifact or environment prerequisite.

The README must not restate JSDoc, generated catalogs or another package's implementation. Choose `kind` mechanically from the repository position and actual entry: `package-group`, `package-library`, `package-reference` or `package-bundle` under the [documentation standard](../AGENTS.md#package-readme-contracts). Give `description` a factual purpose. Every README is a bilingual pair; write both sides and record only the pair you reviewed. Keep `## Known Limitations and Deferred Work` for durable local gaps; a package genuinely without any uses a reasoned exemption in `scripts/package-readme-policy.manifest.json`, not an unexplained "none". Group maps and generic libraries may have different justified classifications; no package copies another package's exemption.

Container maps derive `package-group`; member contracts default to `package-reference`. Assign `package-library` to a generic library or `package-bundle` to an actual composition only through an audited `packageKinds` policy entry with a reason. Each kind selects exactly one matching template. A new kind adds its template, repository placement, owner and focused check together; do not add a local label without governance.

Frontmatter rejects `name`, `audience`, ungoverned `tags` and README-local `i18n`; factual `description` and kind are not a second package manifest.

```markdown
## Summary

What the package owns and who calls it.

## API

| Export | Role |
|---|---|
| `example()` | One sentence: input, result, failure. |

## Known Limitations and Deferred Work

- **Gap** — the exact missing case, its consequence, and any maintainer constraint.
```

Classify Model Experience from implementation, independently of limitations. A generic model-agnostic library or a group map uses the policy's reasoned no-section classification; this example's validator has no prompt, tool or model context and must not invent one. A package with zero direct effects or one consumer-owned path may use a reviewed `None, as ...` or `Indirectly, through ...` sentence plus `#### KV Cache effect` and one non-empty paragraph. Name the actual condition or consumer, not its implementation details.

When a package owns model-facing content, add `## Model Experience`, one H3 per direct, conditional, capped, lifetime or auxiliary context entry, and the ordered H4 fields `What the model sees`, `Token effect`, `KV Cache effect`, each with one prose paragraph. Quote stable owned literals exactly: a long literal uses a titled H5 and a `markdown` fence under the field introducing it; keep short literals inline with named placeholders. Summarize only data-dependent or provider-owned text. Link generated tool schemas to their anchored catalog and state only local deltas; separate prompt and schema entries if visibility can differ. State fixed/conditional/retained/replaced/capped/zero-direct token effects and append-only/prefix-stable/replacing/independent cache behavior, including invalidation conditions. Do not present a UI or transport detail as a model-visible concept.

Metadata readers, when introduced, follow the [non-activation and self-contained resource contract](../defensive-patterns/conditional-domains.md#display-metadata-without-activation), with formats, byte limits, locale chain and package/subpath addresses owned by that actual protocol. They are not grounds to add a plugin host to an ordinary library.

## 5. Verify

```sh
pnpm install        # registers the workspace
pnpm run doc-sync   # documentation and pairing gates
pnpm run constraints && pnpm run typecheck && pnpm run lint
pnpm run test:coverage
pnpm run build && pnpm run hygiene
```

Follow the [testing policy](../testing.md) for the behavior tests, real entry path, and coverage the new package needs. A package whose source is not read by a packed consumer needs a built-export smoke; a package with no runtime code needs types-only verification.
