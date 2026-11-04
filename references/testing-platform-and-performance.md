# 平台 lane、性能与 CI

本页触发：要建或改 Web 浏览器/性能压力 lane、benchmark 门禁与工作负载、测试支持包选用、CI lane 编排与证据信任、平台跳过与条件豁免，或 Python SDK 的 pytest/installed-wheel 证据时读本页。本页完整拥有 §29–33、§37–38 与 §40（M29 Web lane、M30 Web 性能压力、M31 benchmark 门禁、M32 工作负载卫生、M33 支持包选择、M37 CI 编排与信任、M38 平台跳过与豁免、M40 Python SDK）。隔离与资源、覆盖率、快照与 replay 的机制分别见 `testing-isolation-and-scheduling.md`、`testing-coverage.md`、`testing-snapshot-workflow.md`、`testing-replay-and-oracles.md`。

读法：每节是一份完整机制记录——机制 ID、问题、触发、前提、步骤、角色与完成信号、失败处理、例外、证据限制；出现哪一小节就承担哪一项义务，缺省不等于免除。标记约定（**[源规则]**／**[迁移设计]**／**[建议]**）与固定源提交 `687f282e` 见根 `testing.md` 首段；触发选择与命令总表见根 `testing.md` §0。本页引用其他页的机制时写成可点击链接。

<a id="m29-web"></a>

## 29. M29 Web 浏览器 lane

**机制 ID.** `testing-web-browser-lane`。

**问题.** DOM 单测不能证明真实浏览器、布局、ARIA、网络和插件 CSS 的组合；截图 diff 又会因字体/像素而不稳。

**触发.** Web UI、客户端插件、ARIA/键盘/布局、session-driven Web 渲染。

**前提.** 已安装 Playwright Chromium/WebKit；已确认要断言语义状态而不是像素。

**步骤.**
1. `test:web` 先构建（CSS/插件/client），再跑 `vitest.web.config.ts`；浏览器模式为 headless，Chromium 为主，model/reasoning picker 额外跑 WebKit。`deepseek-harness/package.json:76-80@687f282e`、`deepseek-harness/vitest.web.config.ts:1-37@687f282e`。
2. 用真实 Chromium 页面和 app bootstrap；不要用 CDP 注入/mock 替换被测产品路径。`apps/web/tests/scaffold.ts` 的入口注释明确要求真实浏览器和 keyless 组装。`deepseek-harness/apps/web/tests/scaffold.ts:1-90@687f282e`。
3. 等待字体/布局/动画的可观察就绪，不使用固定 sleep；用可访问角色/名称/label 定位，断言 ARIA/可见状态/焦点，而不是截图。`deepseek-harness/.agents/notes/implemented/testing/2026-07-24-web-gui-browser-e2e-lane.md:1-20@687f282e`。
4. session-driven Web 输出放 `snapshots/web/`；UI-only 输出放 `apps/web/tests/expected/`；Web 可以借用 canonical session，但不要复制。`deepseek-harness/docs/testing.md:15@687f282e`。
5. CI 用 `DSH_SNAPSHOT=replay` 只读；`test:web:refresh` 只在本地、人工审查。`deepseek-harness/docs/testing.md:15@687f282e`。
6. built Web snapshot 用 `test:web:built`，由 `ci-consumers` 在 build 后运行；不要在未构建时把 skip 当通过。`deepseek-harness/scripts/run-gates.ts:574-578@687f282e`。
7. 可访问性/键盘交互要有确定性：在 reflow 前用键盘建立选择，避免“点击后立即 reflow”让断言落在旧值上。`deepseek-harness/.agents/notes/implemented/testing/2026-09-27-spreadsheet-selection-by-keyboard-before-reflow.md:5-14@687f282e`。
8. **CI 的 Web 执行器先串行、再有界并发**：`scripts/run-web-snapshots.ts` 要求 `DSH_WEB_SNAPSHOT_WORKERS` 是正安全整数且十进制文本与原始环境值一致，否则直接抛错；先串行跑两个 browser-owner 文件（`hmr-live.e2e.ts`、`client-plugin-live.e2e.ts`），任一失败即停止整条 lane；通过后再用 `--fileParallelism --maxWorkers` 跑其余文件。子进程被信号终止按失败上报。`deepseek-harness/scripts/run-web-snapshots.ts:1-44@687f282e`。

