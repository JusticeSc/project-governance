---
name: project-governance
description: Install the bundled fixed Node.js/TypeScript project-governance template into a new or existing project, protecting existing content and reconciling installation conflicts.
---

# Install the project-governance template

This Skill installs its bundled Node.js/TypeScript governance template, not a business application. Subsequent development follows the target's `AGENTS.md`, documentation and Skills.

## Prepare

Confirm the target path, stack and business, data and configuration to preserve. Installer: Node.js >=22.19.0. Template: Node.js `>=24 <25`, pnpm 11.28.5. The Skill's offline asset needs no npm workspace, `node_modules` or Claude-specific link.

If the required stack or package manager conflicts with this template, stop before installation. Explain the mismatch and agree on a compatible approach; `--add-missing` does not resolve incompatibility.

## Install

Run:

```sh
node <skill-dir>/scripts/install-template.mjs <project-directory>
```

`<skill-dir>` is this Skill's directory. New targets are created; existing directories may be shared. Default mode refuses collisions before writing and never overwrites existing files or links. Inner symlinks and junctions are refused; target-root aliases are allowed.

### Existing-project conflicts

1. Install to a temporary directory for a complete reference. Compare every conflict, including non-directory blockers, with the target; identify template obligations and behavior to preserve.
2. Get the user's approval for material business, data or important configuration changes; agree on merges. Never replace owner content merely to install.
3. Run `node <skill-dir>/scripts/install-template.mjs --add-missing <project-directory>` on the target. It copies only absent paths and lists all collisions. Exit 3 means conflicts remain: this is a **partial installation**, even if files were added. Exit 0 means no collisions; exit 1 means failure. Redirected inner directories are refused before writes. On write failure, inspect reported paths: rollback removes only unchanged creations from this run; uncertain content remains for review.
4. Reconcile every conflict and blocker against the reference, apply approved merges and preserve unrelated content. Remove the reference only after confirming this run created it.

## Verify and hand off

Inspect target entry points, configuration, scripts and project Skills. Confirm conflicts and blockers are reconciled, approved merges applied and protected content intact. Exit 0 does not prove an existing project's merged setup or behavior; a reference or partial installation is incomplete. Report unresolved conflicts and unperformed checks or setup.

Installation does not install dependencies or hooks, initialize Git or change remotes. New projects follow installed instructions to set up dependencies and start requested work; existing projects validate the merged setup and preserve behavior.
