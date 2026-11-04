---
description: "记录持久化类型更改及其兼容性确认。"
kind: persistence-change
---

# 2026-11-02-market-index-format-1

[English](2026-11-02-market-index-format-1.md) | 中文

## 概述

首次捕获当前插件市场格式1的 MarketIndex 声明结构及所有可达声明类型。

## 目录

- [声明](#declaration)
- [兼容性](#compatibility)
- [验证](#verification)
- [开发备注](#dev-note)

<a id="declaration"></a>
## 声明

```yaml persistence-change
schemaVersion: 1
id: 2026-11-02-market-index-format-1
baseline: true
changes:
  - root: "MarketIndex"
    previous: null
    after: "957b79be6571f957b1b78b449f4ddeb2f249cdce5b810ee27c21073030a17c07"
    decision: same-version
```

<a id="compatibility"></a>
## 兼容性

本基线记录当前源码，不描述两个读取器版本间的转换。基线的 same-version 标记不建立运行时兼容、发布、人审接受或定稿检查点事实，不推断历史发布或 Session generation。

<a id="verification"></a>
## 验证

已执行 corepack pnpm exec vitest run scripts/persistence-changes.spec.ts scripts/persistence-schema-model.spec.ts，15个用例通过。这些测试在隔离夹具中检查真实声明类型提取、结构历史与检查点验证。生成前目录 --check 因缺失当前清单而拒绝。尚未执行历史读取器互操作或运行时格式迁移验证。

<a id="dev-note"></a>
## 开发备注

无。
