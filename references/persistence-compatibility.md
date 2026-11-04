# 兼容性决策、载荷与来源策略

按[当前记录](persistence-current-records.md)或[历史与冻结](persistence-historical-finalized.md)定位本次责任。本页保留固定来源的具体格式、条件、例外和负保证；Session／TypeScript名词与pnpm／scripts命令是来源绑定，不是本产品已提供的持久化执行器。目标需绑定真实根、版本、生成器与检查；缺执行器须报告缺项，不能手填生成哈希或声称验证完成。来源观察与示例验收用例不等于本产品或消费者运行通过。

<a id="persistence-current-records.compatibility-decision"></a>
## 3. 兼容性决策：同版本 vs 版本提升

### 触发
检测到任何结构性变化；分类器报告“需要兼容性评审”；准备写 `decision:`；CI 拒绝 `same-version`。

### 源仓义务（判定标准）
保持 Session 版本，当且仅当旧读取器满足其一（`deepseek-harness/docs/persistence-changes/README.md:49-49@687f282e`）：

1. 保留已接受数据的**必要含义**；
2. 安全忽略可选功能，同时保留不透明记录；
3. 在执行、修改或恢复截断**之前**拒绝不受支持的必要数据。

新读取器必须保留历史含义与可读性。只有“不安全解释无法被有效判别信息阻止”时才提升版本。未知字段/值只有在现有读取器**实际**安全处理时才计入；类型差异本身不能证明行为。

### 记录要求表
| 检测到的变化 | 记录要求 |
|---|---|
| 添加可选事件体属性（含完整子树） | `same-version` |
| 必选事件体属性改为可选 | `same-version` |
| 新增普通event根（kind=event且surface=false） | `same-version` |
| 新增surface event根、新增非event根，或删除任意root | 兼容性评审后`same-version`，或显式`version-bump` |
| 为普通事件增加更高数字 `data.version`，且按现有规则保留所有旧载荷分支 | `same-version` |
| 在 before/after 携带相同受支持策略的 user/developer 源槽上添加显式归属 kind | `same-version` |
| 可选改必选、加必选属性、改已有类型、删除/重命名属性或事件 | 兼容性评审后 `same-version`，或显式 `version-bump` |
| 改SessionHeader、JsonlHeaderLine或SessionEventEnvelope，包括添加optional属性 | 兼容性评审后`same-version`；header版本变化必须`version-bump` |

来源：`deepseek-harness/docs/persistence-changes/README.md:51-59@687f282e`。 来源：deepseek-harness/docs/persistence-changes/README.md:46-63@687f282e 来源：deepseek-harness/docs/persistence-changes/README.zh.md:46-63@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-13-working-directory.md:36-40@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-14-workspace-changes-event.md:36-45@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-18-schedule-optional-title.md:36-45@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-30-job-session-lifecycle.md:40-44@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-16-session-format-v4.md:24-106@687f282e

新增根／header属性的精确分类来自`deepseek-harness/scripts/persistence-changes.ts:385-390@687f282e`、`deepseek-harness/scripts/persistence-changes.spec.ts:568-577@687f282e`，而非仅凭“新增字段”判安全。旧reader还必须在required refusal时给升级诊断；新reader接受同一日志内合法的新旧混合表示，功能缺失保持原行为。

### 分类器与人的分工
- 分类器只识别“已确立的同版本情形”和“需要评审的变更”，**不能判定语义安全**（`deepseek-harness/docs/persistence-changes/README.md:61-61@687f282e`）。
- 需要评审的变更若仍想同版本，记录或更新时必须显式 `--decision same-version`；CLI 在生成被标记记录前要求该选择（`deepseek-harness/docs/persistence-changes/README.md:61-63@687f282e`）。
- CI 读取已记录的 `decision: same-version`，只要历史、schema、header 版本约束成立就接受，无论记录是生成还是手工编辑（`deepseek-harness/docs/persistence-changes/README.md:63-63@687f282e`）。
- 显式 `version-bump` 必须自带递增的 `SessionHeader.version` 转换；同版本决策**不能**豁免 header 版本变化（`deepseek-harness/docs/persistence-changes/README.md:61-61@687f282e`）。
- 定稿记录不可变，后续记录不能复用已接受的 3→4 转换（`deepseek-harness/docs/persistence-changes/README.md:61-61@687f282e`）。

