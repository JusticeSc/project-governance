# 真实API、性能、简化与可靠性

[代理流程索引](agent-workflows.md)只作任务导航，本页拥有具名操作条件。来源标记说明固定提交687f282e的义务、事实及适配，不代表已运行。来源的pnpm／change-scope／gh stack等命令与目录是其绑定；目标须用真实现有工具实现同等作用，不得把未分发的来源命令冒充本产品能力。未有commit的空项目按空树与实际新文件核对范围，不伪造base／head；已有提交或PR则必须验证真实ref及各脏层。

<a id="aw-16"></a>
## 16. Provider 面向的真实 API 证据

`【源义务】` 测试策略的 with-key 规则：不做 real-API 配给限制；无 key 测试只证明管线，只有 with-key 运行证明 agent 对真实模型工作。覆盖写文件 prompt、多轮对话、工具使用、流中取消。最高价值是 boot 一个 shipped `dsh` profile、发一个 prompt、检查世界的 **smoke**。无密钥 CI 与无 key 贡献者通过 self-skip 保持可用；self-skip 不是成本信号。profile 级集成测试放 `apps/cli/tests/profiles/`；包特定组合留在包测试。来源：`docs/testing.md:23-25`。

`【源义务】` 真实 provider e2e 属于 `pnpm run test:e2e` 层级：针对 live provider API（DeepSeek 模型 + 按各自 key 门控的 provider 专用 smoke，如 `EXA_API_KEY`、`PERPLEXITY_API_KEY`）；每个 suite 无 key 时 self-skip，保持无密钥 CI 绿（`docs/testing.md:7-17`）。

`【源义务】` 实现新 provider adapter 的协议义务（`docs/cookbook/adding-an-llm-adapter.md:1-43`）：

- 注册是 effect-based（HMR-safe）；每个 provider route 一个 adapter；重复抛错；多 route 注册 all-or-nothing。
- `options.provider` 选 adapter，`options.model` 是 provider model id；动态目录 adapter 可不经生命周期重配服务新模型。
- Secret 用 cordis 原生：schemastery Config + env fallback，经 cordis.yml `!!js process.env.MY_KEY` 注入；不要在代码里读临时 key 文件。
- `usage` 必须在 `finish` 之前发出；`finish` 之后**什么也不发**。稳健做法：缓冲 finish/usage 到 provider 的 end-of-stream 标记，再 flush。
- Tool-call `arguments` 端到端是**原始 JSON 字符串**；流式片段用 `argumentsDelta`；provider 返回解析对象时在 `block-end` 重新 stringify。
- block `index` 按首次出现流顺序分配；同一 block 的每个 delta 复用该 index。
- 错误只有两条路径：从 `stream()` **抛**（transport/protocol 失败，用 `LlmError` + 稳定 code），或以 `finish {kind: 'error' | 'aborted'}` 结束（provider in-band 失败）。按失败类选择并记录。
- 尊重 `options.signal`（传给 fetch/SDK）。
- provider 无法履行的 `GenerateOptions` 字段必须抛 `LlmError(..., 'UNSUPPORTED_OPTION')`，不得静默丢弃。
- 需要 native metadata 的 provider 用 `finish.replayState` 发出最小无损 JSON 投影；重建历史时校验。`LlmRuntime` 只在历史 provider route 与目标 route 当前由**同一 adapter 实例**拥有时传递；adapter 决定同模型/跨模型/跨 provider 恢复是否合法。状态缺失时不得仅凭 provider/model 名推断 native replay。
- thinking-mode 开关留在 adapter Config；模型元数据用 provider-neutral capability seam：实现 `resolveModel()`，含 provider/model identity 与可选 `context`/`reasoning`；只在存在时声明配置的 `defaultEffort`；尊重 resolver 的可选 `AbortSignal`。reasoning effort 是有序不透明 id，由 adapter 映射到 provider 请求；保留 adapter 权威可选列表（含支持的 `off`），不暴露最终 wire 拼写、不 clamp 不支持值；id 不必等于 wire 表示。
- 实现结构：wire types、request serialization、transport parsing、chunk translation、adapter class 分离职责。

