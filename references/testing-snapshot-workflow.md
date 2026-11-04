# 快照工作流：触发、语料、模式与身份

本页触发：要判断某处改动是否必须有快照、快照放哪里、manifest 与语料怎么守卫、场景怎么选与命名、用 replay/record/refresh 哪一种模式、归一化到什么程度、身份 token 与 header pins 由谁拥有时读本页。本页完整拥有 §16–23（M16–M23：快照必需性与放置、manifest 与机械守卫、场景选择与代际、录制语料政策、模式、归一化、身份与凭据、header pins）。工作区 oracle、HTTP fixture、replay 脚本与 expected 归属见 `testing-replay-and-oracles.md`；证据层级与真实入口见 `testing-evidence-and-reliability.md`。

读法：每节是一份完整机制记录——机制 ID、问题、触发、前提、步骤、角色与完成信号、失败处理、例外、证据限制；出现哪一小节就承担哪一项义务，缺省不等于免除。标记约定（**[源规则]**／**[迁移设计]**／**[建议]**）与固定源提交 `687f282e` 见根 `testing.md` 首段；触发选择与命令总表见根 `testing.md` §0。本页引用其他页的机制时写成可点击链接。

<a id="m16-snapshot-required"></a>

## 16. M16 快照何时必需、放在哪里

**机制 ID.** `testing-snapshot-required-and-placement`。

**问题.** 单元测试、mock 测试和 e2e 都可能绿，但组装后的模型可见转录、工具 schema、系统提示和持久化结果已经变了；反过来，把非会话输出塞进顶层 `snapshots/` 又会让“快照 = 会话驱动”的所有权失效。

**触发.** 任何非平凡的模型、协议或人可见改动；`SessionEventMap`、agent-loop、session-lifecycle、能力缝、生命周期/转录变体。

**前提.** 已确认改动是否有组装后的 transcript；已确认它是否由 recorded session 驱动。

