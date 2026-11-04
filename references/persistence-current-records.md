# 持久化变更记录

新增、修改或删除被持久化的声明类型、确认兼容性或准备接受基线时读取。目录、数据格式与执行工具要绑定目标真实项目；本产品提供治理规则，不提供来源的Session schema生成器／迁移运行时。缺工具不能取消记录、旧读取器安全、完整历史或验证责任。

| 本次责任 | 规范owner |
|---|---|
| 日期id、双语／配对／after-schema四件套、机器声明、记录骨架 | [记录格式](persistence-record-format.md) |
| same-version或bump、双向读取行为、data.version、归属策略及禁止字段 | [兼容决策](persistence-compatibility.md) |
| 每根前驱、摘要、共享类型传递、当前根及末端刷新 | [根与历史](persistence-record-history.md) |
| 日志不可变快照、拒绝原子性、投影与实验记录读侧 | [运行时合同](persistence-runtime.md) |
| 配对生成区、发布归档、版本迁移及验证器不保证的内容 | [版本与验证](persistence-record-verification.md) |
| 接受之后的机器不可变、新版本检查点与协同篡改边界 | [finalized](persistence-finalization.md) |

作者提供真实生产／读取行为与必要记录；生成器拥有机器快照及配对，不能手填摘要掩盖差异；评审判断语义与旧读取器是否在执行／截断前安全拒绝。分类器和类型差异都不能代替语义安全。当前writer、已接受与已发布不是一个数字，见[历史与冻结](persistence-historical-finalized.md)。

来源固定提交687f282e8625c6b8d11ff58211a90524be2e4317，精确坐标在各专题原位保留；原语料数量、逐项研究过程和重复来源总账留在冻结输入，不作为新产品执行结果。