### 步骤
1. 列出每个受影响根与变化类别。
2. 对照上表得到“已确立 same-version / 需评审 / 必须 bump”。
3. 需评审时，在 Compatibility 写双向读者行为，再决定同版本（显式 CLI 选择）或 bump。
4. 选择 bump 时，同时给出 header 版本递增与迁移边（见 [版本提升](persistence-record-verification.md#persistence-current-records.version-bump-migration)）。
5. 把决策写进机器声明；CI 只做形式接受，语义由评审负责。

### 完成信号
- 每个变化根都有 `decision`，且与表一致。
- `same-version` 记录能指出旧读取器的三种安全行为之一。
- `version-bump` 记录的 header 版本确实递增。

### 失败处理
- 分类器标记为需评审但没有 `--decision`：CLI 不生成记录；补决策。
- 想用same-version绕过header版本号变化：验证器拒绝，必须bump；header／envelope的其他变化按上述决策表接受兼容性评审，不自动要求bump。
- 记录已定稿又需要新变化：新增后继记录，不复用旧转换。

### 例外与边界
- 新增“读取时必需”的事件仍是 `same-version`，前提是旧读取器会**拒绝**整条日志而不是误解（`deepseek-harness/docs/persistence-changes/2026-09-13-working-directory.md:36-40@687f282e`、`deepseek-harness/docs/persistence-changes/2026-09-14-workspace-changes-event.md:36-40@687f282e`、`deepseek-harness/docs/persistence-changes/2026-09-30-job-session-lifecycle.md:40-44@687f282e`）。
- 必选改可选也可以 `same-version`，但必须说明缺失值的处理（`deepseek-harness/docs/persistence-changes/2026-09-18-schedule-optional-title.md:36-40@687f282e`）。
- “类型不同”不是自动不安全，也不是自动安全；必须给读取器行为证据。


<a id="persistence-current-records.same-version-evidence"></a>
## 4. 同版本说明与验证证据

### 触发
写 `decision: same-version`；评审一条同版本记录；判断“旧读取器会不会误解”。

### 源仓义务
每条同版本记录都必须说明**两个方向**：旧记录如何仍可读；旧读取器如何处理新记录。包括无需显式 CLI 决策的已确立情形（`deepseek-harness/docs/persistence-changes/README.md:69-69@687f282e`）：

- 日志里没有某功能时，必须保留旧行为；
- 可舍弃功能必须能安全忽略；
- 必要功能必须有**有效的拒绝信号**；
- 不受支持功能的拒绝**不得**变成损坏恢复或尾部截断；
- 必选改可选时，说明读取器如何处理缺失值。

Verification 段落记录**实际执行**的检查；评审者判断行为与证据，检查器只校验声明与类型分类（`deepseek-harness/docs/persistence-changes/README.md:69-69@687f282e`）。

### 【源仓实现事实：可用作范例的四种写法】
- 纯可选字段新增：省略即旧行为；PTC dispatch 不进模型历史，原生工具结果回放只投影 `data.message`（`deepseek-harness/docs/persistence-changes/2026-09-12-auto-review-error-metadata.md:40-49@687f282e`）。
- 新必需事件：旧日志没有它仍有效；旧构建拒绝含该事件的日志；当前读取器需要其投影（`deepseek-harness/docs/persistence-changes/2026-09-14-image-offload.md:84-93@687f282e`、`deepseek-harness/docs/persistence-changes/2026-09-14-workspace-changes-event.md:36-45@687f282e`）。
- 必选改可选：旧日志可无 `title` 解码/折叠；缺省按未命名任务；宿主任务记录仍要求该成员（`deepseek-harness/docs/persistence-changes/2026-09-18-schedule-optional-title.md:36-45@687f282e`）。
- 来源字段新增但 `kind` 不变：缺字段即 owner；旧读取器忽略；该字段不进模型请求（`deepseek-harness/docs/persistence-changes/2026-10-13-user-rpc-principal.md:48-57@687f282e`）。
- 纯展示元数据：缺 `meta` 的旧记录有效；历史调用安全禁用导航；写入器与基线保持 V4（`deepseek-harness/docs/persistence-changes/2026-10-05-ptc-operation-metadata.md:36-45@687f282e`）。
- 仅日志事件：缺失表示请求省略字段并使用提供方默认值，没有读取方回放该字段（`deepseek-harness/docs/persistence-changes/2026-10-13-deepseek-search-thinking.md:36-45@687f282e`）。

### 步骤
1. 在 Compatibility 先写“旧 → 新”方向（旧日志在新读取器下的含义）。
2. 再写“新 → 旧”方向（旧读取器遇到新记录：忽略？拒绝？截断？）。
3. 对照三种安全行为给出结论；若依赖拒绝，证明拒绝发生在执行/修改/恢复截断之前。
4. 在 Verification 写实际命令与观察结果（测试文件/数量/SDK 快照），不要写“应当通过”。
5. 评审者独立检查证据是否覆盖两个方向与同时发生的变化。

### 完成信号
Compatibility 同时覆盖两个方向；Verification 有可复现命令与结果；没有把“类型兼容”当作行为证据。

### 失败处理
- 旧读取器会静默丢弃必需数据：不能同版本；改判别信息或 bump。
- 拒绝发生在恢复截断之后：视为不安全，不能同版本。
- 证据只覆盖新读取器：补旧读取器/历史日志证据。

### 例外
已定稿的历史记录不要求重写说明；新记录必须引用/保留其声明与快照。

来源：deepseek-harness/docs/persistence-changes/README.md:69-69@687f282e 来源：deepseek-harness/docs/persistence-changes/README.zh.md:69-69@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-12-auto-review-error-metadata.md:40-49@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-14-image-offload.md:84-93@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-18-schedule-optional-title.md:36-45@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-10-13-user-rpc-principal.md:48-57@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-10-05-ptc-operation-metadata.md:36-45@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-10-13-deepseek-search-thinking.md:36-45@687f282e


<a id="persistence-current-records.payload-version-evolution"></a>
## 5. `data.version` 载荷分支演进

### 触发
普通事件要新增一种载荷形状；想给现有事件加字段但不想 bump Session 版本。

### 源仓义务
普通事件可以新增载荷分支，条件是（`deepseek-harness/docs/persistence-changes/README.md:65-65@687f282e`）：

- 使用**必需、非负整数** `data.version`，且新版本**大于**所有已有载荷版本；
- 所有旧分支在既定同版本规则下仍可读；
- 可选属性新增与必选改可选可以伴随新版本；**每个保留分支独立比较**；
- 其他载荷改动需要兼容性评审；
- 旧读取器可能拒绝新载荷版本——这是允许的。

### 【源仓实现事实：catalog 的三步演进】
机器解析 `event:subagent/catalog` 快照可见：
- `2026-09-20-unknown-child-catalog`：`data` 联合有 5 个分支，覆盖 `continuable`/`one-shot` 的 v0、v1，并新增 `mode: "unknown", version: 1`（`deepseek-harness/docs/persistence-changes/2026-09-20-unknown-child-catalog.schema.json:1-250@687f282e`）。
- `2026-09-19-external-subagent-catalog`：在前述分支上增加 `mode: "external", version: 2`，旧分支全部保留（`deepseek-harness/docs/persistence-changes/2026-09-19-external-subagent-catalog.schema.json:1-290@687f282e`）。
- 兼容性说明明确：“旧读取器拒绝 v1”；“分类器仅在所有旧载荷分支保持不变时允许更高载荷版本；同版本扩展与移除旧读取支持仍属破坏性变更”（`deepseek-harness/docs/persistence-changes/2026-09-20-unknown-child-catalog.md:36-45@687f282e`）。

### 步骤
1. 确认事件是“普通事件”，不是 header/envelope。
2. 给新分支一个严格更大的非负整数 `version`。
3. 保留每个旧分支的完整形状；不要借机改旧分支。
4. 在 Compatibility 说明旧读取器会拒绝新版本、新读取器接受哪些版本。
5. 重新生成快照；核对联合分支数与版本字面量。

### 完成信号
快照中旧分支逐字段不变；新分支 `version` 最大；记录声明该根 `same-version`。

### 失败处理
- 新分支版本不大于旧值/不是整数/负数：验证器拒绝。
- 改了或删了旧分支：不能按本机制同版本；走兼容性评审或 bump。
- header/surface 结构变化：不属于本机制。

### 例外
旧读取器拒绝新载荷是预期行为，不是缺陷；但拒绝不得表现为损坏恢复或尾部截断（与 [同版本证据](persistence-compatibility.md#persistence-current-records.same-version-evidence) 联用）。

来源：deepseek-harness/docs/persistence-changes/README.md:65-65@687f282e 来源：deepseek-harness/docs/persistence-changes/README.zh.md:65-65@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-20-unknown-child-catalog.md:36-45@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-19-external-subagent-catalog.md:36-45@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-20-unknown-child-catalog.schema.json:1-250@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-19-external-subagent-catalog.schema.json:1-290@687f282e


<a id="persistence-current-records.attribution-policy"></a>
## 6. 归属来源策略（`@persistenceSource` / `@persistenceAttribution`）

### 触发
新增消息来源 kind；把生产者私有信息写进用户/开发者消息源；比较两个带策略的 schema 快照。

### 源仓义务
- 提取器接受核心拥有的 source 属性上的**显式** `@persistenceSource` 绑定（字面量 user 或 developer 角色）；**不会**从无注解类型推断绑定（`deepseek-harness/docs/persistence-changes/README.md:67-67@687f282e`）。
- 生产者用 `@persistenceAttribution` 限定其 `MessageSourceMap` 成员。限定承诺：
  1. 未知 kind 及其 JSON 元数据在**没有生产者**的情况下也能被读取并保留；
  2. 该 kind 不引入校验、回放或权限要求。
- 生产者可以检查自己的 kind 以恢复去重状态；其他读取器必须在不使用该投影的情况下保留并派生已记录消息。
- 记录 schema 保留：绑定、策略版本、字面量 `kind` 判别字段、保留承诺、符合条件的 kind 集合。
- 清单 format 2 保存这些承诺；没有绑定策略的提取保持 format 1。**Session 格式版本独立于策略版本**。
- 比较双方快照必须携带兼容的策略状态。已有 kind 分组仍做常规结构比较；**删除、未标记新增、策略更改、无关结构变更需要兼容性评审**。同一 wire kind 的多个上下文形式分支归为一组。

### 【源仓实现事实：三个落地例子】
- 迟到回答来源 `user-question-reply`：`kind` 仍是 `user`；没有 `dsh-user-questions` 的读取器保留消息并从内容派生历史；只有 `userQuestions` projection 读该来源；answer RPC 是唯一生产者，关闭面板不持久化回复（`deepseek-harness/docs/persistence-changes/2026-09-21-user-question-reply.md:48-57@687f282e`）。
- 工作目录通知归属：新增来源种类只做归属；策略保留未知归属而不解释（`deepseek-harness/docs/persistence-changes/2026-10-05-working-directory-attribution.md:48-52@687f282e`）。
- 非 owner 调用方：owner prompt 不写 `principal`，缺省即 owner；`kind` 保持 `'user'`；字段不进模型请求（`deepseek-harness/docs/persistence-changes/2026-10-13-user-rpc-principal.md:48-57@687f282e`）。
- V4 的 PTC 生产者写 `source.kind: 'ptc-mode'`；迁移边保留 `tools-code-mode`/`tools-ptc` 作为历史查找键；策略保留 `ptc-mode`，不允许把它只当归属（`deepseek-harness/docs/persistence-changes/2026-09-16-session-format-v4.md:104-104@687f282e`）。

### 步骤
1. 判定是核心拥有（写 `@persistenceSource`）还是生产者拥有（写 `@persistenceAttribution`）。
2. 写下字面量 `kind` 判别字段与保留承诺；不要依赖运行时推断。
3. 确认未知 kind 的 JSON 元数据能被完整保留。
4. 更新策略版本与符合条件 kind 集合；记录中声明 before/after 策略状态兼容。
5. 若删除 kind、未标记新增或改变策略：按需评审，不能用普通可选字段新增糊弄。

### 完成信号
快照携带策略状态；记录声明同一 Session 版本；未知 kind 的读取测试覆盖“无生产者仍保留”。

### 失败处理
- 无注解类型被当作已绑定：提取器不会推断，记录会缺策略，比较失败。
- 删除/未标记新增：分类器要求评审。
- 策略状态不兼容的两个快照：不能直接比较。

### 例外
System/model/tool source 保持严格语义规则，不能套用归属宽松策略（`deepseek-harness/docs/persistence-changes/2026-09-16-session-format-v4.md:100-100@687f282e`）。

来源：deepseek-harness/docs/persistence-changes/README.md:67-67@687f282e 来源：deepseek-harness/docs/persistence-changes/README.zh.md:67-67@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-21-user-question-reply.md:48-57@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-10-05-working-directory-attribution.md:48-52@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-10-13-user-rpc-principal.md:48-57@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-16-session-format-v4.md:98-104@687f282e


<a id="persistence-current-records.reserved-field"></a>
## 7. 禁止字段保留（可选 `never` + `@persistenceReserved`）

### 触发
读取器按属性名拒绝某个旧 JSON 字段；想把这个事实固化进 schema；以后可能重新允许该字段。

### 源仓义务
- 当读取器按名称拒绝某 JSON 属性时，把该属性声明为**可选 `never`**，并加**无参数** `@persistenceReserved`（`deepseek-harness/docs/persistence-changes/README.md:71-71@687f282e`）。
- 提取器保留该禁止字段；因此以后允许 JSON 值属于**已有字段类型变更**（需兼容性评审或 bump），不是普通可选字段新增。
- 必选属性或允许 JSON 值的属性**不能**携带该标记。
- 未标记的可选 `never` 与 `undefined` 属性保留既有省略行为。

### 【源仓实现事实】
- `2026-09-16-session-format-v4` 的 `request/header` 根把退役的 `system` 键记录为可选 `never`；该声明只是在记录**已有**的原生读取拒绝，不改变存储数据或提示词重建（`deepseek-harness/docs/persistence-changes/2026-09-16-session-format-v4.md:96-96@687f282e`）。
- 机器解析 v4 快照：`event:request/header` 的对象节点有 `system`（optional，primitive `never`）；另有 11 个消息根存在可选 `never` 属性 `tool`。初始基线快照没有 `never` 节点（`deepseek-harness/docs/persistence-changes/2026-09-16-session-format-v4.schema.json:1-16212@687f282e`，机器解析）。
- 快照不携带注解文本，因此从快照本身无法区分哪些 `never` 由 `@persistenceReserved` 标记、哪些是普通省略；注解事实来自 README 规则与 v4 记录的散文。

### 步骤
1. 把拒绝规则写成可选 `never` 属性，保留字段名。
2. 加无参数 `@persistenceReserved`；不要加参数或条件。
3. 在记录中说明这是“记录既有拒绝”，不是新增行为。
4. 以后允许值时，按“已有字段类型变更”评审，而不是当作可选新增。

### 完成信号
快照含该可选 `never` 属性；记录声明没有改变存储语义；分类器把“允许该字段值”标为需评审。

### 失败处理
- 把 `never` 写成必选：非法。
- 允许 JSON 值却仍按普通可选新增：会被判为已有字段类型变更并拒绝。
- 去掉标记：该属性的省略语义改变。

### 例外
未标记 `never`/`undefined` 保持既有省略行为；不要把它们当成禁止字段。

来源：deepseek-harness/docs/persistence-changes/README.md:71-71@687f282e 来源：deepseek-harness/docs/persistence-changes/README.zh.md:71-71@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-16-session-format-v4.md:96-96@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-16-session-format-v4.schema.json:1-16212@687f282e