**步骤.**
1. **同一 PR 增加/更新 keyless recorded-session 场景**；package、e2e、mock-only 和 rationale 证据不能替代组装 transcript。`deepseek-harness/docs/testing.md:53-55@687f282e`。
2. 按入口放目录：headless → `snapshots/session/`；SDK → `snapshots/sdk/`；ACP → `snapshots/acp/`；Web → `snapshots/web/`；Web 渲染可以显式借用另一个场景的 canonical session。`deepseek-harness/docs/testing.md:53-55@687f282e`。
3. **非 recorded-session 驱动的期望输出留在所有者旁边**：`tests/expected/`，不要放 `snapshots/`，不要用 `*.snapshot.ts` 后缀；browser expectations 用 `test:web`，package/script expectations 用 `test`。`deepseek-harness/docs/testing.md:53-55@687f282e`、`deepseek-harness/.agents/skills/dsh-pre-push-checks/SKILL.md:35-39@687f282e`。
4. **两个 SDK 同 PR**：agent-loop/session-lifecycle/`SessionEventMap` 改动更新 TypeScript 和 Python 期望输出；`pnpm run test` 不覆盖这两套期望输出，须选择各自 owning lane；Python runtime 的相关车道使用 `scripts/snapshots/python-sdk-single-exe/`。`deepseek-harness/AGENTS.md:161@687f282e`。
5. 计划阶段就列出 unit/e2e/snapshot 覆盖：能力缝、生命周期路径、transcript 输出；缺 snapshot harness 支持要在同一改动里补。`deepseek-harness/AGENTS.md:161-163@687f282e`。
6. Web 渲染若借用场景，必须在 manifest/注释中写明借用关系，不要复制一份会漂移的 session。
7. **跨平台夹具而非适配夹具的归一化**：源要求夹具在macOS/Linux回放，修夹具而非修改normalizer来迁就它。[M21](#m21-normalization)仍只去除真正环境噪声，不得normalize掉行为差异；这一要求不等于已观察到两平台运行。`deepseek-harness/AGENTS.md:158@687f282e`。

**角色与完成信号.** 作者判断是否必需并放对位置；评审者检查“这改动是否改变了用户/模型可见的组装输出”；完成信号是 keyless replay 场景存在、通过、差异被审查。

**失败处理.** 不确定是否必需：看是否改变模型请求/持久化/用户可见输出；是则加。放错目录：移动并更新 manifest/配置，不要留副本。

**例外.** 机械/局部编辑、无模型或用户可见输出的改动可以不加；但要在 PR 说明理由。`deepseek-harness/AGENTS.md:158-160@687f282e`。

**证据限制.** 快照证明录制 transcript 的组装结果，不证明真实 provider 接受该请求（[M10](testing-real-api-and-secrets.md#m10-e2e-key)）或发布产物可运行（[M15](testing-evidence-and-reliability.md#m15-source-built)）。

<a id="m17-manifest-guards"></a>

## 17. M17 Snapshot manifest 与机械守卫

**机制 ID.** `testing-snapshot-manifest-and-guards`。

**问题.** 目录重命名会留下无用的旧快照；sidecar 可以悄悄漂移；header pin 可以为零或重复；committed JSONL 可以不是 canonical；仅靠人工审查无法保证。

**触发.** 新增/重命名/删除场景；修改 `snapshot.yml`；修改 sidecar；修改 fixture 存储格式。

**前提.** 场景目录已注册；`snapshot.yml` 能被严格解析。

**步骤.**
1. **`snapshot.yml` 只写声明字段**：`profile`（`headless`/`sdk`/`sdk-minimal`/`acp`/`web`）、`composition`、`header`、`recording`、workspace facts 等；`session` 是**只读借用者引用**（目录自己拥有 selected parent 时省略），不是 ACP 专用；`workspace.final: true` 表示最终 workspace 与初始不同。解析器用 `exactKeys` 拒绝未知/不一致字段。`deepseek-harness/snapshots/AGENTS.md:7-9@687f282e`、`deepseek-harness/packages/test-support/session-snapshot/src/manifest.ts:100-125@687f282e`, `deepseek-harness/packages/test-support/session-snapshot/src/manifest.ts:213-231@687f282e`, `deepseek-harness/packages/test-support/session-snapshot/src/manifest.ts:374-380@687f282e`。
   - **字段值守卫**：YAML 用 `JSON_SCHEMA`，拒绝自定义 tag；`replay.override` 只能 `true`；`platform` 只能 `posix|pwsh`；`permission` 只能 `read-only|workspace-write|danger-full-access`；environment 键匹配 `^[A-Z][A-Z0-9_]*$` 且值为 string；workspace 非空，`final` 只能 `true`、`parent` 只能 `outside-temp`。
   - **输入形状**：input 声明非空 task 或非空 attachments；每个 attachment 只含 id/mediaType/data，id 以 `sha256:` 开头且不重复、mediaType 含 `/`、data 是非空 string。源诊断称 MIME/base64，但没有验证完整 MIME/base64 语法，也不证明摘要正确。
   - **历史借用边界**：session.source 非空，拒绝绝对路径、反斜杠与 NUL；sessionFormat.version 是非负 safe integer 且不为 `-0`，coverage 是非空、唯一的 supported 名称；借用 session 时不能同时声明 sessionFormat。依据：`deepseek-harness/packages/test-support/session-snapshot/src/manifest.ts:204-206,285-405@687f282e`；`deepseek-harness/packages/test-support/session-snapshot/tests/manifest.spec.ts:181-207@687f282e`。这些 parser 单测不证明 suite/disk 守卫或场景语义；本次未执行。
2. **目录注册守卫**：`snapshots/<dir>` 必须与场景表一一对应；重命名/删除场景留下的孤儿目录必须失败。`deepseek-harness/packages/test-support/session-snapshot/src/suite.ts:1604-1612@687f282e`。
3. **场景角色与命名**：每个场景 own 或显式 reference 一个 primary Session role 加 contiguous child roles；parent 为 `session[.vN].jsonl`，child 为 `session.<ordinal>[.vN].jsonl`；`v0` 省略、正版本小写、文件名与 header 一致；replay/record/refresh 选最高代际；普通 one-shot 从 selected JSONL 派生 user task 和 replay script，不要重复写 `input.json`；shared reference 只读、无环、指向 owner 的 selected parent generation，record/refresh 不重命名或删除已提交代际。`deepseek-harness/snapshots/AGENTS.md:7-9@687f282e`。守卫还要求每个场景目录有 `snapshot.yml`、`input.json`、`stdout.expected.jsonl` 和 primary session fixture；`profile` 必须等于 agent profile 或 `acp`，ACP 场景的 `manifest.session` 必须为 undefined（自己拥有 session）。`deepseek-harness/packages/test-support/session-snapshot/src/suite.ts:1613-1650@687f282e`。
4. **sidecar 与声明一致**：`pinsChildToolSchemas`/`pinsChildSystemPrompts` 的索引必须与磁盘上的 `tool-schemas.<n>.expected.json`/`system-prompt.<n>.expected.md` 完全一致；`pinsNativeWindowsStdout` 控制 Windows stdout 文件；`overridden` 控制 `replay.override.json`；prompt/schema sidecar 只能由 owner 持有。`deepseek-harness/packages/test-support/session-snapshot/src/suite.ts:1615-1650@687f282e`。
5. **header pin 守卫**：每个 header class 恰好一个 pinning 场景；零 pin 会丢掉该类的结构表面，两个会把表面拆开；所有场景的 class 必须有 pin。`deepseek-harness/packages/test-support/session-snapshot/src/suite.ts:1660-1676@687f282e`。
6. **pin 组合守卫**：pinning fixture 的 header 序列、prompt 序列、tool-schema 序列、`expectedHeaderChanges`、`expectedPromptChanges` 必须互相匹配；prompt 非空且以 newline 结尾；schema 用 canonical JSON；每个不同 prompt/schema 只存一份。`deepseek-harness/packages/test-support/session-snapshot/src/suite.ts:1678-1710@687f282e`。
7. **child pin 守卫**：声明的 child 索引必须指向真实 `session.<n>.jsonl`；sidecar 必须 canonical，且 prompt pin 与 class pin 的初始 prompt 一致。`deepseek-harness/packages/test-support/session-snapshot/src/suite.ts:1712-1735@687f282e`。
8. **committed JSONL 存储守卫**：prompt 文本/tool schema 离开 JSONL；每个模型请求前有 logged system prompt；portable cwd token 不保留平台 realpath 前缀；固定点检查失败即报。`deepseek-harness/packages/test-support/session-snapshot/src/suite.ts:1737-1745@687f282e`。
9. **文件名守卫**：`expected-filenames.yml` 在 PR/push 运行 `scripts/check-expected-filenames.sh`；它禁止 tracked non-vendor 文件名包含 `golden`，要求改用 `expected` 等准确术语；这不是 `.jsonl` 语法校验。`deepseek-harness/.github/workflows/expected-filenames.yml:1-28@687f282e`、`deepseek-harness/scripts/check-expected-filenames.sh:1-26@687f282e`。
10. **fixture 布局脚本**：`canonicalSessionFixture()` 对当前格式重排为 one-event-per-row、去掉 seq/time envelope；对历史版本严格解码但**保持字节不变**；重写后做 payload 等价和幂等检查；错误带物理行/事件行。`deepseek-harness/scripts/session-fixture-layout.ts:220-275@687f282e`。

**角色与完成信号.** 作者维护 manifest/sidecar；评审者看守卫是否覆盖新增表面；完成信号是 snapshot fixture 守卫套件全绿，孤儿/缺失/不一致都显式失败。

**失败处理.** 孤儿目录：注册或删除，不要留。sidecar 不匹配：改声明或文件，不要放宽守卫。canonical 失败：看脚本给出的行号，修 fixture 或迁移逻辑。

**例外.** ACP 场景拥有自己的 session；Web 可以借用 canonical session；physical fixture（WebWorker/installed runtime）不由布局脚本改写。`deepseek-harness/scripts/session-fixture-layout.ts:20-50@687f282e`。

**证据限制.** 机械守卫证明结构和声明一致，不证明场景语义覆盖了真实风险；仍需 [M16](#m16-snapshot-required)/[M19](#m19-corpus) 的选择判断。

**补充源码引用（尾部区间复读分派实际读取）**：`deepseek-harness/scripts/session-fixture-layout.ts:61-219@687f282e`、`deepseek-harness/scripts/session-fixture-layout.ts:276-294@687f282e`、`deepseek-harness/apps/web/tests/scaffold.ts:1728-1788@687f282e`、`deepseek-harness/packages/test-support/session-snapshot/src/suite.ts:1200-1225@687f282e`、`deepseek-harness/snapshots/session/headless.snapshot.ts:1135-1192@687f282e`

<a id="m18-selection"></a>

## 18. M18 场景选择、命名与代际

**机制 ID.** `testing-snapshot-selection-and-generations`。

**问题.** 同一角色有多个父/子 session 时，选错代际会让 replay 输入和期望输出不匹配；命名不一致会让发现逻辑漏文件。

**触发.** 新增/迁移 session fixture；格式版本升级；子代理场景。

**前提.** 每个文件 header 的 version 已知；manifest 已列出角色。

**步骤.**
1. **命名**：父角色 `session[.vN].jsonl`；子角色 `session.<ordinal>[.vN].jsonl`；`v0` 省略（不要写 `.v0`）；正版本用小写 `.vN`；文件名必须与 header version 一致。`deepseek-harness/docs/testing.md:53-55@687f282e`。
2. **选择最高代际**：replay、record、refresh 都按角色选最高 `vN`；同一角色出现重复 generation 要失败；只发现 manifest 声明的文件，不能靠 glob `session-*` 猜。`deepseek-harness/docs/testing.md:53-55@687f282e`、`deepseek-harness/snapshots/AGENTS.md:7-9@687f282e`。
3. **主 fixture 必需**：每个场景至少一个 primary session；child 索引从 1 开始；`session.<n>` 必须对应真实 child。`deepseek-harness/packages/test-support/session-snapshot/src/suite.ts:1613-1650@687f282e`。
4. **当前格式与历史格式分开**：当前 writer 格式在文件名/header 中声明，one row per event，embedded compact Assistant streams；历史 fixture 保留 released representation；显式 `sessionFormat` owner 保留迁移覆盖，不要为了整齐把历史字节重写。`deepseek-harness/docs/testing.md:17@687f282e`、`deepseek-harness/docs/testing.md:53-55@687f282e`、`deepseek-harness/scripts/session-fixture-layout.ts:230-270@687f282e`。
5. **物理 fixture**：WebWorker VFS 和 installed-runtime 的 session JSONL 保留物理编码，不参与 canonical 投影。`deepseek-harness/scripts/session-fixture-layout.ts:20-50@687f282e`。

**角色与完成信号.** 作者命名/放置；评审者检查版本和 header 一致；完成信号是发现逻辑只读到预期文件，最高代际被使用，重复/缺失显式失败。

**失败处理.** 文件名与 header 不一致：改名或改 header，不要只改一侧。重复 generation：删除/合并，不要赌排序。历史 fixture 被重写：从源恢复，修脚本的跳过条件。

**例外.** 无版本号的协议 fixture 和当前 projected snapshot 使用 scalar event rows；仍然走同一发现/校验。`deepseek-harness/scripts/session-fixture-layout.ts:130-145@687f282e`。

**证据限制.** 命名/代际守卫不证明内容语义；见 [M19](#m19-corpus)/[M20](#m20-modes)。

**补充源码引用（尾部区间复读分派实际读取）**：`deepseek-harness/packages/test-support/session-snapshot/src/session-files.ts:84-253@687f282e`、`deepseek-harness/apps/web/tests/scaffold.ts:145-199@687f282e`、`deepseek-harness/snapshots/session/headless.snapshot.ts:1131-1172@687f282e`

<a id="m19-corpus"></a>

## 19. M19 录制语料政策（corpus）

**机制 ID.** `testing-snapshot-corpus-policy`。

**问题.** 只保留“最新的一个”会话会让格式迁移、旧工具、旧 profile 的兼容性失去输入；但把所有历史都塞进 replay 又会让语料无限膨胀。corpus 政策定义“保留哪些代际、每个代际必须覆盖什么”。

**触发.** 修改 session 格式/持久化/模型可见输出；新增/重录 corpus 场景；升级默认格式版本。

**前提.** 场景目录有 `corpus: true` 标记；每个 retained 代际声明 coverage；当前版本已知。

**步骤.**
1. **corpus 目录**：`corpus: true` 的场景必须在 `snapshot.yml` 中声明保留代际和 coverage；不是所有快照都是 corpus。`deepseek-harness/snapshots/AGENTS.md:9-17@687f282e`。
2. **角色独立计数**：parent 和 child 的 current/baseline 角色分别计数；混合代际不能把一个角色的覆盖算到另一个。`deepseek-harness/scripts/session-snapshot-corpus-policy.spec.ts:43-58@687f282e`。
3. **V3 baseline 作为迁移输入**：源仓要求保留 V3 多数作为 migration input，不要求每个 V3 都有 current successor；current writer owner 可以并存。`deepseek-harness/scripts/session-snapshot-corpus-policy.spec.ts:17-33@687f282e`。
4. **相邻迁移边直接覆盖**：每个 adjacent version（如 v1/v2）必须由该代际的 fixture 直接覆盖，不能借用另一个代际的 coverage 标签；缺边即失败。`deepseek-harness/scripts/session-snapshot-corpus-policy.spec.ts:75-100@687f282e`。
5. **V0 覆盖**：V0 retained fixture 必须声明 `multi-hop`、`packed-row`、`retry-failure`、`shipped-profile`；缺少即失败。`deepseek-harness/scripts/session-snapshot-corpus-policy.spec.ts:75-100@687f282e`。
6. **retired tools**：可以在 current format 中保留 retired tool 场景，但不能声称 migration coverage；retained version 必须早于 current。`deepseek-harness/scripts/session-snapshot-corpus-policy.spec.ts:60-74@687f282e`。
7. **重录/刷新不能洗掉 corpus**：replay/refresh 选择最高代际，但 corpus suite 必须继续覆盖所有 retained 代际；refresh 掉最后的 V3 输入会被政策测试拒绝。`deepseek-harness/scripts/session-snapshot-corpus-policy.spec.ts:60-74@687f282e`。
8. 运行完整 corpus suite，而不是只跑 `-t` 过滤；改变格式/持久化/模型可见输出时尤其如此。

**角色与完成信号.** 作者维护 corpus 标记/coverage；评审者检查“这次重录是否删掉了迁移输入”；完成信号是 corpus policy 测试 + 完整 snapshot 套件通过。

**失败处理.** 缺 v3/v0/相邻边：补 fixture，不要改政策标签绕过。retained 版本晚于 current：修正声明。重录导致覆盖丢失：恢复旧 fixture 或补替代。

**例外.** 新生成、尚未进入 corpus 的场景可以不标；一旦标记，就必须满足角色/代际/覆盖约束。

**证据限制.** 政策检查的是标签和生成关系，不证明 fixture 语义质量；需要人工审查 + replay 通过。

**补充源码引用（尾部区间复读分派实际读取）**：`deepseek-harness/packages/test-support/session-snapshot/src/suite.ts:1200-1225@687f282e`、`deepseek-harness/packages/test-support/session-snapshot/src/suite.ts:1746-1760@687f282e`

<a id="m20-modes"></a>

## 20. M20 快照模式：replay / record / refresh

**机制 ID.** `testing-snapshot-modes`。

**问题.** 录制模式会写入真实 provider 输出；刷新模式可能在“看起来只是更新 fixture”时把回归一起批准；回放模式必须 keyless 且能发现不一致。

**触发.** 模型转录变化；行为修复后 replay 输入仍有效；新增场景；格式迁移。

**前提.** replay 无需 key；record 需要可用 provider；refresh 要求旧 replay 输入仍有效。

**步骤.**
1. **默认 replay**：`pnpm run test:snapshot`，keyless，通过 shipped profile 回放 recorded session；CI 用 `DSH_EXAMPLE_MODE=lib` 启动 built lib。`deepseek-harness/AGENTS.md:88-93@687f282e`、`deepseek-harness/scripts/run-gates.ts:747-754@687f282e`。
2. **record**：`DSH_SNAPSHOT=record pnpm run test:snapshot:record`（`--update`），需要真实 provider；只用于新增/模型转录变化。`deepseek-harness/package.json:69-72@687f282e`。
3. **refresh**：`DSH_SNAPSHOT=refresh pnpm run test:snapshot:refresh`，在 replay 输入仍有效时刷新期望输出；不要用它掩盖行为变化。`deepseek-harness/package.json:71@687f282e`。
4. **并发语义**：replay 用 `describe.concurrent`；record/refresh 串行，避免共享 provider/端口/输出竞争。`deepseek-harness/packages/test-support/session-snapshot/src/suite.ts:1226-1234@687f282e`。
5. **record 不依赖旧输出**：record 的 `fixtureFiles` 为空，写入版本化输出；refresh 读取旧 fixture 以保留 volatile 值（identity/catalog time 等）。`deepseek-harness/packages/test-support/session-snapshot/src/suite.ts:1360-1405@687f282e`。
6. **只读保留**：authored-only 场景在 record 时跳过（没有 live run 可录）；retained sessionFormat 不被 refresh 改写。`deepseek-harness/packages/test-support/session-snapshot/src/suite.ts:1300-1360@687f282e`。
7. **record/refresh 写**：session logs、stdout、sidecars；replay 比较所有输出。`snapshot.yml` 的 `workspace.final` 决定是否比较 `workspace.expected/`；record/refresh **不**重写 workspace oracle。`deepseek-harness/docs/testing.md:53-55@687f282e`。
8. **每个 fork 的退出必须断言**：子进程被信号/超时结束时，报告“超时/被杀”，不要伪装成 status mismatch。`deepseek-harness/.agents/skills/dsh-ci-test-reliability/SKILL.md:105-108@687f282e`。
9. **审查每个 diff**：record/refresh 的输出是人工审查对象，不是自动批准。`deepseek-harness/docs/testing.md:53-55@687f282e`。

**角色与完成信号.** 作者选择模式并审查 diff；评审者检查是否有“refresh 批准回归”；完成信号是 replay keyless 通过，record/refresh 的 diff 有解释。

**失败处理.** replay 失败：先判断行为变化还是 fixture 过期；行为变化修代码，fixture 过期才 refresh。record 失败：看 provider/凭据/场景；不要改成 skip。workspace 差异：先判断产品副作用，再决定是否声明 `workspace.final`。

**例外.** 真实 provider 不可用不能伪造 record；可以只提交 replay fixture（来自已有录制）并在 PR 说明。retained 历史格式不因 refresh 重写。

**证据限制.** record 捕获的是当时 provider 输出；refresh 只证明新输出与旧输入一致，不证明产品正确。replay 不证明真实 wire（[M26](testing-replay-and-oracles.md#m26-replay)）。

10. **按适配器与 composition 分支核对 replay/live 补丁**：headless 按“基础 `cordis.yml` → 选中 composition 的 live `cordis.yml` 或 replay `cordis.snapshot.yml` → 基础 `model.cordis.yml` → 可选场景 `runtime.cordis.yml`”组合；选中基础 composition 且为 live 时不重复追加它。SDK 必须先分支：`composition` 以 `sdk-` 开头时，保留该 owner 的 `cordis.yml`，replay **再追加**同 owner 的 `cordis.snapshot.yml`，不追加默认 `model.cordis.yml`；其他 transport-neutral composition 才使用默认基础、选中 live/replay overlay、默认 model 的顺序，默认 owner 的 live 不重复追加。不能将通用 launcher 的“replay 替换选中 patch”套到 SDK 专用分支：launcher 的 `profileArgs()` 使用 `[base, replayPatchPath(selected)]`，app-boot 的 `resolveConfigPath()` 则只在 replay 改写请求 config 的 basename；两者各有自己的调用范围。`deepseek-harness/snapshots/session/headless.snapshot.ts:1252-1262@687f282e`、`deepseek-harness/snapshots/sdk/sdk.snapshot.ts:551-562@687f282e`、`deepseek-harness/packages/test-support/session-snapshot/src/launcher.ts:343-369@687f282e`、`deepseek-harness/packages/boot/app-boot/src/index.ts:95-112@687f282e`。
11. **overlay 语义审阅仍未闭合**：overlay 文件仍没有逐文件语义审阅记录；本参考只保留这一未闭合事实，具体批次读取清单属于研究取证，不作为操作参考的机制属性。组合顺序有代码引用，不等于全部配置语义或与 manifest composition 名称的一致性已验；简单行扫描也不能代替 YAML 或语义审查。

**补充源码引用（尾部区间复读分派实际读取）**：`deepseek-harness/apps/web/tests/scaffold.ts:132-140@687f282e`、`deepseek-harness/snapshots/sdk/sdk.snapshot.ts:1097-1145@687f282e`、`deepseek-harness/snapshots/session/headless.snapshot.ts:1135-1192@687f282e`

<a id="m21-normalization"></a>

## 21. M21 归一化：只抹环境噪声

**机制 ID.** `testing-snapshot-normalization`。

**问题.** 不归一化会让 cwd、session id、时间戳、spill 路径在不同机器上产生 diff；归一化过头会把真实行为差异一起抹掉。

**触发.** 新增/修改 fixture；跨平台 replay 失败；spill/temp 路径变化；身份 token 调整。

**前提.** 已列出“环境拥有”的字段和“行为拥有”的字段。

**步骤.**
1. **cwd**：替换所有已知拼写（含 macOS `/private` 前缀），最长优先，边界匹配，避免误伤共享前缀；只对 cwd-rooted path 做分隔符规范化，不全局重写反斜杠（会破坏正则/命令/模型文本）。`deepseek-harness/packages/test-support/session-snapshot/src/normalize.ts:100-190@687f282e`。
2. **spill 路径**：`{{spillLocator:<name>}}` 只替换 harness 拥有的本地/snapshot spill 路径；不要把任意临时路径都 token 化。`deepseek-harness/packages/test-support/session-snapshot/src/normalize.ts:180-205@687f282e`。
3. **event-read 时间**：只对 exact event-read 结果的 fenced target 区域替换 `{{eventTime}}`/`{{eventOmittedBytes}}`，邻居/模型/bash 文本保持可见。`deepseek-harness/packages/test-support/session-snapshot/src/normalize.ts:195-215@687f282e`。
4. **identity**：session/child id、UUID、`messageId` 按 `identityMode` 处理；`preserve` 保留已 redact 的 typed id 和任意 UUID-like prose，`legacy` 做全局替换。`deepseek-harness/packages/test-support/session-snapshot/src/normalize.ts:25-45@687f282e`、`:205-220@687f282e`。
5. **两边同 context**：actual 和 expected 都用 `fixtureContext`/同一 `NormalizeContext` 归一化；不要只归一化 actual。`deepseek-harness/apps/cli/tests/profiles/headless/tests/headless.expected.e2e.ts:60-75@687f282e`。
6. **保留行为**：模型文本、工具参数、错误、未触碰文件内容保持原样；不要为了让 diff 变短而扩大 token。`deepseek-harness/packages/test-support/session-snapshot/README.md:30-70@687f282e`。
7. **canonical/fixed point**：fixture 重写要幂等，payload 等价；历史版本不重写。`deepseek-harness/scripts/session-fixture-layout.ts:230-270@687f282e`。
8. **native writer output**：捕获平台原生 writer 输出时用 `nativeWriterOutput: true`，不要套用 source-vs-migrated 的默认比较。`deepseek-harness/packages/test-support/session-snapshot/src/normalize.ts:15-25@687f282e`。

**角色与完成信号.** 作者维护 token 列表；评审者检查“这个 diff 被抹掉的是环境还是行为”；完成信号是跨平台 replay 稳定，真实行为差异仍可见。

**失败处理.** 新环境噪声：加最小 token，并写测试。差异是行为：修代码/审查，不要加 token。token 误伤：收窄边界/路径根。

**例外.** 平台专属 golden 可以保留 native 分隔符（`cwdPathMode: 'native'`）；但要在说明中写清楚。`deepseek-harness/packages/test-support/session-snapshot/src/normalize.ts:1-15@687f282e`。

**证据限制.** 归一化测试能证明 token 的局部行为；不能证明所有环境噪声都被覆盖。采用项目需要跨平台 fixture 证据。

**补充源码引用（尾部区间复读分派实际读取）**：`deepseek-harness/apps/web/tests/scaffold.ts:1010-1198@687f282e`、`deepseek-harness/packages/test-support/session-snapshot/src/normalize.ts:301-665@687f282e`

<a id="m22-identity"></a>

## 22. M22 身份、凭据与 typed token

**机制 ID.** `testing-snapshot-identity-and-credentials`。

**问题.** 录制 transcript 会包含 session/child id、工具名、schema、凭据引用；直接提交会泄露秘密或让父子关系失真。

**触发.** 新增 fixture；修改工具/schema/身份；auth recovery 场景；凭据相关测试。

**前提.** 已列出需要保留的身份关系（parent/child、tool owner、schema owner）。

**步骤.**
1. **typed token 只用于稳定身份**：session/child id、工具名、tool schema、认证恢复标记等；token 必须能还原父子关系，不能把两个不同 child 合并。`deepseek-harness/packages/test-support/session-snapshot/README.md:30-70@687f282e`。
2. **只有 header pin 拥有 prompt/schema sidecar**：其他场景引用 owner，不要复制；sidecar 内容用 canonical 格式，且唯一。`deepseek-harness/packages/test-support/session-snapshot/src/suite.ts:1678-1710@687f282e`。
3. **凭据不落盘**：fixture 中不出现真实 key/token/密码；mock key 只用于本地 mock server。`deepseek-harness/AGENTS.md:123-127@687f282e`、`deepseek-harness/packages/test-support/llm-mock-server/README.md:40-50@687f282e`。
4. **auth recovery**：恢复场景要断言认证恢复后的 header/请求形状，而不是只断言“重试了”。工具 schema 用 token 引用，避免把整个 schema 复制进 JSONL。`deepseek-harness/packages/test-support/session-snapshot/README.md:50-70@687f282e`。
5. **提交前扫描**：检查 expected/fixture 中的 `sk-`、`Authorization`、`apiKey`、环境变量值；不确定时按秘密处理并轮换。

**角色与完成信号.** 作者维护 token/owner；评审者检查秘密和父子关系；完成信号是 fixture 不含真实凭据，identity 关系可还原，sidecar 唯一。

**失败处理.** 发现秘密：轮换、删除/重写历史、修 token 化；不要只删当前文件。父子关系错：修 token/owner，不要复制 fixture。

**例外.** 测试专用的假 key（如 `mock-key`）可以存在；必须明显不是生产凭据，且只指向本地 mock。

**证据限制.** token 化能降低泄露面，但不能证明历史提交/日志没有秘密；需要独立 secret 扫描。

**补充源码引用（尾部区间复读分派实际读取）**：`deepseek-harness/packages/test-support/session-snapshot/src/suite.ts:611-786@687f282e`、`deepseek-harness/apps/web/tests/scaffold.ts:1280-1373@687f282e`

<a id="m23-header-pins"></a>

## 23. M23 Header pins：系统提示与工具 schema 的单一所有者

**机制 ID.** `testing-snapshot-header-pins`。

**问题.** 每个场景都存一份 system prompt/tool schema 会漂移；没有 pin 又会丢掉某类请求的结构表面；多个 pin 会拆分同一表面。

**触发.** 修改系统提示、工具 schema、header class、请求组装；新增 profile。

**前提.** 已枚举 header class（默认/子代理/profile 变体）；知道每个 class 的 owner 场景。

**步骤.**
1. 每个 header class **恰好一个** `pinsHeader: true` 场景；零个失败，两个失败。`deepseek-harness/packages/test-support/session-snapshot/src/suite.ts:1660-1676@687f282e`。
2. pin 场景声明 `systemPromptSource`、`toolSchemasSource`、`expectedHeaderChanges`、`expectedPromptChanges`；这些字段只允许出现在 pin 场景，非 pin 出现即失败。`deepseek-harness/packages/test-support/session-snapshot/src/suite.ts:1240-1255@687f282e`。
3. pin sidecar 存**完整但 token 化**的 prompt/schema：初始 + 每次变化；schema 用 canonical JSON；prompt 非空且以 newline 结尾；不同 class 的 sidecar 内容唯一。`deepseek-harness/packages/test-support/session-snapshot/src/suite.ts:1678-1710@687f282e`。
4. pin fixture 的 header 数 = `1 + expectedHeaderChanges`；prompt 数 = `1 + expectedPromptChanges`；schema 序列长度与 header 数一致；每个 header 的 tools 用 sidecar token。`deepseek-harness/packages/test-support/session-snapshot/src/suite.ts:1678-1710@687f282e`。
5. 子代理场景可以额外 pin child schema/prompt；索引必须指向真实 child，且 prompt 与 class pin 的初始 prompt 一致。`deepseek-harness/packages/test-support/session-snapshot/src/suite.ts:1712-1735@687f282e`。
6. 修改 header 时同时更新 pin sidecar、`expected*Changes` 和 fixture；不要只改 fixture 让 replay 绿。

**角色与完成信号.** 作者维护 class→pin 映射；评审者检查“这个新 header 变体有没有 owner”；完成信号是 pin 守卫全绿，header 变化有可见 diff。

**失败处理.** 零 pin：加一个 owner。两个 pin：合并/删除。sidecar 漂移：改 owner 或引用，不要复制。计数不匹配：修 fixture/声明。

**例外.** header class 可以继承；pinning 场景可以是某个 class 的唯一场景，此时没有非 pin 的 live run 来发现未声明变化，所以必须直接断言 committed pin。`deepseek-harness/packages/test-support/session-snapshot/src/suite.ts:1684-1692@687f282e`。

**证据限制.** pin 证明组装后的 header 形状，不证明 provider 接受；真实 provider 仍由 [M10](testing-real-api-and-secrets.md#m10-e2e-key) 覆盖。

**补充源码引用（尾部区间复读分派实际读取）**：`deepseek-harness/packages/test-support/session-snapshot/src/suite.ts:1411-1584@687f282e`、`deepseek-harness/snapshots/sdk/sdk.snapshot.ts:442-443@687f282e`、`deepseek-harness/snapshots/session/headless.snapshot.ts:279-325@687f282e`

---

## 附：本页机制的来源坐标索引

本页机制的来源坐标如下（固定提交 `687f282e`）。坐标只用于追溯，不新增正文断言；正文解释仍以本页对应小节为准。

- `testing-snapshot-required-and-placement`：`deepseek-harness/snapshots/AGENTS.md:1-17@687f282e`
- `testing-snapshot-manifest-and-guards`：`deepseek-harness/packages/test-support/session-snapshot/src/manifest.ts:1-432@687f282e`、`deepseek-harness/scripts/session-fixture-layout.ts:1-60@687f282e`、`deepseek-harness/packages/test-support/session-snapshot/tests/manifest.spec.ts:1-207@687f282e`
- `testing-snapshot-selection-and-generations`：`deepseek-harness/scripts/session-fixture-layout.ts:130-270@687f282e`
- `testing-snapshot-corpus-policy`：`deepseek-harness/scripts/session-snapshot-corpus.corpus.ts:1-216@687f282e`、`deepseek-harness/scripts/session-snapshot-corpus-policy.spec.ts:1-146@687f282e`
- `testing-snapshot-modes`：`deepseek-harness/docs/testing.md:53-55@687f282e`、`deepseek-harness/package.json:69-76@687f282e`、`deepseek-harness/packages/test-support/session-snapshot/src/suite.ts:1226-1234@687f282e`、`deepseek-harness/packages/test-support/session-snapshot/src/suite.ts:1300-1405@687f282e`、`deepseek-harness/scripts/run-gates.ts:747-754@687f282e`、`deepseek-harness/apps/web/tests/scaffold.ts:132-140@687f282e`、`deepseek-harness/snapshots/sdk/sdk.snapshot.ts:1097-1145@687f282e`、`deepseek-harness/snapshots/session/headless.snapshot.ts:1135-1192@687f282e`、`deepseek-harness/snapshots/session/headless.snapshot.ts:1252-1262@687f282e`、`deepseek-harness/snapshots/sdk/sdk.snapshot.ts:551-562@687f282e`、`deepseek-harness/packages/test-support/session-snapshot/src/launcher.ts:343-369@687f282e`、`deepseek-harness/packages/boot/app-boot/src/index.ts:95-112@687f282e`
- `testing-snapshot-normalization`：`deepseek-harness/packages/test-support/session-snapshot/src/normalize.ts:1-45@687f282e`、`deepseek-harness/packages/test-support/session-snapshot/src/normalize.ts:100-220@687f282e`
- `testing-snapshot-identity-and-credentials`：`deepseek-harness/packages/test-support/session-snapshot/src/identity.ts:1-135@687f282e`
- `testing-snapshot-header-pins`：`deepseek-harness/packages/test-support/session-snapshot/src/suite.ts:1226-1255@687f282e`