**角色与完成信号.** 作者写语义断言；评审者检查“像素/文本关键词是否能被作弊满足”；完成信号是 Chromium（及需要的 WebKit）真实通过，ARIA/状态断言稳定。

**失败处理.** 布局 flake：等显式就绪/状态，不要加 sleep。跨浏览器差异：判断产品语义，必要时显式 skip。快照差异：审查，不要盲目 refresh。

**例外.** 需要视觉审查时可以另存截图，但不要把它作为 CI 门禁；截图不是源仓的默认证据。`deepseek-harness/.agents/notes/implemented/testing/2026-07-24-web-gui-browser-e2e-lane.md:1-20@687f282e`。

**证据限制.** 浏览器 lane 证明选定浏览器/视口的行为，不证明所有设备/浏览器；不证明真实 provider。

<a id="m30-web-perf"></a>

## 30. M30 Web 性能与压力 lane

**机制 ID.** `testing-web-performance-and-stress`。

**问题.** 性能/压力测试会放大机器噪声和资源竞争；把它们混进默认 Web 套件会让日常反馈不稳定。

**触发.** 前端渲染/滚动/长会话性能；并发浏览器压力；性能预算变更。

**前提.** 有独立perf/stress诊断配置，机器、浏览器和负载可记录；不要把手动诊断误认成预算型CI门禁。

