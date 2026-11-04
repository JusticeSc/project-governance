# Node/TypeScript governance template contract

English | [中文](template-design.zh.md)

This page describes the independent project at `templates/node-typescript/`. It is the source for the Skill's fixed offline asset, not a member of the product's npm workspace. `SOURCE-LICENSE.txt` records the copied material's provenance and license.

## Workspaces and runtime contract

The template ships without an application, library, or domain data. pnpm discovers real applications under `apps/*` and libraries under `packages/*/*`; the root workspace retains the governance toolchain. An empty member set is valid only when no applicable business workspaces exist. When a project adds members, its manifests, TypeScript references, workspace policy and applicable checks must describe the actual members rather than an example.

## Direct new-project starting point

The installed project's [starting guide](../templates/node-typescript/docs/cookbook/starting-a-project.md) owns setup and project-specific choices. Existing projects require an approved reconciliation of conflicting files and commands. The installer preserves existing content; copying non-conflicting files alone does not integrate conflicting governance configuration.

## Toolchain and source/artifact planes

The template requires Node `>=24 <25`, pins pnpm 11.28.5 and records its toolchain in its own lockfile. Its manifests own the script inventory. Build and checks operate on discovered, declared workspaces; generated outputs and dependencies are not distributed as template author files. Author `gitignore` files are restored as `.gitignore` during export.

## Gates, documentation and review

The template's `scripts/run-gates.ts` owns its aggregate, and its CI workflow invokes the project checks. The development and testing pages own prerequisites and commands; the installed Skills carry the development, review and simplification workflows. Rules for changes to real project data, public interfaces and operational behavior apply when those changes exist. An empty project is not a reason to skip checks once their subjects are introduced.

## What the product verifies, and what it does not

The product distribution selects the template's author files and the Skill asset; `npm run check:template` exercises an isolated export. `npm run smoke` exercises the actual packed product and installation. The template has a separate check graph and CI workflow. An installer success does not replace project setup, conflict reconciliation or running the applicable checks.

## Acceptance for this binding

- A new project can install the Skill's template without unrelated business code or a required agent-specific symlink.
- The empty template installs dependencies and runs applicable checks. Real added workspaces are discovered, built and checked; an invalid workspace is refused.
- Existing project files are not silently replaced; conflicts are reported and the integrated project is verified after approved reconciliation.
- The actual packaged Skill and template carry the required author files, not generated dependencies, build outputs or local agent settings.
- Product CI and the template's own CI must both pass before a release candidate is called ready.