`【源义务】` pre-push 对 provider 变更：有凭据时跑相关 `pnpm run test:e2e`；绝不打印 secret（`dsh-pre-push-checks/SKILL.md:41`）。CI 可靠性对文档化瞬态外部 provider 测试允许重试，例外保持在外部边界（`dsh-ci-test-reliability/SKILL.md:102-117`）。

`【源义务】` 简化约束：两个 LLM adapter 是有意设计；JSONL 是唯一第一方 Session persistence provider，后端中立 Service Definition 支持 out-of-tree provider；除非用户明确覆盖，不要提议删除 LLM 双胞胎或 persistence seam（`dsh-find-simplifications/SKILL.md:14`）。

`【源事实】` pi-ai provider metadata 有本地 hook 检查：变更 pi-ai 依赖或生成器后按包 README 的 provider metadata 更新步骤；hook 在输入或生成文件 staged 时内存重生成期望元数据，拒绝陈旧而不重写/暂存（`docs/development.md:145-149`）。

### 执行卡片

- **前置条件**：真实 key 可用；或明确知道本次无 key 只证明管线。
- **步骤**：选 provider 面 → 跑对应 e2e smoke → 检查世界而非自报 → 记录 key 是否可用 → 不打印 secret。
- **责任者**：provider/adapter 作者；评审者核对证据。
- **完成信号**：真实模型轮次发生；断言外部状态/文件/事件；失败分类正确（产品 vs provider 瞬态）。
- **失败处理**：无 key 时报告“未验证真实 provider”，不要声称通过；外部瞬态按策略重试，不扩散到内部断言。
- **例外**：无密钥 CI 的自跳过；文档化瞬态外部 provider 的重试。
- **证据限制**：源仓库的 with-key 证据在外部环境生成，迁移后不可复用；必须重跑。

---

来源：deepseek-harness/docs/testing.md:7-25@687f282e 来源：deepseek-harness/docs/cookbook/adding-an-llm-adapter.md:1-43@687f282e 来源：deepseek-harness/.agents/skills/dsh-pre-push-checks/SKILL.md:27-52@687f282e 来源：deepseek-harness/.agents/skills/dsh-ci-test-reliability/SKILL.md:102-117@687f282e 来源：deepseek-harness/.agents/skills/dsh-find-simplifications/SKILL.md:10-16@687f282e 来源：deepseek-harness/docs/development.md:145-149@687f282e


<a id="aw-17"></a>
## 17. 性能工作流

`【源义务】` 触发：调查/优化性能、设计真实合成基准或 CI 性能门禁、剖析长 Session/Web 响应、把性能 PR 证据变成有测量的行为保持修复（`dsh-speed-up-perf/SKILL.md:6-8`）。

关键约束（`dsh-speed-up-perf/SKILL.md:10-92`）：

