# 开发指南

[English](development.md) | 中文

环境准备教程带新贡献者从前置条件走到通过检查的检出目录。其后的贡献者参考说明仓库布局、TypeScript 布局、日常工作流与 CI 组织。[架构](architecture.zh.md)拥有 workspace 边界；[测试策略](testing.zh.md)拥有所需证据；当前脚本清单以 `package.json` 与 `scripts/run-gates.ts` 为准。

建立不同业务时，先按[从模板建立不同业务项目](cookbook/starting-a-project.zh.md)完整替换示例并设置项目参数，再继续普通开发。

<a id="setup-tutorial"></a>
## 环境准备教程

### 前置条件

- Node.js `>=24.0.0 <25`；确切范围由 `package.json` 定义。
- 通过 Corepack 使用 pnpm `11.28.5`。没有 shell shim 时，用 `corepack pnpm` 代替 `pnpm`；全局 shim 是可选项。
- Git 2.26 或更新版本。钩子需要 Git；来源列表包含 Git 仓库时也需要它。
- Python 3.10 或更新版本用于完整检查：`pnpm run check:ci` 会运行审查归属历史测试，需要 `python -m pip install -r .github/review-ownership/requirements.txt`。缺少解释器时该门禁失败，不会报告通过；其余门禁无需 Python 即可运行。两个用例因夹具需要 Windows 缺少的能力而在 Windows 上显式跳过。要运行包含这些 POSIX 文件系统与可执行脚本夹具的完整套件，请使用工作流声明的 Linux 环境或 Windows 的 WSL 2。
- 生成运行需要访问 npm registry 与每个列出的 Git 主机；不需要 API key。
- Windows 上需要完整检查或该套件的 POSIX 夹具时，使用 WSL 2 提供 Linux 环境。检出目录、依赖与工具链应保持在同一个操作系统环境中，并把检出放在该环境的文件系统上。
- `.claude/skills` 是指向 `.agents/skills` 的相对目录符号链接。在 Windows 上使用允许创建符号链接的文件系统和账户，并在检出项目前配置 Git 实际创建符号链接（`core.symlinks=true`）。

<a id="bootstrap-a-new-export"></a>
### 新导出工程的 Git 初始化

导出的作者树不是 Git 克隆。在安装钩子之前，将当前目录初始化为独立仓库，审阅导出的输入，并用自己已配置的 Git 身份记录首次导入：

```sh
git init
git config --local core.symlinks true
git add --all
git commit -m "Import template inputs"
```

该提交记录已审阅的输入，不代表检查通过或治理验收完成。之后再安装钩子：归档验证器需要已提交基线，在首次完整导入前安装钩子可能阻止该提交。不要通过绕过钩子或虚构归档封印建立基线。已有克隆已经具备历史，直接使用下方通用安装步骤。

### 首次安装

在仓库根目录安装：

```sh
corepack pnpm install
corepack pnpm run hooks:install
corepack pnpm run typecheck
```

pnpm 使用严格符号链接布局，未声明的依赖会失败，而不会通过提升解析。依赖生命周期脚本在 `pnpm-workspace.yaml` 中默认禁止执行；只有显式允许的构建依赖会运行。仓库没有根 `postinstall`：`pnpm run hooks:install` 从本项目自己的 Git 根目录显式安装 worktree 本地的 Lefthook 配置；缺少 Git 或本地可执行文件时失败，拒绝借用外层仓库。`CI=true` 和 `GITHUB_ACTIONS=true` 会有意跳过安装，不修改 Git 配置。

钩子安装成功且 `pnpm run typecheck` 成功退出后，本地环境准备才完成。新导出工程还须在安装后运行 `pnpm run verify-archived-agent-notes`，验证其已提交基线。自动化作业中的跳过不证明钩子已安装。

### 日常工作流

