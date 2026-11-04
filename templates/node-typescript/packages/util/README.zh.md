---
description: "共享工具的包地图：插件市场索引格式 1 校验器与固定安装参数构建器。"
kind: "package-group"
---

# util/ —— 共享工具

[English](README.md) | 中文

## 摘要

`util/` 分组为能力包提供共享的机械原语，避免重复实现。本检出包含一个库：读者与生成器共同使用的格式 1 校验器，以及把已列出版本转换为确切包规格的安装参数构建器。这里每个根条目都是库：不注册产品服务或事件，消费能力保留业务语义。

## 目录

- [包](#packages)
- [相关文档](#related-documentation)
- [开发记录](#dev-note)

-----

<a id="packages"></a>
## 包

每个包提供一个原语；打开包页面了解如何使用。

| 包 | 职责 |
|---|---|
| [`plugin-market-index/`](plugin-market-index/README.zh.md) | 校验插件市场索引格式 1，并构建固定的安装参数 |

-----

<a id="related-documentation"></a>
## 相关文档

- [根包地图](../README.zh.md) —— `util/` 在所有包分组中的位置。
- [格式合同](../../.agents/notes/implemented/feature/2026-10-02-plugin-market-index-format.zh.md) —— 格式本身及其来源。
- [新增包手册](../../docs/cookbook/adding-a-package.zh.md) —— 新的共享原语如何加入本分组。
- [包合同分类](../../docs/cookbook/adding-a-package.zh.md#4-write-the-package-readme) —— kind、限制与模型影响策略；本包族地图不拥有模型上下文或运行时行为。

<a id="dev-note"></a>
## 开发记录

<details>
<summary>维护者的工作上下文——点击展开</summary>

无。

</details>
