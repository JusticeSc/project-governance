# `@project-governance/documentation`

English | [中文](README.zh.md)

## Summary

This package ships the governance documentation gates as one Node ESM package: portable checks for Markdown links, paragraph wrapping, standing-document budgets, English/Chinese pairing records, repository-reference policy, package-group subsystem pages, package README summaries and caveats, documented TypeScript compilation, literal type equivalence, and upgrade-guide layout. Every command reads a target repository's own configuration and corpus, reports findings, and never edits target documents except when a caller explicitly re-records a bilingual pair.

## Scope of the package

One package, eleven independently triggered commands. A target enables the commands its documents need; there is no aggregate score, no implicit corpus and no built-in policy. Rule bodies stay in the governance references, and this README only explains how each command reads a target repository.

## Prerequisites

- Node.js 22.19.0 or newer, as declared by `engines.node`.
- The Markdown and YAML parsers pinned in this package's `package.json`, installed from the workspace lockfile with `npm ci --ignore-scripts` before any command runs; a missing parser is exit 2, never a pass.
- TypeScript from the target repository for `doc-typecheck` and `verify-type-equiv`: both resolve the target root `package.json`, so the target must install its own compiler.
- A target repository that declares each command's configuration under `.doc-gates/`; nothing in this package supplies a default corpus or default policy.

## Commands

Each command is declared as a `bin` entry of this package; run it directly from a checkout with `node <skill>/packages/governance/documentation/src/<command>.mjs` or through the linked executable name.

### Markdown links: `verify-md-links`

- Trigger: relative links, anchors, moved pages, or newly archived notes change.
- Target configuration: `.doc-gates/markdown-links.json` with `roots`, `files` and optional `archiveRoots`, which defaults to `.agents/notes/archived`.
- Checks: each repository-relative target exists, each fragment resolves to a rendered heading or an `<a id>` anchor, percent-encoded paths decode, and a missing target is reported before a fragment mismatch.
- Does not check: external, root-absolute or protocol-relative URLs, anchors inside non-Markdown targets, and code fences or commented-out HTML, which never create anchors. In-page fragments are checked.

### Paragraph wrapping: `verify-md-wrap`

- Trigger: prose is added to ordinary paragraphs, list items or block quotes.
- Target configuration: `.doc-gates/markdown-wrap.json` with the same `roots`, `files` and `archiveRoots` corpus fields.
- Checks: one source line per prose paragraph, reporting `file:line` for every hard-wrapped continuation; fenced code, HTML blocks, tables and YAML frontmatter stay exempt.
- Does not check: line length, table or HTML layout, translation quality, and archived documents, which are excluded from the source corpus.

### Standing budgets: `verify-doc-budgets`

- Trigger: a standing document such as a project entry file keeps growing.
- Target configuration: `.doc-gates/doc-budgets.json`, a map from literal path to a positive word ceiling; `--list` prints the table instead of failing.
- Checks: whole-file whitespace token counts, including frontmatter, Markdown syntax and code, plus missing budgeted files, non-positive ceilings and an empty manifest.
- Does not check: prose quality, per-section size, or whether a reviewed ceiling is still the right one.

### Bilingual pairing: `verify-translation-pairing`

- Trigger: an English document or its Chinese counterpart is edited, added, archived or deleted.
- Target configuration: `.doc-gates/translation-pairing.json` with `roots`, `files`, `excluded`, `generatedSources` and `publicRepositoryBlobRoot`.
- Checks: the counterpart exists, the `.i18n.yaml` section record matches both sides, the language switcher is present, and headings, lists, tables, code blocks and link targets line up.
- Does not check: translation accuracy or fluency, and it never injects generated regions; `--write <pair>` or `--write --all` is the only mode that writes, and `--cached <pair>` reads staged bytes.

### Repository references: `verify-repository-references`

- Trigger: maintained text may carry commit identifiers, disallowed repository URLs or blocked terms.
- Target configuration: `.doc-gates/repository-references.json` with `gitRoot`, `roots`, `files`, `excludePrefixes`, `commitIdentifiers`, `forbiddenUrls`, `allowedUrlLiterals`, `bannedTerms`, `ruleExclusions`, `generatedRegions` and `gitDiscovery`; `--list` reports without failing.
- Checks: hexadecimal identifiers that resolve to exactly one commit object, disallowed URLs after percent and HTML-entity decoding, blocked terms in paths and lines, declared per-rule exclusions and marker regions.
- Does not check: anything outside the declared corpus, and it takes no built-in organisation list: every rule set, including an explicitly empty one, is target configuration and requires a real Git object database.

### Subsystem pages: `verify-subsystem-pages`

- Trigger: package groups, subsystem pages or ownership exemptions change.
- Target configuration: `.doc-gates/subsystem-pages.json` with `packagesRoot`, `docsRoot`, `pageRoot`, `groupReadme`, `manifest`, `pageSuffix` and `exemptions`.
- Checks: every group README links a page under the page root that actually exists, and every exemption carries a justification, names a live group, and is not contradicted by a real link.
- Does not check: Chinese pages, subsystem index files, indirect links, bare paths, and the page's content; the link is judged by where it resolves, not by how it reads.

### Package README summaries: `verify-package-readme-summaries`

- Trigger: a package, group or root README is created or its summary is rewritten.
- Target configuration: `.doc-gates/package-readme-summaries.json` with `packagesRoot` and `readme`.
- Checks: every discovered root, group and package README carries `## Summary` of at most 100 whitespace tokens.
- Does not check: whether the summary is accurate, non-English READMEs, and packages whose README is absent from the scan.

