# Project governance

English | [中文](README.zh.md)

## Summary

An installation Skill and a fixed Node.js/TypeScript project template for coding agents. The Skill installs the template in a new or existing project, protects existing content and hands ordinary development to the project's own AGENTS.md and Skills. The template contains a real plugin-market example, workspace configuration, checks and project documentation; it is not a language-independent template.

## Use

Requires Node.js >=22.19.0 and npm with workspace support. From a product directory outside the target project:

```sh
npm ci --ignore-scripts
npm run install-template -- ../your-project
```

The target may be new or existing. Existing directories can be shared, but any conflicting file, link or non-directory blocks installation before project files are changed. The [Skill](SKILL.md) explains how to review and, with the necessary permission, merge conflicts into the actual project; a separate reference copy is not a completed installation.

`install-skill` installs the Skill's own seat, not the template. Do not put the complete Skill seat inside the target template project: its additional copy of the template can interfere with the project's checks. Installation does not install dependencies or hooks, initialise Git or change remote settings.

## Use the Skill in OMP

Clone this GitHub repository into `<workspace>/.omp/skills/project-governance`. From `<workspace>`, prepare the Skill and check that OMP discovers it:

```sh
npm --prefix .omp/skills/project-governance ci --ignore-scripts
omp read skill://project-governance
```

Start a new OMP session from `<workspace>` and ask it to use `project-governance` to install the template at the target project path. Keep the Skill checkout outside the target project. Existing conflicting files require review and permission as described in the [Skill](SKILL.md).

## Template

`templates/node-typescript/` is the fixed independent project used by the installer, not a member of this repository's npm workspace. For a separate reference copy, `export-template` still requires a new output directory.

Export creates a relative `.claude/skills` directory symlink to the canonical `.agents/skills` tree. The destination filesystem and account must permit symbolic links; on Windows this may require Developer Mode or an account with the symbolic-link privilege. Windows Git checkouts of the resulting project must materialize symbolic links (`core.symlinks=true`) to preserve Claude skill discovery.

```sh
npm run export-template -- ../new-project
cd ../new-project
corepack pnpm install --frozen-lockfile
corepack pnpm run typecheck
```

After export, enter the new project's AGENTS.md and [start-a-project tutorial](templates/node-typescript/docs/cookbook/starting-a-project.md) for project parameters, complete example replacement and first behavior verification. The commands above verify only installation and types. Before installing hooks or running index/history checks in a new export, follow the template's [Git bootstrap](templates/node-typescript/docs/development.md) to establish its own repository and initial import. Export itself never initializes Git or creates commits.

For the template's generator, provide a real source list and follow its own README; `start` is not a governance check. The complete template check (`corepack pnpm run check:ci`) needs Git, Python 3.10 or newer and the review-ownership Python requirements, and the POSIX fixtures require Linux or WSL 2. See the template's development guide for setup and the exact prerequisites.

Installation copies the authored files and restores the Claude skills link; it does not include dependencies, build outputs or caches. The template declares Node `>=24 <25` and pins pnpm 11.28.5 and its toolchain in its own lockfile. The template's own README, architecture, development and testing pages own its project instructions; the [template design](docs/template-design.md) describes its binding.

## Tools and evidence

The [CLI](references/cli.md) runs declared trusted repository checks or installs a Skill. The [documentation package](packages/governance/documentation/README.md) provides explicit-corpus checks, bilingual pairing and compiler-backed documentation checks. Missing prerequisites, failed commands and unverified layers are not success. The check runner does not select obligations or certify adoption.

The template carries its own executors — structure, documentation pairing, Agent Note format and archive checks, build and built-plane smoke — in `scripts/`, run through its own gate graph. They belong to the template and run inside an exported copy; this product's CLI and documentation package neither invoke them nor gain those predicates. Local execution, remote CI, platform enforcement and independent Agent adoption are different evidence. The product does not activate weighted approval or Note archive checks in a consumer's existing project; the exported template carries its own executors. It does not certify autonomous adoption. Their [rules](references/decisions.md) still apply when triggered; lack of an executor in a project is a missing implementation, not an exemption.

## Develop and maintain

Follow [AGENTS.md](AGENTS.md), the [architecture](docs/architecture.md), [development](docs/development.md) and [testing](docs/testing.md) guides. `npm run check:structure` verifies the declared package graph — public entries, package-name imports and published subpaths, workspace declarations and cycles — using TypeScript only as a parser; `npm test` runs each workspace's tests and then the root regressions. Computed import/require calls, aliased loaders, `require.resolve` and other dynamic resolution remain unproven, and the independent template keeps its own structure predicate. `npm run check:template` exports the template into an isolated directory, performs the locked install, builds it and runs the built CLI on an empty source list and on a refused argument; the root check list invokes it, so local runs and CI share one definition. Current contracts live with their owners; this repository does not require maintainer session files or a sibling source checkout. [Source attribution](docs/provenance.md) and [MIT notices](LICENSE) explain origin, not operational success.
