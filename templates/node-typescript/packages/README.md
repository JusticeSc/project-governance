---
description: "The package workspace: how npm packages under packages/ are grouped, what each group owns, and the conventions that bind them."
kind: "package-group"
---

# Packages

English | [中文](README.zh.md)

## Summary

The toolkit is assembled from npm packages under `packages/`, grouped by capability family. This checkout has one group: [`util/`](util/README.md), which holds shared primitives consumed by the apps and by future packages. Use this page as the top-level map: find the owning group, then open its README for the package list. Every package is scoped `@deepseek-ai/dsh-*` and lives in exactly one group; each group README is the authoritative package map for its family.

## Table of Contents

- [Package groups](#package-groups)
- [Release expectations](#release-expectations)
- [Dependencies](#dependencies)
- [Package README contracts](#package-readme-contracts)
- [Dev Note](#dev-note)

-----

<a id="package-groups"></a>
## Package groups

Every package lives in exactly one group; new packages join existing groups, and a new group updates its own README and this table.

| Group | Role |
|---|---|
| [`util/`](util/README.md) | Low-level libraries shared across the workspace: the format-1 validator and any future zero-domain primitive |

-----

<a id="release-expectations"></a>
## Release expectations

A package's manifest declares its publication intent. The validator is a publishable library with a public `publishConfig` and a `repository` entry; the generator app is `private` and is not published. Public APIs are pre-stable: update all in-repository consumers in the same change; externally observable breaks follow the [upgrade-guide workflow](../.agents/skills/dsh-create-upgrade-guide/SKILL.md). There is no experimental group in this checkout.

-----

<a id="dependencies"></a>
## Dependencies

Dependencies point from the app and higher-level packages toward `util/`; the reverse dependency does not exist. A `util/` package registers no app service and owns no product state, so its consumers keep the domain semantics.

- The app depends on the validator for parsing and install arguments; the validator's [manifest](util/plugin-market-index/package.json) owns its external dependencies.
- Workspace dependencies use `workspace:*`.
- A new dependency needs a current consumer that cannot reasonably use the standard library; `pnpm run constraints` checks the declared graph. A maintained replacement follows [the replacement workflow](../docs/development.md#replacing-maintained-code-with-a-dependency), which owns semantic comparison, integration evidence and removal of obsolete owned code.

-----

<a id="package-readme-contracts"></a>
## Package README contracts

Every package README follows the [kind, Summary, Model Experience and limitations contract](../docs/cookbook/adding-a-package.md#4-write-the-package-readme). Reasoned no-section classifications live in `scripts/package-readme-policy.manifest.json`; do not copy an unrelated group's exemption or use an unexplained "none". Package conventions — exports, source/artifact planes, tests, TypeScript layout — live in [packages/AGENTS.md](AGENTS.md).

-----

<a id="dev-note"></a>
## Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
