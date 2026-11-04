# 检查责任与执行宽度

一项变更的操作步骤唯一归[变更闭环](../change-workflow.md)，共同完成状态归[项目标准](../project-standard.md)。本页只区分检查责任，不建立另一套步骤或状态。

## 检查责任分层，而非每次全量重跑

| 层次 | 承担的责任 | 不能据此推定 |
|---|---|---|
| 本地 Git hooks | 对暂存内容执行有限的配对、冻结记录、lint、空白、生成元数据与 vendor 约束；pre-push 只做 typecheck | 未覆盖的行为、快照、文档、构建和安装已经验证 |
| 开发者本地 | 根据完整 diff 选择能发现本次回归的最小充分证据，补真实入口和专项前提 | 一次聚焦检查覆盖全仓、全部平台或真实提供方 |
| CI | 按工作流执行广覆盖、构建依赖和平台矩阵，汇总必需作业的真实状态 | 观察性步骤等同必需门禁，或 skipped/cancelled 等同成功 |
| 人工评审 | 判断需求符合性、接口两侧、生命周期、设计必要性、文档含义及检查盲点 | 工具无法判断的内容可以由计数、格式或绿色标签代替 |
| 平台与发布负责人 | 配置服务端 required checks、审批资格和受权发布流程，并在相应层观察效果 | 工作流文件存在就代表合并会被拒绝或发布已完成 |

源明确不设 hooks 之外的通用本地全量基线；只有用户要求、CI 诊断或无法再缩小的仓库级变化才做本地完整排练。已通过且未失效的检查不为提交或推送重复执行。**共享检查定义与退出码契约，不等于每次本地与 CI 执行同样宽度。** 门禁运行顺序还必须满足产物依赖与共享资源约束，不能盲目并行。

第一方依据：[实际 hook 配置](https://github.com/deepseek-ai/deepseek-harness/blob/687f282e8625c6b8d11ff58211a90524be2e4317/lefthook.yml#L1-L49)、[本地选择与全量例外](https://github.com/deepseek-ai/deepseek-harness/blob/687f282e8625c6b8d11ff58211a90524be2e4317/.agents/skills/dsh-pre-push-checks/SKILL.md#L27-L78)。详细条件见[推送前证据](../workflow-integration-and-handoff.md#aw-08)及[平台运行与观察性边界](build-and-delivery.zh.md#baseline-delivery)。
