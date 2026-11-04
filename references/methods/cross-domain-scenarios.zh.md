<a id="baseline-scenarios"></a>
# 从代表性变更反查跨域义务


本节是综合方法的一页：用代表性变更反查跨域义务与证据，不表示已实现或已运行；七类方法见各专题页，来源覆盖见[来源与覆盖](sources-and-coverage.zh.md)。

以下是方法的场景校核：判断这类改动应当追哪些对象、需要什么证据，不报告已实现该功能或已运行来源场景。实际任务还要按目标事实补足相关分支。

| 变更起点 | 必须连起来的要求 | 可发现错误的证据与边界 |
|---|---|---|
| 给工具增加超时参数 | [类型与调用方](types-and-interfaces.zh.md#baseline-types)；[配置解析和任务/子进程 owner](architecture-and-lifecycle.zh.md#baseline-architecture)；[失败输出与回放](behavior-and-evidence.zh.md#baseline-behavior)；保存字段时的[旧数据读取](persistence-and-compatibility.zh.md#baseline-persistence)；[说明](documentation-and-derived-content.zh.md#baseline-docs)与[产物](build-and-delivery.zh.md#baseline-delivery) | 类型检查不能证明超时后工作已停止。检查取消/超时后的外部效果、静止清理与错误反馈；对模型/用户输出审回放 diff。只有涉及持久化时才触发格式记录，只有触达产物入口时才加对应 built/packed 证据。 |
| 新增一段模型上下文或工具 schema | [模型输入与日志可重建](persistence-and-compatibility.zh.md#baseline-persistence)；[接口两侧](types-and-interfaces.zh.md#baseline-types)；[用户/模型可见回放及 SDK](behavior-and-evidence.zh.md#baseline-behavior)；[Model Experience 与示例](documentation-and-derived-content.zh.md#baseline-docs) | 新输入追到事件，修改既有消息追到纯投影，比较恢复/回放时的实际请求；披露 token/KV 成本不能代替日志重建。两个 SDK 是否必需取决于是否改变共享循环、生命周期或事件定义，不因任何 prompt 改动都全跑两者。 |
| 把一个运行依赖改为可选并发布 | [依赖声明、缺失语义及加载](architecture-and-lifecycle.zh.md#baseline-architecture)；[源码/产物/安装消费者](build-and-delivery.zh.md#baseline-delivery)；[用法与兼容说明](documentation-and-derived-content.zh.md#baseline-docs) | 在真实安装布局分别有/无该依赖时加载并触发相关能力，断言无关能力仍可用、缺失有明确处理；检查打包未内联可选依赖。workspace/源码测试不能证明这些结果；不凭 manifest 标签宣布可选性生效。 |
| 新增 Session 派生状态并改变其 fold | [统一投影、恢复与版本](persistence-and-compatibility.zh.md#baseline-persistence)；[资源和状态 owner](architecture-and-lifecycle.zh.md#baseline-architecture)；[并发与回放](behavior-and-evidence.zh.md#baseline-behavior)；影响模型/用户时的[说明](documentation-and-derived-content.zh.md#baseline-docs) | 核对实时、冷读、resume/replay 使用同一权威规则；测试事件顺序、缺 registry/key、版本冲突及恢复结果。可重建缓存与规范数据分开，不因“能重算”允许第二份权威状态；非 Session 项目映射到自身单一读模型而非强装源框架。 |
| 移动一个双语 API 文档并改生成清单 | [事实归属与生成源](supporting-methods.zh.md#baseline-support)；[类型等价、示例、双语、入链与公开投影](documentation-and-derived-content.zh.md#baseline-docs)；改门禁时的[依赖与汇总](review-and-collaboration.zh.md#baseline-collaboration) | 先改 owner/源并重生成，再核对本地与公开片段、完整适用语料和两侧含义；配对哈希不证明翻译正确。只改文档不默认跑平台打包；若示例编译读当前声明，则补其构建前提，不能依赖旧产物。 |
