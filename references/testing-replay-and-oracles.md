# 回放、fixture 与 oracle

本页触发：要写或修改 workspace oracle、loopback HTTP fixture、LLM replay 脚本、回放语料 token、owner-local expected 输出，或判断无凭据 `llm-mock-server` 能证明什么时读本页。本页完整拥有 §24–28（M24 workspace oracle、M25 HTTP fixture、M26 LLM replay、M27 回放 token 还原、M28 expected 输出放置）和 §34（M34 `llm-mock-server` 协议替身）。快照触发/语料/模式/归一化见 `testing-snapshot-workflow.md`；真实 API 与凭据见 `testing-real-api-and-secrets.md`。

读法：每节是一份完整机制记录——机制 ID、问题、触发、前提、步骤、角色与完成信号、失败处理、例外、证据限制；出现哪一小节就承担哪一项义务，缺省不等于免除。标记约定（**[源规则]**／**[迁移设计]**／**[建议]**）与固定源提交 `687f282e` 见根 `testing.md` 首段；触发选择与命令总表见根 `testing.md` §0。本页引用其他页的机制时写成可点击链接。

<a id="m24-workspace"></a>

## 24. M24 Workspace oracle：完整最终树

**机制 ID.** `testing-snapshot-workspace-oracle`。

**问题.** 只断言“某个文件存在”会漏掉额外文件、残留临时目录、错误内容；record/refresh 又可能顺手把产品副作用写进期望。

**触发.** 场景会改 workspace；工具写文件；子代理/持久化；新增 `.tmp`/spill 行为。

**前提.** 场景声明了初始 workspace；已确认最终 workspace 是否应改变。

**步骤.**
1. **默认最终 = 初始**：非 mutating 场景断言 `finalWorkspace` 与 `initialWorkspace` 完全相等；出现任何额外/修改文件即失败。`deepseek-harness/packages/test-support/session-snapshot/src/suite.ts:1585-1605@687f282e`。
2. **mutating 场景显式声明** `workspace.final: true`，并提交完整的 `workspace.expected/` 树；断言最终树与期望树完全相等。`deepseek-harness/packages/test-support/session-snapshot/src/suite.ts:1590-1605@687f282e`。
3. **record/refresh 不重写 oracle**：`workspace.expected/` 是独立的人工审查产物；录制/刷新只写 session/stdout/sidecar。`deepseek-harness/docs/testing.md:53-55@687f282e`。
4. **等待静止后捕获**：先等子进程/工具/持久化完成，再捕获树；不要用固定 sleep。`deepseek-harness/packages/test-support/session-snapshot/src/workspace.ts:1-113@687f282e`。
5. **清理自有临时目录**：`.tmp`/spill/owned tree 在断言前删除；不要让 harness 自己的残留进入 oracle。`deepseek-harness/packages/test-support/session-snapshot/README.md:50-60@687f282e`。
6. **隐藏/未跟踪文件**：捕获要覆盖完整树（含隐藏文件），但排除明确不属于 workspace 的外部路径；规则要写在 manifest/owner 文档。

**角色与完成信号.** 作者声明 mutating 并提交期望树；评审者检查“这个额外文件是产品行为还是测试残留”；完成信号是完整树比较通过，失败能指出具体路径。

**失败处理.** 额外 `.tmp`：先修清理，不要加 ignore。真实新输出：更新 oracle 并审查内容。非 mutating 场景改了文件：判断产品副作用，必要时改声明并解释。

**例外.** 只读场景不需要 `workspace.final`；没有 workspace 的场景不适用。

**证据限制.** oracle 证明该 workspace 内的文件树，不证明外部文件系统/网络副作用。

**补充源码引用（尾部区间复读分派实际读取）**：`deepseek-harness/apps/web/tests/scaffold.ts:146-158@687f282e`、`deepseek-harness/apps/web/tests/scaffold.ts:1199-1220@687f282e`、`deepseek-harness/snapshots/session/headless.snapshot.ts:817-835@687f282e`

