# 项目治理

[English](README.md) | 中文

## 概述

面向编程Agent的安装Skill与固定Node.js／TypeScript项目模板。Skill将模板安装到新建或已有项目，保护已有内容，再把日常开发交给工程自身的AGENTS.md和Skills。模板包含真实插件市场示例、workspace配置、检查与工程文档，并非适用于所有语言的通用模板。

## 使用

从 [GitHub Releases](https://github.com/JusticeSc/project-governance/releases) 的 Skill ZIP 获取 `project-governance/`，或从仓库复制 [`skills/project-governance/`](skills/project-governance/)。如使用 ZIP，先解压，再将整个目录复制到 `<项目>/.agents/skills/project-governance/`。复制后的目录就是 Skill：其中包含离线固定模板资产，不依赖本仓其他文件或 npm 依赖。使用的 Agent 可能有自己的 Skill 发现约定。

请 Agent 使用 [project-governance](skills/project-governance/SKILL.md) 安装模板，也可直接运行安装器（需要 Node.js >=22.19.0）：

```sh
node <skill-dir>/scripts/install-template.mjs <project-directory>
```

`<skill-dir>` 是复制后的 Skill 目录，`<project-directory>` 可以是新目录或已有目录。已有目录可以共存，但文件、链接或非目录冲突会使安装器在修改项目前停止。审阅冲突并对已有内容的必要变更取得授权，然后在实际项目中协调并安装；单独的参考副本不算安装完成。中途失败时，安装器只尝试回退本次创建且未改变的路径，并报告需要检查的路径。

安装不安装依赖或钩子，不初始化 Git，不改变远端设置，也不替换示例业务。安装后按目标工程的 AGENTS.md 和文档进行设置与开发。

## 模板

`templates/node-typescript/`是用于构建 Skill 资产的固定独立工程，不是本仓 npm workspace 成员。复制后的 Skill 可离线安装。在已准备 npm workspace 依赖的产品检出中，`npm run export-template -- <new-output-directory>` 也可创建单独的参考副本，输出目录须尚不存在。

安装和导出会创建相对的 `.claude/skills` 目录符号链接，指向唯一的 `.agents/skills` 目录。目标文件系统和账户必须允许创建符号链接；Windows 上可能需要开发者模式或具有创建符号链接权限的账户。之后通过 Windows Git 检出该项目时必须让符号链接实际生效（`core.symlinks=true`），才能保留 Claude 的 Skill 发现入口。

```sh
npm run export-template -- ../new-project
cd ../new-project
corepack pnpm install --frozen-lockfile
corepack pnpm run typecheck
```

导出后进入新工程的AGENTS.md和[新项目教程](templates/node-typescript/docs/cookbook/starting-a-project.md)，设置项目参数、完整替换示例并验证首条真实行为。上述命令仅验证安装与类型。在新导出工程中安装钩子或运行索引／历史检查之前，先按模板[Git 初始化步骤](templates/node-typescript/docs/development.md)建立独立仓库并记录首次导入。导出本身不会初始化 Git 或创建提交。

模板的生成器需要真实源清单，请按模板自身README操作；`start`不是治理检查。模板完整检查（`corepack pnpm run check:ci`）需要Git、Python 3.10或更新版本及review-ownership的Python依赖，POSIX夹具需要Linux或WSL 2。安装步骤和具体前提见模板开发指南。

安装复制作者文件并恢复Claude Skills链接，不包含依赖、构建产物或缓存。模板声明Node `>=24 <25`，在自身锁文件中固定pnpm 11.28.5和工具链版本。模板自身的README、架构、开发和测试页面拥有项目说明；[模板设计](docs/template-design.zh.md)记录其绑定。

## 工具与证据

[CLI](references/cli.md)执行已声明的可信仓内检查或安装Skill。[文档包](packages/governance/documentation/README.zh.md)提供显式语料检查、双语配对和编译器支持的文档检查。缺前提、命令失败及未验证层都不是成功。运行器不负责选择义务，也不认证采用完成。

模板在`scripts/`中携带自身执行器——结构、文档配对、Agent Note格式与归档检查、构建与构建产物smoke——由其自身门禁图运行。它们归模板所有，只在导出的副本内运行；本产品CLI与文档包既不调用它们，也不因此获得这些谓词。本地执行、远端CI、平台强制和独立Agent采用是不同证据。产品不会在消费者已有项目中启用加权审批或Note归档检查；导出模板携带自己的执行器。产品不认证自主采用。触发时仍需落实相应[规则](references/decisions.md)；项目缺执行器是实现缺项，不是豁免。

## 开发与维护

按[AGENTS.md](AGENTS.md)、[架构](docs/architecture.zh.md)、[开发](docs/development.zh.md)和[测试](docs/testing.zh.md)说明工作。`npm run check:structure`校验声明的包图——公开入口、包名import与已发布子路径、workspace声明与依赖环——TypeScript仅作parser；`npm test`先运行各workspace测试，再运行根回归。计算式import／require调用、别名loader、`require.resolve`及其他动态解析仍未被证明，独立模板保留自身结构谓词。`npm run check:template`把模板导出到隔离目录，执行锁定安装、构建，并驱动构建后CLI处理空源清单与非法参数；根检查清单调用它，因此本地运行与CI共享同一定义。当前合同由各自owner维护，本仓不依赖维护者会话文件或兄弟来源检出。[来源说明](docs/provenance.zh.md)与[MIT通知](LICENSE)解释来源，不证明执行成功。
