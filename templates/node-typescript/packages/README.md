---
description: "The package workspace: how npm packages under packages/ are grouped, what each group owns, and the conventions that bind them."
kind: "package-group"
---

# Packages

English | [中文](README.zh.md)

## Summary

Libraries belong under `packages/<group>/<package>/`, grouped by their actual capability family. This project currently has no package groups or libraries. When a requested behavior needs a library, use this page to find its group and that group's README for its package list; each group README is the authoritative map for its family. Package names come from their manifests, not a required source-project scope.

## Table of Contents

- [Package groups](#package-groups)
- [Release expectations](#release-expectations)
- [Dependencies](#dependencies)
- [Package README contracts](#package-readme-contracts)
- [Dev Note](#dev-note)

-----

<a id="package-groups"></a>
## Package groups

Every package lives in exactly one group. Reuse a group when its role fits; a new group updates its own bilingual README and this navigation. There are no declared package groups yet; add navigation only when a real group owns a package. Follow [adding a package](../docs/cookbook/adding-a-package.md) for registration and documentation.

-----

<a id="release-expectations"></a>
## Release expectations

A package's manifest declares its publication intent. Libraries follow the repository's publication rules; applications are private. Update all in-repository consumers with a changed contract; externally observable breaks follow the [upgrade-guide workflow](../.agents/skills/dsh-create-upgrade-guide/SKILL.md) when its conditions apply. Release and registry publication require their own authorization and evidence.

-----

<a id="dependencies"></a>
## Dependencies

Dependencies follow actual responsibilities: a library does not depend on an application. Declare dependencies at their owning member and review cross-package contracts and policy classifications when introducing them.

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
