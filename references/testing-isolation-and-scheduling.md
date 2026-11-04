# 测试隔离、并发与调度

本页触发：改动触及并发拓扑、端口/临时目录/子进程等资源、进程全局状态与平台语义、lane 超时预算，或出现资源未释放、测试互相污染、flake 需要定位静止点时读本页。本页完整拥有 §2–5（M02 执行拓扑、M03 资源分配与清理、M04 进程全局状态与平台语义、M05 同步与超时预算）。证据层级、覆盖率、快照与 CI 的机制分别见同目录 `testing-evidence-and-reliability.md`、`testing-coverage.md`、`testing-snapshot-workflow.md`、`testing-platform-and-performance.md`。

读法：每节是一份完整机制记录——机制 ID、问题、触发、前提、步骤、角色与完成信号、失败处理、例外、证据限制；出现哪一小节就承担哪一项义务，缺省不等于免除。标记约定（**[源规则]**／**[迁移设计]**／**[建议]**）与固定源提交 `687f282e` 见根 `testing.md` 首段；触发选择与命令总表见根 `testing.md` §0。本页引用其他页的机制时写成可点击链接。

<a id="m02-topology"></a>

## 2. M02 执行拓扑：四层并发与资源所有权

**机制 ID.** `testing-execution-topology`。

**问题.** 测试文件不是一个孤立的进程。Vitest 文件、worker、同一 job 的其他 gate、同一宿主上的其他 job 都可能重叠；进程隔离并不隔离端口、可预测路径、外部命名空间或继承的子进程。

**触发.** 新增/修改任何异步测试、子进程、端口、临时目录、数据库、socket、共享输出目录，或调整 worker/分区配置。

**前提.** 已读当前 Vitest 配置和当前 workflow；不能用记忆中的旧拓扑推断。

**步骤.**
1. 按四层建模：同一文件内用例 → 不同文件/worker → 同一 job 的独立 Vitest/gate 进程 → 共享宿主上的不同 Actions job。`deepseek-harness/.agents/skills/dsh-ci-test-reliability/SKILL.md:17-27@687f282e`。
2. 对每个获取的资源写出五个事实：**所有者、原子分配方式、可观察就绪信号、注册的清理、静止完成信号**。
3. 不要因为一个夹具缺隔离就把整套串行化；缩小独占范围或改分配方式。串行 block 保护不了另一个文件、进程或 job。`deepseek-harness/.agents/skills/dsh-ci-test-reliability/SKILL.md:25-27@687f282e`。
4. 配置层显式设 worker/分区：coverage 的 instrumented 分区数、exempt heavy、snapshot 并发、Web snapshot worker、gate 并发。`deepseek-harness/scripts/run-gates.ts:210-260@687f282e`。
5. 对进程全局的测试使用 process-bound 项目/独立 fork；不要与 thread-safe 用例混跑。两个项目都用 `pool: 'forks'`。源 `vitest.config.ts:186-200@687f282e` 的注释记录 Node 24 从 worker threads 进入 CJS lexer 时在 macOS/Linux/Windows 均出现 `v8::ToLocalChecked Empty MaybeLocal` in `cjs_lexer::Parse`；该注释没有给出精确受影响版本区间或上游 issue，升级 Node 后必须重新取得复现或测试证据再改变 fork 策略，不能把这条快照观测当作永久平台事实。`deepseek-harness/vitest.config.ts:166-230@687f282e`。

**角色与完成信号.** 作者建模并写资源所有权；评审者按四层追问“另一个 job 同时跑会怎样”；完成信号是并发运行下仍通过，且清理后宿主没有残留。

**失败处理.** 只在单独运行时通过、并发时失败，是测试缺陷，不是“runner 不稳定”。先定位共享资源，再考虑缩小独占范围；不要先加长超时。

**例外.** 真正全局且无法命名空间的资源可以串行，但必须写明资源和范围；不能把“整个套件串行”当作默认修复。

**证据限制.** 源仓的配置和共享 runner 说明能证明拓扑存在；具体宿主的 CPU/内存竞争、容器配额和外部服务状态需要采用项目自己的运行记录。

