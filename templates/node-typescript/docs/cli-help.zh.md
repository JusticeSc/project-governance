# CLI 帮助参考

[English](cli-help.md) | 中文

本页投影已声明真实 CLI 启动器的帮助，不是手工维护的选项表。没有已声明启动器时，没有应用帮助可投影。引入启动器后，由所属应用或包 README 记录行为、失败与副作用；[开发指南](development.zh.md#source-plane-and-packed-artifact-plane)拥有源码与构建执行边界。帮助输出本身不证明选项有效。

## 已声明 CLI 帮助

<!-- BEGIN GENERATED cli-help -->

<!-- END GENERATED cli-help -->

## 更新帮助

新增启动器或修改 CLI 选项或帮助文本后，更新 `scripts/project-policy.ts` 中的声明，运行 `pnpm run gen-cli-help`，再运行 `pnpm run gen-cli-help --check`。生成器调用每个已声明入口的帮助命令；入口失败时必须失败，不能接受空输出。没有入口时，投影记录这一事实，不虚构起步 CLI。两种语言在生成区域保留相同命令输出。通过真实接受与拒绝路径测试变动选项；构建入口行为受影响时另行测试构建入口。
