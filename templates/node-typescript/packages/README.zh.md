---
description: "包 workspace：packages/ 下的 npm 包如何分组、每个分组拥有什么，以及约束它们的约定。"
kind: "package-group"
---

# 包

[English](README.md) | 中文

## 摘要

本工具包由 `packages/` 下按能力族分组的 npm 包组成。本检出只有一个分组：[`util/`](util/README.zh.md)，它保存应用与未来包共享的底层原语。把本页当作顶层地图：找到所属分组，再打开其 README 查看包列表。每个包都使用 `@deepseek-ai/dsh-*` scope，并且只属于一个分组；每个分组 README 是其包族的权威包地图。

## 目录

- [包分组](#package-groups)
- [发布预期](#release-expectations)
- [依赖](#dependencies)
- [包 README 合同](#package-readme-contracts)
- [开发记录](#dev-note)

-----

<a id="package-groups"></a>
## 包分组

每个包只属于一个分组；新包加入现有分组，新分组要更新自己的 README 与本表。

| 分组 | 职责 |
|---|---|
| [`util/`](util/README.zh.md) | 在整个 workspace 中共享的底层库：格式 1 校验器及未来任何不承载领域语义的原语 |

-----

<a id="release-expectations"></a>
## 发布预期

包的 manifest 声明其发布意图。校验器是可发布库，带有公开的 `publishConfig` 与 `repository` 条目；生成器应用是 `private`，不发布。公开 API 处于预稳定阶段：在同一变更中更新所有仓库内消费方；外部可感知的破坏遵循[升级指南工作流](../.agents/skills/dsh-create-upgrade-guide/SKILL.md)。本检出没有 experimental 分组。

-----

<a id="dependencies"></a>
## 依赖

依赖从应用与更高层包指向 `util/`；反向依赖不存在。`util/` 包不注册应用服务，也不拥有产品状态，因此其消费方保留领域语义。

- 应用依赖校验器进行解析与安装参数构建；校验器的[manifest](util/plugin-market-index/package.json)拥有其外部依赖声明。
- Workspace 依赖使用 `workspace:*`。
- 新依赖需要当前消费方，并且无法合理使用标准库；`pnpm run constraints` 检查声明的依赖图。持续维护的替换依赖遵循[替换流程](../docs/development.zh.md#replacing-maintained-code-with-a-dependency)，由该流程拥有语义比较、集成证据与过时自有代码移除。

-----

<a id="package-readme-contracts"></a>
## 包 README 合同

每个包 README 遵循 [kind、Summary、Model Experience 与限制合同](../docs/cookbook/adding-a-package.zh.md#4-write-the-package-readme)。带理由的无此节分类归 `scripts/package-readme-policy.manifest.json`；不能复制无关包族的豁免，也不使用无解释的「none」。包约定——导出、源码面／产物面、测试、TypeScript 布局——见 [packages/AGENTS.md](AGENTS.md)。

-----

<a id="dev-note"></a>
## 开发记录

<details>
<summary>维护者的工作上下文——点击展开</summary>

无。

</details>
