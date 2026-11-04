# 测试覆盖率门禁与分区

本页触发：需要决定覆盖率门禁形态、写排除台账与豁免理由、切分并合并覆盖率分区，或诊断覆盖率 worker 异常退出时读本页。本页完整拥有 §6–9（M06 per-file 100% 门禁、M07 排除台账与重套件、M08 分区合并与计时、M09 worker 退出诊断）。隔离与资源、快照与 expected、CI 编排的机制分别见同目录 `testing-isolation-and-scheduling.md`、`testing-snapshot-workflow.md`、`testing-replay-and-oracles.md`、`testing-platform-and-performance.md`。

读法：每节是一份完整机制记录——机制 ID、问题、触发、前提、步骤、角色与完成信号、失败处理、例外、证据限制；出现哪一小节就承担哪一项义务，缺省不等于免除。标记约定（**[源规则]**／**[迁移设计]**／**[建议]**）与固定源提交 `687f282e` 见根 `testing.md` 首段；触发选择与命令总表见根 `testing.md` §0。本页引用其他页的机制时写成可点击链接。

<a id="m06-coverage"></a>

## 6. M06 覆盖率门禁：per-file 100%

**机制 ID.** `testing-coverage-per-file-100`。

**问题.** 聚合覆盖率会让一个文件的高覆盖掩盖另一个文件的死代码。源仓把覆盖率当成“删死代码”的门禁，而不是“补测试”的 KPI。

**触发.** 合入运行时代码；修改 `packages/*/*/src`；调整覆盖率配置或排除项；CI coverage 失败。

**前提.** 已区分运行时源码、测试、脚本、文档、应用、生成物、类型声明、平台专属代码。

