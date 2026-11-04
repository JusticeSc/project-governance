# 手册：新增 workspace 包

[English](adding-a-package.md) | 中文

在 `packages/` 下新增 workspace 库的文件级清单。按实际项目选择包名与职责。项目初始准备见[开始项目](starting-a-project.zh.md)。

## 1. 创建包

```text
packages/<group>/<pkg>/
  package.json     # declared identity, dependencies and built exports
  tsconfig.json    # extends ../../../tsconfig.base.json, rootDir src,
                   # outDir lib/types, references each actual workspace dependency
  src/index.ts     # public entry
  src/types.ts     # exported types only; no runtime code
  tests/           # Vitest specs owned by this package
  tests/tsconfig.json # no-emit TypeScript project for type-aware lint
  README.md        # contract, API, side effects, limitations
  README.zh.md     # Chinese counterpart
  README.i18n.yaml # bilingual consistency record
```

当现有分组符合包的职责时复用它。新分组是纯容器：没有 `package.json`、没有源文件，包仍恰好位于其下一层；新分组拥有自己的 `README.md`／`README.zh.md` 配对，并在 [packages/README.zh.md](../../packages/README.zh.md) 中增加一行。其 README 链接拥有的 `docs/subsystems/*.md` 页面，或者由 `scripts/project-policy.ts` 记录有理由的无页面分类。