1. **先定范围与当前权威**：读根 `AGENTS.md`、architecture、testing policy、defensive patterns、受影响包指令与 Agent Notes；用 `dsh-ci-test-reliability` 处理进程、时钟、浏览器测试、异步清理。与用户约定用户可见端点、负载范围、资源约束、可接受的小行为差异、停止规则。后端与浏览器端到端测量分开；测本地开销时排除模型/网络延迟并声明排除。
2. **检查精确当前 base**，不只看运行中的 checkout；研究最终合并 diff、owning source、测试、已解决 review threads；PR body 可能描述已放弃实现。区分已合并、已关闭未合并、被取代、估算、新测量证据。
3. **先考察用户路径再排序候选**：冷启动、首次历史读取、当前代重开、可写恢复；多轮/工具重历史、大消息/结果、子 Session 列表、重复导航；初始历史传输与折叠、首次可用 paint、旧页加载、滚动、工具展开、非活跃视图激活；live streaming 与重连。独立成本驱动因素（字节、持久事件、compact 记录、raw delta、turn、tool、child、可见 DOM 节点）要变化；不要用大量微小相同消息冒充真实负载。按用户延迟、CPU/分配、保留内存、发生率、置信度排序；每个候选写生产消费者、重复工作、期望复杂度、最小可证伪干预、必须稳定的行为。
4. **先建真实合成基准**：遵循 `benchmarks/AGENTS.md` 与性能门禁决策；扩展现有必跑 lane，不建竞争性校准/报告基础设施。用户授权本地语料检查时只提取聚合负载特征；**绝不**把 prompt、输出、路径、身份、ID、凭据、录音或可识别片段复制进 fixture、日志、截图、PR、产物。用审查过的常量生成固定输入；基准不依赖用户 home、环境仓库、网络服务或私有数据。
5. **实现前记录测量卡**：用户操作（精确动作 + 外部可观察完成条件）、负载（固定维度、分布、构造 seed/常量、为何覆盖普通与尾部长尾）、入口路径（生产调用/组合与构建产物；mock 的外部边界）、时钟（包含 setup、冷/热、计时起止、排除成本）、内存（可达端点对象、基线、GC 策略、保留 vs 瞬态限制）、裁决（原始样本、选定聚合、校准的绝对/比率/内存限制、负向控制）、行为（owning 功能测试/快照、允许的小差异）。
6. **测量构建后 JavaScript**：CPU worker 在 plain Node 下运行；source-loader 开销与模块解析不是 shipped 路径。浏览器用构建后产品资源与支持的 `dsh` profile 经现有测试 harness。不要为测量加生产导出或把算法复制进“基准实现”。冷/进程内存样本用 fresh children 与私有临时根；warm 样本显式保留目标缓存；不要让 fixture setup 偷偷预热冷场景；两侧保持相同输入、校验、完成条件、可达输出。
7. **报告所有样本与决定结果的聚合**；Node lane 用现有共享时间校准与审查过的方差余量；不要按 CPU 速度缩放字节/计数/无量纲比率。手工浏览器诊断无阈值；必跑浏览器性能用例需要显式 lane 决策并在实际 CI 浏览器/runner 上重复测量后才采用时间预算；Node 机器乘数不是浏览器校准。预算是源码常量，不是环境覆盖。测量工作与其他 owned CPU 密集 job 串行；参考与候选在可比条件下测量；不要放宽预算或挑幸运运行隐藏回归。
8. **端到端延迟独立于组件阶段**；保留内存要目标对象仍可达；瞬态压力用受限堆完成或合适峰值测量区分。更快执行但无界保留不是自动胜利。
9. **浏览器响应性**用真实浏览器输入并观察 UI 更新；包含最终 stall；区分 scheduled timers 与真实输入；有界合成生产者，避免追赶爆发发明不同负载；说明 first paint、滚动、分页、live 更新、已激活但隐藏视图是否覆盖。Node fold、fake DOM、自定义 heartbeat 事件不能单独证明浏览器响应性。
10. **先证明回归再删除工作**：改生产代码前跑未优化负载，保存命令、revision、运行时/平台、fixture 维度、原始测量、裁决。把失败场景缩小到仍触真实瓶颈，再排序可证伪假设。用 profile、分配样本、工作计数或阶段计时区分。一次只改一个因果因素；重跑聚焦场景与其端到端父级；要求负向控制：收紧后的断言在原始实现或受控重新引入目标成本时失败。阈值宽到回归通过不是保护；低于已验证噪声底也不是可靠预算。
11. **保持行为与资源所有权**：性能测量补充功能证据，不替代；跑/加 owning 窄测试（输出、排序、分页、流索引、错误、取消、并发、disposal）。保留模型可见/日志等价、已发布代不可变、原子发布、必需校验、可写就绪。不要为数字静默截断历史、跳过工具结果或改生命周期语义。任何有意的小可见差异通过 owning 无密钥快照验证；产品可见 GUI 变更包含浏览器证据/GIF。
12. **交付有界可评审结果**：用 Agent Note 规则记录耐久理据、替代、校准、排除、剩余风险；检查相关 note 的 supersession，但不把性能工作变成全语料散文清理。请求栈时先选层并用官方 GitHub stacks 与独立 worktree；每层可合并：基准基础设施保护基线，优化层带修复、功能覆盖、更紧预算；独立瓶颈可用独立栈；在 owning 层修复再向上传播。应用 pre-push，报告只执行过的证据，检查 CI 而非假设本地时序证明 runner 稳定。

