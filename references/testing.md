# 测试域治理迁移参考（testing）

> 源仓：`deepseek-harness`，固定提交 `687f282e8625c6b8d11ff58211a90524be2e4317`，只读。 引用格式：`deepseek-harness/<path>:<start>-<end>@687f282e`。引用只标出实际检查过的范围；未检查的范围不在此列出，也不得以“本页未提”推断已覆盖。 标记约定：**[源规则]** 表示源仓有明确文字、配置或代码要求；**[迁移设计]** 表示为了让这些要求在采用项目中可执行而设计的落地步骤；**[建议]** 表示源仓未强制、但采用时可降低风险的附加做法。迁移设计不冒充源规则。 本文只覆盖测试域。发布流水线、文档配对、会话格式语义、安全审批等只在测试域需要时引用，交叉依赖汇总与适用边界见 `testing-migration-and-scope.md`。

## 0. 使用契约与读者入口

这套治理解决的不是“有没有测试”，而是：**在什么风险下选哪一层证据、用什么执行拓扑、怎样让失败可复现、怎样证明真实入口而不是 mock 的自证、以及哪些豁免仍然可审计**。

先按触发条件选入口：

| 触发 | 先读 | 典型命令 | 完成信号 |
|---|---|---|---|
| 改了一个包的局部行为 | [M01](testing-evidence-and-reliability.md#m01-tiered-evidence)、[M02](testing-isolation-and-scheduling.md#m02-topology) | `pnpm run test <focused>` | 聚焦用例通过；若触及覆盖率范围，再跑聚焦覆盖率 |
| 改的是异步、子进程、端口、临时目录、全局状态 | [M02](testing-isolation-and-scheduling.md#m02-topology)-[M05](testing-isolation-and-scheduling.md#m05-synchronization)、[M35](testing-evidence-and-reliability.md#m35-reliability-skill) | 聚焦用例 + 并发/恢复证据 | 资源释放到静止；拒绝 flake 掩盖 |
| 改的是运行时代码且要合入 | [M06](testing-coverage.md#m06-coverage)-[M09](testing-coverage.md#m09-fork-diagnostics)、[M37](testing-platform-and-performance.md#m37-ci) | `pnpm run test:coverage` 或 `check:ci:coverage` | 合并后的 per-file 100% 门槛通过 |
| 改的是模型/用户可见输出 | [M16](testing-snapshot-workflow.md#m16-snapshot-required)-[M27](testing-replay-and-oracles.md#m27-replay-corpus)、[M01](testing-evidence-and-reliability.md#m01-tiered-evidence) | `pnpm run test:snapshot` | keyless 回放差异被审查 |
| 改的是 CLI/进程装配但无会话回放 | [M28](testing-replay-and-oracles.md#m28-expected) | `pnpm run test:expected` | owner-local 期望输出通过 |
| 改的是 Web UI | [M29](testing-platform-and-performance.md#m29-web)-[M30](testing-platform-and-performance.md#m30-web-perf) | `pnpm run test:web`（必要时 `test:web:built`） | Chromium/WebKit 语义断言通过 |
| 改的是 provider/真实 API 行为 | [M10](testing-real-api-and-secrets.md#m10-e2e-key)-[M11](testing-real-api-and-secrets.md#m11-e2e-isolation)、[M12](testing-evidence-and-reliability.md#m12-world-verification) | `pnpm run test:e2e` | 有 key 的真实运行；无 key 只说明管线可跑 |
| 改的是 Python SDK/wheel/运行时 | [M40](testing-platform-and-performance.md#m40-python-sdk)、[M14](testing-evidence-and-reliability.md#m14-real-entry)-[M15](testing-evidence-and-reliability.md#m15-source-built) | `uv run --project python/sdk pytest`；installed-wheel keyless | pytest + 干净 venv black-box 通过；real API 只在 trusted 环境 |
| 改的是性能敏感路径 | [M31](testing-platform-and-performance.md#m31-benchmark-gate)-[M32](testing-platform-and-performance.md#m32-benchmark-hygiene) | `pnpm run test:bench` 或聚焦 benchmark | 预算内中位数；原始样本与机器信息齐全 |
| 改的是测试基础设施/夹具/CI | [M02](testing-isolation-and-scheduling.md#m02-topology)-[M09](testing-coverage.md#m09-fork-diagnostics)、[M33](testing-platform-and-performance.md#m33-support-roster)-[M38](testing-platform-and-performance.md#m38-skips) | 对应 lane + 负对照 | 新守卫能让被拒绝的回归变红 |
| 推送/重写历史前 | [M36](testing-evidence-and-reliability.md#m36-pre-push) | `pnpm run change-scope --base <ref>` | 只运行覆盖出站 diff 的最小证据 |

**[源规则]** 测试分层和命令总表在 `docs/testing.md`；命令清单在根 `AGENTS.md` 的 Commands。不要把“我跑了 `pnpm run test`”当成覆盖率门禁：源仓明确规定 CI 覆盖率门禁是 `test:coverage`，不是 `test`。`deepseek-harness/docs/testing.md:7-17@687f282e`、`deepseek-harness/AGENTS.md:113-121@687f282e`。

**[源规则]** 测试跟着它验证的代码区域走：包测试在包自己的 `tests/**`，仓库脚本测试在 `scripts/**/*.spec.ts`，profile 级集成测试在 `apps/cli/tests/profiles/`，包级 Loader 组合留在该包测试内。`deepseek-harness/docs/testing.md:7-17@687f282e`、`deepseek-harness/.agents/skills/dsh-pre-push-checks/SKILL.md:35-43@687f282e`。

**[迁移设计]** 采用项目先建立自己的“触发 → 层级 → 命令 → 所有者 → 证据”表，不要直接照抄命令名。表中每一行必须能回答：谁运行、在哪个环境运行、失败时谁修、允许哪些例外、哪些结论这层证据不能证明。


## 证据家族页索引

本页只保留触发入口、共同使用边界和跨页索引。机制正文按证据家族分页，每页正文与其来源坐标同页持有；本页不再持有 40 个机制正文，也不复制来源附录。

| 主题页 | 拥有的原节 | 内容 |
|---|---|---|
| [testing-evidence-and-reliability.md](testing-evidence-and-reliability.md) | §1、§12–15、§35–36 | 证据层级与命令选择、世界验证、mock 边界、真入口组合、源/构建平面、可靠性 Skill、推送前检查 |
| [testing-isolation-and-scheduling.md](testing-isolation-and-scheduling.md) | §2–5 | 执行拓扑与并发、资源分配与清理、进程全局状态与平台语义、同步/超时预算/静止 |
| [testing-coverage.md](testing-coverage.md) | §6–9 | per-file 覆盖率门禁、排除台账与重套件、分区合并与计时、worker 退出诊断 |
| [testing-real-api-and-secrets.md](testing-real-api-and-secrets.md) | §10–11、§39 | 真实 API key 策略与信任边界、凭据/网络/副作用隔离、秘密卫生 |
| [testing-snapshot-workflow.md](testing-snapshot-workflow.md) | §16–23 | 快照必需性与放置、manifest 与守卫、场景选择与代际、语料政策、模式、归一化、身份 token、header pins |
| [testing-replay-and-oracles.md](testing-replay-and-oracles.md) | §24–28、§34 | workspace oracle、loopback HTTP fixture、LLM replay、回放 token、expected 归属、无凭据 mock server |
| [testing-platform-and-performance.md](testing-platform-and-performance.md) | §29–33、§37–38、§40 | Web 与性能压力 lane、benchmark 门禁与工作负载、支持包选择、CI 编排与信任、平台豁免、Python SDK |
| [testing-migration-and-scope.md](testing-migration-and-scope.md) | §41–44（含原命令卡） | 迁移实施顺序与验收清单、适用范围、证据限制、跨域依赖、最小可执行命令卡 |

机制级来源坐标在各家族页末尾的“附：本页机制的来源坐标索引”；域级索引读法见 `testing-migration-and-scope.md`。