<a id="m03-resources"></a>

## 3. M03 资源分配与清理

**机制 ID.** `testing-resource-isolation`。

**问题.** “先检查空闲再占用”会产生 TOCTOU 竞争；可预测路径会被并行用例踩踏；只调用 `close()`/`kill()` 而不等待完成信号会留下晚到回调。

**触发.** 端口、临时目录、数据库、socket、session、输出目录、子进程、浏览器、文件监听。

**前提.** 已确认资源的所有者和生命周期；已知道该资源在失败/重试/超时路径上也要释放。

**步骤.**
1. **用所有者分配器，不要扫描后占用**：网络夹具 `listen(0)` 并在 server 报告 listening 后读取分配地址；临时根用 `mkdtemp`；共享数据库/socket/session/输出位置用每测试唯一命名空间；必须不存在的路径用独占创建。`deepseek-harness/.agents/skills/dsh-ci-test-reliability/SKILL.md:29-40@687f282e`。
2. **稳定记录标识与临时传输地址分离**：录制 fixture 里的固定 id 是解析输入，不是要占用的资源；在夹具内部翻译成实时值，不要为了“真实”去改录制值。`deepseek-harness/.agents/skills/dsh-ci-test-reliability/SKILL.md:38-40@687f282e`。
3. **获取后立刻注册清理**，让断言失败也能释放；清理顺序是：停止新回调/请求 → 解绑监听 → 恢复全局钩子 → 终止自有工作 → 等待 child exit/server close/worker terminate。
4. **等待静止**：`abort()`、`close()`、`kill()` 只是请求；必须 await 对应的完成信号。晚到完成可能污染下一个测试时，要证明处置能阻止它。`deepseek-harness/.agents/skills/dsh-ci-test-reliability/SKILL.md:90-99@687f282e`。
5. **固定路径清理**：snapshot 的 `.tmp`/workspace 旁路目录由所有者删除；不要留下未注册目录或孤儿夹具。`deepseek-harness/packages/test-support/session-snapshot/README.md:50-60@687f282e`。

**角色与完成信号.** 作者实现分配/清理；评审者检查失败路径和超时路径；完成信号是并发运行后端口、临时目录、子进程、全局状态均无残留。

**失败处理.** 清理失败要区分“产品没退出”和“测试没等待”；前者修产品，后者补完成信号。不要用固定 sleep 等待退出。

**例外.** 纯解析用的字面路径/URL 不是获取的资源，不要为了“看起来固定”而重写。`deepseek-harness/.agents/skills/dsh-ci-test-reliability/SKILL.md:38-40@687f282e`。

**证据限制.** 源仓能证明分配/清理规则和辅助代码；不能证明每个夹具在任意宿主上都无泄漏。采用项目需要并发压力和残留检查。

**补充源码引用（尾部区间复读分派实际读取）**：`deepseek-harness/apps/cli/tests/profiles/packed-installation.ts:1-129@687f282e`、`deepseek-harness/apps/web/tests/scaffold.ts:462-475@687f282e`、`deepseek-harness/apps/web/tests/scaffold.ts:620-700@687f282e`、`deepseek-harness/apps/web/tests/scaffold.ts:967-990@687f282e`

<a id="m04-global-state"></a>

## 4. M04 进程全局状态与平台语义

**机制 ID.** `testing-global-state-and-platform-semantics`。

**问题.** `process.env`、`cwd`、fake timers、locale/timezone、module mocks、registry、console hook、`globalThis`、全局 `fetch` 拦截都是独占可变资源。Windows 与 POSIX 对环境变量大小写、文件句柄释放、mtime 精度、权限和信号的语义不同。

**触发.** 修改环境变量、cwd、时钟、locale、全局对象、模块注册表、fetch/console hook；编写跨平台断言。

**前提.** 已列出会被修改的全局状态；已确认测试结束后原值是“不存在”还是“存在”。

