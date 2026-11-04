# 包关系

[English](package-relationships.md) | 中文

本参考投影当前 workspace manifest，不是第二份手工维护的依赖策略。节点是真实 workspace 包；有向边表示声明的运行时依赖。它不推断运行时组合、动态注册或仅类型导入。[架构](architecture.zh.md)拥有行为与依赖方向；各包 README 拥有各自合同。

## Workspace 关系图

<!-- BEGIN GENERATED package-relationships -->
```mermaid
graph TD
```
<!-- END GENERATED package-relationships -->

## 更新投影

`scripts/doc-graphs.manifest.json` 拥有图根、输出与边选择。变更 workspace 成员或依赖后，用 `pnpm run gen-doc-graphs` 重新生成，并用 `pnpm run gen-doc-graphs --check` 检查新鲜度。不手改生成区域来修复过期投影。除 Mermaid 语法外，还须对照源码 manifest 审查关系；新鲜度不证明架构合适。两种语言共享相同生成内容；散文另行审查并记录配对。