1. 阅读所属领域的文档：[架构](architecture.zh.md)说明 workspace 边界，包或应用 README 说明其合同，[防御性模式](defensive-patterns/README.zh.md)说明生成与输出规则，[文档标准](AGENTS.md)说明文字要求。
2. 一次只做一个行为变更，并在同一变更中更新其消费方、测试与文档。
3. 运行覆盖该变更的最小检查（见[验证变更](#verify-a-change)）。
4. 请求审查前，运行缺失的证据一次，并报告实际运行过的命令。

## 贡献者参考

### 仓库布局

```text
apps/plugin-market-generator/       CLI application
packages/util/plugin-market-index/  format validator library
  src/                              source
  tests/                            package-owned Vitest specs
.agents/skills/                     agent workflows
.agents/notes/                      decision records
docs/                               developer documentation
scripts/                            build, gate, and documentation scripts
.github/                            inherited review and workflow configuration
```

新包位于 `packages/<group>/<package>/` 并复用现有分组；新分组是带自己 README 与 [packages/README.zh.md](../packages/README.zh.md) 中一行的容器。新应用位于 `apps/` 下。

<a id="typescript-project-layout"></a>
### TypeScript 项目布局

| 文件 | 职责 | 构成程序？ |
|---|---|---|
| `tsconfig.json` | 解决方案入口；扩展共享基础选项，自身不包含文件，并显式引用 `tsconfig.host.json`。 | 否 |
| `tsconfig.host.json` | Node 聚合：workspace 包引用、应用与包的测试、脚本与测试配置。 | 是 |
| `tsconfig.base.json` | 共享编译选项与源码 `paths` 映射。Vitest 将 vite-tsconfig-paths 指向它。 | 否 |
| `tsconfig.node.base.json` | 聚合扩展的 Node 专用编译设置。 | 否 |
| `packages/<group>/<package>/tsconfig.json` | 扩展 `tsconfig.base.json`，设置 `rootDir: src` 与 `outDir: lib/types`，包含 `src`，并引用 workspace 依赖。 | 是 |
| `apps/plugin-market-generator/tsconfig.json` | 结构相同；引用校验器包。 | 是 |

`tsconfig.base.json` 拥有把 workspace 包名解析到 `src` 的 `paths` 映射。该映射是源码测试与 `tsx` 启动器看到 TypeScript 源码的原因，也避免过期的 `lib/` 静默加载模块的第二份副本：

- 静态检查、Vitest 与 `pnpm start` 将 workspace 导入解析到 `src`。
- `build:artifacts` 按依赖顺序编译每个项目，生成 `lib/` 与声明。
- `build:check` 使用磁盘上已有的声明运行聚合检查；缺失或过期产物会表现为编译错误。它既不编译包项目，也不重建产物。
- `build` 把产物构建与聚合检查作为一个有序图运行。
- `typecheck` 编译聚合，但不生成打包产物。

按变更需要选择命令：

| 场景 | 命令 |
|---|---|
| 迭代源码并需要可运行产物 | `pnpm run build:artifacts` |
| 源码变化后检查测试或脚本 | 最近一次 `build:artifacts` 之后运行 `pnpm run build:check` |
| 声明 TypeScript 工作完成前 | 最近一次 `build:artifacts` 之后运行 `pnpm run build:check`，或 `pnpm run build` |
| 不生成包产物的类型检查 | `pnpm run typecheck` |
| 仅 lint 变更 | `pnpm run lint` |

作用域由 `scripts/build.ts` 定义。消费已构建 `lib/` 的门禁或脚本必须声明该依赖；源码面的门禁与测试必须在干净树上通过。

### 源码面与打包产物面

- 开发命令、测试与源码启动器使用 `paths` 映射和 TypeScript 源码。应用的 `start` 脚本通过 `tsx src/bin.ts` 运行。
- 打包后的校验器只暴露 `lib/index.js`、`lib/types/index.d.ts` 与 `./package.json`。源码子路径被刻意排除；打包消费方不能导入 TypeScript 源码。
- 构建后的应用入口是 `apps/plugin-market-generator/lib/types/bin.js`，由 `pnpm start:built` 以纯 Node 运行。
- 源码专用模块可以使用纯 Node 无法执行的 TypeScript 语法。不要把它当作打包合同，也不要增加源码子路径或把源文件加入 `files`。

<a id="verify-a-change"></a>
### 验证变更

让证据与影响面匹配；提交或推送时不要默认运行完整套件。

- 行为：用聚焦的 spec 运行 `pnpm run test`。新增的包运行时行需要行为测试；覆盖率门禁要求 `packages/*/*/src` 运行时实现逐文件语句、分支、函数与行覆盖率均为 100%，且不设豁免。应用行为由 spec、真实 CLI 接受/拒绝与构建产物 smoke 证明，而不是应用级 V8 阈值；仅类型声明不承载运行时义务。
- 覆盖率：`pnpm run test:coverage`，或使用拆分门禁 `pnpm run test:coverage:partitioned`。
- 类型：`pnpm run typecheck`；当变更触及生成的声明时使用 `build:check`／`build`。
- 文字：`pnpm run doc-sync` 包含 TypeScript 示例编译；`pnpm run doc-typecheck` 只选择该编译器。`pnpm run test:docs` 保留无需构建的文档检查子集，不编译示例（[范围](testing.zh.md#documentation-compilation)）。
- 包元数据：先运行 `pnpm run build`，再运行 `pnpm run hygiene`（publint、workspace 约束、包与依赖检查）。Hygiene 检查现有构建产物，不会自行构建。
- 已发布路径：`pnpm run build`，然后用真实来源列表运行构建产物。
- 完整本地集合：`pnpm run check:all`；它聚合与 `check:ci` 相同的门禁组。`check:ci`、`check:ci:static`、`check:ci:coverage`、`check:ci:unit` 与 `check:ci:artifacts` 选择 CI 形态的组。

独立运行的 `doc-typecheck`、`doc-sync` 与 `check:ci:static` 会准备所需项目合同，并通过项目引用编译示例；它们不要求先构建。`check:all`、`check:ci` 与 `check:ci:artifacts` 则在其已有构建之后，以 `DSH_DOC_TYPECHECK_USE_BUILD_OUTPUT=1` 运行 `doc-typecheck:contracts-ready`，消费这些声明，不生成产物，也不启动另一个编译写入者。在主检查图中，构建位于覆盖率之后。单独使用 `doc-typecheck:contracts-ready` 假定合同已是最新；它不是独立运行时的准备命令。

`pnpm run duplication` 度量跨文件 TypeScript 克隆；报告的克隆是设计信号，不是自动失败。

### Git 集成

翻译记录（`.i18n.yaml`）使用 Git 默认文本合并。只有当两个分支都修改了同一标题段中的语言特定内容时记录才冲突；解决 Markdown 后重新运行 `pnpm run verify-translation-pairing --write <pair>`。

Lefthook 需显式安装，是快速的本地检查点，而不是完整门禁：

- `pre-commit` 针对暂存 blob 校验暂存翻译记录，校验归档 Agent Note，使用与项目无关的 `.oxlintrc.staged.json` 配置运行暂存 lint，并检查暂存 diff 的空白错误。它不会修复或重新暂存部分暂存的文件。
- `pre-merge-commit` 在 Git 创建自动合并提交前执行相同的基于索引的配对与归档 Note 检查。
- `pre-push` 运行 `pnpm run typecheck`。

钩子刻意不运行测试、覆盖率、文档门禁、构建或 hygiene。变更所需的证据运行一次；CI 拥有完整覆盖率与兼容性矩阵。

### CI 门禁

`.github/` 下的 workflow 与 review-ownership 配置属于继承的来源材料。`check:ci`、`scripts/run-gates.ts` 与 workflow 文件拥有其当前 job 清单。本检出尚未针对远端运行这些 workflow；配置存在不等于 CI 已通过。

<a id="generator-commands-and-side-effects"></a>
### 生成器命令与副作用

从源码运行应用：

```sh
pnpm start --input plugins.txt --output site/index.json --title "Example Market"
```

执行 `pnpm run build` 后运行构建产物：

```sh
pnpm start:built --input plugins.txt --output site/index.json --title "Example Market"
```

两种形式都相对于当前工作目录解析 `--input`、`--output` 与默认缓存目录。它们仅在内容变化时写索引，在输出旁的 `icons/` 下写大图标，只删除它们能识别的过期生成图标，并把缓存保持在输出目录之外。每次运行都会尝试访问各来源；Git 来源还需要 Git。退出状态 `0` 表示所有来源都读取成功，`1` 表示至少一个来源不可读（有合法的上一次成功结果时复用，否则不贡献插件），`2` 表示参数或来源列表无效。

生成器从不安装包、运行包脚本或检出工作树。不会应用 `.npmrc` 中的 registry 凭据，Git 也不会提示输入凭据；私有仓库需要凭据助手或 SSH agent。抓取上限见[应用 README](../apps/plugin-market-generator/README.zh.md#security)。

### 环境变量

没有必需的应用变量。`GIT_SSH_COMMAND` 与 `GIT_SSH` 是传给 Git 的唯一继承 `GIT_*` 变量；其他 Git 变量会被丢弃。不要提交凭据或填充过的 `.env`。

### TODO 标记

使用以下三种注释标记，按紧急程度排序：

- `FIXME` —— 除非审查者明确同意，否则应阻止发布。
- `TODO` —— 资源允许时应尽快修复。
- `XXX` —— 将来可能修复；无承诺。

<a id="documenting-source-contracts"></a>
### 记录源码合同

子系统参考复制源码声明时，用 `ts type-equiv` 保留其原始 JSDoc，并在 `scripts/type-equiv.manifest.json` 登记 `{ "doc": "docs/subsystems/example.md", "symbol": "Example", "source": "packages/group/package/src/types.ts" }`。去除实现体的公共类使用 `ts public-api` 并设置 `"projection": "public-api"`。projection 保留 public 字段、构造函数、accessor、方法与类/成员 JSDoc，省略实现体及 private/protected 成员。`pnpm run verify-type-equiv` 比较源码声明与 JSDoc，忽略空白和非 JSDoc 注释，并要求每个 document/symbol/projection 恰有一个清单项和一个已登记围栏。源码变化时同步更新声明包族的归属页；检查器无法发现从未文档化的新合同。

`pnpm run verify-export-jsdoc` 检查公共文档形式，`pnpm run gen-doc-graphs --check` 检查源码派生关系的新鲜度，`pnpm run gen-cli-help --check` 检查声明的 CLI-help 投影。通过真实源码 owner 重新生成，不手改生成区域。`pnpm run verify-node-next-types` 需要最新构建产物，在外部 NodeNext ESM 消费方检查声明；它不是源码别名测试。这些命令都不替代行为审查或真实 packed install。

<a id="replacing-maintained-code-with-a-dependency"></a>
### 用依赖替换维护代码

真正减少自有实现与测试时优先使用持续维护的依赖。读取当前 owner、消费方合同、依赖策略与相关先例；比较语义、失败、生命周期、边界、支持平台、许可、维护与发布影响。通过真实消费方证明替换，只在依赖实际承责的地方删除过时代码与测试。保留本项目集成与合同的回归覆盖；不保留第二实现，也不为无当前需求增加 wrapper。放宽扫描或策略需要 domain owner 确认，不能作为获得绿色的方法。

每个操作系统环境单独安装依赖，不在 WSL 或 Linux 复用 Windows 依赖。本地平台证据不证明另一平台。预算、并发、timing 数据与 CI 策略归实际配置 owner；未经授权不调整宿主全局设置，也不恢复暂停的远程服务。

### 包边界验证

可导入包模块保持 ESM 且不使用 top-level await；可执行 shebang/bin 源码仅享有[包规则](../packages/AGENTS.md)明确的窄例外。不新增 Node loader `resolve` hook 来修补源码/产物混用，包括改写相同 specifier 的 wrapper。确需替换时，先重新审计解析、存在时的 hot reload 与插件管理，并在落地前取得 domain owner 确认。源码启动器不证明依赖声明完整；该检查归依赖扫描。

可能缺失的 optional dependency 或 peer 不在模块顶层静态值导入。允许 type-only import；确有可选操作时才使用处理缺失的 dynamic import，或必要时采用 owning host 支持的 lazy-require 机制。缺失表示能力不可用，不是成功的空输出。optional 与 experimental 能力不混入默认产品与发布依赖；显式可选组合或 test/example opt-in 不是默认。每个包由真实产品入口可达性或策略中的 category 与 reason 交代；未说明的孤儿包或过期豁免不是验收。不存在时不要求创建 experimental group 或插件组合。

发布 `files` 只包含声明的构建产物与资源，不含源码 passthrough 或 source map。标准 NodeNext 声明与 manifest 检查不证明真实 tarball payload：在干净外部布局安装实际生成的 tarball，使用其构建根入口，验证声明依赖与禁止的源码子路径，并保留 frozen-lockfile 可复现性。packed install 证明可安装性，不证明交互行为或 registry 发布。多包发布从真实 install 与 peer 边推导顺序，显式报告 cycle 与无法满足的 peer 边，并把完整 release set 当作一次 pack/upload 单元；单包不虚构 family-order 对象。