**步骤.**
1. 优先注入依赖或实例级 adapter；必须修改全局时，捕获**原值是否存在**，恢复完全相同的状态。
2. 修改范围最小化：`try/finally` 包住最小范围；获取后立刻注册恢复；对“失败可能早于局部 finally”的情况加 `afterEach` 兜底。`deepseek-harness/.agents/skills/dsh-ci-test-reliability/SKILL.md:43-51@687f282e`。
3. 只拦截夹具拥有的最窄请求/调用；不要把整个 `fetch` 或整个模块替换成宽泛 mock。
4. **平台断言取新鲜值**：恢复 mtime 后再读一次，用读回值做期望，不要假设写入值能无损往返（NTFS 100ns tick）。`deepseek-harness/.agents/skills/dsh-ci-test-reliability/SKILL.md:53-70@687f282e`。
5. Windows 环境变量名大小写不敏感；seed `http_proxy` 与 `HTTP_PROXY` 两个键在 Windows 上只有一个条目。Windows 文件句柄异步释放；rename/remove 需要按观测到的竞争做有界重试。POSIX 权限/信号语义不能靠弱化断言跨平台；确实无法跨平台时显式跳过并写原因。`deepseek-harness/.agents/skills/dsh-ci-test-reliability/SKILL.md:57-70@687f282e`。
6. **代理基线**：Vitest setup 删除 ambient proxy 名称，让每个套件从已知环境开始；需要代理的测试显式设置它要验证的名称。`NODE_USE_ENV_PROXY` 在进程启动时已被 Node 采样，setup 删除无效，必须在 shell 中 unset。`deepseek-harness/scripts/test-proxy-environment.ts:1-60@687f282e`。
7. **DOM 环境**：jsdom 的 `ResizeObserver` 默认实现只在缺少时安装，并由 `vi.unstubAllGlobals` 恢复；几何/时序套件自己提供 observer。`deepseek-harness/scripts/test-dom-environment.ts:1-41@687f282e`。

**角色与完成信号.** 作者写恢复/平台分支；评审者检查“原值不存在”路径和失败路径；完成信号是全局状态在用例后与用例前完全一致，平台差异有显式理由。

**失败处理.** 跨平台失败先判断是产品语义还是测试假设；产品语义问题修产品，测试假设问题修测试。不要为了绿而在所有平台弱化断言。

