<a id="baseline-persistence"></a>
# 持久化、日志与兼容


本节是综合方法的一页：解释磁盘契约、日志、投影与旧数据这一变更面；逐项来源与覆盖见[来源与覆盖](sources-and-coverage.zh.md)。

持久化类型首先是磁盘契约，其次才是 TypeScript 类型。修改事件结构、字段可选性或根对象分类时，旧记录仍可能被新代码读取；因此要在同一变更内完成 acknowledgement 记录、schema 快照/目录更新和兼容性判断，而不是等测试失败再补。记录的 owner 是持久化负责人；生成器负责目录与摘要，评审负责“旧记录是否仍按原意解释”，三者不能互相替代。

已提交的 Session generation 是不可改写的历史，不只限于已发布或冻结版本；相邻迁移可新增版本命名的后继，但不得移动、覆盖或删除已提交代际。保留前代既不提供读取失败时的自动 fallback，也不承诺降级。格式变化只有在现有判别字段及 reader 行为能保证安全解释时才可同版本演进，否则升级 Session 格式并按来源代际解码。SQLite 的 `SCHEMA_VERSION` 单调递增是该存储的规则；目标没有 SQLite 时不强造它，但仍须判断自身持久记录的读取兼容性，有相应 schema 版本制度时保留其单调约束。

Session log 是模型输入与派生状态的权威来源。正式包声明自己的 Session 事件；`appendPluginRecord` 的生产调用只限实验包和规定 owner，不能用仅尽力保留的 `plugin:` 记录承载正式功能必需状态。新模型可见输入需要 Session event；改变既有消息内容则注册纯消息投影，脱离运行态的读者也要显式提供相同定义，保证实际请求可从日志重建。Session 派生状态使用统一投影规则，实时与恢复不能各自维护相冲突的权威值；unit 的状态字段或 fold 语义变化时递增 `stateVersion`。Host reader 必须要求投影服务或在缺 registry/key 时明确失败，贡献者可保留可选注册，不等于 host 能静默使用默认值。

