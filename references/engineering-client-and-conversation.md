# 客户端与会话：组件契约、分层、远程能力与渲染

本页拥有客户端与会话呈现的规则：§30 客户端组件（注入、数据流与身份）、§31 客户端分层与域图、§32 远程能力（每能力一个 service 与 `@Remote` 纪律）、§33 会话读取与渲染（投影单路径、增量计算、无业务分支）。触发：写/评审 `packages/client/*` 组件、slot、store、hook、effect、资源读取、样式或构建；新增 client domain 目录、跨域 import、改 shared layer；新增 `@Remote` 方法、改 API controller/service、迁移 remote 能力或处理资源/调用者身份；读 Session 数据、加 conversation node、改分组引擎/列表/seat/Markdown/UserMessage、客户端缓存/retention 或流式渲染。读本页前先读 [§0 使用约定与证据边界](engineering.md#0-使用约定与证据边界)。

<a id="engineering-client-component-contract"></a>
## 30. 客户端组件：注入、数据流与身份（engineering-client-component-contract）

**触发**：写/评审 `packages/client/*` 组件、slot、store、hook、effect、资源读取、样式/构建。

**角色与前置**：插件作者遵守 slot/inject/store 契约；评审者检查组件是否持有 ctx、订阅外部源、传 ReactNode、模块级 handle。

**【源仓义务】**
- 组件通过自己注册的 inject face 接收所有渲染数据：plain data、action callback、保留的 `hooks` 隔间（renderer 绑定为 `use<Name>`）；父渲染点通过 `renderSlot` 传 owner data。不要从树顶读一个大 global state 再往下传。`deepseek-harness/docs/defensive-patterns/client-components.md:7-54@687f282e`
- props 是数据或回调；React node 通过声明的 child slot 传递。不要在 props/inject 里放 `ReactNode`/`ReactElement`/`() => JSX.Element`；需要宿主提供 markup 时声明 child slot。`deepseek-harness/docs/defensive-patterns/client-components.md:55-94@687f282e`
- slot 注册的是模块作用域的稳定函数组件；render 期间创建组件函数会每次产生新类型，React 会卸载/重挂并重置展开/焦点/滚动。注册时参数通过 props 到达，不闭包 render-time 变量。`deepseek-harness/docs/defensive-patterns/client-components.md:95-134@687f282e`
- 组件永不接收 Cordis `ctx`、不 import service class poke、不读 React context；业务组件看到零 context。bare observable 只有 Injection 包成 hook 后才能到组件；组件不自己 `subscribe`/`useSyncExternalStore`。`deepseek-harness/docs/defensive-patterns/client-components.md:135-169@687f282e`
- 上下文来自当前 scope（provider/injected member/framework hook）；不用全局 `current`/`active`/`selection`/`viewId`；同一 session 的多个 composer/conversation 必须独立。`deepseek-harness/docs/defensive-patterns/client-components.md:170-187@687f282e`
- 资源消费者走注入的 `useResource`；domain wrapper 可以在其上组合自己的 hook，但不重建 fetch/cache/subscription。`deepseek-harness/docs/defensive-patterns/client-components.md:188-228@687f282e`
- store 只承载共享 viewing/interaction state；spec 声明 init/actions/persist key；inject face 只给窄接口/selector/actions，不给整个 store；handle 在 `apply` 内创建，模块级 handle 禁止。业务数据在 object layer，不在 store；设置变更走 settings interface。`deepseek-harness/docs/defensive-patterns/client-components.md:229-272@687f282e`
- 切换状态不 remount 控件或替换 DOM；初始状态在第一次 flow 建立，不由 effect 后填；组件收到 hooks/selectors/actions，而不是整个 service。`deepseek-harness/docs/defensive-patterns/client-components.md:273-309@687f282e`
- `useLayoutEffect` 不是默认，换成 `useEffect` 也不是修复；layout measurement 先回答为何必须在此、为何 CSS 不行、为何必须像素级，再进注入的 measurement hook 并获 domain expert 确认。effect 不用来记录状态/绑定逻辑。`deepseek-harness/docs/defensive-patterns/client-components.md:310-347@687f282e`
- effect 不用来把 render 可推导数据推回父级；在 render 决定、通过 render-time channel 交给 host，或由用户手势更新。`deepseek-harness/docs/defensive-patterns/client-components.md:348-381@687f282e`
- build 调整走该包的 tsdown plugin；样式走 CSS Modules；只 inline images/GIF/SVG 且 inline 到 CSS 而非 JSX；大文本不进 TSX；`style` 只放运行时计算值。`deepseek-harness/docs/defensive-patterns/client-components.md:382-416@687f282e`
- `key` 只在命名实体/实例身份时传；`key={index}` 对可变列表失败；key 不用来消 warning 或编码顺序。`deepseek-harness/docs/defensive-patterns/client-components.md:417-449@687f282e`
- `packages/client/AGENTS.md` 补充：三通道 live data（owner props/local state/declared store）、数据访问阶梯、store 读写、inject 只从 apply closure 的 ctx、Factory 稳定身份、组件测试直接 props；`ctx` 只在 apply world。`deepseek-harness/packages/client/AGENTS.md:7-33@687f282e； deepseek-harness/packages/client/AGENTS.md:42-45@687f282e`

**步骤**
1. 设计 registration：name/children/store/inject；列出组件订阅的每个子状态和稳定 props。
2. inject 只返回窄数据/回调/hooks；不返回 store/service/ctx/ReactNode。
3. 组件用框架 hook 读数；写走 actions；派生用纯函数/useMemo。
4. 资源和共享状态走 `useResource`/declared store；handle 留在 `apply`。
5. 检查身份/初始状态/effect/key；样式走 CSS Module；组件测试直接喂 props。

**完成信号**：组件不持有 ctx/服务/订阅；props 无 ReactNode；slot 注册稳定；store 窄且 handle 不模块级；effect 不推数据；key 有业务身份；测试不依赖渲染机制。

**失败处理**：若需要全局状态，提升为 service/store 并注入；若组件要 ctx，改为在 apply 里准备数据；若 effect 在同步状态，移到 render/inject。

**例外**：已发布的 node-valued props 在触碰时转换，不扩展；`useLayoutEffect` 只有在三问通过 + domain expert 确认后保留；真正需要 remount 时由调用者拥有并说明。`deepseek-harness/docs/defensive-patterns/client-components.md:55-94@687f282e； deepseek-harness/docs/defensive-patterns/client-components.md:310-347@687f282e`

**迁移裁剪**：目标不是 React 时，映射为“注入数据/回调 + 稳定组件身份 + 无全局选中 + 资源单读路径 + 窄 store”；保留判定。没有 slot 机制时可把 children 组合映射为目标组合 API。

**证据与限制**：评审为主；组件行为测试可补充。通过渲染测试不证明没有隐藏订阅。

来源：deepseek-harness/docs/defensive-patterns/client-components.md:7-54@687f282e 来源：deepseek-harness/docs/defensive-patterns/client-components.md:55-94@687f282e 来源：deepseek-harness/docs/defensive-patterns/client-components.md:95-134@687f282e 来源：deepseek-harness/docs/defensive-patterns/client-components.md:135-169@687f282e 来源：deepseek-harness/docs/defensive-patterns/client-components.md:170-187@687f282e 来源：deepseek-harness/docs/defensive-patterns/client-components.md:188-228@687f282e 来源：deepseek-harness/docs/defensive-patterns/client-components.md:229-272@687f282e 来源：deepseek-harness/docs/defensive-patterns/client-components.md:273-309@687f282e 来源：deepseek-harness/docs/defensive-patterns/client-components.md:310-347@687f282e 来源：deepseek-harness/docs/defensive-patterns/client-components.md:348-381@687f282e 来源：deepseek-harness/docs/defensive-patterns/client-components.md:382-416@687f282e 来源：deepseek-harness/docs/defensive-patterns/client-components.md:417-449@687f282e 来源：deepseek-harness/packages/client/AGENTS.md:7-33@687f282e 来源：deepseek-harness/packages/client/AGENTS.md:42-45@687f282e

<a id="engineering-client-layering"></a>
## 31. 客户端分层与域图（engineering-client-layering）

**触发**：新增 client domain 目录、跨域 import、改 shared layer（ui-primitives/layout/renderer/object layer）、评审 UI 改动。

**角色与前置**：feature owner 在自己的包吸收需求；shared layer owner 批准真正通用的变更；`verify-client-domain-graph` 检查目录级依赖。

**【源仓义务】**
- 每层隔离级别：`ui-primitives` 消费目录控件，新控件先在 feature 包，第二个消费者才提升；`ui-layout`/shell 消费并通过 wrapper/覆盖样式适配；`ui-renderer` 业务代码无 value 依赖，只通过 slots/provide-inject hooks/declared stores 扩展；另一个 feature plugin 无 runtime import/re-export，UI 走 slots、行为走 injected services，共享 runtime 只放窄静态 owner；data object layer 通过文档化 surface 读，feature 概念不进入；自己的包内不受限。`deepseek-harness/docs/defensive-patterns/client-components.md:450-493@687f282e`
- 三层红线：data object layer（React-free：connection、session-controller/client、workspace-controller/client、client/store snapshot engine）；render machinery（ui-renderer/dynamic plugin：所有 ctx→React 集成、slot renderer、SessionProvider、uSES adapter）；presentation components（plugin 包 `src/client/`，纯 props，可整体重写）。`deepseek-harness/packages/client/AGENTS.md:46-60@687f282e`
- 业务数据在 object layer，不在 store；store 只放共享 viewing/interaction state。`rpcId` 严格双向：发起者 mint、响应者 echo、mint 留在 Connection。notifier 发布：`notifyNow` 只是用户手势的直接 echo；结构更新用 microtask-batched `markDirty`；可见 streaming chunk 用 cumulative `markFrameDirty`。Web 层是纯展示：不把“怎么画”写进 session log；tool card 从 raw call/result + persisted metadata 派生；未知/畸形 tool data 回退 generic form；新的 model-visible input 仍需 session event。`deepseek-harness/packages/client/AGENTS.md:46-60@687f282e`
- 目录 regime：一个 UI feature = 一个 plugin package；多域包按未来可拆包切分（`contract/` 是唯一共享 API，domain 目录互不 import，`apply.ts` 是唯一跨域 assembly）；注册走 `slots.register`/`registerFactory`，不用模块级副作用。`deepseek-harness/packages/client/AGENTS.md:111-114@687f282e`
- 门禁 `verify-client-domain-graph`：`contract/` 层可被所有域 import；domain 目录不得 import sibling domain；只有顶层 `apply.ts`/`index.ts`/`index.tsx` 可跨域 assembly；违规给出 file/imported/reason。`deepseek-harness/scripts/verify-client-domain-graph.ts:1-104@687f282e`

**步骤**
1. 判定改动属于 feature 还是 shared layer；feature 需求留在自己的包。
2. 跨包 UI 走 slot，行为走 injected service；不 runtime import/re-export feature 值。
3. 多域包建 `contract/` + domain 目录 + `apply.ts`；域间只通过 contract。
4. 改 shared layer 时列所有消费者并回归；真正通用才提升。
5. 运行 `verify-client-domain-graph` + client tests。

**完成信号**：门禁绿；无 sibling-domain import；shared layer 无 feature 概念；object layer 无 React；业务数据不在 store。

**失败处理**：若需要共享，先建 contract 或提升到窄静态 owner；不要给 feature plugin 加导出。若门禁报 top-level 非 assembly 跨域，移动 assembly 点。

**例外**：shared layer 的通用改动（排序、虚拟化、可访问性）不是业务修改；真正的 shared 改动需 owner 确认并回归所有消费者。`deepseek-harness/docs/defensive-patterns/client-components.md:450-493@687f282e`

**迁移裁剪**：映射到目标前端的分层/目录 lint；保留“feature 拥有自己 + contract 唯一共享 + shared 需 owner”。没有 slot 时用组合/依赖注入替代。

**证据与限制**：目录门禁自动；组件/集成测试补充。门禁只查相对 import 的目录级边界，不查语义。

来源：deepseek-harness/docs/defensive-patterns/client-components.md:450-493@687f282e 来源：deepseek-harness/packages/client/AGENTS.md:46-60@687f282e 来源：deepseek-harness/packages/client/AGENTS.md:105-114@687f282e 来源：deepseek-harness/scripts/verify-client-domain-graph.ts:1-104@687f282e

**补充来源坐标：**
- `engineering-client-layering`：`deepseek-harness/packages/client/AGENTS.md:105-114@687f282e`

<a id="engineering-remote-capability"></a>
## 32. 远程能力：每能力一个 service 与 `@Remote` 纪律（engineering-remote-capability）

**触发**：新增 `@Remote` 方法、改 API controller/service、迁移 remote 能力、处理资源/调用者身份。

**角色与前置**：能力 owner 建自己的 service；API 层只做通用编排；评审者逐条检查五项纪律。

**【源仓义务】**
- 新远程业务能力是**新 service**（自己的包或对象），`@Remote` 标在该 service 的具体方法上；不要往已有大 service 上加方法。按业务边界拆，不按调用者数量；迁移时方法出现在新 owner 上。`deepseek-harness/docs/defensive-patterns/remote-and-api.md:7-44@687f282e`
- `@Remote` 五项纪律：标在真正执行能力的具体方法（不是转发 wrapper）；client-facing 类型从生成器推断/别名（如 `TypertClientRemote['session']`），不手写第二套；wire payload 是 JSON，binary 字段级表达，方法出站不做 decode（生成 codec + Gateway 校验结果）；已发布方法/字段名只增不改，重命名是独立改动；每个方法声明它触碰的所有 `resources`，多资源返回逐项 `this.ctx.remoteAccess.allows(resource)` 过滤，调用者只从 `this.ctx.invocation.peer.principal` 读，不从参数读。`deepseek-harness/docs/defensive-patterns/remote-and-api.md:45-82@687f282e`
- `packages/api` 的 controller/gateway/remotes 只承载传输、调用形状、Session 生命周期等通用编排；业务分支不得聚合在这里；业务决策在拥有包，以 projected data 或注册条目进入。`deepseek-harness/docs/defensive-patterns/remote-and-api.md:83-115@687f282e`
- 没有 decorator 的方法仍是普通 service 方法；五项纪律只治理“什么成为 Remote 方法”。重命名或新 decode 路径要先说明收益和现有调用者影响，并获 domain owner 确认；作者不能自批。`deepseek-harness/docs/defensive-patterns/remote-and-api.md:45-82@687f282e`
- `@Remote` 支持 Host 已有的 lookup 参数、尾部 `AbortSignal`、`@Remote({ mode: 'stream' })` 流；出站不 decode。`deepseek-harness/docs/defensive-patterns/remote-and-api.md:45-82@687f282e`

**步骤**
1. 按业务边界建 service；把 `@Remote` 放在 concrete 方法。
2. Client 类型用生成器别名；payload 保持 JSON；binary 字段级。
3. 为方法列 `resources`；返回多资源逐项 filter；principal 只从 invocation 读。
4. 不改已发布名称；重命名单独改动 + owner 确认。
5. 生成 Typert 产物并编译/测试 Client 调用。

**完成信号**：新能力在新 service；decorator 不在 wrapper；类型无手写重复；无输出 decode；资源/principal 正确；API 层无业务分支。

**失败处理**：若方法需要 wrapper，检查是否该把 decorator 移到实现；若类型手写，改为生成别名；若资源漏列，补 `resources` 并测试 denial。

**例外**：一个 service 的所有方法服务同一业务边界时保持整体；需要独立协议的数据（事件流、分页、增量 reduce、投影、实体子流）走各自注册模型，不做成 Remote 方法。`deepseek-harness/docs/defensive-patterns/remote-and-api.md:7-44@687f282e`

**迁移裁剪**：目标没有 `@Remote`/Typert 时，映射为“每能力一个 RPC service + 生成类型 + JSON payload + 资源授权 + principal 来源”。保留五项纪律的判定。

**证据与限制**：生成产物编译/类型测试是自动证据；访问控制需要 denial 测试。没有真实调用路径的静态正确不等于运行时安全。

来源：deepseek-harness/docs/defensive-patterns/remote-and-api.md:7-44@687f282e 来源：deepseek-harness/docs/defensive-patterns/remote-and-api.md:45-82@687f282e 来源：deepseek-harness/docs/defensive-patterns/remote-and-api.md:83-115@687f282e

<a id="engineering-conversation-render"></a>
## 33. 会话读取与渲染：投影单路径、增量计算、无业务分支（engineering-conversation-render）

**触发**：读 Session 数据、加 conversation node、改分组引擎/列表/seat/Markdown/UserMessage、客户端缓存/retention、流式渲染。

**角色与前置**：session/UI owner 维护 projection 与 renderer；业务包注册自己的 unit/renderer；评审者检查是否出现第二读路径或业务分支。

**【源仓义务】**
- Session 数据只通过 Projection 读取与计算：client 读 projection value，不在组件里拉 log；属于 Session 的计算注册为 projection unit 并发布结果，不按需重算。`deepseek-harness/docs/defensive-patterns/conversation-and-session.md:7-49@687f282e`
- `stateVersion` 从 1 开始；序列化 state 字段或 fold 语义变化就 bump（兼容与否都 bump）；同一 key 用不同 `stateVersion` 注册两次会 throw。默认全量计算；缩小计算范围需 domain expert 确认。部分 projection view 可以服务接口可用性，但绝不决定外部可见结果。`deepseek-harness/docs/defensive-patterns/conversation-and-session.md:7-49@687f282e`
- 冷读是最后手段：先读可用 cache；只有没有 projection 覆盖时才 cold read；“小 Session 可全量读”的例外已移除且不再考虑。cache 与 official 不等价时，miss/stale 产生显式结果，不静默切慢路径。`deepseek-harness/docs/defensive-patterns/conversation-and-session.md:50-84@687f282e`
- Retention 一条生命周期规则：client 通过显式 `SessionReference` 持有；引用计数到 0 释放；idle reclamation 谓词是 `refCount == 0 && inflight == 0`，不枚举业务状态。`deepseek-harness/docs/defensive-patterns/conversation-and-session.md:85-127@687f282e`
- 新 node 计算必须声明复杂度；高频 streaming chunk 不立即发布、不每 chunk 全量重算。append path 成本是 `D` 个 Definition 的 `D` 次 match + 一次常量 Context-key lookup；发布词汇 `none`/`animation-frame`/`immediate`；高频 delta 禁止 `immediate` 和全量重算；结构/终态变化可选 `immediate`。`deepseek-harness/docs/defensive-patterns/conversation-and-session.md:128-161@687f282e`
- 分组引擎（`ProcessState`、group hierarchy、group semantics）无业务规则；业务计算 placement enum，引擎只按 enum 放置；新增 enum 值是支持的扩展。`deepseek-harness/docs/defensive-patterns/conversation-and-session.md:162-196@687f282e`
- `ChatNodeList`/`ChatNodeSeat`/`ChatGroupSeat` 无业务分支/字段；新 node 把 kind 加进 `ChatNodeDataMap` 并注册 renderer；列表继续按 kind dispatch。`deepseek-harness/docs/defensive-patterns/conversation-and-session.md:197-232@687f282e`
- `AssistantMarkdown` 及渲染管线无业务分支；展示需求注册 renderer 或把语义放进 data；官方默认内容也走同一注册面，不做 host-side inline fallback；wrapper 调官方 entry 并保留 fallback，不重渲染 slot、不 import 私有 React 组件。`deepseek-harness/docs/defensive-patterns/conversation-and-session.md:233-278@687f282e`
- `UserMessage` 和 UI `user` kind 渲染无业务字段/分支；业务差异走 payload（自己的 merge-extensible source kind 或 content field）或注册 renderer；`MessageSourceMap` 可 declaration-merge 扩展。`deepseek-harness/docs/defensive-patterns/conversation-and-session.md:279-316@687f282e`
- 架构侧：session log 是模型上下文唯一来源，`deriveMessages()` 从 log 投影；新 model-visible 输入需要 session event（模型可见 ⟺ 已记录）；`dsh-session-projection` 拥有 `ctx.sessionProjections`，host 消费者读 typed state，carrier 批量裁剪 client view。`deepseek-harness/AGENTS.md:137-137@687f282e`、`deepseek-harness/docs/architecture.md:118-128@687f282e`

**步骤**
1. 找现有 projection/read path；没有才加 cold read，并把 miss 作为显式状态。
2. 新计算注册 unit，声明 stateVersion 和复杂度；变化就 bump。
3. 高频 chunk 只增量更新受影响子树；发布用 batching，不用 immediate。
4. 业务包注册 node kind/renderer；shared engine/list/Markdown 不加分支。
5. retention 用显式 reference；reclamation 只用一个谓词。
6. 为 streaming 性能、cache miss、版本冲突写测试。

**完成信号**：只有一条 read path；无每 chunk 全量；shared engine/list/Markdown 无业务分支；retention 可审计；stateVersion 正确。

**失败处理**：若出现第二读路径，删除并接 projection；若 cache miss 落全量，改成显式 state；若 shared 层要分支，注册 renderer 或把语义放进 data。

**例外**：结构/终态 publication 可 `immediate`；host 可有 cold read（client 的限制不要求 host 绝对禁止）；部分 projection view 只服务可用性。`deepseek-harness/docs/defensive-patterns/conversation-and-session.md:50-84@687f282e； deepseek-harness/docs/defensive-patterns/conversation-and-session.md:128-161@687f282e`

**迁移裁剪**：目标没有 projection 框架时，映射为“单一读模型 + 注册计算 + 缓存 miss 显式 + 增量/批量发布 + shared renderer 注册”。保留“无业务分支”的判定。

**证据与限制**：评审 + 性能测试；快照可证明输出。投影版本冲突要运行时测试；类型不覆盖。

来源：deepseek-harness/docs/defensive-patterns/conversation-and-session.md:7-49@687f282e 来源：deepseek-harness/docs/defensive-patterns/conversation-and-session.md:50-84@687f282e 来源：deepseek-harness/docs/defensive-patterns/conversation-and-session.md:85-127@687f282e 来源：deepseek-harness/docs/defensive-patterns/conversation-and-session.md:128-161@687f282e 来源：deepseek-harness/docs/defensive-patterns/conversation-and-session.md:162-196@687f282e 来源：deepseek-harness/docs/defensive-patterns/conversation-and-session.md:197-232@687f282e 来源：deepseek-harness/docs/defensive-patterns/conversation-and-session.md:233-278@687f282e 来源：deepseek-harness/docs/defensive-patterns/conversation-and-session.md:279-316@687f282e 来源：deepseek-harness/AGENTS.md:137-137@687f282e 来源：deepseek-harness/docs/architecture.md:118-128@687f282e
