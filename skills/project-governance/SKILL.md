---
name: project-governance
description: Install the bundled fixed Node.js/TypeScript project-governance template into a new or existing project, protecting existing content and reconciling installation conflicts.
---

# Install the project-governance template

This Skill installs its bundled fixed template. The template includes an example application and project governance files. Once installed, hand ordinary development to the target project's own AGENTS.md, documentation and Skills.

## Prepare and install

Confirm the target path, its technology stack and existing content to protect. The installer requires Node.js >=22.19.0; the template itself requires Node.js `>=24 <25` and pnpm 11.28.5. The destination filesystem and account must permit directory symbolic links; on Windows this may require Developer Mode or symbolic-link privilege. The copied Skill includes the template as an offline asset and needs no npm workspace or node_modules.

Run:

```sh
node <skill-dir>/scripts/install-template.mjs <project-directory>
```

`<skill-dir>` is this Skill's directory; the target may be new or existing. The installer checks all conflicts before writing to the target. Existing directories may be shared, but a conflicting file, link or non-directory stops installation. Existing files are not overwritten. If installation fails during writing, inspect the reported paths; rollback removes only this run's unchanged creations, not uncertain user content. Installation does not install dependencies or hooks, initialize Git, change remote settings or replace the example business.

## Reconcile conflicts

Read the conflicting project and template files and identify what to preserve, merge or add. For a complete reference, run the same installer into a new temporary directory. Obtain the user's approval for changes to existing business, data or important configuration, then apply the approved merges and install the remaining template files, directories and links into the actual project. Preserve existing content outside the approved changes and account for every conflict. A reference copy or partial copy alone is not a completed installation. Remove a temporary reference only after confirming this run created it.

## Handoff

Confirm the actual target contains the template's entry points, configuration, scripts and project Skills, that protected content remains intact, and that approved merges are complete. Report unresolved conflicts and any checks or setup not performed. Installing dependencies, initializing the project's Git repository, replacing example business and subsequent development follow the target project's own AGENTS.md and documentation; they are not completed by template installation.
