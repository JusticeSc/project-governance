# 贡献

[English](CONTRIBUTING.md) | 中文

感谢你帮助维护这个工具包。它是一个独立、由来源裁剪而来的项目：托管副本的一方负责其贡献政策、发布流程与远端设置。以下规则说明在仓库内如何开发与验证一项变更。

## 修改代码之前

先阅读根 [AGENTS.md](AGENTS.md)，再阅读你要触及领域的 owner：[架构](docs/architecture.zh.md) 说明 workspace 边界，[开发指南](docs/development.zh.md) 说明环境准备与检查，[测试策略](docs/testing.zh.md) 说明所需证据，[文档标准](docs/AGENTS.md) 说明 Markdown 与双语配对。

## 工作流

- 一项变更只对应一个可观察行为。在同一变更中更新该行为触及的所有消费方、测试与文档。
- 除非请求明确要求改变，否则保留生成器与校验器的来源行为。格式变更从[格式合同](.agents/notes/implemented/feature/2026-10-02-plugin-market-index-format.zh.md)开始。
- 将有持久影响的决策理由记录到 [Agent Note](.agents/notes/README.zh.md)；机械性或局部修改无需记录。不要把旧决策改写成相反的决策。
- 同时更新双语配对的双方，并用 `pnpm run verify-translation-pairing --write <pair>` 重新记录。
- 不要把凭据、本地缓存目录、构建产物与生成的索引文件提交到仓库。`.gitignore` 列出了本仓库自己的排除项。
- 没有当前消费方需要时，不要新增依赖、包或配置开关。

## 验证

先完成一次[开发环境准备](docs/development.zh.md#setup-tutorial)，包括新导出工程的 Git 初始化与工作树本地钩子。更换业务时，先按[从模板建立不同业务项目](docs/cookbook/starting-a-project.zh.md)操作。随后沿开发指南的验证部分，只选择实际变更所需的检查。

文档变更使用 `pnpm run doc-sync`（快速子集为 `pnpm run test:docs`）。涉及已发布路径的变更还需要 `pnpm run build` 并运行构建产物。只报告实际运行过的命令及其结果。覆盖率门禁覆盖包运行时源码，要求逐文件 100%；应用由行为 spec、CLI 接受/拒绝与构建入口 smoke 证明，而不是应用级 V8 阈值。未覆盖的运行时路径通常意味着应删除它或补上行为测试，而不是增加豁免。

Git 钩子只是本地检查点，不是完整门禁：`pre-commit` 校验暂存的翻译记录、归档 Note、暂存 lint 与空白错误；`pre-push` 运行 `typecheck`。请求审查前请自行运行其余证据。

## 审查

审查者依据所属文档与[防御性模式](docs/defensive-patterns/README.zh.md)判断变更，而不只看 diff。发现须给出位置、触发条件与失败机制。修复归属于引入问题的变更，并作为独立提交。

## 许可证与溯源

贡献按仓库的 MIT [许可证](LICENSE) 接受。不要复制许可证不兼容的代码、资产或文档。在变更中记录导入材料的来源；当导入面变化时，保持 [SOURCE-LICENSE.txt](SOURCE-LICENSE.txt) 准确。