**步骤.**
1. `test:web:perf`先build，再以`DSH_SNAPSHOT=replay`运行`vitest.web.perf.config.ts`。该高基数诊断配置明确位于所有默认Vitest清单之外，因此也不进入CI执行lane。`deepseek-harness/package.json:81-83@687f282e`、`deepseek-harness/vitest.web.perf.config.ts:5-19@687f282e`
2. `test:web:stress` 先 build，再跑 `vitest.web-stress.config.ts`，用于并发/浏览器进程压力；它是 opt-in，不作为默认门禁。`deepseek-harness/package.json:83-85@687f282e`、`deepseek-harness/vitest.web-stress.config.ts:1-15@687f282e`。
3. 必需预算型性能门禁由`benchmarks/`另行拥有，测量用户路径、采用校准常量并输出报告；不能将本节手动诊断的计时当作CI阻断。若目标要新增预算门禁，按 [M31](#m31-benchmark-gate) 性能基准门禁独立落实。`deepseek-harness/benchmarks/AGENTS.md:3-18@687f282e`
4. 压力结论只补充确定性回归，不替代它；压力通过不能证明没有 race。`deepseek-harness/.agents/skills/dsh-ci-test-reliability/SKILL.md:109-115@687f282e`。

**角色与完成信号.** 作者维护诊断负载，评审者核对机器、测量边界及结论；完成信号是选定手动诊断确实执行且结果被分析，perf/stress的opt-in身份明确。预算型benchmark通过是另一份证据。

**失败处理.** 超预算：先看机器/浏览器/负载，再判断产品回归；不要直接放宽。压力失败：定位资源竞争，不要改成串行掩盖。

**例外.** 本机数字不能当作发布容量。目标如另接CI诊断runner属于显式迁移设计，不是源Web perf既有自动保证；预算型必需门禁另按benchmark机制证明。

**证据限制.** 源仓能证明 lane 和配置；不能证明任意机器上的绝对性能。

<a id="m31-benchmark-gate"></a>

## 31. M31 性能基准门禁

**机制 ID.** `testing-benchmark-gate`。

**问题.** 性能回归不会让功能测试变红；把 benchmark 混进包测试又会让计时受测试框架/并发影响。

**触发.** 修改热路径、持久化、会话打开、工具管线、前端预算；发布前。

**前提.** benchmark 在 `benchmarks/` 独立目录；预算已校准；CI 有独立 idle runner。

**步骤.**
1. 预算型 benchmark 放 `benchmarks/*.bench.ts`；不要放包 `tests/`，也不要用 `.bench.ts` 混进普通测试。`deepseek-harness/benchmarks/AGENTS.md:1-18@687f282e`。
2. 单个 benchmark 用 `pnpm run bench <path>`；完整门禁用 `pnpm run test:bench`（先 build bench/web，再跑 `vitest.bench.config.ts`），CI 用 `pnpm run check:ci:bench`。`deepseek-harness/benchmarks/AGENTS.md:5-12@687f282e`、`deepseek-harness/package.json:65-68@687f282e`。
3. `vitest.bench.config.ts` 只包含 `benchmarks/**/*.bench.ts`；process-bound/plain Node；不在 TSX 下跑计时。`deepseek-harness/vitest.bench.config.ts:1-29@687f282e`。
4. CI 的 `node 24 / benchmarks` job 单独跑、`timeout-minutes: 20`、无并发 gate；失败也上传 `benchmarks/.dsh-report/`。`deepseek-harness/.github/workflows/ci.yml:206-265@687f282e`。
5. 预算用未四舍五入的中位数；同时保存原始样本 min/median/max，避免只看一个数。`deepseek-harness/benchmarks/session-open/session-open.bench.ts:120-180@687f282e`。
6. 失败是门禁失败；不要把 benchmark 改成 `test.skip` 或删除预算。

**角色与完成信号.** 作者维护 benchmark/预算；CI 维护者保证 idle runner；完成信号是 PR benchmark job 通过，报告含机器信息和样本。

**失败处理.** 超预算：先复跑/看机器，再定位回归；不要先放宽阈值。报告缺失：检查 teardown/上传路径。

**例外.** 内存受限案例走 `test:bench:memory` 单独进程；不能与普通 benchmark 共享堆。`deepseek-harness/package.json:67@687f282e`。

**证据限制.** benchmark 证明该机器/负载下的时间/内存，不证明生产容量；容器 CPU 配额会让数字偏离。

**补充源码引用（尾部区间复读分派实际读取）**：`deepseek-harness/benchmarks/session-open/session-open.bench.ts:311-495@687f282e`

<a id="m32-benchmark-hygiene"></a>

## 32. M32 Benchmark 工作负载卫生

**机制 ID.** `testing-benchmark-workload-hygiene`。

**问题.** 计时区间里混入构建、fixture 生成、冷启动、GC 或环境探测，会把准备成本算成产品成本；使用 ambient repo/network 又会让结果不可复现。

**触发.** 新增/修改 benchmark；预算校准；内存/扩展性案例。

**前提.** 有每 benchmark 独立的临时根；输入可合成；计时端点明确。

**步骤.**
1. **每 benchmark 自有树/身份/哨兵**：不读 ambient repo、不共享私有 Harness home、不依赖网络；需要 built 模块时自己 build。`deepseek-harness/benchmarks/AGENTS.md:3-12@687f282e`。
2. **准备在计时外**：合成 session、迁移模板、冷 resume 等放在 unmeasured setup；计时只覆盖目标端点。`deepseek-harness/benchmarks/session-open/session-open.bench.ts:200-260@687f282e`。
3. **每个样本 fresh worker**：避免前一样本污染；worker 报告退出码/信号/超时，失败要给 stderr 尾部。`deepseek-harness/benchmarks/session-open/session-open.bench.ts:180-240@687f282e`。
4. **报告原始值 + 聚合**：min/median/max、总 wall、CPU user/system、peak RSS、retained heap/external/arrayBuffers/RSS；budget 用中位数。`deepseek-harness/benchmarks/session-open/session-open.bench.ts:120-180@687f282e`。
5. **机器信息**：CPU 型号、可用并行度、平台、架构、Node/V8 版本；这些在计时 worker 退出后记录。`deepseek-harness/benchmarks/support/machine-profiles.ts:1-58@687f282e`。
6. **内存压力**：旧空间上限、独立进程、显式 GC、retained heap 与 fresh host 对比；报告 peak RSS。`deepseek-harness/scripts/run-memory-pressure-bench.ts:1-147@687f282e`。
7. **报告失败也要生成**：teardown 在预算失败后仍渲染 `benchmarks/.dsh-report`；若在记录任何 timing 前失败，则没有报告，上传步骤应 warn 而不是二次失败。`deepseek-harness/.github/workflows/ci.yml:236-265@687f282e`。
8. **校准**：用固定机器/多次采样校准参考值；不要把一次热运行当基线。`deepseek-harness/benchmarks/support/calibration.ts:1-15@687f282e`。

**角色与完成信号.** 作者维护隔离/端点/报告；评审者检查“准备是否在计时内”“是否有 ambient 输入”；完成信号是报告可复现、预算可解释。

**失败处理.** 计时包含准备：移动端点。报告缺失/不完整：修 harness/teardown。样本噪声：增加样本/校准，不要删异常值。

**例外.** shipped SDK workflow 变体需要 built dsh/SDK；仍然只把启动/请求/关闭的声明端点计入预算。`deepseek-harness/.agents/notes/implemented/testing/2026-09-06-backend-continuation-performance.md:5-20@687f282e`。

**证据限制.** 合成输入/声明端点不等于公共工作负载；报告不能外推为生产 SLA。

**补充源码引用（尾部区间复读分派实际读取）**：`deepseek-harness/benchmarks/session-open/session-open.bench.ts:261-495@687f282e`

<a id="m33-support-roster"></a>

## 33. M33 测试支持包选择

**机制 ID.** `testing-support-harness-roster`。

**问题.** 测试支持包如果互相嵌套或各自造 mock，会让“哪一层是真实”不可追踪；一个包也不能解决所有边界。

**触发.** 需要录制会话、回放 LLM、启动 Loader、真实 loop、客户端 runtime、Remote HTTP、无凭据 provider。

**前提.** 已明确要替换的边界和要保留的真实下游。

**步骤.**
1. 按边界选包（源仓七个包各有唯一职责）：
   - `session-snapshot`：recorded session 的存储、归一化、profile adapter；不是通用断言库。
   - `llm-replay`：按调用顺序回放 recorded LLM chunks；不是真实 provider。
   - `loader-smoke`：真实 Loader + app/process 启动；不是 UI/browser。
   - `agent-loop-testkit`：真实 loop/session/tool registry/JSONL，fake model/tools；不是 fake loop。
   - `client-runtime`：真实 client 组装 + fake remote；REPL/heads 示例；不是 Web 浏览器 lane。
   - `remote-mock`：HTTP Remote 表面；测试专用 `any` fallback；不是 production Remote 类型。
   - `llm-mock-server`：无凭据远端 provider 替身；不是 provider 保真。
2. **只保留一个 mock 边界**：例如 `makeBridgeHarness()` 保留 loop/session/tool registry/JSONL，只把模型 adapter 换掉；不要让 replay 再套 mock server。`deepseek-harness/docs/testing.md:27-31@687f282e`。
3. 在测试/README 写清“替换了什么、保留了什么、不能证明什么”；评审者按这个清单检查。`deepseek-harness/packages/test-support/README.md:1-53@687f282e`。
4. 选择 built/source 模式：Loader smoke/built smokes 走 [M15](testing-evidence-and-reliability.md#m15-source-built)；session/LLM replay 走 replay；Web 走 [M29](#m29-web)。

**角色与完成信号.** 作者选包并记录边界；评审者检查嵌套/重复 mock；完成信号是测试断言落在真实下游，且未替换部分有证据。

**失败处理.** 两个 harness 冲突：保留一个边界，另一个降为 fixture。mock 证明不了产品：升级到 [M14](testing-evidence-and-reliability.md#m14-real-entry)/[M10](testing-real-api-and-secrets.md#m10-e2e-key)。

**例外.** 纯单元测试可以用简单 fake，不需要引入完整 harness；但不要声称集成证据。

**证据限制.** 每个包只证明其边界；组合使用不会自动变成端到端证明。

<a id="m37-ci"></a>

## 37. M37 CI 编排与证据信任

**机制 ID.** `testing-ci-orchestration-and-trust`。

**问题.** 测试门禁如果都在一个 job 里串行，会慢；如果彼此不等待构建，会读到半成品；如果失败不互相中止，会浪费多分钟；如果观测 lane 与阻断 lane 混淆，会把“有诊断”当成“已阻断”。

**触发.** 新增/调整 lane、gate、worker、缓存、build 依赖、平台矩阵。

**前提.** 已读当前 workflow 和 `scripts/run-gates.ts`；知道哪些 job 是 required、哪些是 observational。

**步骤.**
1. **分组 lane**：coverage、consumers、bench、unit、windows blocking/complete/observational；artifact consumers 等待同一个 build；snapshot/expected/web built 在 build 后跑。`deepseek-harness/.github/workflows/ci.yml:109-391@687f282e`、`deepseek-harness/scripts/run-gates.ts:392-556@687f282e`。
2. **coverage 分区 + exempt heavy**：见 [M07](testing-coverage.md#m07-exclusions)/[M08](testing-coverage.md#m08-partitioning)；CI PR coverage job 只跑 PR，缓存 `.coverage-times.json`，给共享宿主 90s 预算。`deepseek-harness/.github/workflows/ci.yml:109-205@687f282e`。
3. **bench 单独 idle runner**：不与并发 gate 共享；20 分钟上限；报告 artifact 即使失败也上传。`deepseek-harness/.github/workflows/ci.yml:206-265@687f282e`。
4. **fail-fast**：`DSH_GATE_FAIL_FAST=1` 让一个 gate 失败中止兄弟；否则失败只跳过依赖它的 gate，独立错误都报告。`deepseek-harness/.github/workflows/ci.yml:284-291@687f282e`、`deepseek-harness/docs/development.md:105-110@687f282e`。
5. **worker 环境**：`DSH_GATE_CONCURRENCY`、`DSH_COVERAGE_MAX_WORKERS`、`DSH_SNAPSHOT_MAX_CONCURRENCY`、`DSH_WEB_SNAPSHOT_WORKERS`、`DSH_OXLINT_THREADS` 等由 scheduler 设置；shared host 上不要用 `availableParallelism()` 无界。`deepseek-harness/scripts/run-gates.ts:210-260@687f282e`、`deepseek-harness/docs/development.md:148-156@687f282e`。
6. **runner-owned 临时存储**：TMPDIR/Playwright/Node compile cache 指向 runner temp；PR 恢复 pnpm/Playwright cache，master 不保存这些 key；self-hosted 复用持久 store。`deepseek-harness/.github/workflows/ci.yml:274-340@687f282e`。
7. **本地完整演练是 opt-in**：`pnpm run check:all` 独立于 Git hooks；CI 拥有 exhaustive coverage/platform matrix。`deepseek-harness/docs/development.md:143-148@687f282e`。
8. **信任边界**：源仓能证明 job/gate 定义；**不能证明**远端 required check、分支保护、secret 权限或组织策略已开启。把“checker 会失败”与“forge 会阻断 merge”分开报告。
9. job-level `if` 跳过的 check 会报告为成功；对 fork/Dependabot 的 e2e skip 要标为未验证，不是通过。`deepseek-harness/.github/workflows/e2e.yml:1-25@687f282e`。

**角色与完成信号.** CI 维护者编排；作者按 lane 提供证据；完成信号是 required lane 全绿、observational 诊断可查、失败能定位到 gate/文件。

**失败处理.** 依赖错乱：修 needs/after，不要用 sleep。缓存污染：清 key/临时目录。平台专属失败：按 [M38](#m38-skips) 显式 skip 或修。

**例外.** Dependabot/fork 的 keyless skip；self-hosted failover 的并发/缓存差异。`deepseek-harness/.github/workflows/ci.yml:109-205@687f282e`。

**证据限制.** 无法从源仓确认远端保护；采用项目必须提供自己的 required-check 截图/配置/运行记录。

<a id="m38-skips"></a>

## 38. M38 平台跳过与条件豁免

**机制 ID.** `testing-platform-skips-and-conditional-exemptions`。

**问题.** 平台能力差异（Windows ACL、pwsh、ConPTY、POSIX 权限/信号）会让同一断言在不同平台失败；弱化所有平台的断言会降低证据；静默跳过会让门槛消失。

**触发.** Windows/macOS/Linux 差异；pwsh 缺失；平台专属 bin/PTY/ACL；CI 平台矩阵。

**前提.** 已确认是平台语义而非产品缺陷；已找到能代表该平台行为的 lane。

**步骤.**
1. **显式跳过并命名原因**：使用配置中的平台排除列表或场景的 `posixOnly`/`pwshOnly`，不要用 `if (platform) return` 静默返回。`deepseek-harness/vitest.config.ts:100-160@687f282e`、`deepseek-harness/packages/test-support/session-snapshot/src/suite.ts:1300-1340@687f282e`。
2. **平台专属守卫仍要跑**：例如快照 fixture 的存储/命名守卫在跳过记录场景时仍执行；不要把整个 suite 跳过。`deepseek-harness/packages/test-support/session-snapshot/src/suite.ts:1604-1745@687f282e`。
3. **条件覆盖率豁免与探测耦合**：pwsh coverage 只有在缺少真实 `pwsh` 时才排除；CI runner 有 pwsh 时恢复完整门槛。`deepseek-harness/vitest.config.ts:118-150@687f282e`。
4. **Windows lane 分级**：blocking / complete / observational；观测 lane 提供诊断但不阻断；不要把观测绿当成阻断证据。`deepseek-harness/scripts/run-gates.ts:316-330@687f282e`。
5. **wine 只用于诊断**：`pnpm run check:windows-wine` 只在诊断已知 Windows 失败时用；CI 拥有该信号。`deepseek-harness/AGENTS.md:121-123@687f282e`。
6. **测试结果只适用于运行环境**：WSL/原生 Windows/Linux 的工具链和文件系统不同；不要跨环境推断。`deepseek-harness/docs/development.md:15-30@687f282e`。

**角色与完成信号.** 作者写跳过理由/条件；评审者检查“是否弱化了所有平台”；完成信号是跳过有原因、对应平台有真实 lane、条件豁免在能力存在时自动恢复。

**失败处理.** 平台失败：先复现/定位差异，再决定修产品还是显式跳过。跳过列表过期：guard/CI 应发现，不要永久保留。

**例外.** 无 pwsh 的本地主机；无 Windows ACL 的 POSIX；仅诊断的 wine。

**证据限制.** 源仓能证明列表/条件；不能证明每个平台的 CI 都实际运行。采用项目需要平台矩阵运行记录。

<a id="m40-python-sdk"></a>

## 40. M40 Python SDK：pytest、installed-wheel keyless、trusted real API

**机制 ID.** `testing-python-sdk-keyless-blackbox`。

**问题.** Python SDK 的 fake runtime peer 测试能证明 SDK 逻辑，但不能证明 wheel 安装、发行物内的可执行文件选择、干净解释器，以及真实 provider。把真实 API 测试放进 fork PR 又会泄露 key；把缺 key 当成 skip 会假绿。

**触发.** 改 Python SDK/runtime、wheel、入口解析、provider 场景、Office sidecar；发布前。

**前提.** 已把 venv 放在 `python/` 外；已安装 `test` group；已区分 fake runtime、installed wheel 和 trusted real API 三种证据。

**步骤.**
1. **pytest 只收集 SDK 测试**：根 `pytest.ini` 把 `testpaths` 限为 `python/sdk/tests`，并排除 `node_modules/.git/dist-exe`，避免递归收集到 worktree/venv 的同名模块。`deepseek-harness/pytest.ini:1-5@687f282e`。
2. **测试组与 pytest 配置随包**：`[dependency-groups].test = pytest + Pillow`；pytest 的 `testpaths = tests`、`addopts = -q`；`uv sync --project python/sdk --group test` 后 `uv run --project python/sdk pytest`。`deepseek-harness/python/sdk/pyproject.toml:24-29@687f282e`、`deepseek-harness/python/development.md:18-30@687f282e`。
3. **fake runtime peer 层**：pytest 套件用 fake runtime peers 验证 SDK 逻辑；`test_bundled_runtime.py` 对 `exe`/`node` carrier 各自 `pytest.skip`，dummy key 只满足 adapter 加载，initialize/shutdown 不调用模型。`deepseek-harness/python/development.md:34@687f282e`、`deepseek-harness/python/sdk/tests/test_bundled_runtime.py:1-40@687f282e`。
4. **installed-wheel keyless 层**：在临时目录建新 venv，安装本地构建的 SDK wheel + runtime wheel；在 checkout 外运行，清空 `PYTHONPATH` 和 `DSH_RUNTIME_MODE`，证明模块和可执行文件都来自发行物，再跑 `--scenario all --installed-wheel`。`deepseek-harness/.github/workflows/build-exe-for-python-sdk.yml:323-380@687f282e`。
5. **场景快照**：比较 `scripts/snapshots/python-sdk-single-exe/` 的 committed expected；`minimal`/`authoring` 的 `model-visible.json` pin system prompt、tool schema、model-visible messages（含 Windows/PowerShell 变体），`advanced` pin 复杂进程的 SDK 结果与父子 session 日志，`scheduler-recovery` 保留失败工具轮和后续完成轮；比较不重写录制。`deepseek-harness/python/development.md:41-48@687f282e`。
6. **trusted real API 层**：只对 trusted PR 和 master push 跑 `--scenario sdk-live --installed-wheel`；两轮真实工具调用，第一轮创建文件并检查，第二轮复制 host-only 随机挑战内容到新 receipt 且不改源文件；两轮都要精确 sentinel 和 model-requested tool call，外部字节比较检查文件。`deepseek-harness/python/development.md:47-48@687f282e`、`deepseek-harness/.github/workflows/build-exe-for-python-sdk.yml:381-453@687f282e`。
7. **缺 secret 失败，不 skip**：real API preflight 检查 `DEEPSEEK_API_KEY_EXTERNAL`，为空直接 `exit 1`/throw；fork 和 Dependabot PR 只跑完整 keyless installed-wheel 路径，不拿 key。`deepseek-harness/.github/workflows/build-exe-for-python-sdk.yml:392-410@687f282e`、`deepseek-harness/python/development.md:47-48@687f282e`。
8. **CI 编排**：PR 的 `python-sdk` job 在 Python 3.10 跑完整 keyless pytest；`python-runtime` 依赖 `python-sdk`，PR 覆盖 Linux/Windows x64，master 由 `ci-master.yml` 覆盖 Linux ARM64 + macOS；最终 aggregate job 的 `needs` 包含 `python-sdk`/`python-runtime`，任一未成功即失败。`deepseek-harness/.github/workflows/ci.yml:486-521@687f282e`、`deepseek-harness/.github/workflows/ci.yml:753-758@687f282e`、`deepseek-harness/.github/workflows/ci-master.yml:42-50@687f282e`。
9. **诊断保留（声明的策略 vs 已实现的行为）**：把 `DSH_OFFICE_TEST_ARTIFACTS` 指向一个新目录时，`scripts/smoke-python-runtime.py` 的 Office smoke 会把输入文档、PNG 批次、manifest 与 `error.txt` 写进该目录，并排除临时运行时文件（`scripts/fixtures/office-render.py:14-41` 的 `workspace` 助手：先 `mkdir(exist_ok=False)`，失败时写 `error.txt`，`finally` 里只复制 `color-blocks.{docx,pptx,xlsx}` 与 `cli-*`/`node-pptx` 批次的 PNG/manifest）。`python/development.md:32` 另外声明“CI 在成功和失败都上传这些文件”，但固定提交的工作流没有任何 Office step 设置该变量或上传这些诊断文件（其他 `upload-artifact` 用于 benchmark report、wheel/发行包等，不是 Office 诊断目录；本批对 `.github/workflows/**` 做了结构性检索匹配 `DSH_OFFICE_TEST_ARTIFACTS|upload-artifact`）；因此**本地保留可证，Office CI 上传是未实现的声明**。采用方若需要该义务，必须自己加“设置变量 + 上传 artifact（含失败分支）”的工作流步骤，不能引用本域参考当作已具备的保证。`deepseek-harness/python/development.md:32@687f282e`、`deepseek-harness/scripts/smoke-python-runtime.py:971-977@687f282e`、`deepseek-harness/scripts/fixtures/office-render.py:14-41@687f282e`。

**角色与完成信号.** Python SDK 作者、CI 维护者、发布/安全负责人。完成信号是：pytest + 干净 venv keyless black-box 通过；需要真实 provider 时 trusted real API 通过；设置 `DSH_OFFICE_TEST_ARTIFACTS` 后本地诊断目录与场景差异可查；fork 无 key 时仍跑 keyless 且不假绿。**源仓 CI 不设置该变量也不上传 Office artifact，所以“CI 上可查 artifact”不是可用的完成信号。**

**失败处理.** wheel 安装失败先查本地发行物/版本固定；入口解析失败查 runtime resolution 和发行物内容；real API 失败先确认 secret/配额/网络，再判断产品；缺 secret 按阻塞处理，不改成 skip。

**例外.** fork/Dependabot 只跑 keyless；本地缺 carrier 时 pytest 独立 skip；manual smoke 用内部 `_launch_args` adapter，不暴露公共 API；Office 可见内容由 LibreOffice Kit CI 拥有，Harness 只验证 installed-wheel smoke。

**证据限制.** keyless 证明发行物和入口，不证明真实 provider；real API 证明该 key/网络/模型/平台，不证明所有 provider；场景覆盖有限；源仓没有证明所有平台每次同时运行。源码级 pytest 对失败通道的断言较宽：它接受 `JsonRpcError`、`TransportClosedError` 或 `TimeoutError`，只要求错误文本包含插件名，因此不证明存在单一确定的失败通道。Python 期望输出与 runtime/打包/发布是 Supply 域的交叉依赖。

---

## 附：本页机制的来源坐标索引

本页机制的来源坐标如下（固定提交 `687f282e`）。坐标只用于追溯，不新增正文断言；正文解释仍以本页对应小节为准。

- `testing-web-performance-and-stress`：`deepseek-harness/package.json:80-85@687f282e`
- `testing-benchmark-workload-hygiene`：`deepseek-harness/benchmarks/session-open/session-open.bench.ts:120-260@687f282e`
- `testing-support-harness-roster`：`deepseek-harness/packages/test-support/session-snapshot/README.md:1-30@687f282e`、`deepseek-harness/packages/test-support/agent-loop-testkit/README.md:1-70@687f282e`、`deepseek-harness/packages/test-support/client-runtime/README.md:1-70@687f282e`、`deepseek-harness/packages/test-support/llm-mock-server/README.md:1-60@687f282e`
- `testing-web-browser-lane`：`deepseek-harness/docs/testing.md:15-15@687f282e`、`deepseek-harness/vitest.web.config.ts:1-37@687f282e`、`deepseek-harness/package.json:76-80@687f282e`、`deepseek-harness/apps/web/tests/scaffold.ts:1-90@687f282e`、`deepseek-harness/.agents/notes/implemented/testing/2026-07-24-web-gui-browser-e2e-lane.md:1-20@687f282e`、`deepseek-harness/.agents/notes/implemented/testing/2026-09-27-spreadsheet-selection-by-keyboard-before-reflow.md:5-14@687f282e`、`deepseek-harness/scripts/run-web-snapshots.ts:1-44@687f282e`
- `testing-ci-orchestration-and-trust`：`deepseek-harness/.github/workflows/ci.yml:737-763@687f282e`、`deepseek-harness/scripts/run-gates.ts:280-391@687f282e`、`deepseek-harness/docs/development.md:148-160@687f282e`
- `testing-python-sdk-keyless-blackbox`：`deepseek-harness/python/development.md:18-58@687f282e`、`deepseek-harness/python/development.md:59-75@687f282e`

本页机制：[`testing-web-browser-lane`](#m29-web)、[`testing-web-performance-and-stress`](#m30-web-perf)、[`testing-benchmark-gate`](#m31-benchmark-gate)、[`testing-benchmark-workload-hygiene`](#m32-benchmark-hygiene)、[`testing-support-harness-roster`](#m33-support-roster)、[`testing-ci-orchestration-and-trust`](#m37-ci)、[`testing-platform-skips-and-conditional-exemptions`](#m38-skips)、[`testing-python-sdk-keyless-blackbox`](#m40-python-sdk)。

### 补充源码坐标

以下为本页相关规则的补充来源坐标：

- 来源：`deepseek-harness/scripts/smoke-python-runtime.py:1139-1300@687f282e`
- 来源：`deepseek-harness/python/sdk/tests/test_bundled_runtime.py:84-106@687f282e`
