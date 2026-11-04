# Node/TypeScript 治理模板

[English](README.md) | 中文

这是一个由来源裁剪的 pnpm 工程模板，内置完整且可替换的插件市场示例：

- [`apps/plugin-market-generator`](apps/plugin-market-generator/README.zh.md) 读取一份 npm 包名与 Git 仓库 URL 列表，写出一个 `index.json` 及其图标文件。它只读取包文件，不运行包代码。
- [`packages/util/plugin-market-index`](packages/util/plugin-market-index/README.zh.md) 校验该索引的格式 1，并为客户端构建某个已列出版本的确切安装参数。

这些 workspace、名称与格式语义复制自 DeepSeek Harness 仓库；[SOURCE-LICENSE.txt](SOURCE-LICENSE.txt) 记录来源与本仓库所做的改动。本仓库不是 DeepSeek Harness 产品，也不包含其 agent 运行时、Web UI 或插件宿主。

## 建立项目

更换业务时，按[从模板建立不同业务项目](docs/cookbook/starting-a-project.zh.md)建立检出环境、完整替换示例、设置项目参数，并验证实际应用和发布库。后续开发由项目自身材料治理；外部采用 Skill 不补齐日常规则或工具接线。

## 状态

开发者预览。公开 API 处于预稳定阶段；一项变更会在同一变更中更新所有消费方。`.github/` 中的 GitHub workflow 与审查配置属于继承的来源材料：本检出尚未针对远端运行过它们，本文也不声称远端强制或整套治理体系已经过检验。

格式 1 的合同由[插件市场索引格式 Agent Note](.agents/notes/implemented/feature/2026-10-02-plugin-market-index-format.zh.md) 定义；生成器写入索引前，校验器会检查文档规则。

## 环境要求

- Node.js `>=24.0.0 <25`。
- 通过 Corepack 使用 pnpm `11.28.5`（`corepack enable`）。
- 当来源列表包含 Git 仓库时，`PATH` 中需要有 Git。
- 每次运行都会尝试访问 npm registry 与列出的 Git 主机；来源不可读时，已有缓存可提供上一次成功的结果。
- 不需要 API key。不会应用 `.npmrc` 中的 registry token；私有 Git 仓库需要凭据助手或 SSH agent。

## 安装

按[开发环境准备](docs/development.zh.md#setup-tutorial)操作，新导出工程须先初始化 Git，再安装钩子。前置条件、安装与完成检查由该指南统一拥有。安装使用锁定的严格 pnpm workspace；生命周期脚本默认禁止，钩子显式安装，而不是由根 `postinstall` 安装。

## 生成索引

编写一份来源列表，每行一个条目。空行与以 `#` 开头的行会被忽略。

```text
# npm packages: every non-deprecated bundle version is listed
@scope/example-plugin
example-plugin
# Git repositories: release tags and the default branch are listed
https://github.com/author/example-plugins
```

从源码运行生成器：

```sh
pnpm start --input plugins.txt --output site/index.json --title "Example Market"
```

`--input`、`--output` 与默认缓存目录都相对于命令运行所在目录解析。成功运行会写出：

- 索引文件，仅在内容变化时改写；
- 索引旁边的 `icons/` 下的图标文件，用于无法内联的图标，并清理它自己生成的过期图标文件；
- 默认位于输入列表旁边的 `.plugin-market-cache` 结果缓存。

它读取 registry 文档、在内存中下载 npm tarball，并把 Git 对象抓取到私有的临时裸仓库。它从不运行包脚本、安装包或检出工作树。请通过 HTTPS 发布输出目录；缓存目录不属于发布内容。

当所有来源都读取成功时退出状态为 `0`；至少一个来源读取失败时为 `1`（有合法的上一次成功结果时复用，否则该来源不贡献插件）；参数或来源列表无效时为 `2`。Git 来源需要服务器支持按 SHA 提供提交，或退而按名称提供 ref；Git 从不提示输入凭据，私有仓库需要凭据助手或 SSH agent。不会应用 `.npmrc` 中的 registry token。

## 构建并运行构建产物

```sh
pnpm run build
pnpm start:built --input plugins.txt --output site/index.json --title "Example Market"
```

`pnpm run build` 编译校验器与应用，并使用已生成的声明检查聚合的测试／脚本程序。`pnpm start:built` 以纯 Node 运行 `apps/plugin-market-generator/lib/types/bin.js`，不会重新构建。`pnpm start` 通过 `tsx` 从 `src` 运行同一个 CLI。

## 命令

```sh
pnpm install                 # install the workspace
pnpm run hooks:install       # install Git hooks explicitly
pnpm run build               # build:artifacts, then build:check
pnpm run build:artifacts     # emit lib/ and declarations
pnpm run build:check         # check tests and scripts against emitted declarations
pnpm run typecheck           # typecheck both workspaces and the aggregate program
pnpm run lint                # Oxlint, type-aware
pnpm run lint:fix            # apply Oxlint fixes
pnpm run test                # Vitest unit tests
pnpm run test:coverage       # Vitest with V8 coverage: per-file 100%
pnpm run test:coverage:partitioned # the coverage gate split into partitions
pnpm run duplication         # cross-file TypeScript clone detection
pnpm run doc-sync            # documentation gates
pnpm run test:docs           # quick documentation checks
pnpm run hygiene             # publint, workspace constraints, package and dependency checks
pnpm run check:all           # complete local gate set; the same aggregation as check:ci
pnpm start                   # run the generator from source
pnpm start:built             # run the built generator
```

`check:all` 与 `check:ci` 运行相同的已注册门禁组；单独的 `check:ci:static`、`check:ci:coverage`、`check:ci:unit` 与 `check:ci:artifacts` 脚本各选择一个组。当前脚本与门禁清单以 `package.json` 与 `scripts/run-gates.ts` 为准。

每项变更所需的证据与其影响面匹配：行为变更用聚焦单元测试，包运行时代码用覆盖率门禁，文档变更用 `doc-sync`，已发布路径用 `build` 加一次构建产物运行。提交或推送时不要默认运行完整套件；CI 拥有完整的矩阵。覆盖率门禁覆盖 `packages/*/*/src/**/*.ts` 运行时实现，逐文件要求语句、分支、函数与行覆盖率均为 100%，且不设豁免；应用由行为 spec、真实 CLI 接受/拒绝与构建入口 smoke 证明，而不是应用级 V8 阈值。

## 文档

- [开发指南](docs/development.zh.md) —— 环境准备、日常工作流、TypeScript 布局与检查。
- [架构](docs/architecture.zh.md) —— 两个 workspace、数据流与格式合同。
- [测试策略](docs/testing.zh.md) —— 测试层级、真实入口与覆盖率。
- [文档标准](docs/AGENTS.md) —— 层级、写作规则、预算与双语配对。
- [Agent Note](.agents/notes/README.zh.md) —— 决策记录及其生命周期。
- [贡献指南](CONTRIBUTING.zh.md) 与[安全说明](SAFETY.zh.md)。

## 许可证

MIT。复制来源与本仓库所做的改动记录在 [SOURCE-LICENSE.txt](SOURCE-LICENSE.txt) 中；第三方依赖的许可证仍归各包所有。