最后，外部可感知的破坏性变化需要用户可执行的升级说明。CLI、profile、配置键、SDK/wire API、持久化数据和发布入口的兼容行为改变时，在同一变更里写清旧用法、新用法、迁移顺序和验证方式；已有未发布指南覆盖的内容继续更新。仓内 pre-stable 接口若所有消费者已在同一变更中改完，可以不留外部迁移步骤；但一旦用户保存的配置或脚本会失效，就不能只写“优化配置”。`verify-upgrade-guides` [只检查已有指南](https://github.com/deepseek-ai/deepseek-harness/blob/687f282e8625c6b8d11ff58211a90524be2e4317/scripts/verify-upgrade-guides.ts#L24-L74)的路径、元数据、结构和词数，[整棵目录缺失也可通过](https://github.com/deepseek-ai/deepseek-harness/blob/687f282e8625c6b8d11ff58211a90524be2e4317/scripts/verify-upgrade-guides.spec.ts#L53-L62)。是否触发、是否漏写以及迁移步骤是否可操作，均由作者和评审核对。本产品的升级指南条目与 Session 格式状态记录分别由[升级指南](../upgrade-guides.md)和[记录生命周期](../documentation-record-lifecycle.md#session-status)拥有，方法页只说明判断义务。

| 原条 | 触发与义务 | 失败机制与责任 | 验证、例外与迁移边界 |
|---|---|---|---|
| 4.01 持久化类型变更要记录 | 修改声明的持久化类型/事件结构时，同一变更完成 acknowledgement、schema 快照与目录/已发布记录检查。 | 旧记录按新类型解释，恢复失败或字段悄悄丢失。持久化 owner 负责记录，生成器 owner 负责目录。 | `verify-persistence-catalog`、`verify-persistence-changes`、`verify-persistence-releases` 加旧语料。源仓的记录格式与生成目录是特定实现；目标需自己的 inventory/record，不能因缺生成器就不记录。 |
| 4.02 已提交代际不能覆盖 | Session 数据或 fixture 的已提交 generation 保持原样；迁移新增版本命名的后继，不移动、覆盖、删除前代。 | 原地改写让升级输入与历史证据消失。持久化 owner 负责。 | 评审加历史/格式检查；保留前代既不提供 fallback，也不承诺 downgrade。不能将“已提交”缩窄为仅已发布/冻结。 |
| 4.03 旧记录不能被解释成另一含义 | 修改字段、事件、schema 或 reader 时判断安全读取；现有 discriminator 与 reader 足够安全才同版本，否则升级 Session 格式；SQLite `SCHEMA_VERSION` 单调递增。 | 同版本改含义，旧数据读成功却解释错。格式 owner 负责。 | 格式/目录检查加旧语料、迁移验证；SQLite 是条件项，不强加给无该存储的目标，也不能以缺检查器豁免真实兼容问题。 |
| 4.04 正式功能不能只写实验记录 | 正式包声明自己的 Session 事件；`appendPluginRecord` 的生产调用只限实验包与规定 owner；关键恢复状态不能只写成可能被忽略的 `plugin:` 记录。 | 正式功能的关键状态落在只有尽力保留保证的实验记录上，迁移或移除插件后丢失。record owner 负责事件定义与调用点。 | `verify-plugin-record-callers` 加评审事件定义。检查是源仓特定实现；目标要定义正式记录与实验扩展的边界，不是禁止一切插件记录。 |
| 4.05 模型输入必须能从 log 重建 | 新输入有 Session event；改变已有消息内容注册纯消息投影，detached readers 显式提供同定义；恢复/回放不依赖未记录内存。 | 隐藏上下文或读者定义缺失，使日志无法复现实际请求。Session 与内容 owner 负责。 | 评审加实际请求与日志重建/回放；Model Experience、token/KV 披露另有责任，不能代替此证明。无模型请求的目标不触发该专项目标。 |
| 4.06 派生状态统一投影与恢复 | 从已提交事件 fold，实时与恢复同规则，状态 owner 单一；状态字段或 fold 改变递增 `stateVersion`；host 缺 registry/key 明确失败。 | 实时、冷读、重启结果分叉，或缓存沿用旧语义。projection owner 负责。 | projection 规范、对应事件/恢复测试及版本校核；瞬时 UI 状态不因此强制持久化；可选贡献不等于 host 可静默默认。 |
| 4.07 破坏旧用法写升级指南 | 外部可感知破坏（CLI/profile/配置键/SDK/wire/持久化/发布入口）在同一变更写 upgrade guide，说明旧/新、用户操作与验证；已有未发布指南覆盖的内容继续更新。 | 内部消费者改完，用户保存的配置/脚本失效。发布 owner 负责。 | `verify-upgrade-guides` 只查已有文件的格式，不发现漏写；触发、完整性与可操作性由作者和评审判断。仓内 pre-stable 且全部消费者同步时可无外部指南；不能把指南留到以后。 |

第一方定位：[AGENTS.md:7–11](https://github.com/deepseek-ai/deepseek-harness/blob/687f282e8625c6b8d11ff58211a90524be2e4317/AGENTS.md#L7-L11)、[AGENTS.md:137](https://github.com/deepseek-ai/deepseek-harness/blob/687f282e8625c6b8d11ff58211a90524be2e4317/AGENTS.md#L137)、[docs/architecture.md:118–128](https://github.com/deepseek-ai/deepseek-harness/blob/687f282e8625c6b8d11ff58211a90524be2e4317/docs/architecture.md#L118-L128)、[docs/session-format-status.md:18–45](https://github.com/deepseek-ai/deepseek-harness/blob/687f282e8625c6b8d11ff58211a90524be2e4317/docs/session-format-status.md#L18-L45)、[docs/persistence-changes/README.md:26–80](https://github.com/deepseek-ai/deepseek-harness/blob/687f282e8625c6b8d11ff58211a90524be2e4317/docs/persistence-changes/README.md#L26-L80)、[docs/cookbook/reviewing-persistence-type-changes.md:23–42](https://github.com/deepseek-ai/deepseek-harness/blob/687f282e8625c6b8d11ff58211a90524be2e4317/docs/cookbook/reviewing-persistence-type-changes.md#L23-L42)。现有参考：[四元组](../persistence-record-format.md#persistence-current-records.record-quadruple)、[完整兼容决策](../persistence-compatibility.md#persistence-current-records.compatibility-decision)、[冻结检查点](../persistence-finalization.md#persistence-historical-finalized.finalized-checkpoint-immutability)、[格式相邻升级与发布](../persistence-adjacent-migrations.md)、[追加快照、拒绝原子性、投影与实验记录](../persistence-runtime.md)。原durable-log专项实现细则仍由源页package-contracts-8的来源坐标保留，本产品不提供其运行时；[升级指南](../release.md#upgrade-guides)。
