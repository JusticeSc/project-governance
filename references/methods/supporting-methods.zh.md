<a id="baseline-support"></a>
# 支撑持续开发的治理方法


本节是综合方法的一页：承载事实归属、规则生命周期、删除判断与复盘准入等支撑方法；它们不是要求每次任务新增管理文件。

七类检查依赖清楚的事实归属与规则生命周期；这些支撑不是要求每次任务新增管理文件。

- **一事实一归属、规则按需加载。** 常驻指令只放跨任务必需的短规则，职责地图帮助找到实现与领域要求；当前行为归代码及所属说明，操作步骤归流程，长期取舍归决策，事故经过归复盘。其他位置链接，不复制多个权威版本；生成器拥有派生内容。原依据：[文档职责分层](https://github.com/deepseek-ai/deepseek-harness/blob/687f282e8625c6b8d11ff58211a90524be2e4317/docs/AGENTS.md#L15-L46)。详见[指令层级与事实归属](../engineering-workflow.md#engineering-instruction-tiers)和[文档归属](../documentation.md)。
- **持久规则必须有作用与落实责任。** 新增规则应能说明防什么错误，先寻找已有归属；能机械判定的约束接到真实检查入口并验证拒绝，不能机械判定的交给明确评审。检查图、配置、缓存、取消和资源释放同样需要验证，不能让检查系统自己漏跑却汇总成功。不是把所有教训都升级成长驻规定，也没有通用的自动规则收益或日落系统。原依据：[评审中的强制路径、测试与负对照](https://github.com/deepseek-ai/deepseek-harness/blob/687f282e8625c6b8d11ff58211a90524be2e4317/.agents/skills/dsh-code-review/SKILL.md#L48-L54)。详见[规则准入](../decisions.md#durable-rule-admission)。
- **决策记录保留未来需要的取舍，而非流水账。** 同一个决定更新原 owner；决定反转用新记录及交叉链接。完全取代后只有保存全部独有理由、替代、后果、验证与覆盖缺口才能合并删除；部分取代保留两者。仍能约束兼容、安全或重引入的理由保持现役；失去推进价值的提案拒绝，不伪装已实现；归档冻结且不再充当当前规则。原依据：[Note 的准入、取代与冻结](https://github.com/deepseek-ai/deepseek-harness/blob/687f282e8625c6b8d11ff58211a90524be2e4317/.agents/notes/README.md#L36-L52)。详见[取代审计](../decisions.md#supersession-audit)与[删除、保留、归档](../decisions.md#delete-keep-archive)。
- **简化看净维护义务，不看删除行数。** 删除前追真实生产者、消费者、动态装配、外部扩展、数据和兼容责任；说清放弃的能力及保留理由。替换工具核对诊断、资源、平台和源/产物路径，不能将同样复杂度移到胶水或新增一致性检查中就宣布简化。删除后同步调用方、类型、配置、测试、说明和生成物；调查不自动获得实施权限。原依据：[简化的消费者证据与成本](https://github.com/deepseek-ai/deepseek-harness/blob/687f282e8625c6b8d11ff58211a90524be2e4317/.agents/skills/dsh-find-simplifications/SKILL.md#L18-L61)。详见[简化流程](../workflow-specialized-evidence.md#aw-18)。
- **事故复盘用来修正逃逸机制。** 只有故障微妙、系统性且重新发现代价高时，才记录根因、为何已有防线没拦住、以及可证伪的新约束。记录存在不等于问题结案；普通局部 bug 不强制产生永久复盘。原依据：[复盘准入](https://github.com/deepseek-ai/deepseek-harness/blob/687f282e8625c6b8d11ff58211a90524be2e4317/docs/postmortem/README.md#L5-L11)。详见[复盘与规则](../decisions.md#postmortem-admission)。

源 Skill 是专项操作程序，不是自动证明规则已遵守的工具；本产品的[共同目标状态、固定职责与工程保证](../project-standard.md#project-standard)及[建立与改造流程](../adoption.md#adoption)属于产品规范设计，不冒充来源的通用状态协议。项目已有任务板、Issue、交接或决策 owner 只有实际满足对应准入、状态和生命周期合同才复用，存在不等于合规，也不仅为“用了治理 Skill”再建同权威记录。稳定复现还需在适用目标观察真实执行，方法正文或元数据完整不能代替该证明。
