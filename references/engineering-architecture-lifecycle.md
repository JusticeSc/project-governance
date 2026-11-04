# 架构与生命周期：扩展地图、能力缝、注册与拆卸

本页拥有“行为放在哪里、由谁拥有、如何卸载”的规则：§3 架构地图与扩展点、§4 能力缝三角色、§5 注册即效果与可逆生命周期、§6 显式状态与正交结果、§7 共享状态所有权与静默拆卸。触发：新增跨包行为或修改 `packages/`、agent loop、工具/适配器/命令/UI/持久状态；设计可替换能力或决定是否拆包；注册工具/prompt section/provider/adapter/listener/slot/命令，或实现 unload/HMR/teardown；设计异步结果、可选参数和公共 API 返回值；引入共享缓存/单例/全局 current，或实现取消、关闭与顺序清理。读本页前先读 [§0 使用约定与证据边界](engineering.md#0-使用约定与证据边界)，本页各节沿用其中的标记、证据状态与迁移裁剪边界。

<a id="engineering-architecture-extension-map"></a>
## 3. 架构地图、扩展点与“插件优先”（engineering-architecture-extension-map）

**触发**：新增跨包行为、修改 `packages/`、修改 agent loop、增加工具/适配器/命令/UI/持久状态、评审架构改动。

**角色与前置**：改动者必须先读架构文档；架构 owner 维护扩展点地图；评审者检查是否把行为放进了中心层。

**【源仓义务】**
- 改 `packages/` 前读 `docs/architecture.md`；架构文档是所有插件、profile/bundle、核心包、事件域、turn flow、能力缝和扩展点地图。`deepseek-harness/AGENTS.md:3-3@687f282e`、`deepseek-harness/docs/architecture.md:1-5@687f282e`
- 新行为附着到已文档化的扩展点；“插件，而不是改 loop”；改 `agent-loop` 必须同步更新 `docs/architecture.md` 的地图。`deepseek-harness/AGENTS.md:138-138@687f282e`、`deepseek-harness/docs/architecture.md:138-140@687f282e`
- 先选事件域：会话事件是持久事实（必须能从日志重建）；agent 事件携带活 Agent（观察或拦截飞行中的工作）；能力事件把策略/适配器接到 seam 上而不 import loop。`deepseek-harness/docs/architecture.md:67-77@687f282e`
- “Where new behavior goes”表逐项目标给机制：模型 provider→`ctx.llm`；模型可见能力→`ctx.tools`；单会话能力集→preset（服务行需 `isolate` realm）；shell/terminal/command/jobs/webhook/fs/sandbox/UI/session state 等各有指定注册面。`deepseek-harness/docs/architecture.md:138-165@687f282e`
- 业务能力拥有自己：中心 runtime/controller/manager/gateway 只承担通用编排和生命周期，业务条目由拥有它的包注册；中心层不得硬编码业务行。`deepseek-harness/docs/defensive-patterns/general.md:124-148@687f282e`、`deepseek-harness/packages/AGENTS.md:14-14@687f282e`
- API 层（controller/gateway/remotes）只做传输、调用形状、Session 生命周期等通用编排；业务分支必须在拥有包内决策，以投影数据或注册条目进入该层。`deepseek-harness/docs/defensive-patterns/remote-and-api.md:83-115@687f282e`

**步骤**
1. 在架构地图中定位目标能力与现有扩展点；没有合适扩展点时先设计 seam，而不是在中心层加分支。
2. 选择事件域；持久事实进 session log，飞行中拦截进 agent/capability 事件。
3. 在拥有包内实现并注册；中心层只转发和管生命周期。
4. 若确实要改 loop，同一改动更新架构地图并说明为何扩展点不足。

**完成信号**：新行为能在“Where new behavior goes”找到对应行；中心层 diff 不含业务常量/分支；架构文档与实现一致。

**失败处理**：若只能在中心层加分支，先补架构决策（Agent Note）并让 domain owner 确认；不要把“先放进去再说”当作完成。

**例外**：纯基础设施（日志、传输、存储）不通过业务注册面，属于合理的中心层内容。`deepseek-harness/docs/defensive-patterns/general.md:124-148@687f282e`

**迁移裁剪**：若目标不是 Cordis，保留“扩展点目录 + 业务拥有自己 + 中心层只编排”的判定；把具体 `ctx.*` 映射为目标框架的注册 API。没有扩展点目录的项目必须先建立一页地图/注册表，否则该机制不可审计；建立地图是前置条件，不是可选项。目标框架一旦新增扩展机制，重新审计地图与归属。

**证据与限制**：源仓主要靠评审和架构文档约束；没有自动“业务分支在中心层”检查器。真实组合测试是补充证据（见 Testing 域）。

来源：deepseek-harness/AGENTS.md:3-3@687f282e 来源：deepseek-harness/AGENTS.md:138-138@687f282e 来源：deepseek-harness/docs/architecture.md:1-5@687f282e 来源：deepseek-harness/docs/architecture.md:67-77@687f282e 来源：deepseek-harness/docs/architecture.md:106-106@687f282e 来源：deepseek-harness/docs/architecture.md:118-128@687f282e 来源：deepseek-harness/docs/architecture.md:130-134@687f282e 来源：deepseek-harness/docs/architecture.md:138-165@687f282e 来源：deepseek-harness/docs/defensive-patterns/general.md:124-148@687f282e 来源：deepseek-harness/packages/AGENTS.md:14-14@687f282e 来源：deepseek-harness/docs/defensive-patterns/remote-and-api.md:83-115@687f282e 来源：deepseek-harness/packages/README.md:94-101@687f282e

<a id="engineering-capability-seam"></a>
## 4. 能力缝三角色（engineering-capability-seam）

**触发**：设计可替换能力（shell、LLM、fs、sandbox、subagent、compaction 等），或决定是否拆包。

**角色与前置**：Service Definition owner 定义词汇与 `ctx.<key>`；Provider owner 实现；Consumer owner 使用；domain owner 裁决边界。

**【源仓义务】**
- seam 是完整三角色：**Service Definition**（拥有 `ctx.<key>` 与词汇类型的 Cordis `Service`，可以是 abstract class 或具体 registry，绝不是 TypeScript `interface`）、一个或多个 **Service Provider**、一个或多个 **Consumer**。`deepseek-harness/docs/glossary.md:7-9@687f282e`、`deepseek-harness/docs/architecture.md:130-134@687f282e`
- 角色通常分开包当它们独立演化；若三个角色确实是同一关注点，可以合并在一个包（LLM seam 就是定义+Consumer 合一、adapters 为 providers）。不要预防性拆分；只有一个可设想 provider 和一个 Consumer 时保持单包。`deepseek-harness/.agents/notes/implemented/architecture/2026-06-13-capability-seams.md:13-30@687f282e`
- Service Definition 为所有当前 Consumer 设计：tool schema、Loader、UI、transport、provider 特有行为留在 Consumer/provider，不能让一个 Consumer 决定服务契约。`deepseek-harness/packages/AGENTS.md:10-10@687f282e`
- 扩展插件依赖 Service Definition，不依赖具体 Provider；组合 bundle 可以依赖 spine plugins。`deepseek-harness/packages/README.md:94-101@687f282e`
- 公共 service 方法只有一个内部调用者是反向气味：改为私有 capability closure，而不是公开方法。`deepseek-harness/packages/AGENTS.md:10-10@687f282e`

**步骤**
1. 写出三角色表：Definition 的 `ctx.<key>`/类型/错误；Provider 的机制；Consumer 的模型/用户可见契约。
2. 判断角色演化速率；独立演化才拆包，否则保留单包。
3. Definition 只暴露契约需要的词汇；Provider 与 Consumer 不互相 import 具体实现。
4. 为每个角色规划真实组合测试和 disposed/HMR 测试。

**完成信号**：存在明确的 Definition 类/registry、至少一个 Provider、至少一个 Consumer；替换 Provider 不需要改 Consumer 的模型可见契约；包依赖图只指向 Definition。

**失败处理**：若一个包同时是定义、provider、consumer 且没有独立演化理由，保留合并并写清理由；若 Provider 泄漏类型到 Consumer，回到 Definition 补词汇，而不是让 Consumer import Provider。

**例外**：`dsh-user-approval` 这类一个包拥有定义与具体实现的 seam 是允许的，因为角色是同一关注点。`deepseek-harness/docs/glossary.md:7-9@687f282e`

**迁移裁剪**：目标框架没有 `Service` 类时，用“接口/抽象类 + 注册表 + 消费者注入”映射，但必须保留“定义不是纯类型别名”的意图（有运行时注册身份）。若目标仓库确实没有多 provider 需求，可以只记录 seam 设计规则而不强行拆包；这是范围裁剪，不是降低定义标准。一旦出现第二个 provider/consumer，重新拆包并验证替换路径。

**证据与限制**：架构评审是主要保证；真实组合测试可证明替换路径。仅存在一个 interface 不构成 seam。

来源：deepseek-harness/docs/glossary.md:7-9@687f282e 来源：deepseek-harness/docs/architecture.md:130-134@687f282e 来源：deepseek-harness/.agents/notes/implemented/architecture/2026-06-13-capability-seams.md:13-30@687f282e 来源：deepseek-harness/packages/AGENTS.md:10-10@687f282e 来源：deepseek-harness/packages/README.md:94-101@687f282e

<a id="engineering-registrations-effects"></a>
## 5. 注册即效果与可逆生命周期（engineering-registrations-effects）

**触发**：注册工具、prompt section、provider、adapter、listener、slot、命令、任何贡献；实现 unload/HMR/teardown。

**角色与前置**：插件作者拥有每个注册的 disposer；评审者追踪从 `apply` 到释放的完整链路。

**【源仓义务】**
- 每个贡献都通过 `ctx.effect()` / `ctx.on()`；registry 的 `register()` 返回 disposer，并附着到调用插件，卸载时自动回卷。`deepseek-harness/AGENTS.md:133-133@687f282e`
- Cordis 管理的注册本身就是效果：`ctx.on`、`ctx.plugin`、service 注册、harness registry 都自动回卷；Cordis 不管理的资源（timer、connection、watcher）必须包在 `ctx.effect()` 里并返回 disposer。`deepseek-harness/docs/cordis-tutorial/02-lifecycle-and-effects.md:1-40@687f282e`
- 每个注册都应有 disposer；若 teardown 顺序重要，把相关工作放进同一个 effect，使释放按预期顺序展开。`deepseek-harness/docs/cordis-primer.md:41-45@687f282e`
- 每个 registry 需要 HMR 安全测试：dispose 贡献 fiber 并观察移除。`deepseek-harness/packages/AGENTS.md:19-19@687f282e`、`deepseek-harness/docs/testing.md:7-12@687f282e`
- 不要在模块级制造单例/缓存来承载注册；共享状态挂在 service 或 instance 上（见 [§7 共享状态所有权、单一生命周期控制与静默拆卸](#engineering-ownership-teardown)）。

**步骤**
1. 列出 `apply` 中每个注册与资源获取点。
2. 用 `ctx.effect`/`ctx.on`/registry disposer 覆盖；同步 disposer 返回值。
3. 对顺序敏感的 teardown，把多个 effect 组合进一个 generator effect，并 yield 精确的 disposer。
4. 写 HMR/卸载测试：dispose 后注册消失、资源关闭、后续调用不落到死对象。

**完成信号**：插件卸载后无 listener/timer/process/file 残留；HMR 测试从红到绿能证明移除；没有模块级 handle。

**失败处理**：若卸载后仍有活动，按 `cordis-styling-nitpicking` 的 P0 规则定位“未回卷副作用”；不要用 `process.exit` 或测试清理掩盖。

**例外**：有意保留的 durable writes/remote mutations 不回滚；但其临时资源与活动监听仍需 owner。`deepseek-harness/.agents/skills/cordis-styling-nitpicking/SKILL.md:31-35@687f282e`

**迁移裁剪**：非 Cordis 框架用“注册返回 dispose/AbortSignal/Closeable”实现同等效果；关键是每个贡献有可审计的释放路径，而不是照搬 API 名。

**证据与限制**：HMR 测试是自动证据；没有测试的插件只能算评审保证。dispose 调用次数不等于 quiescence。

来源：deepseek-harness/AGENTS.md:133-133@687f282e 来源：deepseek-harness/docs/cordis-tutorial/02-lifecycle-and-effects.md:1-40@687f282e 来源：deepseek-harness/docs/cordis-primer.md:41-45@687f282e 来源：deepseek-harness/packages/boot/hmr/README.md:12-27@687f282e 来源：deepseek-harness/packages/boot/hmr/README.md:39-49@687f282e 来源：deepseek-harness/packages/boot/hmr/README.md:59-83@687f282e 来源：deepseek-harness/packages/boot/hmr/README.md:104-123@687f282e 来源：deepseek-harness/packages/AGENTS.md:19-19@687f282e 来源：deepseek-harness/docs/testing.md:7-12@687f282e 来源：deepseek-harness/.agents/skills/cordis-styling-nitpicking/SKILL.md:31-35@687f282e

**补充来源坐标：**
- `engineering-registrations-effects`：`deepseek-harness/packages/boot/hmr/README.md:12-27@687f282e`、`deepseek-harness/packages/boot/hmr/README.md:59-83@687f282e`

<a id="engineering-explicit-state-contracts"></a>
## 6. 显式状态、正交结果与公共契约（engineering-explicit-state-contracts）

**触发**：设计异步结果、可选参数、状态表示、错误/超时/退出组合、公共 API 返回值、发布/提交流程。

**角色与前置**：API owner 在类型定义处写清契约；评审者判断调用者能否仅凭公共 API 命名失败来源和状态；实现者不得用时间/回调顺序补偿设计。

**【源仓义务】**
- **正交结果独立报告**：一个结果可以同时是“超时”和“退出码 0”（信号被捕获）；`timedOut`、`signal`、`exitCode` 各自独立暴露，不能把一个事实嵌进另一个分支。评审看报告形状，而不是杀进程机制。`deepseek-harness/docs/defensive-patterns/general.md:7-12@687f282e`
- **公共契约两侧都兑现**：多种内部表示（throw 或 `finish {kind:'error'|'aborted'}`）在公共 API 边界归一化；文档在类型定义处写明归一化契约；内部 helper 仍可 throw。`deepseek-harness/docs/defensive-patterns/general.md:13-18@687f282e`
- **异步状态不是同步状态**：`agent.followup()` 没有逐消息完成；后台任务完成会与 turn 边界竞争；`reader.close()` 同时表示 EOF 和 dispose。不要把 `agent/status`/`whenIdle()` 当作单次 follow-up 的结果。调用者若拥有一个运行区间，必须显式定义区间（例如从持久 inbox receipt 到下一次 whole-agent `idle`），并把输出描述为区间级而非因果归属。`deepseek-harness/docs/defensive-patterns/general.md:19-24@687f282e`
- **时间不承载正确性**：正确性来自显式调用点和显式状态，不来自 callback 落在事件循环的哪个位置；`microtask`/`setTimeout`/`queueMicrotask` 决定正确性会在负载下静默失败。React effect 也不能提供“渲染后刚刚好”的顺序。`deepseek-harness/docs/defensive-patterns/general.md:25-47@687f282e`
- **可选输入同时说明两种行为**：接口契约要写“存在时返回什么、缺失时返回什么、各自副作用”；累积的 `?.` 是信号——它替代了“字段是否应存在”的决定。`deepseek-harness/docs/defensive-patterns/general.md:48-70@687f282e`
- **一个值只表达一个事实**：未知、空集合/空串、真正缺失是三种事实，用三种表示（判别联合/显式枚举），不要用一个 `undefined`/`null` 全包。`deepseek-harness/docs/defensive-patterns/general.md:71-86@687f282e`
- **在提交点发布状态**：通知和派生状态只在操作成功后发出/更新；cache、prompt、UI echo、replay、query 都从一个权威源派生。`deepseek-harness/packages/AGENTS.md:17-17@687f282e`

**步骤**
1. 为公共结果画“独立事实表”（成功/失败/取消/超时/信号/未知）。
2. 在边界归一化内部表示；类型与 JSDoc 写清两侧行为。
3. 若调用者需要区间语义，显式命名区间；不要把它塞进共享 `running` 标志。
4. 用状态机/显式调用点替代 timing 技巧；在提交点之后才发布。
5. 为每个“可选/未知/空”写测试，证明调用者能区分。

**完成信号**：调用者仅凭公共 API 能说出失败来源和状态；没有嵌套条件才可读的事实；没有依赖微任务顺序的正确性；判别联合覆盖三种“无值”。

**失败处理**：若无法在边界归一化，缩小公共 API 或拆出独立结果类型；不要加 fallback 把未知吞成空。

**例外**：测试超时预算用于等待失败，不是 timing 正确性；纯为节奏的用户可见延迟不属于该规则。`deepseek-harness/docs/defensive-patterns/general.md:25-47@687f282e`

**迁移裁剪**：把“正交结果/显式状态”映射到目标语言的结果类型或错误分类；保留判定句“调用者能否独立命名每个事实”。没有异步 API 的项目可以先应用可选参数与一值一事实部分；一旦引入异步取消/超时/信号，必须补齐相应的独立结果与 quiescence 证据，不能把“当前无异步”当成永久豁免。

**证据与限制**：主要是评审保证；可用契约测试补充。公共契约测试通过不证明所有调用者都正确使用。

来源：deepseek-harness/docs/defensive-patterns/general.md:7-12@687f282e 来源：deepseek-harness/docs/defensive-patterns/general.md:13-18@687f282e 来源：deepseek-harness/docs/defensive-patterns/general.md:19-24@687f282e 来源：deepseek-harness/docs/defensive-patterns/general.md:25-47@687f282e 来源：deepseek-harness/docs/defensive-patterns/general.md:48-70@687f282e 来源：deepseek-harness/docs/defensive-patterns/general.md:71-86@687f282e 来源：deepseek-harness/packages/AGENTS.md:17-17@687f282e

<a id="engineering-ownership-teardown"></a>
## 7. 共享状态所有权、单一生命周期控制与静默拆卸（engineering-ownership-teardown）

**触发**：引入共享缓存、单例、全局 current/active 选择、模块级 handle；实现取消/关闭/进程退出；多个异步阶段共享 readiness/disposal 状态；provider 与 consumer 的清理顺序。

**角色与前置**：状态 owner 必须是命名 service/instance；生命周期 owner 明确谁等待谁；评审者按 P0 规则追踪 disposer 身份。

**【源仓义务】**
- **共享状态有 owner**：挂在 service 或 instance 上，owner 是有生命周期命名的对象；模块级 cache、singleton、global `WeakMap`、`Symbol.for`/`globalThis`/`window.__X__` 都是隐藏 owner，且活得比 teardown 久。`deepseek-harness/docs/defensive-patterns/general.md:104-123@687f282e`、`deepseek-harness/packages/AGENTS.md:13-13@687f282e`
- **拒绝新的 active/current 单例**：全局唯一选中状态是代码库不做的设计陈述；同一数据的多个视图各自持有引用或 key。确实每 service 唯一的概念用 service/instance 字段 + `inject`，不用模块级字段。`deepseek-harness/docs/defensive-patterns/general.md:87-103@687f282e`
- **一个异步操作一个生命周期控制器/事务**：readiness、cancellation、disposal、reservation、sentinel 若需要独立 owner/结算点就拆；否则折叠，同时保留 rollback、callback containment、quiescence。`deepseek-harness/packages/AGENTS.md:9-9@687f282e`
- **Dispose 必须达到 quiescence，而不只是请求**：kill/abort 后 await 子进程退出；可选通知可以早停，但完成/最终持久化所需的资源和 listener 必须活到消费者结算。`deepseek-harness/docs/defensive-patterns/general.md:192-197@687f282e`
- **回调异常在 dispatcher 内隔离**：捕获并报告每个 listener 的异常，不让 dispatch promise reject 或饿死后续 listener；listener 的 owner 仍要按错误处理规则处理它改动的状态。`deepseek-harness/docs/defensive-patterns/general.md:198-211@687f282e`
- **清理依赖必须活到消费者完成**：当前 Cordis fiber unload 并发启动 sibling disposers；service withdrawal 在自己的 disposer 里 await 依赖 fiber，但 sibling 资源可能已经开始关闭。需要显式所有权和 awaited 顺序：停止新 admission → 结算已接收消费者 → drain/release 资源。`deepseek-harness/.agents/skills/cordis-styling-nitpicking/SKILL.md:37-60@687f282e`
- **Provider 发布的推荐顺序**：function plugin + 一个 `ctx.effect(function*(){...})`；先获取资源与完成 listener 并 yield 精确 disposer，最后 `yield ctx.provide(name, service)`；若需 admission gate，最后 yield 其清理，使 disposal 先停止新 admission。`deepseek-harness/.agents/skills/cordis-styling-nitpicking/SKILL.md:45-60@687f282e`
- **生命周期 disposer 是能力，不是观察者权利**：`ctx.agents.create`/`resume` 返回 `AgentHandle = { agent, dispose(): Promise<void> }`；持有裸 `Agent` 的注册表观察者不能拆卸它。调用方 fiber 与注册的 factory provider 是结构共有人：调用方卸载执行结构化所有权，provider 卸载必须停掉所有依赖其 scoped 表面的旧实例；所有路径到同一个 memoized teardown（停 loop → await 退出与 idle flush → detach agent → detach session → unwind scope）。public id 在其精确注册表项 detach 后可复用。`deepseek-harness/.agents/notes/archived/architecture/2026-06-18-agent-lifecycle-and-ownership-contracts.md:10-24@687f282e`
- **Teardown 顺序是耐久性的一部分**：把 session 生命周期折叠进 agent 的单个 composite Cordis effect；fiber 卸载会并发 dispose sibling effects（`Promise.all`），若拆成 sibling 会把“移除 session store 的 append publication hooks”和 loop 的 closing `session/flush` 竞态，丢掉 closing `turn/end`。单 effect 内的 disposer 走有序 LIFO：先停 loop 并 `await agent.done`，再 detach session，因此 handle `dispose()` 与 fiber 卸载都能捕获最后一次 flush。`deepseek-harness/.agents/notes/archived/architecture/2026-06-18-agent-lifecycle-and-ownership-contracts.md:24-24@687f282e`
- **后台任务的 owner token 放在能力边界**：`ShellExecRequest.owner?: string` 在解析后的 `ShellExecSpec` 中变成 required-but-nullable `owner: string | undefined`（忘记传是可见的 `undefined`，不是静默缺字段）；executor 用 `ownerOf(id)` 暴露 owner，access policy（token 比较）留在 Consumer `tool-bash`，capability 只保留不透明 token。session/agent id 在 live agent 中唯一，`SessionStore.enter()` 拒绝重复 live id；HMR reload 不会让旧后台任务被别的 session 读取或杀死。`deepseek-harness/.agents/notes/archived/architecture/2026-06-18-agent-lifecycle-and-ownership-contracts.md:28-41@687f282e`
- **归档说明不是当前权威**：上述 Note 已于 2026-09-04 归档；它解释已实现行为与顺序，但当前契约仍以 `docs/subsystems/core.md`、`packages/core/agent` 的类型和测试为准。迁移时保留“capability disposer + 结构共有人 + LIFO + quiescence”的判定，不要照搬归档文件的时态。`deepseek-harness/.agents/notes/archived/architecture/2026-06-18-agent-lifecycle-and-ownership-contracts.md:3-6@687f282e`

**步骤**
1. 给每个共享值命名 owner（service/instance/keyed record），删除模块级 handle。
2. 画异步操作的状态机：readiness/cancel/dispose/reservation/sentinel；若多个 owner 能独立结算则拆，否则折叠。
3. 写 cleanup 依赖图：谁在完成前需要哪个 listener/service/writer；用组合 effect 或显式 await 保证顺序。
4. 在失败路径也测试：cleanup 错误不能跳过 abort/settlement/resource release。
5. 用受控 promise 构造“消费者最后使用依赖时开始 provider disposal”的回归。

**完成信号**：能指出每个共享值的 owner；没有模块级单例；dispose 后达到静默；回调异常不破坏后续 listener；清理依赖在消费者结算前可用。

**失败处理**：若无法证明顺序，先停止新 admission，再收敛到显式 enclosing owner；不要靠“注册顺序”或“加 inject”假装同步。

**例外**：不可变标量常量、纯冻结表、无状态函数、显式 scoped owner 内分配的对象不属于单例问题。排除缺失 inject、仅可能但不可达的晚调用、有意抑制可选通知。`deepseek-harness/.agents/skills/cordis-styling-nitpicking/SKILL.md:25-30@687f282e； deepseek-harness/.agents/skills/cordis-styling-nitpicking/SKILL.md:57-57@687f282e`

**迁移裁剪**：非 Cordis 运行时用“容器/作用域 + Closeable + 显式 await”实现；保留 P0 判定“是否有活副作用在 dispose 后残留”和“cleanup 依赖是否早于消费者完成”。没有 HMR 的项目仍应保留 teardown 回归。

**证据与限制**：HMR 测试和受控 promise 回归是证据；静态搜索只能发现候选，不能证明安全。源仓自己也说 Cordis 的 workaround 不是完整 enclosing-owner 修复。

来源：deepseek-harness/docs/defensive-patterns/general.md:87-103@687f282e 来源：deepseek-harness/docs/defensive-patterns/general.md:104-123@687f282e 来源：deepseek-harness/docs/defensive-patterns/general.md:192-197@687f282e 来源：deepseek-harness/docs/defensive-patterns/general.md:198-211@687f282e 来源：deepseek-harness/packages/AGENTS.md:9-9@687f282e 来源：deepseek-harness/packages/AGENTS.md:13-13@687f282e 来源：deepseek-harness/.agents/skills/cordis-styling-nitpicking/SKILL.md:25-60@687f282e 来源：deepseek-harness/.agents/notes/archived/architecture/2026-06-18-agent-lifecycle-and-ownership-contracts.md:1-51@687f282e

**补充来源坐标：**
- `engineering-ownership-teardown`：`deepseek-harness/.agents/skills/cordis-styling-nitpicking/SKILL.md:25-60@687f282e`、`deepseek-harness/.agents/notes/archived/architecture/2026-06-18-agent-lifecycle-and-ownership-contracts.md:1-51@687f282e`
