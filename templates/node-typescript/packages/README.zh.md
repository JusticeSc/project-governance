---
description: "包 workspace：packages/ 下的 npm 包如何分组、每个分组拥有什么，以及约束它们的约定。"
kind: "package-group"
---

# 包

[English](README.md) | 中文

## 摘要

库位于 `packages/<group>/<package>/`，按真实能力族分组。本项目目前没有包分组或库。请求的行为需要库时，通过本页找到所属分组，再打开该分组 README 查看包列表；每个分组 README 是其包族的权威地图。包名由 manifest 定义，不要求沿用来源项目的 scope。

## 目录

- [包分组](#package-groups)
- [发布预期](#release-expectations)
- [依赖](#dependencies)
- [包 README 合同](#package-readme-contracts)
- [开发记录](#dev-note)

-----

<a id="package-groups"></a>
## 包分组

每个包只属于一个分组。职责合适时复用分组；新分组须更新自己的双语 README 与本导航。目前没有已声明包分组；只有真实分组拥有包时才新增导航。登记与文档见[新增包](../docs/cookbook/adding-a-package.zh.md)。

-----

<a id="release-expectations"></a>
## 发布预期

包的 manifest 声明其发布意图。库遵循仓库的 publication rules；应用为 private。合同变化时同步更新所有仓库内消费方；外部可感知的破坏在触发条件成立时遵循[升级指南工作流](../.agents/skills/pg-create-upgrade-guide/SKILL.md)。发布版本及 registry 发布需要各自的授权和证据。

-----

<a id="dependencies"></a>
## 依赖

依赖遵循真实职责：库不依赖应用。由所属成员声明依赖，并在引入时审查跨包合同与策略分类。

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
