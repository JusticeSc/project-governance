---
kind: upgrade-guide
description: "升级验证器前修正无效的格式 1 插件名称和版本。"
---

# 格式 1 名称和版本验证

[English](guide.md) | 中文

## 变更

`parseMarketIndex` 会拒绝 npm 新包名称验证器不允许的插件名称、node-semver 无法解析的版本，以及与 node-semver 规范化结果不同的 npm 版本。此前其中一些值会被接受，或在排序时导致未捕获的 `TypeError`。可解析的 Git 版本字符串及其构建元数据会完整保留。受影响文档的索引生产者和读取者必须修正这些值；[格式规则](../../../../.agents/notes/implemented/feature/2026-10-02-plugin-market-index-format.zh.md)没有改变。

## 迁移

1. 在每个索引 JSON 中，将无效的 `plugins[].name` 和 `plugins[].versions[].version` 值替换为安装来源实际使用的有效包名称和版本。更新受影响的 `dist-tags` 目标，使其完全匹配。
2. 将修正后的文档和其 URL 传给 `parseMarketIndex`；发布或使用索引前，根据 `MarketIndexError` 报告的 JSON 路径解决所有错误。