### 执行卡片

- **前置条件**：可复现负载；构建产物；可测环境；用户同意的停止规则。
- **步骤**：定范围 → 检查 base → 排候选 → 写测量卡 → 建基准 → 证明回归 → 单因素改 → 端到端复测 → 行为证据 → 负向控制 → 报告。
- **责任者**：性能作者；评审者核对测量与行为。
- **完成信号**：改动前后绝对值与比率、端点与内存语义、行为证据、负向控制、精确检查、排除项齐全；预算不放宽。
- **失败处理**：端到端收益消失、典型负载显著回归、复杂度超过小收益、取消/保留/耐久无法解释与测试时拒绝优化；记录被拒假设，不扩范围。
- **例外**：手工浏览器诊断无阈值；必跑浏览器预算需显式 lane 决策。
- **证据限制**：本地时序不证明 CI runner 稳定；历史数字与新鲜测量、CI 证据必须分开。

---

来源：deepseek-harness/.agents/skills/dsh-speed-up-perf/SKILL.md:1-92@687f282e 来源：deepseek-harness/benchmarks/AGENTS.md:1-18@687f282e 来源：deepseek-harness/docs/testing.md:7-17@687f282e 来源：deepseek-harness/docs/defensive-patterns/README.md:7-25@687f282e


<a id="aw-18"></a>
## 18. 简化工作流

`【源义务】` 触发：寻找有证据的简化、写/合并提案、识别小内联清理、评估其他分支的简化（`dsh-find-simplifications/SKILL.md:6-8`）。

### 18.1 约束与领域切分

`【源义务】` 先读 `AGENTS.md`、architecture（判断包之前）、defensive patterns、testing policy；查相关活跃 Agent Notes 的有意决策；归档 note 是历史例子，不是当前权威，**不要**检查、验证或修复其出链。两个 LLM adapter 与 JSONL persistence provider 是受保护设计（见 §16）。广泛请求按独立域分给子代理：loop 与 persistence；model/tool assembly；Host/Client/SDK；subprocess 与 execution providers；composition/scripts/tests/documentation。每个代理给有界域并要求消费者证据与被拒替代。来源：`dsh-find-simplifications/SKILL.md:10-16`。

### 18.2 发现可移除义务的问题

`【源义务】` （`dsh-find-simplifications/SKILL.md:18-28`）：

- 声明特性是否有完整效果路径？追 producer、transformations、provider/endpoint 支持、可观察结果；字段到处复制仍可能没有 setter、没有 reader、或只有拒绝它的实现；搜索 constructor 与 discriminant emitter，不只 caller。
- 哪些区分改变消费者动作？几个内部状态可能只需一个模型可见状态或一个可用标识符；保留控制授权、驻留、耐久、所有权的内部区分；删只邀请不可用选择的公开区分。
- 更小的显式行为能否移除子系统？固定间隔、调用者提供时区、报告激活失败可消除通用日历、持久默认、自动回滚；说出放弃的能力与被删机制。生产调用者让它成为行为决策，不是自动拒绝。
- 消费者能否在需要时读权威值？找复制历史、晋升账本、失效事件后读取、共享投影流旁的特性缓存；派生或复用可能一起删除订阅、保留数据、陈旧响应处理、恢复路径；先确定必需观察时机。
- 是否把组合误当策略？可选服务存在、provider 方法、兄弟工具可表达可用性而不决定部署行为；显式配置或调用者意图操作可移除 registry 与依赖检查；所有权或完成时机不同时保留不同操作。
- 谁拥有完整维护成本？追 pass-through 配置、重复应用树、产品使用的 demo launcher、仅 resolver 的 workspace、有自身升级生命周期的安装 helper；把整个被删系统与替代比较，含残余 glue；移动复杂度或加门禁保持重复定义相等不是移除。

