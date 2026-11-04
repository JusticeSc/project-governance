# CLI help reference

English | [中文](cli-help.zh.md)

This page projects help from the real generator entry, not a manually maintained option table. The [app README](../apps/plugin-market-generator/README.md) owns operational behavior, failures and side effects; [development](development.md#generator-commands-and-side-effects) owns source and built launch modes. Help output alone does not prove an option works.

## Generator help

<!-- BEGIN GENERATED cli-help -->
### `plugin-market-generator`

```text
$ pnpm run start -- --help
Usage: plugin-market-generator [options]

Write a plugin market index from a list of npm packages and Git repositories.

Options:
  --input <file>           source list: one npm package name or https Git URL
                           per line; lines starting with # are comments
  --output <file>          index file to write; large icons go to icons/ beside
                           it, and stale generated icons there are removed
  --title <text>           market title
  --description <text>     market description
  --cache <dir>            cache directory (default: .plugin-market-cache beside
                           the input list)
  --registry <url>         npm registry (default: "https://registry.npmjs.org/")
  --inline-icon-bytes <n>  largest icon embedded as a data URL, at most 32768
                           (default: 16384)
  --concurrency <n>        sources read at once (default: 4)
  --timeout-ms <n>         deadline for one request or git command (default:
                           60000)
  -h, --help               show this help

Exit status: 0 when every source was read, 1 when some source fell back to its cached result or was omitted,
2 for invalid arguments or input.
```
<!-- END GENERATED cli-help -->

## Updating help

After changing CLI options or help text, run `pnpm run gen-cli-help` and then `pnpm run gen-cli-help --check`. The generator invokes `apps/plugin-market-generator/src/bin.ts` with `--help`; it must fail on a failed entry rather than accepting empty output. Both languages retain identical command output inside the generated region. Test changed options through actual acceptance and refusal paths, and test the built entry separately when its behavior is affected.