**例外.** 确有平台专属能力（POSIX 权限、信号、pwsh、ConPTY）时，按 [M38](testing-platform-and-performance.md#m38-skips) 显式跳过并命名原因。

**证据限制.** 源仓能证明规则和示例；不能证明所有平台组合都被覆盖。采用项目需要 Windows/macOS/Linux 至少各一条真实 lane。

<a id="m05-synchronization"></a>

## 5. M05 同步、超时预算与静止处置

**机制 ID.** `testing-deterministic-synchronization`。

**问题.** 固定 sleep 不能证明 setup 完成或 teardown 静止；过小的 case timeout 会覆盖 runner 已给的 lane 预算；只发取消信号不等待完成会把失败转移成下一个测试的污染。

**触发.** 任何异步等待、race 测试、超时断言、子进程/服务关闭、expect.poll。

**前提.** 已知要等待的**状态**（不是“过多久”）；已知该用例所在 lane 的预算。

**步骤.**
1. 等待显式就绪事件、握手、状态转移、拥有的 promise 或外部可观察条件；超时只用于**限制**等待，不能成为断言正确的原因。`deepseek-harness/.agents/skills/dsh-ci-test-reliability/SKILL.md:72-88@687f282e`。
2. `describe`/case timeout 会覆盖 runner 的 `--testTimeout`，低于 lane 预算就是收窄；需要收窄时写明原因。hook 预算与 test 预算一起抬高；只抬 case 会把竞争失败推到 `afterEach`。`deepseek-harness/.agents/skills/dsh-ci-test-reliability/SKILL.md:74-80@687f282e`。
3. 当超时本身是被测对象时，外层等待要远大于被测超时，避免 harness 自己的等待先触发。`deepseek-harness/.agents/skills/dsh-ci-test-reliability/SKILL.md:80-82@687f282e`。
4. 用 barrier/deferred 把 race 放在确定点并证明重叠；不要断言调度相关顺序，除非该顺序就是产品行为；时间本身是被测对象时注入/伪造时钟并恢复真实 timer。`deepseek-harness/.agents/skills/dsh-ci-test-reliability/SKILL.md:84-88@687f282e`。
5. **观测不能先于被观测状态**：不要用“开始时启动的 wall-clock 窗口”去读一个前面还有长前缀的状态；应等待 hand-over/状态写入，再开始有界等待。`deepseek-harness/.agents/notes/implemented/testing/2026-09-27-observation-waits-on-observed-state.md:5-12@687f282e`。
6. 当一个状态是**最终态**时，轮询可能在点击提交前就被初值满足；先把选择/布局动作放在断言前，再用一个能区分初值与目标值的观察。`deepseek-harness/.agents/notes/implemented/testing/2026-09-27-spreadsheet-selection-by-keyboard-before-reflow.md:5-14@687f282e`。
7. 需要重试时，先命名被等待的工作；重试只能是有界的外部瞬态处理，不能是本地确定性测试的修复。
8. **超时预算可被机械验证**：`DSH_COVERAGE_TEST_TIMEOUT_MS` 必须是正整数；它同时约束 per-test、hook 和 `expect.poll`。格式错误在 config load 阶段失败，不进入任何测试。`deepseek-harness/scripts/lane-test-budget.spec.ts:56-122@687f282e`、`deepseek-harness/vitest.config.ts:360-406@687f282e`。
9. CI coverage lane 在共享宿主上给 90s 预算（并发/分区/兄弟 gate 争用），Windows coverage lane 同理；这是“恢复 lane 已给的预算”，不是凭空加余量。`deepseek-harness/.github/workflows/ci.yml:126-140@687f282e`。

**角色与完成信号.** 作者写等待/预算；评审者追问“这个等待在什么条件下会永远不返回/过早返回”；完成信号是重复运行和负载下都能稳定收敛，且超时失败能看到被等待的状态。

**失败处理.** 超时：先定位没到达的状态和诊断输出；不要先加时间。竞态：用 barrier 证明重叠，再用确定性断言。清理未静止：补 await，不要用 sleep 掩盖。

**例外.** 真实 provider 的瞬态重试（[M10](testing-real-api-and-secrets.md#m10-e2e-key)）；诊断已知 Windows 失败的 wine（[M38](testing-platform-and-performance.md#m38-skips)）；两者都必须在外部边界并保留记录。

**证据限制.** 源仓能证明预算代码、lane 值和诊断规则；不能证明任意负载下都不 flake。采用项目需要保留失败样本、重跑记录和压力证据。

**补充源码引用（尾部区间复读分派实际读取）**：`deepseek-harness/apps/web/tests/scaffold.ts:964-1000@687f282e`、`deepseek-harness/apps/web/tests/scaffold.ts:1516-1709@687f282e`、`deepseek-harness/packages/session-query/session-query-sqlite/tests/sqlite.spec.ts:1376-1880@687f282e`

---

## 附：本页机制的来源坐标索引

本页机制的来源坐标如下（固定提交 `687f282e`）。坐标只用于追溯，不新增正文断言；正文解释仍以本页对应小节为准。

- `testing-execution-topology`：`deepseek-harness/docs/testing.md:19-21@687f282e`、`deepseek-harness/vitest.config.ts:1-50@687f282e`
- `testing-resource-isolation`：`deepseek-harness/scripts/test-proxy-environment.ts:1-63@687f282e`
- `testing-global-state-and-platform-semantics`：`deepseek-harness/.agents/notes/implemented/testing/2026-09-27-plugin-manager-git-child-environment.md:5-20@687f282e`

本页机制：[`testing-execution-topology`](#m02-topology)、[`testing-resource-isolation`](#m03-resources)、[`testing-global-state-and-platform-semantics`](#m04-global-state)、[`testing-deterministic-synchronization`](#m05-synchronization)。

### 补充源码坐标

以下为本页相关规则的补充来源坐标：

- 来源：`deepseek-harness/scripts/lane-test-budget.spec.ts:1-55@687f282e`