创建 `tests/tsconfig.json`，扩展 `../../../../tsconfig.base.json`，设置 `compilerOptions.noEmit: true`、`include: ["**/*.ts", "**/*.tsx"]` 和 `references: [{ "path": ".." }]`。它拥有包测试的类型感知 lint；host 聚合继续检查这些测试，包源码项目仍只包含 `src`。见 [TypeScript 项目布局](../development.zh.md#typescript-project-layout)。

`package.json` 不变量：

- `type: "module"`；`version` 与 `license` 无论 scope 如何都与根 `package.json` 一致。
- `main: "lib/index.js"` 与 `types: "lib/types/index.d.ts"`。
- `exports["."]` 将 `types` 映射到 `./lib/types/index.d.ts`，将 `default` 映射到 `./lib/index.js`；为元数据读取方导出 `./package.json`。
- `files` 只列出包发布的确切构建产物。不要加入 `src/**`；打包消费方使用构建后的根导出。
- Workspace 依赖使用 `workspace:*`。运行时校验器或解析器放入 `dependencies`；仅测试与仅类型的工具放入 `devDependencies`。
- 可发布的库设置 `publishConfig.access: "public"` 与 `repository` 条目；私有应用设置 `private: true`。

包内相对导入在源码中使用显式 `.ts` 说明符（例如 `export * from './types.ts'`）。编译器在输出的 JavaScript 中改写为 `.js`，并在声明中保留可解析形式，供 NodeNext 消费方使用。

## 2. 在根配置中注册

| 文件 | 修改 |
|---|---|
| `tsconfig.base.json` | 运行 `pnpm run gen-tsconfig-paths`，把每个已声明库映射到实际源码，并保全生成区外的手写别名。不添加分组通配符。 |
| `tsconfig.host.json` | 在 `references` 中增加 `{ "path": "./packages/<group>/<pkg>" }`。该包属于 Node 聚合。 |
| `scripts/product-use.manifest.json` | 写明包的角色与理由。声明入口通过运行时依赖可达的包使用 `product`；否则按实际用途选择 `development-only` 或 `test-support`。运行 `pnpm run verify-product-use`。 |
| `pnpm-workspace.yaml` | 无需修改：`packages/*/*` 已包含该包。 |

`pnpm install` 注册 workspace 并更新锁文件。在 `scripts/package-dependency-policy.ts` 分类实际跨包运行时导出；仅当启动器、分组策略或真实 typed-import 探针变化时更新 `scripts/project-policy.ts`。`pnpm run constraints` 检查 workspace 与发布规则；`build:check` 消费最新产物，不自行构建。

## 3. 决定包的拓扑

除非角色确实独立演进，否则保持一个包。角色独立时，分离能力定义、实现与消费方，使替换实现不影响消费方。单一用途的库保持一个包。

### 命名存在的角色

命名稳定的当前职责。不要命名第一版实现、可能的未来扩展或基类。接口包命名能力；实现包增加区分它的机制、协议、环境或供应商。

| 词 | 何时使用 | 何时不要使用 |
|---|---|---|
| `Controller` | 接受命令或用户意图并改变一个现有状态。 | 执行任意工作或拥有 provider 群。 |
| `Store` | 拥有一个数据集，主要提供创建、读取、更新、删除、快照或订阅操作。 | 校验状态机、仲裁权限或分发工作。Map 不会让类成为 store。 |
| `Directory` | 暴露用于发现或选择的条目与元数据。 | 生产者向其注册实现，或调用方通过它执行工作。 |
| `Presenter` | 从领域值到渲染意图的纯转换。 | 执行 I/O、订阅、修改状态或拥有生命周期。 |
| `Registry` | 拥有动态的命名注册集合，包括查找、重复或优先级规则、生命周期与释放。 | 主要合同是分发、执行、取消或策略。 |
| `Runtime` | 运行实时工作并拥有跨调用的分发、取消或操作生命周期。 | 只存储记录、返回目录或解析一个值。 |
| `Resolver` | 从提供输入计算或定位一个答案，但不拥有该答案的生命周期。 | 拥有可变集合或长时间运行。 |
| `Engine` | 实现领域算法或有状态执行模型。 | 只选择 provider 或跨协议边界转发。 |
| `Policy` | 决定允许、选择、限制或观察什么。 | 执行该决定允许的机制。 |
| `Executor` | 在一个能力中运行一个显式请求或已解析规格。 | 拥有广泛的应用生命周期或 provider 目录。 |
| `Gateway` | 适配进程、网络、RPC 或 API 边界。 | 只注册同进程服务或存储元数据。 |
| `Provider` | 提供能力定义的一个实现。存在多个时可加机制或供应商限定词。 | 它是能力定义或消费方运行时。 |
| `Backend` | 在定义接口后实现可替换的底层持久化、传输或执行。 | 它是面向用户的服务。 |
| `Handle` | 指代一个实时资源并控制或观察它。 | 它创建并管理完整资源池。 |
| `Config` | 拥有一个已解析配置值或一个紧密受限的记录及其更新合同。 | 存储通用集合或暴露无关设置。 |
| `Service` | 拥有一个内聚的领域服务，表中没有更精确的角色能如实命名。 | 名称存在只是因为另一个库称该类为 service。 |

单一引擎、运行时、策略、控制器、解析器、存储或当前配置优先使用单数名称；注册表或拥有多个命名成员的服务使用复数名称。角色与名称必须一致。

<a id="4-write-the-package-readme"></a>
## 4. 编写包 README

包 README 是逐包合同。保持简短且最新：

- **摘要** —— 用途、何时选择本包及主要代价，英文至多 100 词；不把实现分类当作读者任务。
- **使用本包／API** —— 导出的函数与类型，各一行说明前置条件、失败与副作用。
- **限制** —— 持久的消费方缺口与非显然的维护约束。普通清理留在源码 TODO 或 Agent Note 中。
- **验证** —— 聚焦测试命令及任何产物或环境前置条件。

README 不得复述 JSDoc、生成目录或另一个包的实现。按仓库位置与真实入口机械选择 `kind`：遵循[文档标准](../AGENTS.md#package-readme-contracts)中的 `package-group`、`package-library`、`package-reference` 或 `package-bundle`。`description` 如实说明用途。每个 README 都是双语配对；写出双方，只记录已审配对。持久的本包缺口保留在 `## Known Limitations and Deferred Work`；确实没有限制的包在 `scripts/package-readme-policy.manifest.json` 使用带理由豁免，而非无解释的「none」。包族地图与通用库可以有不同的合理分类；不能复制别包豁免。

容器地图推导为 `package-group`；成员合同默认 `package-reference`。只有通过带理由的已审 `packageKinds` 策略条目，才为通用库指定 `package-library`、为实际组合指定 `package-bundle`。每个 kind 选择唯一匹配模板。新 kind 同时增加模板、仓库位置、owner 与聚焦检查；不添加无治理的局部标签。

Frontmatter 拒绝 `name`、`audience`、无治理的 `tags` 与 README-local `i18n`；事实性 `description` 与 kind 不是第二份包清单。

```markdown
## Summary

What the package owns and who calls it.

## API

| Export | Role |
|---|---|
| `example()` | One sentence: input, result, failure. |

## Known Limitations and Deferred Work

- **Gap** — the exact missing case, its consequence, and any maintainer constraint.
```

Model Experience 按实现分类，与限制分类独立。通用模型无关库或包族地图使用策略中带理由的无此节分类；本例校验器没有 prompt、tool 或模型上下文，不能虚构。无直接影响或只有一条消费方拥有路径的包，可以用已审的 `None, as ...` 或 `Indirectly, through ...` 句子，加 `#### KV Cache effect` 和一个非空段落。命名真实条件或消费方，不复述其实现。

包拥有模型可见内容时，添加 `## Model Experience`，每个 direct、conditional、capped、lifetime 或 auxiliary context entry 使用一个 H3，按顺序放置 H4 字段 `What the model sees`、`Token effect`、`KV Cache effect`，每个字段一个散文段落。逐字引用本包拥有的稳定 literal：长 literal 在引入字段下使用带标题 H5 和 `markdown` 围栏；短 literal 保持行内并命名 placeholder。只概括数据依赖或 provider 拥有的文本。生成 tool schema 链到目录锚点，只陈述本包差异；prompt 与 schema 可见性不同时分条。说明 fixed/conditional/retained/replaced/capped/zero-direct token 影响，以及 append-only/prefix-stable/replacing/independent cache 行为与失效条件。不把 UI 或 transport 细节当作模型可见概念。

引入 metadata reader 时，遵循[不激活与资源自包含合同](../defensive-patterns/conditional-domains.zh.md#display-metadata-without-activation)，格式、字节上限、locale chain 与包/subpath 地址归实际协议。这不是给普通库增加插件宿主的理由。

## 5. 验证

```sh
pnpm install        # registers the workspace
pnpm run doc-sync   # documentation and pairing gates
pnpm run constraints && pnpm run typecheck && pnpm run lint
pnpm run test:coverage
pnpm run build && pnpm run hygiene
```

按[测试策略](../testing.zh.md)补充新包所需的行为测试、真实入口路径与覆盖率。源码不被打包消费方读取的包需要构建导出 smoke 测试；没有运行时代码的包需要仅类型验证。