<a id="m25-network"></a>

## 25. M25 Loopback HTTP fixture：生命周期、映射与代理隔离

**机制 ID.** `testing-snapshot-network-fixtures`。

**问题.** Snapshot fixtures 需要 loopback HTTP，但 ambient proxy 会把请求送错、启动/销毁竞争会留下 listener/连接、fetch 映射会丢失 method/headers、后来的 wrapper 会被覆盖。

**触发.** 场景触达外部 HTTP；search/loopback fixture；auth recovery/download；Vitest proxy 环境。

**前提.** 已确认 fixture 只需要本地 loopback authority；已声明哪些请求属于 recorded authority。

**步骤.**
1. **loopback effect 自己拥有 listener**：绑定 `127.0.0.1:0`；在 Cordis effect 中注册 cleanup；`unref()` 防止 fixture 持有进程；cleanup 先跑 owner callback，再 `close()` + `closeAllConnections()`，两者错误合并为 `AggregateError`；setup 失败也要 cleanup。`deepseek-harness/snapshots/session/loopback-fixture-server.mjs:1-75@687f282e`。
2. **dispose 在启动中获胜**：用 `started` barrier；dispose 不提前完成，等 `finishListening` 后关闭 server/连接/unref；spec 断言 `closed/connectionsClosed/unreferenced` 且 fetch 恢复。`deepseek-harness/scripts/snapshot-http-fixtures.spec.ts:91-141@687f282e`。
3. **fetch 映射保真**：string/URL/Request 三种输入都映射到 loopback authority；`Request` 的 method/headers 必须保留；无关 URL 原样传递；同一 recorded authority 的意外 path 必须 reject。`deepseek-harness/scripts/snapshot-http-fixtures.spec.ts:143-181@687f282e`。
4. **所有权冲突要报告**：fixture 安装 fetch 后又被后来的 wrapper 替换时，dispose 保留后来的 wrapper，并报告 ownership error；不能静默覆盖。`deepseek-harness/scripts/snapshot-http-fixtures.spec.ts:183-203@687f282e`。
5. **清 ambient proxy**：Vitest setup 删除 proxy names 和 `NODE_USE_ENV_PROXY`；需要代理的测试显式设置；`NODE_USE_ENV_PROXY` 必须在 shell 启动前 unset（Node 在进程启动时采样，setup 删除不能解绑）；real-API e2e 也清。`deepseek-harness/scripts/test-proxy-environment.ts:1-60@687f282e`。
6. **真实网络只走 e2e**：本地 loopback fixture 不录；需要真实 provider/网络时用 [M10](testing-real-api-and-secrets.md#m10-e2e-key)/[M11](testing-real-api-and-secrets.md#m11-e2e-isolation)，不要用 fixture 冒充 live 证据。`deepseek-harness/docs/testing.md:27-31@687f282e`。

**角色与完成信号.** 场景作者/网络 owner；完成信号是 loopback lifecycle spec 通过、proxy 环境已知、真实网络证据单独运行。

**失败处理.** listener 挂住：检查 effect cleanup 和 `closeAllConnections`；proxy 干扰：清 ambient 并让需要代理的测试显式设置；映射错：检查 recorded authority 和 path 白名单。

**例外.** 真实 e2e 走真实网络（[M10](testing-real-api-and-secrets.md#m10-e2e-key)/[M11](testing-real-api-and-secrets.md#m11-e2e-isolation)）；本地 fixture server 的 loopback 交互不录。

**证据限制.** loopback fixture 证明本地服务器生命周期、fetch 映射和所有权；不证明 live 网络、CDN、限流或 provider 保真。

<a id="m26-replay"></a>

## 26. M26 LLM replay：脚本、覆盖与消费校验

**机制 ID.** `testing-llm-replay-scripts`。

**问题.** 回放脚本与真实会话调用顺序不一致时，测试可能读错脚本、少跑调用，或者用“没抛错”掩盖未消费的 fixture。

**触发.** 新增 recorded session；模型流变化；工具调用重试；子代理。

**前提.** 有主 session（及可选 child session）的 JSONL；知道每个模型调用的 turn/step。

**步骤.**
1. **派生脚本**：从 `assistant/message`/`assistant/attempt` 的 stream 展开 chunks；`compaction/summary` 的 `llmStreamCall` 用 `rawOutput` 重建；每个调用必须以 `finish` 结束，否则说明是抛出的流，需要 `replay.override.json`。`deepseek-harness/packages/test-support/llm-replay/src/index.ts:462-505@687f282e`。
2. **覆盖/补丁**：`ReplayOverrideDoc` 可以是整脚本数组或 `{ patches }`；`at` 是 0-based 调用索引，等于派生长度时追加（如注入瞬态错误后的重试）。`deepseek-harness/packages/test-support/llm-replay/src/index.ts:507-540@687f282e`。
3. **会话绑定**：每个 live session 绑定一个脚本；脚本按绑定顺序分配；匿名调用用单独 key；多出未录制的 session 或脚本耗尽都抛错并提示重录。`deepseek-harness/packages/test-support/llm-replay/src/index.ts:1031-1100@687f282e`。
4. **消费校验**：`assertConsumed()` 要求所有脚本都绑定且每个脚本的调用都被消费；未消费会失败并列出 session/数量。`deepseek-harness/packages/test-support/llm-replay/src/index.ts:1100-1125@687f282e`。
5. **provider catalog 校验**：input modalities 只能是 text/image；imageRequestTokens 必须正安全整数且含 image；systemPromptUpdate 只能是 `in-history`；toolUpdate 只能是 `in-history`/`addition-only`。`deepseek-harness/packages/test-support/llm-replay/src/index.ts:1125-1209@687f282e`。
6. **post-2xx 副作用**：DeepSeek official provider 的 replay 仍调用 extensions 的 `prepare/accept`，重现 2xx 后的副作用；但它不重现 provider wire body。`deepseek-harness/packages/test-support/llm-replay/src/index.ts:1075-1095@687f282e`。
7. **节奏**：`paceMs` 可逐 chunk 延迟；默认 burst；用于时序敏感场景，不改变内容。
8. **child files**：`DSH_SNAPSHOT_CHILD_FILES` 用 path delimiter 分隔；每个 child 对应一个 recorded subagent session log。

**角色与完成信号.** 作者维护脚本/override；评审者检查未消费/多消费；完成信号是 replay 通过且 `assertConsumed` 通过。

**失败处理.** 脚本耗尽/未录制 session：重录或补 override，不要放宽。`finish` 缺失：补 override 或修录制。provider 校验失败：修 catalog 配置。

**例外.** 单 session 匿名调用可以不绑 id；trace/非流式 replay 不适用。

**证据限制.** replay 证明脚本消费和下游行为，不证明真实 provider 的 wire/认证/限流。

**补充源码引用（尾部区间复读分派实际读取）**：`deepseek-harness/packages/test-support/llm-replay/src/index.ts:1-1030@687f282e`、`deepseek-harness/apps/web/tests/scaffold.ts:849-949@687f282e`

<a id="m27-replay-corpus"></a>

## 27. M27 回放语料的 token 还原

**机制 ID.** `testing-replay-corpus-token-restoration`。

**问题.** 提交的 replay JSONL 为了脱敏用了 token；回放时必须把 token 还原成当前 live 值，但不能改 fixture 或猜错关系。

**触发.** replay fixture 含 `{{...}}` token；子代理/身份关系；新增 scrub token。

**前提.** 已登记 token 的语义和 owner；已确认 fixture 是 replay 输入。

**步骤.**
1. 用共享的 `materializeSessionTokens`/`restoreReplayCorpus` 还原 token；每个 token 映射到当前 live session/child/tool/schema，不修改文件。`deepseek-harness/packages/test-support/session-snapshot/src/suite.ts:850-950@687f282e`。
2. **父子关系**：child token 必须映射到同一个 child live id；不要因为两个 child 文本相似就合并。
3. **长度/形状**：还原后允许 fixture 与 live 值长度不同（例如 id 长度），但结构/关系必须一致；不匹配要抛出并指出 token/位置。
4. **override 与 corpus 分离**：`replay.override.json` 是行为补丁，不是身份 token；presence 必须与 `overridden` 一致。`deepseek-harness/packages/test-support/session-snapshot/src/suite.ts:1615-1650@687f282e`。
5. **不重写历史**：replay corpus 文件是只读输入；还原只发生在内存/进程内。

**角色与完成信号.** 作者维护 token 映射；评审者检查“token 是否泄露/合并身份”；完成信号是 replay 通过，还原后的请求/状态与录制关系一致。

**失败处理.** token 不识别：加映射或报错，不要猜。父子错：修 token/录制。fixture 需要改：回到 record/refresh，不要在 replay 时改。

**例外.** 纯本地、无身份关系的 fixture 可以不用 token；但一旦提交，必须能解释每个 token。

**证据限制.** token 还原证明关系映射，不证明真实 provider 会接受这些值。

<a id="m28-expected"></a>

## 28. M28 Owner-local expected output

**机制 ID.** `testing-expected-output-placement`。

**问题.** 不是所有组装行为都需要 recorded session。CLI 进程、配置转储、启动失败、插件兼容性这类“有真实进程但没有模型回放”的输出，放在 `snapshots/` 会污染会话语料；放在普通单测里又缺少完整进程。

**触发.** CLI/进程装配、启动/退出、配置 schema、插件兼容性、Web 的非 session 输出。

**前提.** 输出不是由 recorded session 驱动；有可启动的真实 profile/进程。

**步骤.**
1. 用 `*.expected.e2e.ts` 命名，放在 owning app/package/script 的 `tests/expected/` 旁；不要放顶层 `snapshots/`，不要用 `*.snapshot.ts`。`deepseek-harness/docs/testing.md:12@687f282e`、`deepseek-harness/.agents/skills/dsh-pre-push-checks/SKILL.md:35-39@687f282e`。
2. `vitest.expected.config.ts` 只包含 `apps/cli/tests/**/*.expected.e2e.ts`；用 proxy 清理 setup；120s test/30s hook；最多 5 worker。`deepseek-harness/vitest.expected.config.ts:1-19@687f282e`。
3. 通过真实 Loader/profile 启动（如 `runLoaderSmoke` + headless driver），断言 stdout/stderr、退出码、持久化文件；CI 用 built exports（`DSH_EXAMPLE_MODE=lib`）。`deepseek-harness/scripts/run-gates.ts:757-766@687f282e`。
4. 两边都用同一归一化 context；比较解析后的 JSONL/文本，而不是逐字节（除非协议要求字节）。`deepseek-harness/apps/cli/tests/profiles/headless/tests/headless.expected.e2e.ts:60-75@687f282e`。
5. 需要刷新时用 `pnpm run test:expected:refresh`，人工审查 diff；不要手改期望来掩盖行为。`deepseek-harness/package.json:73-76@687f282e`。
6. 进程被信号/超时结束时，先断言不是信号/超时，再断言退出码，避免“被杀”伪装成普通失败。`deepseek-harness/.agents/skills/dsh-ci-test-reliability/SKILL.md:105-108@687f282e`。

**角色与完成信号.** 作者放对目录、启动真实进程；评审者检查输出是否被世界断言覆盖；完成信号是 `pnpm run test:expected` 通过且无 session 回放。

**失败处理.** 输出差异：先判断是环境噪声还是行为；环境加最小归一化，行为修代码/审查。放错目录：移动并更新配置，不要留副本。

**例外.** 一旦场景需要 recorded session 的模型输入/持久化，改用 `snapshots/`（[M16](testing-snapshot-workflow.md#m16-snapshot-required)）。纯包/脚本期望用 `test`，浏览器期望用 `test:web`。

**证据限制.** expected 证明该进程的输出，不证明真实 provider；keyless 仍是 mock/脚本模型。

**补充源码引用（尾部区间复读分派实际读取）**：`deepseek-harness/apps/cli/tests/profiles/headless/tests/headless.expected.e2e.ts:84-1211@687f282e`、`deepseek-harness/apps/web/tests/scaffold.ts:1697-1720@687f282e`

<a id="m34-llm-mock-server"></a>

## 34. M34 `llm-mock-server` 的无凭据协议替身

**机制 ID.** `testing-llm-mock-server-contract`。

**问题.** 真实 provider 的凭据/网络/限流让恢复和流式测试难以稳定；但 mock server 如果被当成 provider 保真，会掩盖 wire/认证差异。

**触发.** provider 恢复、流式 chunk、工具调用、认证错误、无 key 的客户端/服务端联调。

**前提.** 服务可以被指向本地 `DEEPSEEK_BASE_URL`；使用假 key。

**步骤.**
1. 启动本地 mock server，设置 `DEEPSEEK_BASE_URL=http://127.0.0.1:<port>/v1` 和 `DEEPSEEK_API_KEY=mock-key`；不要把真实 key 传给它。`deepseek-harness/packages/test-support/llm-mock-server/README.md:40-50@687f282e`。
2. 用它的故障注入/恢复模式验证客户端在错误、重试、流中断下的行为；断言外部请求次数/顺序/最终状态，而不是只看 mock 日志。
3. 它是**外部边界**替身：保留真实 loop/tool/persistence；不要再用另一个 mock 包住下游。
4. 不要把它当作 provider 兼容性/限流/真实 wire 的证据；这些需要 [M10](testing-real-api-and-secrets.md#m10-e2e-key)。

**角色与完成信号.** 作者配置本地 server/假 key；评审者检查是否泄漏真实 key、是否断言了下游；完成信号是恢复场景稳定通过且外部效果正确。

**失败处理.** 连接失败：检查端口/路径/假 key。行为差异：判断是客户端还是 mock 协议，不要直接改 mock 让测试绿。

**例外.** 需要真实 provider 的测试用 [M10](testing-real-api-and-secrets.md#m10-e2e-key)；mock server 不替代。

**证据限制.** 只证明被 mock 的协议子集和客户端行为，不证明 provider 实现。

**补充源码引用（尾部区间复读分派实际读取）**：`deepseek-harness/apps/cli/tests/profiles/headless/tests/headless.expected.e2e.ts:97-217@687f282e`

---

## 附：本页机制的来源坐标索引

本页机制的来源坐标如下（固定提交 `687f282e`）。坐标只用于追溯，不新增正文断言；正文解释仍以本页对应小节为准。

- `testing-snapshot-network-fixtures`：`deepseek-harness/scripts/snapshot-http-fixtures.spec.ts:1-203@687f282e`
- `testing-llm-replay-scripts`：`deepseek-harness/packages/test-support/llm-replay/README.md:1-100@687f282e`、`deepseek-harness/packages/test-support/llm-replay/src/index.ts:1031-1209@687f282e`
- `testing-llm-mock-server-contract`：`deepseek-harness/packages/test-support/llm-mock-server/README.md:1-169@687f282e`

本页机制：[`testing-snapshot-workspace-oracle`](#m24-workspace)、[`testing-snapshot-network-fixtures`](#m25-network)、[`testing-llm-replay-scripts`](#m26-replay)、[`testing-replay-corpus-token-restoration`](#m27-replay-corpus)、[`testing-expected-output-placement`](#m28-expected)、[`testing-llm-mock-server-contract`](#m34-llm-mock-server)。