**步骤.**
1. CI 覆盖率命令是 `pnpm run test:coverage`（根脚本先构建 native-system，再 `vitest run --coverage`），不是 `pnpm run test`。`deepseek-harness/package.json:60-70@687f282e`、`deepseek-harness/docs/testing.md:10@687f282e`。
2. 只对运行时源码设门槛：`packages/*/*/src/**/*.ts`（以及明确列出的 client 源）；每个文件要求 100% statements/branches/functions/lines，`perFile: true`。`deepseek-harness/vitest.config.ts:101-166@687f282e`。
3. 覆盖率 include 范围之外的文件（测试、脚本、应用、生成物、vendor、配置、平台二进制、类型-only、进程入口 bootstrap）必须有理由；见 [M07](#m07-exclusions)。
4. 未覆盖行先判断是不是**死代码**；是死代码就删除，不要为了数字补无意义测试。`deepseek-harness/docs/testing.md:10@687f282e`。
5. 每次覆盖率运行输出未覆盖位置的 `file:line:column`（statement/function/branch），让失败可定位。`deepseek-harness/scripts/coverage-uncovered-locations.cjs:61-116@687f282e`。
6. 分区运行由 coordinator 合并后统一执行 thresholds；单个分区不各自决定全局通过。见 [M08](#m08-partitioning)。
7. 聚焦覆盖率时同时指定**测试文件**和**源码范围**：`vitest run <test> --coverage --coverage.include='<src>'`；不要用 `--passWithNoTests`、降低阈值或缩窄 include 来隐藏未覆盖文件。`deepseek-harness/.agents/skills/dsh-pre-push-checks/SKILL.md:61-83@687f282e`。
8. 行为正确性不能由覆盖率替代：line coverage 只证明行跑过，不证明产品按发布形态工作。`deepseek-harness/docs/testing.md:10@687f282e`。

**角色与完成信号.** 作者保证新源码被真实行为覆盖或删除；评审者检查排除项和“为覆盖率而写”的测试；完成信号是合并后的 per-file 100% 通过，且未覆盖位置为空。

**失败处理.** 未覆盖：先判断死代码/不可达/仅在子进程运行/平台专属，再决定删除、补测试或按 [M07](#m07-exclusions) 记入豁免。不要直接加 `/* v8 ignore */`。

**例外.** 平台专属源码（如 `pwsh-local`）在没有 pwsh 的宿主上自跳过并条件排除；CI 有 pwsh 时恢复完整门槛。`deepseek-harness/docs/testing.md:10@687f282e`、`deepseek-harness/vitest.config.ts:118-150@687f282e`。

**证据限制.** 源仓能证明阈值和 include/exclude；不能证明每个文件的行为都被有效断言。覆盖率必须与 [M12](testing-evidence-and-reliability.md#m12-world-verification)/[M14](testing-evidence-and-reliability.md#m14-real-entry) 的世界断言配合。

<a id="m07-exclusions"></a>

## 7. M07 覆盖率排除台账与重套件

**机制 ID.** `testing-coverage-exclusion-ledger`。

**问题.** 宽泛的 exclude、无理由的 `/* v8 ignore */`、以及“重套件不跑覆盖率”都会让死代码/回归消失。豁免必须可审计、可机械核对、仍然被执行。

**触发.** 新增覆盖率排除；新增 `v8 ignore`；把套件移出 instrumented 运行；平台条件豁免。

**前提.** 已确认被排除的代码确实不是可测运行时逻辑，或确实无法在 instrumented 进程中运行。

**步骤.**
1. **每个 exclude 写理由**：测试/脚本/应用/生成物/vendor/配置/平台二进制/类型-only/进程 bootstrap 分别说明为什么不属于覆盖率分母。`deepseek-harness/vitest.config.ts:101-166@687f282e`。
2. **`/* v8 ignore next -- reason */` 只包最小表达式**，并写明不可达/平台/注册保证的原因；不要包整段逻辑。源仓在 snapshot 注册保证处使用带原因的 ignore。`deepseek-harness/packages/test-support/session-snapshot/src/suite.ts:1410-1430@687f282e`。
3. **重套件单独跑、但不消失**：`scripts/coverage-exempt.ts` 维护 `filter` + `exclude` 的套件清单；CI 在 instrumented coverage 之外用 `vitest run <filter...>` 执行它们，标为 `test:coverage-exempt-heavy`。`deepseek-harness/scripts/coverage-exempt.ts:1-59@687f282e`、`deepseek-harness/scripts/run-gates.ts:696-730@687f282e`。
4. **机械核对**：每个 entry 的 positional filter 与 exclude glob 必须从仓库 spec 清单中选出**同一个非空文件集**；entry 之间不能重叠；所有 Typert 套件必须被覆盖。`deepseek-harness/scripts/coverage-exempt.spec.ts:1-62@687f282e`。
5. **普通覆盖率运行排除这些套件**（`DSH_COVERAGE_EXEMPT`），重套件运行不设该变量；这样它们不会双跑，也不会被当成通过覆盖率门槛。`deepseek-harness/vitest.config.ts:116-135@687f282e`。
6. 重套件失败仍然是失败；它们只是不计入覆盖率分母，不是“允许失败”。

**角色与完成信号.** 作者维护 entry 和理由；评审者检查 filter/exclude 是否仍然指向真实文件；完成信号是 guard 测试通过、重套件实际执行、覆盖率合并结果没有被豁免污染。

**失败处理.** filter 与 exclude 不一致：修 entry，不要放宽 guard。套件改名：guard 会因非空/一致性问题变红。平台缺失：用条件豁免并保留探测，不要永久删除。

**例外.** 源仓的重套件包括 memory-limited benchmarks、scaled benchmark report、session corpus performance、session-open performance gate、frontend performance budgets、benchmark-next-package-dependency、benchmark-npm-resolution、Typert 全套。具体名单随源变化，迁移时以项目自己的配置为准。`deepseek-harness/scripts/coverage-exempt.ts:1-59@687f282e`。

**证据限制.** guard 能证明“filter 和 exclude 选到同一批文件”，不能证明这些套件本身有意义；仍需 [M31](testing-platform-and-performance.md#m31-benchmark-gate)/[M32](testing-platform-and-performance.md#m32-benchmark-hygiene) 的预算和 [M02](testing-isolation-and-scheduling.md#m02-topology) 的并发证据。

<a id="m08-partitioning"></a>

## 8. M08 覆盖率分区、合并与计时

**机制 ID.** `testing-coverage-partitioning`。

**问题.** 大型仓库的覆盖率运行在单进程里会超出 CI 时限；简单按文件哈希分片会让重文件堆在一个分片；分区后如果只合并数字而不校验文件清单，会静默漏跑。

**触发.** coverage 文件数/时长超过单 lane；CI 需要并行分区；调整 worker 数或分区数。

**前提.** 已有 `vitest list --filesOnly` 可枚举的 instrumented 文件清单；已区分 thread-safe 与 process-bound 项目；已有可合并的 coverage blob 机制。

**步骤.**
1. **从真实清单取文件**：`vitest list --filesOnly`，位置过滤参数放在 `--` 之后，避免把 `--testTimeout 5000` 之类当成过滤；在这里移除 exempt heavy 套件。`deepseek-harness/scripts/coverage-partitions.ts:202-222@687f282e`。
2. **按记录时长做 LPT 分配**：重文件先放入当前最轻的分区；同权重按路径稳定排序；未知权重按 1；min-heap 保持 O(log partitions)。`deepseek-harness/scripts/coverage-partitions.ts:300-390@687f282e`。
3. **拒绝空分区**：Vitest 对没有匹配文件的 config 会“跑全部”，空分区会静默把整套跑一遍。`deepseek-harness/scripts/coverage-partitions.ts:520-546@687f282e`。
4. **每个分区用独立 config**：按项目拆分 include（thread-safe vs process-bound）；process-bound 保持专用 pool；命令行参数过长在 Windows 会撞 CreateProcess 限制，所以用短 config 路径而不是把几百个文件塞进 argv。`deepseek-harness/scripts/coverage-partitions.ts:430-450@687f282e`。
5. **每个分区单 worker 跑 coverage**，输出 blob、file-times、canonical locations；`--coverage.reportOnFailure` 保留失败证据。`deepseek-harness/scripts/coverage-partitions.ts:610-650@687f282e`。
6. **合并后再判 thresholds**：coordinator 用 `vitest --merge-reports=<blobs> --coverage` 合并，per-file 100% 在合并结果上执行。`deepseek-harness/scripts/coverage-partitions.ts:655-675@687f282e`。
7. **校验完整性**：blob 集合必须与分区命令一一对应；每个分区的 timing report 必须恰好覆盖分配的文件一次（缺失、意外、重复都失败）。`deepseek-harness/scripts/coverage-partitions.ts:676-700@687f282e`。
8. **计时历史**：`.coverage-times.json` 在 CI cache 中跨 run 保存；新测量覆盖旧值，已删除文件被剔除；本地可回退到 Vitest results cache。`deepseek-harness/scripts/coverage-partitions.ts:238-310@687f282e`。
9. **失败保留诊断**：失败时保留 `coverage/.partitioned` 的分区 config、inventory、报告；只有成功才删除。`deepseek-harness/scripts/coverage-partitions.ts:500-520@687f282e`。
10. **CI 分配 worker/分区**：`DSH_COVERAGE_MAX_WORKERS` 决定 instrumented worker；分区数默认为 `total - max(1, floor(total/3))`，仅当 >1 时设置；self-hosted CI 显式给 6 workers / 4 partitions。`deepseek-harness/scripts/run-gates.ts:210-252@687f282e`、`deepseek-harness/.github/workflows/ci.yml:111-140@687f282e`。

**角色与完成信号.** 作者维护分区算法和清单；CI 维护者给 worker/分区/缓存；完成信号是所有分区非空、blob 完整、timing 完整、合并覆盖率达到 per-file 100%。

**失败处理.** 空分区：检查清单/过滤。blob 缺失：看分区输出尾部。文件重复/缺失：看 timing report 和 project 分配。分片过慢：调整 worker/分区或检查重套件。

**例外.** 小仓库可以不分区（partitions < 2 直接走普通 coverage）；但一旦启用，完整性和非空校验不能跳过。

**证据限制.** 源仓能证明算法、校验和 CI 变量；不能证明任意 CI 机器上的时长分布。采用项目需要自己的 timing 基线和失败样本。

<a id="m09-fork-diagnostics"></a>

## 9. M09 覆盖率 worker 退出诊断

**机制 ID.** `testing-coverage-fork-diagnostics`。

**问题.** coverage 分区在 fork worker 被杀/崩溃时，Vitest 可能只给出一个模糊的失败；没有 PID、文件、退出码和信号，无法区分 OOM、超时、产品崩溃和测试崩溃。

**触发.** coverage 分区出现无法解释的 worker 退出；需要判断是资源压力还是具体测试。

**前提.** 使用 fork pool；不改变 Vitest 的调度和失败语义。

**步骤.**
1. 用 `coverageForkPool` 包装 `ForksPoolWorker`；只在有未完成 `run`/`collect` 请求时报告。`deepseek-harness/scripts/coverage-fork-diagnostics.ts:1-85@687f282e`。
2. 日志字段至少包含 `pid`、`project`、`workerId`、正在处理的 `files`、`exitCode`、`signalCode`。
3. 正常 `stop` 的退出静默；`stop` 前已发生 worker error 的退出仍然报告；`cancel` 不误报。`deepseek-harness/scripts/coverage-fork-diagnostics.ts:20-80@687f282e`。
4. 诊断层不改调度、不改失败处理；它只增加可观察性。

**角色与完成信号.** 测试基础设施维护者；完成信号是意外退出日志能定位到项目和文件，正常退出没有噪声。

**失败处理.** 看到 `coverage-worker-exit`：先看文件列表和 signal；区分 OOM/外部 kill/断言失败。不要用重试掩盖。

**例外.** 非 coverage fork pool 不需要该包装；其他 lane 可用各自的进程退出诊断。

**证据限制.** 诊断不是根因证明；仍需复现、资源监控和失败测试输出。

---

## 附：本页机制的来源坐标索引

本页机制的来源坐标如下（固定提交 `687f282e`）。坐标只用于追溯，不新增正文断言；正文解释仍以本页对应小节为准。

- `testing-coverage-per-file-100`：`deepseek-harness/vitest.config.ts:57-100@687f282e`、`deepseek-harness/vitest.config.ts:230-260@687f282e`
- `testing-coverage-exclusion-ledger`：`deepseek-harness/scripts/coverage-uncovered-locations.cjs:1-121@687f282e`
- `testing-coverage-partitioning`：`deepseek-harness/scripts/coverage-partitions.ts:1-16@687f282e`、`deepseek-harness/scripts/coverage-partitions.ts:200-300@687f282e`、`deepseek-harness/scripts/coverage-partitions.ts:300-400@687f282e`、`deepseek-harness/scripts/coverage-partitions.ts:430-520@687f282e`、`deepseek-harness/scripts/coverage-partitions.ts:560-700@687f282e`

本页机制：[`testing-coverage-per-file-100`](#m06-coverage)、[`testing-coverage-exclusion-ledger`](#m07-exclusions)、[`testing-coverage-partitioning`](#m08-partitioning)、[`testing-coverage-fork-diagnostics`](#m09-fork-diagnostics)。

### 补充源码坐标

以下为本页相关规则的补充来源坐标：

- 来源：`deepseek-harness/vitest.config.ts:229-403@687f282e`
