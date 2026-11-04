# Node.js/TypeScript 治理模板

[English](README.md) | 中文

本项目提供 Node.js/TypeScript workspace、开发检查、文档标准与 agent 工作流。初始状态没有业务应用或库：只引入所请求工作需要的 owner。按照[开始项目](docs/cookbook/starting-a-project.zh.md)从环境准备走到真实行为。

## 环境要求与准备

通过 Corepack 使用 Node.js `>=24 <25` 和 pnpm `11.28.5`。钩子与依赖基线的检查需要 Git；完整 CI 形态检查还需要 Python。安装钩子前遵循[开发环境准备](docs/development.zh.md#setup-tutorial)，包括 Git 基线指导。已配置工作流不代表远端 CI 已通过。

## 开发

任务需要时，将应用放在 `apps/<app>/`，库放在 `packages/<group>/<package>/`。在编译器、产品用途及适用的启动器策略中登记真实成员；[新增包指南](docs/cookbook/adding-a-package.zh.md)详述库的登记方式。只为真实持久化数据声明持久化；声明及历史见[开始项目](docs/cookbook/starting-a-project.zh.md)。

运行 `corepack pnpm install`，再依据[开发指南](docs/development.zh.md#verify-a-change)和[测试策略](docs/testing.zh.md)选择覆盖变更行为的检查。包运行时代码逐文件要求 100% 覆盖率；应用行为需要真实入口证据。一旦有关对象存在，不得以空 workspace 为由跳过其检查。

## 文档

- [Agent 指令](AGENTS.md)与[文档标准](docs/AGENTS.md)
- [架构](docs/architecture.zh.md)、[开发](docs/development.zh.md)与[测试](docs/testing.zh.md)
- [防御性模式](docs/defensive-patterns/README.zh.md)与[Agent Note](.agents/notes/README.zh.md)

## 许可证

许可证与来源归属见 [LICENSE](LICENSE) 和 [SOURCE-LICENSE.txt](SOURCE-LICENSE.txt)。
