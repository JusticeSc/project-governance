# 项目治理

[English](README.md) | 中文

## 概述

一个为编程 Agent 安装 Node.js／TypeScript 治理模板的项目 Skill。模板提供 workspace 配置、开发与评审 Skills、检查和工程文档，不包含示例应用或库；它不是适用于所有语言的通用模板。

## 使用

1. 从 [GitHub Releases](https://github.com/JusticeSc/project-governance/releases) 获取 `project-governance/` Skill 目录，或复制本仓的 [`skills/project-governance/`](skills/project-governance/)。将整个目录复制到 `<项目>/.agents/skills/project-governance/`。
2. 确认所用 coding agent 会从该位置发现项目 Skill，然后请它使用 `project-governance` 安装模板。Skill 和模板资产可离线使用，不依赖本仓其他文件或 npm 依赖。
3. 对已有项目，先审阅报告的冲突，批准预期改动，再由 Agent 将治理文件与原项目协调。只有所需文件已整合进实际项目并运行其检查，安装才算完成；单独的参考副本或部分复制不算完成。
4. 按安装后项目的 `AGENTS.md` 和文档准备工具链并继续开发。

也可使用 Node.js >=22.19.0 直接调用安装器：

```sh
node <skill-dir>/scripts/install-template.mjs <project-directory>
```

默认模式在改动项目文件之前拒绝文件冲突。`--add-missing` 只复制项目中不存在的路径，报告全部冲突；仍需人工协调时以状态码 3 退出，绝不覆盖已有文件。项目内部重定向目录会被拒绝；项目根目录的别名允许使用。安装失败时，只回滚本次创建且未被改变的路径，并报告需要检查的路径。

安装不安装依赖或钩子，不初始化 Git，也不更改远端。安装器不创建特定 Agent 的发现链接；请使用你的 coding agent 实际支持的位置。

## 模板

`templates/node-typescript/` 是用于构建 Skill 固定离线资产的独立项目，不属于本仓 npm workspace。模板需要 Node `>=24 <25`，并固定 pnpm 11.28.5。完整检查还需要 Git、Python 3.10 或更新版本及 review-ownership 的 Python 依赖；适用环境和命令见安装后项目的开发指南。

在已准备 npm workspace 依赖的产品检出中，也可将参考副本导出到尚不存在的目录：

```sh
npm run export-template -- ../new-project
```

复制 Skill 的使用方式不依赖导出步骤。[模板设计](docs/template-design.zh.md)说明 workspace 和检查合同。

## 工具与证据

[CLI](references/cli.md) 执行已声明的可信仓内检查或安装 Skill。[文档包](packages/governance/documentation/README.zh.md)提供显式语料检查、双语配对和编译器支持的文档检查。模板携带自己的开发与评审执行器；缺少前提或命令失败都不是检查通过。

## 开发与维护

按 [AGENTS.md](AGENTS.md)、[架构](docs/architecture.zh.md)、[开发](docs/development.zh.md)和[测试](docs/testing.zh.md)说明工作。`npm run check` 执行产品声明的检查，`npm run smoke` 验证打包分发；模板有自己的 CI 工作流和检查图。[来源说明](docs/provenance.zh.md)与 [MIT 通知](LICENSE)记录归属。
