# CLI 帮助参考

[English](cli-help.md) | 中文

本页投影真实生成器入口的帮助，不是手工维护的选项表。[应用 README](../apps/plugin-market-generator/README.zh.md)拥有运行行为、失败与副作用；[开发指南](development.zh.md#generator-commands-and-side-effects)拥有源码与构建启动模式。帮助输出本身不证明选项有效。

## 生成器帮助

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

## 更新帮助

修改 CLI 选项或帮助文本后，运行 `pnpm run gen-cli-help`，再运行 `pnpm run gen-cli-help --check`。生成器以 `--help` 调用 `apps/plugin-market-generator/src/bin.ts`；入口失败时必须失败，不能接受空输出。两种语言在生成区域保留相同命令输出。通过真实接受与拒绝路径测试变动选项；构建入口行为受影响时另行测试构建入口。
