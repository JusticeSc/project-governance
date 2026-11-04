# Project governance

English | [中文](README.zh.md)

## Summary

A project Skill that installs a Node.js/TypeScript governance template for coding agents. The template provides workspace configuration, development and review Skills, checks and project documentation; it does not include a sample application or library. It is not a language-independent template.

## Use

1. Get the `project-governance/` Skill directory from [GitHub Releases](https://github.com/JusticeSc/project-governance/releases) or copy [`skills/project-governance/`](skills/project-governance/) from this repository. Copy the entire directory to `<project>/.agents/skills/project-governance/`.
2. Ensure your coding agent discovers project Skills from that location, then ask it to use `project-governance` to install the template. The Skill and its template asset work offline; they do not need this repository or npm dependencies.
3. For an existing project, review the reported conflicts and approve the intended changes before the agent reconciles them with the existing project. Installation is complete only when the needed governance files have been integrated into the actual project and its checks have been run. A separate reference copy or a partial copy is not completion.
4. Follow the installed project's `AGENTS.md` and documentation to set up its toolchain and continue development.

You can invoke the installer directly with Node.js >=22.19.0:

```sh
node <skill-dir>/scripts/install-template.mjs <project-directory>
```

The default refuses file conflicts before changing project files. `--add-missing` copies only paths absent from the project, reports every conflict, and exits with status 3 when manual reconciliation remains. It never overwrites an existing file. Redirected directories inside the project are refused; a project-root alias is permitted. On an installation failure, rollback is limited to unchanged paths created by the installer, and any paths requiring review are reported.

Installation does not install dependencies or hooks, initialize Git, or change remotes. It does not create an agent-specific discovery link: choose the location your coding agent actually supports.

## Template

`templates/node-typescript/` is an independent project used to build the Skill's fixed offline asset; it is not part of this repository's npm workspace. The template requires Node `>=24 <25` and pins pnpm 11.28.5. Its complete check also requires Git, Python 3.10 or newer, and the review-ownership Python requirements; see the installed project's development guide for the applicable environment and commands.

A product checkout with its npm workspace dependencies prepared can also export a reference copy to a new directory:

```sh
npm run export-template -- ../new-project
```

Export is not required to use the copied Skill. The [template design](docs/template-design.md) describes the workspace and check contracts.

## Tools and evidence

The [CLI](references/cli.md) runs declared trusted repository checks or installs a Skill. The [documentation package](packages/governance/documentation/README.md) supplies explicit-corpus checks, bilingual pairing and compiler-backed documentation checks. The template carries its own development and review executors. Missing prerequisites and failing commands are not successful checks.

## Develop and maintain

Follow [AGENTS.md](AGENTS.md), the [architecture](docs/architecture.md), [development](docs/development.md) and [testing](docs/testing.md) guides. `npm run check` runs the product's declared checks; `npm run smoke` exercises its packed distribution. The template has its own CI workflow and check graph. [Provenance](docs/provenance.md) and the [MIT notice](LICENSE) record attribution.
