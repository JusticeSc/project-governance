# 测试域迁移程序、适用范围与证据限制

将测试机制接入目标项目、判断适用范围、报告证据限制或核对跨域责任时读本页。内容包括 §41 实施顺序与验收清单、§42 适用范围、§43 证据限制、§44 跨域依赖及最小命令示例。

本页程序是 **[迁移设计]**，不是源仓命令。按阶段执行，只把已观察结果写成证据。证据标记与固定源提交见[测试入口](testing.md)，按触发条件选择机制；不能因命令示例存在就视为目标已配置。

<a id="migration-plan"></a>

## 41. 迁移实施顺序（采用项目执行）

以下是 **[迁移设计]**，不是源仓命令。目标是把根 `testing.md` 索引中的各机制逐一落到一个真实项目，而不是复制 deepseek-harness 的目录。

### 阶段 0：盘点与参数化
1. 列出测试表面：单元、覆盖率、expected、snapshot、Web、e2e、bench、平台矩阵。
2. 列出运行时源码根、测试根、脚本根、生成物根、vendor/第三方根。
3. 列出真实入口：CLI/bin、server、worker、desktop、Web、SDK；标出哪些有 built 产物。
4. 列出外部边界：provider、网络、时钟、文件系统、数据库、子进程、浏览器。
5. 列出平台：Linux/macOS/Windows/WSL；哪些能力是平台专属。
6. 为每个参数给默认值：per-file 覆盖率、worker/分区、超时预算、样本数、预算、并发。

### 阶段 1：最小可信单元与覆盖率
1. 建立 Vitest 配置：source paths、process-bound 项目、setup（proxy/DOM）、reporter。
2. 设 per-file 100% 覆盖率，只 include 运行时源码；写排除台账和 `v8 ignore` 规则。
3. 建 `test`、`test:coverage`、聚焦覆盖率命令；确认 `test` 不等于覆盖率门禁。
4. 加未覆盖位置报告；让失败可定位到 file:line。

### 阶段 2：隔离与可靠性
1. 建资源助手：`listen(0)`、`mkdtemp`、唯一命名空间、清理注册。
2. 建全局状态恢复助手：env/cwd/timer/locale/fetch/registry；capture absence。
3. 设 lane 超时预算；加 per-test/hook/poll 的机械 guard。
4. 建可靠性 Skill/审查清单；禁止 sleep/retry/串行掩盖。
5. 加并发/恢复/负对照证据。

### 阶段 3：真实入口与快照
1. 建 Loader smoke / real composition；覆盖默认导出/命名导出回归。
2. 建 owner-local expected 与 `test:expected`。
3. 建 snapshot harness：manifest、fixture discovery、normalization、identity tokens、modes、workspace oracle、HTTP fixtures、replay。
4. 建 corpus 政策与守卫；把格式迁移输入纳入。
5. 让两个 SDK/消费者输出同 PR 更新（如果有多语言 SDK）。

### 阶段 4：Web、bench、e2e
1. 建真实浏览器 lane；语义/ARIA 断言；CI replay 只读。
2. 建手动perf/stress opt-in诊断lane，保留机器/负载/测量记录；不声称其默认进入CI预算阻断。
3. 建 benchmark 目录/配置/报告；CI idle runner；内存案例独立。
4. 建 e2e workflow：key 自跳过、preflight、fork/Dependabot 排除、secret 最小作用域、端点固定、telemetry 关闭。

### 阶段 5：CI 编排
1. 画 lane 依赖图：build → consumers；coverage 分区；bench 独立；platform 分级。
2. 设 fail-fast、worker/分区、缓存、runner temp、artifact 上传。
3. 区分 required 与 observational；把“checker 失败”和“forge 阻断”分开验证。
4. 加 expected-filenames/fixture guard/coverage-exempt guard。

### 阶段 6：采用验证（C4/C5 要求）
1. 选一个**新项目**和一个**既有项目**，覆盖两种工具链。
2. 用全新会话的 agent 只依赖本 Skill/参考执行；记录第一次失败和修复。
3. 覆盖功能、bug、文档/接口变更、review、fresh-session continuation。
4. 对未被案例覆盖的机制补案例。
5. 每个“enforcement”收集 positive/rejection/recovery 证据；区分“检查器能失败”和“forge 真的阻断”。
6. 远程实验需显式授权与隔离；不做生产发布/保护变更。