### Package README caveats contract

- Trigger: run `verify-package-readme-limitations` when a package is added, retired, or its deferred work is documented or removed.
- Target configuration: `.doc-gates/package-readme-limitations.json` with `packagesRoot`, `manifest`, `readme` and `exemptions`.
- Checks: each scanned package README has exactly one `## Known Limitations and Deferred Work` section with reader-visible top-level `- ` bullets, and each exemption names a live package whose section is actually absent.
- Does not check: whether the bullets are complete or substantive, and it does not accept variant headings, deeper headings or competing non-goals sections.

### Documented compilation: `doc-typecheck`

- Trigger: documentation shows `ts` code blocks that call the project's API.
- Target configuration: `.doc-gates/typecheck.json` with a corpus, `tsconfig` and `mode`, which is `project` or `declarations`.
- Checks: `ts` blocks compile against the target tsconfig and its real types, `ts ignore-check` blocks are counted against an opt-out budget, and a Chinese derivative reuses the English blocks only when its checked sequence is identical.
- Does not check: `ts type-equiv`, `ts public-api` and catalog fences owned by other gates; `declarations` mode only maps `<dir>/src` aliases to `<dir>/lib/types`, so any other layout needs `project` mode.

### Type equivalence: `verify-type-equiv`

- Trigger: a document copies a declaration, projection or augmentation of a real TypeScript symbol.
- Target configuration: `.doc-gates/type-equiv.json` with a corpus and `manifest`, defaulting to `.doc-gates/type-equiv.manifest.json`, whose entries name `doc`, `symbol`, `source`, optional `projection` and `augmentations`.
- Checks: the fenced declaration equals what the target compiler produces, including JSDoc and literal content while ignoring trivia and bodies, and the manifest stays a bijection over the corpus.
- Does not check: the block against the project's types, which is `doc-typecheck`'s job, and undisclosed blocks, duplicate entries or sources outside the corpus are refused rather than inferred.

### Upgrade guides: `verify-upgrade-guides`

- Trigger: a release note, migration guide or breaking change is documented.
- Target configuration: no file; the command takes `--root`, `--guide-root` (default `docs/upgrade-guide`), `--sections`, `--max-words` and `--print-config`.
- Checks: the `v<version>/<item>/guide.md` layout, the `kind: upgrade-guide` frontmatter with a non-empty description, the Change and Migration outline, and the 500-word ceiling that counts frontmatter.
- Does not check: a repository with no guide tree, which passes by design, and the Chinese guide's word count unless a ceiling is declared for it.

## Behaviour that is easy to misread

- Link and wrapping corpus scans reject empty or wholly archived input with exit 2. Pairing and package-caveat scans can accept an empty declared scope; that is not evidence of coverage.
- Link and wrapping scans exclude archived sources but still check inbound links. Pairing uses its own manifest exclusions and does not implicitly exclude every archived directory.
- A bilingual record is re-recorded only for the pairs the caller names, or for the whole corpus with `--write --all`; editing one side is out of sync until the counterpart moves too.
- A missing upgrade-guide tree passes, and a missing subsystem-page configuration is exit 2: the two commands treat absence differently on purpose.
- Two type commands answer different questions: `doc-typecheck` compiles documented snippets against the target API, while `verify-type-equiv` compares copied declaration text literally.

## Exit codes

- `0`: no findings in the selected scope, including a command's documented absent-tree or empty-scope case; this is not proof of coverage.
- `1`: findings were reported for the declared corpus.
- `2`: unusable invocation, configuration, corpus or prerequisite, including a missing parser, compiler or Git database.

## Running and verifying

```sh
npm ci --ignore-scripts
npm test --workspace @project-governance/documentation
```

The package tests spawn each command against disposable target trees under the operating system's temporary directory; they need the pinned parsers, the pinned compiler and a `git` executable on `PATH`.

## Rule owners

- [documentation.md](../../../references/documentation.md): composition of the documentation obligations and their routing.
- [documentation-structure-and-prose.md](../../../references/documentation-structure-and-prose.md): document tiers, prose and budget rules.
- [documentation-links-and-repository-policy.md](../../../references/documentation-links-and-repository-policy.md): link, anchor and repository-reference policy.
- [documentation-localization.md](../../../references/documentation-localization.md): bilingual pairing and record rules.
- [documentation-package-and-api.md](../../../references/documentation-package-and-api.md): package README, subsystem page and API documentation rules.
- [documentation-adoption-and-checks.md](../../../references/documentation-adoption-and-checks.md): how a project enables and wires these commands.
- [upgrade-guides.md](../../../references/upgrade-guides.md): upgrade-guide layout, metadata and section contract.

## Known Limitations and Deferred Work

- `verify-upgrade-guides` passes a repository with no guide tree at all, so an empty or mislocated guide root is not reported by that command.
- `doc-typecheck` `declarations` mode only understands source aliases that map to `<dir>/lib/types`; a target with another build layout must use `project` mode.
- `verify-type-equiv` checks only symbols listed in its manifest and refuses everything else, so a new copied declaration fails until the manifest is updated.
- `verify-repository-references` needs a real Git object database and refuses to run without one; it cannot evaluate commit identifiers from text alone.
- Repository-reference policy is entirely target configuration: this package ships no organisation list, no blocked terms and no commit scan defaults.
- `verify-subsystem-pages` proves a direct link resolves under the page root; it does not judge whether the page describes the group.
- These gates read configured paths only; they do not discover obligations, choose a corpus, or keep a policy current for the target project.