### 18.3 证明可达性与权衡

`【源义务】` 先 `rg` 再读匹配；搜索精确符号、属性读写、discriminant、event/wire 字符串、config key、包名，以及 `.method(` 与 `method(` 两种形式。测试与声明能显示契约，不能证明 shipped producer/consumer。覆盖 `packages/*/*/src`、`apps/`、`python/`、运行时脚本、shipped profiles 与 overlays、包 manifest 与 exports、loader resolution、生成运行时资产、安装包消费者。按真实入口而不是目录名分类 example/fixture。跟生成目录到消费者：被模型写插件挂载使用的目录是动态产品 API，纯文档列表不是固定调用者。公共第三方扩展路径即使零仓库调用点也可能是有意的。静态未用代码检查器必须覆盖 manifest 驱动加载、生成输出、编译面，且不维护平行 per-workspace 例外清单。来源：`dsh-find-simplifications/SKILL.md:29-42`。

每个候选记录：当前 owner、有效 producer/consumer 路径、消失什么、保留什么、保留它的最强理由。区分：不可达/未读行为的移除；有明确损失的产品/公开行为收窄；受保护义务或证据不足。候选破坏受保留义务、只是搬移同样复杂度、或没有有意义减少时拒绝。

`【源义务】` 小的本改进放可执行 `TODO`/`FIXME`/`XXX` 注释，不写独立设计记录（`dsh-find-simplifications/SKILL.md:42`、`docs/development.md:196-205`）。

### 18.4 保留所有权与失败语义

`【源义务】` 对拷贝、冻结、校验器、回调捕获，命名值的 origin、next owner、trust boundary。类型化同进程调用通常借用 readonly 值；parser、config loader、queue、model/tool JSON、durable file、worker、process、wire decoder 拥有或校验输入。恶意 getter 或回调替换测试本身不建立需求。冻结根不证明后代不可变；相等 id 不证明对象同一。异步机制要映射每个 promise、flag、取消路径、disposer、reservation 到 owner 与 transition；只有表达同一事实时才合并；保留同步发布与回滚、回调包含、first-terminal-outcome 仲裁、worker/process 所有权、dispose-to-quiescence。持久 start/end 标记即使转录渲染器忽略也可记录真实事实；丢掉中断工作不是冗余日志清理。来源：`dsh-find-simplifications/SKILL.md:43-48`。

### 18.5 替换基础设施

`【源义务】` 遵循依赖策略：在加包前搜索现有依赖与 Node 内置（按引擎下限）；识别替代删除的精确实现与专用测试、维护与传递成本、glue 必须保留的每个残余行为。演练最可能击败替代的不匹配：协议截断、取消与 teardown、配置边界、确定性测试时钟、平台打包、source vs built 入口。覆盖 framing 但需重建同样 framing 以执行大小限制的库不是简化。接受的边缘行为变化写进提案与相关测试。不要重证依赖的通用规范却省略 harness 特有 shim 的测试。来源：`dsh-find-simplifications/SKILL.md:49-54`。

### 18.6 记录、合并与验证

