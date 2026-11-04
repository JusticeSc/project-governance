# 架构

[English](architecture.md) | 中文

在修改 `apps/` 或 `packages/` 下的任何内容之前，请先阅读本页。两个 workspace 共同实现一种格式及其生产者；[格式 Agent Note](../.agents/notes/implemented/feature/2026-10-02-plugin-market-index-format.zh.md) 拥有数据合同，本页说明围绕它的代码如何组织。

这是内置示例的架构。建立不同业务时，由[从模板建立不同业务项目](cookbook/starting-a-project.zh.md)规定替换闭包与项目参数；按实际实现更新本地图，不将示例继续当作现行权威。

## Workspace

| Workspace | 职责 | 入口 |
|---|---|---|
| [`apps/plugin-market-generator`](../apps/plugin-market-generator/README.zh.md) | 读取由 npm 包与 Git 仓库组成的来源列表，写出经过校验的格式 1 索引及图标文件。 | `src/bin.ts` → `src/cli.ts` |
| [`packages/util/plugin-market-index`](../packages/util/plugin-market-index/README.zh.md) | 校验格式 1 文档，并为某个版本构建确切的安装参数。 | `src/index.ts` |

应用是 Node 程序，不是插件宿主。该包是库：没有 I/O、没有状态、没有注册，也不依赖应用。应用依赖该包，反向依赖不存在。

[包关系图](package-relationships.zh.md)从 manifest 投影真实 workspace 运行时依赖，并检查新鲜度；它不替代本页行为地图。[CLI 帮助参考](cli-help.zh.md)投影实际入口的帮助，不维护另一份选项目录。

## 数据流

```text
source list
  -> source normalization and line validation            src/sources.ts
  -> per-source read (registry / Git refs)               src/fetchers.ts, src/generate.ts
  -> package discovery and manifest reading              src/packages.ts
  -> display fields and icons                            src/metadata.ts
  -> format-1 document                                   src/generate.ts
  -> parseMarketIndex validation                         @deepseek-ai/dsh-plugin-market-index
  -> atomic index and icon writes                        src/files.ts, src/cli.ts
```

生成是确定性的：条目遵循归一化后的来源列表顺序，相同输入产生相同的索引字节。缓存结果只针对输入身份复用——已列出的 registry 版本和渠道，或 Git 提交与包目录。来源无法读取时，若存在当前缓存格式的有效上次成功条目则复用，并返回退出状态 `1`；参数或列表无效返回 `2`。

应用读取远端数据，但从不执行包代码。npm tarball 在大小上限下流式读取、按 registry 完整性校验并在内存中解包。Git 对象被抓取到私有的临时裸仓库，钩子、文件系统监视、子模块与不支持的传输均被禁用，文件以 blob 读取；不存在工作树。

<a id="format-ownership"></a>
## 格式归属

- [格式 Agent Note](../.agents/notes/implemented/feature/2026-10-02-plugin-market-index-format.zh.md) 定义格式 1。[SOURCE-LICENSE.txt](../SOURCE-LICENSE.txt) 拥有复制来源的归属记录。
- `packages/util/plugin-market-index/src/types.ts` 拥有校验后的 TypeScript 记录。`LocalizedText` 只在那里定义；应用从该包导入它。
- `parseMarketIndex(value, indexUrl)` 校验它已实现的规则。生成器在写出每份完成文档前用它校验。
- `marketInstallTarget(name, version)` 构建固定的 npm 或 Git 安装参数，并在版本记录 registry 时显式包含它。
- 未知的 `source.type`、未声明的元数据引用、重复的插件名或版本、缺失或无效的 `engines.dsh`，或无效的 `dist-tags` 目标，会拒绝整份文档。

该包只发布根导出（`lib/index.js` 与声明文件）。它刻意没有 `./src/*` 子路径：源码面是开发关注点，不是消费方合同。

## 模块图

应用把每个阶段放在一个模块中；变更应扩展所属阶段，而不是在 CLI 中增加分支。

| 模块 | 职责 |
|---|---|
| `src/bin.ts` | 进程入口；委托给 CLI。 |
| `src/cli.ts` | 选项解析、路径解析、缓存目录、输出清理、退出状态。 |
| `src/sources.ts` | 来源列表解析与逐行格式校验。 |
| `src/fetchers.ts` | npm registry 文档与 tarball、Git ref 与对象、抓取上限、缓存键。 |
| `src/packages.ts` | bundle 发现、workspace／glob 扫描、清单字段、`engines.dsh` 推导。 |
| `src/metadata.ts` | 本地化文本、图标、作者、主页、仓库、关键词。 |
| `src/generate.ts` | 版本选择、tag、按来源缓存、文档组装、校验。 |
| `src/files.ts` | 原子写入与只读文件树抽象。 |

该包只暴露根入口：`parseMarketIndex`、`marketInstallTarget`、`MarketIndexError`、`MAX_INLINE_ICON_BYTES` 与导出的记录类型。

## 源码面与产物面

- 源码测试与 `pnpm start` 通过根 tsconfig 的 `paths` 映射把 workspace 导入解析到 `src`；它们由 Vitest 或 `tsx` 运行。
- `pnpm run build` 生成 `lib/` 与声明。`pnpm start:built` 与任何打包后的消费方使用根 `exports`，它指向 `lib/`。
- 源码面的模块可以使用纯 Node 无法执行的 TypeScript 语法；这不属于打包合同。不要为了令这种导入可用而增加源码子路径导出或把源文件加入包的发布 `files`。

## 新行为放在哪里

| 目标 | Owner |
|---|---|
| 接受另一种来源 | `src/sources.ts` 负责行，`src/fetchers.ts` 负责读取；仅当索引无法表达时才扩展 `generate.ts` 的选择逻辑与格式。 |
| 修改展示元数据 | 先改格式 Agent Note 与校验器类型；再改 `src/metadata.ts` 及其测试。 |
| 修改版本／tag 选择 | `src/generate.ts` 与 `src/packages.ts`；保持格式与缓存键一致。 |
| 修改输出选项 | `src/cli.ts` 负责解析，`src/generate.ts` 负责行为；记录该选项及其副作用。 |
| 修改格式规则 | 在同一次变更中修改 Agent Note、`plugin-market-index/src`、其测试，以及所有必须满足该规则的生成路径。 |
| 修改抓取上限或信任边界 | `src/fetchers.ts`；在选项与 README 中保持上限明确。 |

## 本仓库没有的边界

这里没有 agent 运行时、浏览器 UI、插件宿主、安装器或会话存储。文档与代码不得把它们描述为可用。打包后的校验器可独立使用；应用是私有的参考生产者，不是市场服务。

引入此类对象时，由其包拥有合同并遵循[条件性领域规则](defensive-patterns/conditional-domains.zh.md)。这些规则不为无关应用指定插件宿主、全局客户端 runtime 或 Session 格式。