### 验收清单（逐项勾）
- [ ] 每个机制在采用项目有对应命令/配置/文件，而不是只有文字。
- [ ] 每个门禁至少有一个**拒绝样本**（故意引入回归，观察失败）。
- [ ] 每个恢复路径有证据（失败后修复/重跑）。
- [ ] 证据绑定源提交、目标版本、实际命令、观察输出。
- [ ] 未执行/未知项明确标为 planned/unknown，不写成 verified。
- [ ] 远端 required check/分支保护/secret 权限有独立证据，未验证就写未知。

<a id="applicability"></a>

## 42. 适用范围与明确不适用

**适用.**
- 多包/多入口的 TypeScript/JavaScript 仓库，尤其有 CLI、server、Web、SDK、子进程。
- 需要 keyless CI + 有 key 的真实 provider 证据。
- 有模型/用户可见输出，需要 recorded-session 回归。
- 有共享 CI runner，需要并发/资源隔离。
- 有性能/内存预算。

**不适用/需缩减.**
- 单文件脚本、无运行时门禁的小项目：不需要 40 个机制；至少保留 [M01](testing-evidence-and-reliability.md#m01-tiered-evidence)/[M02](testing-isolation-and-scheduling.md#m02-topology)/[M06](testing-coverage.md#m06-coverage)/[M12](testing-evidence-and-reliability.md#m12-world-verification)/[M15](testing-evidence-and-reliability.md#m15-source-built)/[M36](testing-evidence-and-reliability.md#m36-pre-push)。
- 没有 recorded session/多语言 SDK：[M16](testing-snapshot-workflow.md#m16-snapshot-required)-[M27](testing-replay-and-oracles.md#m27-replay-corpus) 可缩减为普通 golden + 归一化。
- 没有独立 benchmark runner：[M31](testing-platform-and-performance.md#m31-benchmark-gate)-[M32](testing-platform-and-performance.md#m32-benchmark-hygiene) 可先做本地诊断，不要把本机数字当门禁。
- 没有 Web/浏览器：[M29](testing-platform-and-performance.md#m29-web)-[M30](testing-platform-and-performance.md#m30-web-perf) 不适用。
- 没有真实 provider：[M10](testing-real-api-and-secrets.md#m10-e2e-key)/[M11](testing-real-api-and-secrets.md#m11-e2e-isolation) 只保留 keyless 管线，不声称产品通过。

**参数化，不要照抄.**
- `packages/*/*/src` → 你的运行时源码根。
- `snapshots/session|sdk|acp|web` → 你的场景分类。
- `DSH_COVERAGE_TEST_TIMEOUT_MS=90000` → 你的 lane 实测预算。
- 6 workers / 4 partitions / 4 e2e workers → 你的 runner CPU/内存。
- per-file 100% → 你的门槛；源仓的选择不是普遍真理，但“per-file 而非聚合”是关键。
- `mock-key`/`127.0.0.1` → 你的本地 mock 端点。

<a id="limits"></a>

## 43. 证据限制与未决项

1. **远端信任未验证**：源仓能证明 workflow/gate 定义，不能证明 GitHub 分支保护、required checks、secret 权限、组织策略。采用项目必须单独提供。
2. **不是全量审阅**：本次审阅覆盖测试策略、配置、核心守卫、支持包 README、Skills 和关键 CI；没有逐行读完全部 `packages/*/tests/**`、所有 workflow、所有 benchmark case、所有 Web e2e。覆盖率报告列出未检查候选。
3. **历史示例有时效性**：Agent Notes 是当时的决策/验证记录；当前代码可能已变化。引用它们只作为机制来源，不当作当前状态。
4. **snapshot corpus 标签是人工声明**：政策测试验证标签/代际/角色，不验证 fixture 是否真的覆盖了标签声称的行为。
5. **benchmark 数字依赖机器**：源仓的预算/校准值不能直接移植；容器 CPU 配额、共享宿主、Node 版本都会改变结果。
6. **mock 边界不是端到端**：任何 harness 都有未覆盖的真实边界；README 的“not proof”必须保留。
7. **平台矩阵未穷举**：源仓有 Windows/macOS/Linux 的多条 lane，但本次没有逐条运行/审阅所有 workflow；平台结论只到“存在显式机制”。
8. **秘密审计未做**：没有扫描历史提交/第三方日志；只审阅了 secret 隔离和 fixture 规则。
9. **机制数量不是目标**：40 个是按源仓证据归纳的可操作单元；采用项目应按风险合并/删减，不要为了数量造检查器。

<a id="cross-domain"></a>

## 44. 交叉域依赖

| 依赖域 | 本域使用点 | 需要对方域确认 |
|---|---|---|
| CI/发布 | [M15](testing-evidence-and-reliability.md#m15-source-built) built 产物、[M37](testing-platform-and-performance.md#m37-ci) lane、[M31](testing-platform-and-performance.md#m31-benchmark-gate) benchmark job | required check、发布/打包、runner 配置 |
| 文档 | [M16](testing-snapshot-workflow.md#m16-snapshot-required) 文档输出、[M36](testing-evidence-and-reliability.md#m36-pre-push) `doc-sync` | 文档配对/链接/生成物规则 |
| 会话格式 | [M18](testing-snapshot-workflow.md#m18-selection) 代际、[M19](testing-snapshot-workflow.md#m19-corpus) corpus、[M20](testing-snapshot-workflow.md#m20-modes) record/refresh | 格式版本语义、迁移 codec、writer 行为 |
| 安全 | [M11](testing-real-api-and-secrets.md#m11-e2e-isolation)/[M22](testing-snapshot-workflow.md#m22-identity)/[M39](testing-real-api-and-secrets.md#m39-secrets) key/secret | 审批、secret 管理、泄露响应 |
| 桌面/安装器 | 跨域测试笔记（installed update/download） | 安装、更新、签名、平台打包 |
| Python SDK | [M40](testing-platform-and-performance.md#m40-python-sdk) Python pytest/installed-wheel/real API；[M16](testing-snapshot-workflow.md#m16-snapshot-required) Python 期望输出 | Python runtime/打包/发布、wheel 平台矩阵 |
| 供应链 | benchmark-npm-resolution 等 | 依赖/打包策略 |

**绑定状态.** 跨域条目按本参考实际读过的 path 与 ranges 绑定：engineering、documentation、agent-workflows、collaboration 等域有对应专题页的明确坐标；测试域编写时没有取得独立覆盖记录的域显式标为未绑定，不伪造绑定。

**跨域边界.** 本域参考只负责“测试如何证明”；不重新定义发布策略、会话格式规范、安全审批或文档配对规则。遇到这些域的具体决策，回到对应 owner；测试域只提供证据要求和失败处理。

---

### 附：最小可执行命令卡（以源仓为例，采用时替换路径）

```sh
pnpm run test <focused>                 # 单元；不设覆盖率门禁
pnpm run test:coverage                  # per-file 100% 覆盖率门禁
pnpm run test:coverage:partitioned      # 分区覆盖率（CI）
pnpm run test:expected                  # owner-local 进程期望
pnpm run test:snapshot                  # keyless recorded-session replay
pnpm run test:snapshot:record           # 需要 key，新增/模型转录变化
pnpm run test:snapshot:refresh          # replay 输入仍有效，刷新期望
pnpm run test:web                       # build + Chromium/WebKit
pnpm run test:web:built                 # 已 build 的 Web snapshot
pnpm run test:e2e                       # 有 key 才证明 provider；无 key 自跳过
pnpm run test:bench                     # build + 预算 benchmark
pnpm run test:bench:memory              # 内存压力案例
pnpm run build:check                    # 在最新 build:artifacts 上检查 tests/scripts 类型
pnpm run doc-sync                       # 文档门禁
pnpm run check:all                      # 本地完整演练（opt-in）
```

---

## 附：域级来源坐标索引的读法

各专题的来源附录列出本页机制的实际坐标，固定提交为 `687f282e`；坐标只用于追溯，不新增正文断言，解释仍以对应小节为准。

补充坐标按责任查找：[调度与同步](testing-isolation-and-scheduling.md#m05-synchronization)、[覆盖率](testing-coverage.md#m06-coverage)、[Python 运行时](testing-platform-and-performance.md#m40-python-sdk)。