`【源义务】` 实质提案用强制骨架：`Problem`、`Proposal`、`Alternatives considered`、`Acceptance criteria`、`Risks`；含具体消费者证据、被删维护成本、放弃的能力、可观察验收条件。已实现决策用 implemented 格式。同一决策更新现有 owner，不创建重复 note。每个新 note 通过 `dsh-archive-agent-notes` 做作用域 supersession 检查。折叠另一分支时比较其独立 diff 与目标 base，只移植有支持的非重叠提案，合并重叠理据；关闭另一 PR 需要授权或明确 housekeeping 所有权。仅文档 Agent Note 工作跑 `doc-sync`、`lint`、`git diff --check`；技能或注释编辑加适用 validator；其他检查经 `dsh-pre-push-checks`。报告调查区域、有支持候选、有意义拒绝/推迟、note 增/并/留/删、实际运行命令。调查扩展中用 draft PR；不要把未验证搜索描述为穷尽。来源：`dsh-find-simplifications/SKILL.md:55-65`。

### 执行卡片

- **前置条件**：明确范围；可搜索全仓；可读 Agent Notes 与历史模式。
- **步骤**：读约束 → 分域 → 找候选 → 证明可达性 → 分类（删除/收窄/受保护）→ 记录 → 验证。
- **责任者**：简化作者；评审者核对消费者证据。
- **完成信号**：每个候选有 owner/路径/损失/保留理由；提案骨架完整；supersession 检查完成。
- **失败处理**：证据不足则拒绝或推迟；受保护设计需用户显式覆盖；不要把“零固定调用者”当不可达。
- **例外**：小改进用 TODO 注释；已实现决策按 implemented 格式。
- **证据限制**：历史模式是校准，不是当前删除清单；归档出链不修。

---

来源：deepseek-harness/.agents/skills/dsh-find-simplifications/SKILL.md:1-65@687f282e 来源：deepseek-harness/.agents/skills/dsh-find-simplifications/references/historical-patterns.md:1-45@687f282e 来源：deepseek-harness/docs/development.md:196-205@687f282e 来源：deepseek-harness/.agents/notes/implemented/process/2026-07-26-dependencies-over-hand-rolling.md:1-36@687f282e


<a id="aw-20"></a>
## 20. 测试可靠性、错误处理与 Cordis 生命周期（跨域入口）

### 20.1 `dsh-ci-test-reliability`

`【源义务】` 触发：新增/修改有 CI 并发、共享主机资源、时钟、进程全局状态、子进程、网络监听器或异步 teardown 风险的测试；调查 flaky CI；评审测试隔离。它拥有隔离与可靠性决策，不替代测试层级策略，也不为推送选命令。来源：`dsh-ci-test-reliability/SKILL.md:6-8`。

核心规则组（`dsh-ci-test-reliability/SKILL.md:18-131`）：

