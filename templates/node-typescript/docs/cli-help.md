# CLI help reference

English | [中文](cli-help.zh.md)

This page projects help from declared real CLI launchers, not a manually maintained option table. With no declared launcher there is no application help to project. When one is introduced, its owning application or package README documents behavior, failures, and side effects; [development](development.md#source-plane-and-packed-artifact-plane) owns source and built execution boundaries. Help output alone does not prove an option works.

## Declared CLI help

<!-- BEGIN GENERATED cli-help -->

<!-- END GENERATED cli-help -->

## Updating help

After adding a launcher or changing CLI options or help text, classify the launcher in `scripts/project-policy.ts` and declare its actual help command in `scripts/cli-help.manifest.json`: `id`, source `script`, help `args`, displayed invocation `display`, and `reason`. Run `pnpm run gen-cli-help`, then `pnpm run gen-cli-help --check`. The generator invokes each declared entry's help command and must fail when that entry fails, not accept empty output. With no entries, the projection records that absence rather than inventing a starter CLI. Both languages retain identical command output inside the generated region. Test changed options through actual acceptance and refusal paths, and test the built entry separately when its behavior is affected.
