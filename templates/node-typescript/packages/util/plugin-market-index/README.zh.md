---
description: "插件市场索引格式 1 校验，以及供索引读者与生成器使用的固定安装参数。"
kind: "package-library"
---

# dsh-plugin-market-index

[English](README.md) | 中文

## 摘要

插件市场索引格式 1 的校验器。该索引是一个 JSON 文件，列出可安装的 bundle 及其展示元数据。[格式 Agent Note](../../../.agents/notes/implemented/feature/2026-10-02-plugin-market-index-format.zh.md) 定义该文档；本包是它的可执行规则集。来源归属由 [SOURCE-LICENSE.txt](../../../SOURCE-LICENSE.txt) 拥有。索引生成器用它校验输出，任何展示或从索引安装的客户端都可以通过它读取文档。

## 目录

- [使用本包](#use-this-package)
- [API](#api)
- [源码面与产物面](#source-and-artifact-plane)
- [验证](#verify)
- [已知限制与延后工作](#known-limitations-and-deferred-work)
- [开发记录](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

它是库，不是服务或宿主插件：没有状态，也没有 I/O。

把获取到的文档解析为 JSON，再将值与其读取来源 URL 传给 `parseMarketIndex`。第一条被违反的规则会抛出带违规值 JSON 路径的 `MarketIndexError`。成功结果会保留有效的 `dist-tags` 与必需的 `engines.dsh` 声明，丢弃格式未定义的成员，把缺失的 `metadata` 组、`keywords`、`labels` 与 `sortKeys` 填充为空值，按 SemVer 优先级降序排列每个插件的 `versions`，并把每个相对 `icon` 引用替换为绝对 URL。

插件名称必须通过 npm 的新包名称验证。确切版本必须能由 node-semver 解析；npm 版本还必须等于其规范化结果，而 Git 版本字符串和构建元数据会完整保留。

`marketInstallTarget(name, version)` 为一个版本构建确切的 pnpm 规格：npm 为 `name@version`，Git 为提交固定的 `git+https` URL 并可选带 `path:` 参数；当版本记录了 registry 时，还会给出应优先询问的 registry。

<a id="api"></a>
## API

```ts
import { MarketIndexError, marketInstallTarget, parseMarketIndex } from '@deepseek-ai/dsh-plugin-market-index'
```

| 导出 | 职责 |
|---|---|
| `parseMarketIndex(value, indexUrl)` | 返回校验后的 `MarketIndex`；违反首条规则时抛出 `MarketIndexError`。 |
| `marketInstallTarget(name, version)` | 返回安装该确切版本的 `{ spec, registry? }`。 |
| `MarketIndexError` | 携带 `path` 与 `reason` 的校验失败。 |
| `MAX_INLINE_ICON_BYTES` | 内联 `data:` 图标解码后的最大载荷，32 KiB。 |
| `MarketIndex`、`MarketPlugin`、`MarketVersion`、`MarketEngines`、`MarketSource`、`MarketRepository`、`MarketIndexMetadata`、`MarketPluginMetadata`、`MarketDeclaration`、`MarketSortKeyDeclaration`、`MarketInstallTarget`、`LocalizedText` | 校验后的记录类型；`LocalizedText` 仅在此定义。 |

<a id="source-and-artifact-plane"></a>
## 源码面与产物面

Workspace 消费方与测试通过根 `paths` 映射把本包名称解析到 `src/index.ts`。打包后的包只暴露根导出（`lib/index.js` 与声明）以及 `./package.json`；它刻意没有 `./src/*` 子路径，因此打包消费方不能导入 TypeScript 源码。

<a id="verify"></a>
## 验证

在 workspace 根目录，`pnpm exec vitest run packages/util/plugin-market-index/tests` 测试真实解析器与安装参数构建器。`pnpm run test:coverage` 证明本包运行时覆盖率阈值，不证明语义完整性。`pnpm run build` 后，`pnpm run verify-node-next-types` 在外部 NodeNext 消费方检查构建声明；真实 tarball 安装是独立的发布证据。本纯库不拥有模型上下文、token 或 KV-cache 行为；带理由的无 Model Experience 分类归 `scripts/package-readme-policy.manifest.json`。

## 已知限制与延后工作

<a id="known-limitations-and-deferred-work"></a>

- **生成器义务未被检查** —— 校验器无法验证 `name`、`version`、`publishTimestamp`、`engines.dsh` 或展示字段与其描述的包一致，也无法验证该包声明了 bundle。
- **没有大小上限** —— 调用方必须在解析前限制文档大小。
- **不安装也不下载** —— 本包只校验并构建参数；它从不获取、安装或执行包。

<a id="dev-note"></a>
### 开发记录

<details>
<summary>维护者的工作上下文——点击展开</summary>

无。

</details>