- **执行拓扑**：同文件测试、不同文件/worker 进程、同 job 内独立 gate 进程、共享主机的不同 Actions job 都可能重叠；进程隔离不隔离端口、可预测路径、外部服务、数据库、socket、继承子进程。对每个获取的资源识别 owner、原子分配机制、可观察就绪信号、注册清理、静默完成信号。
- **原子分配**：网络 fixture 用 `listen(0)` 绑 loopback，server 报 listening 后读地址；不要先扫空闲端口再绑定。私有 per-test 临时根用 `mkdtemp`；共享数据库/socket/session/output 用唯一 per-test namespace；必须不存在的路径用独占创建；稳定录制标识与临时 transport 地址分开，在 fixture 内翻译。
- **进程全局状态**：`process.env`、`cwd`、fake timers、locale/timezone、module mock、registry、console hook、`globalThis`、全局 `fetch` 拦截都是独占可变资源；优先注入依赖或实例局部 adapter；必须修改时捕获原值是 absent 还是 present、精确恢复、立即注册恢复、最小 `try/finally`、`afterEach` 兜底、只拦截 fixture 拥有的最窄请求。
- **平台语义**：写回值只在断言容忍写回失败时安全；NTFS 100ns tick 不能让分数毫秒无损往返；Windows 环境变量名大小写不敏感；Windows 异步释放文件句柄；Windows 无 POSIX 权限/信号语义。优先全平台成立的观察；确实不能时显式平台跳过并写原因。
- **超时预算**：`describe`/case timeout 覆盖 runner `--testTimeout` 而不是让步；低于 lane 预算会降低 CI 已给的额度；受进程创建约束的 suite 用 lane 预算，更紧的值要写原因；hook 预算随 test 预算一起提高；超时本身是主题时，外层等待远大于被测超时。
- **按状态同步**：固定 sleep 不是证据；等显式就绪事件、握手、状态转换、owned promise 或外部可观察条件；用 deferred/barrier 把竞态放在确定点；超时只用于界定等待；不要断言调度相关顺序，除非那是被测产品行为；时间本身是主题时注入/伪造时钟并恢复。
- **Dispose 到静默**：获取后立即注册清理，使断言失败也释放资源；清理停止新回调/请求、detach listener、恢复全局 hook、终止 owned work、await 子进程退出/server close/worker termination；只调 `abort()`/`close()`/`kill()` 而不 await 完成信号是不完整 teardown。
- **证明目标回归**：实用时先看普通回归失败；新静态/语料 guard 临时引入被拒用例并观察预期失败；竞态用 barrier 证明重叠，重复执行不是竞态测试；端口/socket/共享路径/子进程在跨进程隔离是修复一部分时并发独立测试进程；fixture 自带 deadline 时先断言没有信号/超时结束子进程再断言退出状态；验证外部状态/事件/文件/日志/退出/disposal，不信自报；压力运行补充确定性回归，不替代。
- **拒绝掩盖**：无目标状态的加超时、加重试、全文件串行、吞错/未处理 rejection、弱化断言、normalize 掉不稳定行为、清理/断言前加 sleep 都不是根因修复。真实 API 策略下文档化瞬态外部 provider 测试可重试，例外留在外部边界。恢复预算不是掩盖。
- **诊断现有 flake**：只读调查；读 `references/ci-flake-diagnosis.md`，按证据分类（host-resource collision、incomplete lifecycle、process-global contamination、load-sensitive synchronization、platform/entry-path mismatch、product concurrency defect、external-provider transience、runner infrastructure），从最小相关拓扑复现，按 owner 修。

### 20.2 `dsh-error-handling`

`【源义务】` 期望失败需要声明类型、稳定 discriminant、处理相关细节；复用包错误约定、保留 cause、机器身份与展示文本分离；**绝不**靠解析 message 路由处理；`assertNever` 等意外缺陷可保持普通 `Error`，containment 不得把它们变成成功。对每个失败定义处理与报告 owner、containment、保证（有效 invariant、absent/partial/committed/unknown 效果、清理责任），并写进 owning API 文档；后台工作保留这些义务。catch 限制异常传播，不限制 mutation；只有受影响状态 owner 能建立安全继续；否则停止依赖工作、丢弃无效状态/实例、升级；只记日志不是恢复；重试需要安全重复、取消、显式 owner；有限操作需要预算，持续监督需要生命周期所有权与可观察降级。每个最终报告需要可读摘要、受影响操作、安全下一步；经接收应用 locale 机制本地化；用户文本不含敏感内部细节。不可信状态或未知结果必须通过 UI 或默认开启的可访问日志可见：影响、不确定性、系统处置、安全下一步；持久无效状态需要持久可见；没有保证不要声称成功/回滚/安全重试；报告失败需要独立回退。验证结果状态与可见结果，不只是异常被捕获。来源：`dsh-error-handling/SKILL.md:6-30`。

### 20.3 `cordis-styling-nitpicking`

`【源义务】` 只报三条 P0（`cordis-styling-nitpicking/SKILL.md:25-60`）：

