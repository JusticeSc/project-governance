---
kind: upgrade-guide
description: Preserve projects using the plugin-market sample when adopting the empty governance template.
---

# Move from the plugin-market sample

English | [中文](guide.zh.md)

## Change

The v0.1.1 template included `apps/plugin-market-generator` and `packages/util/plugin-market-index` and created a `.claude/skills` link. The next template starts without a sample application or library and does not create that link. A fresh installation no longer provides the sample's commands or APIs. Existing project files are not removed automatically.

## Migration

1. Preserve the existing project, data and local changes. Identify any use of the two sample paths and `.claude/skills`; do not delete the application, library or data merely because the new template omits them.
2. Obtain the new `project-governance/` Skill in a separate location, without overwriting an existing Skill seat. If an agent relied on `.claude/skills`, use that agent's supported Skill discovery location instead.
3. For an existing project, compare the new template with its files and approve necessary merges. The command below adds only missing paths; exit 3 means conflicts still require reconciliation, not that adoption is complete. Redirected directories are refused before writes. If installation fails, inspect its reported paths and retain the backup until recovery is complete.

   ```sh
   node <new-skill-dir>/scripts/install-template.mjs --add-missing <existing-project>
   ```

4. Keep or replace any sample code the project actually uses as project-owned code. Reconcile the reported configuration and documentation conflicts without overwriting unapproved content. After the merged project has a reviewed pnpm lockfile, use Node 24 and pnpm 11.28.5 to run `pnpm install --frozen-lockfile`, `pnpm run build` and `pnpm run constraints` from the project root. Also run the project's existing tests and start its application when applicable. Resolve failures before declaring the migration complete.
