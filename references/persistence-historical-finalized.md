# 历史格式、接受基线与发布

提升writer、读取旧数据、冻结兼容基线或核对发布格式时读取。已提交的数据代际原样保留，新行为通过具名相邻转换与新代际表达，不能移动、覆盖或删除旧代际。

| 权威 | 回答什么 | 不能替代 |
|---|---|---|
| 当前writer常量 | 本工作树写什么格式 | 包版本、fixture名称或cache版本 |
| finalized检查点 | 哪个完整根／记录基线已接受 | 当前catalog或已发布记录 |
| release记录与evidenceTag | 哪个格式随产品真实发布 | tag存在或CI绿色 |
| 历史完整快照 | 各个旧整数当时的声明 | 迁移运行时安全或未声明行为 |

| 本次责任 | 规范owner |
|---|---|
| 低于writer的每个整数、归档拒绝覆盖、传递指纹与完整快照 | [格式历史](persistence-format-history.md) |
| 接受记录、checkpoint字段／哈希、不可变与新增后继 | [finalized](persistence-finalization.md) |
| 每条相邻转换、运行顺序、unsupported与raw log边界 | [具名迁移](persistence-adjacent-migrations.md) |
| 历史来源、完整双语／生成区与证据能否支持结论 | [历史证据](persistence-history-evidence.md) |

本产品没有源Session执行器；专题中的源命令必须映射到目标已实现工具，并实际验证，不能照抄命令名冒充已有能力。来源tag与中间树明确区分，不虚构发布。发布完成还须按[发布责任](release.md#persistence-release-state)回读真实writer并推进发布记录；类型变更先走[当前记录](persistence-current-records.md)。