1. **单例**：进程级实例或可变状态 owner，其身份/生命周期来自模块加载、静态字段、全局 symbol、隐藏缓存或 `getInstance()`。弱键、大小边界、generation check、行为保持 memoization 不给模块级缓存 Cordis 所有权。排除不可变标量常量、纯冻结表、无状态函数、显式 scoped owner 内分配的对象。建议 Cordis service + 声明/解析的消费者依赖。
2. **未反转副作用**：disposal 后仍留下 listener、registration、timer、watcher、子 fiber、process、connection、临时文件、subscription、ambient patch、异步工作。abort/kill 而不 await settlement，且清理可能在 owned work 停止前返回，即违规。正确的 `ctx.on()`/`ctx.plugin()`/`ctx.effect()` 已提供反转，调用者不必保留早期 disposer；未管理资源需要 owned effect 或显式 await 清理。不要要求回滚有意的 durable write 或远端 mutation，但临时/活资源仍需 owner。
3. **清理依赖先于消费者完成**：任何完成清理所需的服务调用或事件投递都是生命周期依赖；让实际资源与 listener 可用到消费者 settle（含最终结果发布与 durable write）。provider 的 disposal promise 在消费者之后完成，不证明其资源活过消费者清理。当前 fiber unload 并发启动兄弟 disposer；service withdrawal 在自己的 disposer 内 await 依赖 fiber，而兄弟资源 closer 可能已运行；加 `inject`、反转注册顺序、保留 service 引用都不修复该竞态；listener 也可能属于 consumer fiber 并随操作 drain 自动退订。要求显式所有权与 await 顺序：停止 admission → 在消费者依赖仍可用时 settle accepted consumers → drain/release 资源；新 admission 拒绝与 accepted 操作完成分开 scope。用显式组合 effect 或资源拥有父级 + awaited consumer/service child；验证实际捕获的 disposer 身份。`ctx.effect(function* ...)` 序列化它收集的 disposer，但包裹独立注册 effect 的 wrapper 不转移原 effect 所有权；顶层 plugin generator yield 不是通用兄弟串行 disposal 保证；检查失败路径：一个清理错误不得跳过必需 abort/settlement/release。

`【源事实】` 当前 workaround：函数式 provider 插件用**一个** `ctx.effect(function* () { ... })` 组合 service 发布与资源 effect；yield 注册返回的精确 disposer；最后 `yield ctx.provide(name, service)`；需要 admission gate 时其清理最后 yield。这排序 provider withdrawal 而消费者仍注册，但不是完整 enclosing-owner shutdown 修复；root/enclosing-owner disposal 与独立启动的 consumer cleanup 仍要显式 owner 保留并 await 实际 consumer disposal task。yield 放在组合 `ctx.effect()` generator 内，即使插件本身是 generator；不要 yield 已注册 disposer 的替代 wrapper。来源：`cordis-styling-nitpicking/SKILL.md:45-60`。

**执行卡片**：前置=插件入口与可达调用图；步骤=定位 mutable owner/注册/资源获取/work admission→追 `this.ctx` 所有权→追清理到最后 service call/event/ack/durable write→比较 consumer 完成与依赖不可用时刻→构造合法失败交错；完成信号=三条 P0 中每条有/无违规的实证结论；失败处理=证据不足则报告 inspected scope 与 material gaps；例外=不可变常量/纯冻结表/无状态函数、有意 durable write、可选通知抑制；证据限制=模式搜索不能宣称穷尽安全。

---

来源：deepseek-harness/.agents/skills/dsh-ci-test-reliability/SKILL.md:1-131@687f282e 来源：deepseek-harness/.agents/skills/dsh-ci-test-reliability/references/ci-flake-diagnosis.md:1-60@687f282e 来源：deepseek-harness/.agents/skills/dsh-error-handling/SKILL.md:1-30@687f282e 来源：deepseek-harness/.agents/skills/cordis-styling-nitpicking/SKILL.md:1-65@687f282e 来源：deepseek-harness/docs/testing.md:7-55@687f282e 来源：deepseek-harness/packages/AGENTS.md:1-29@687f282e

