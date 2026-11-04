# 相邻格式转换与数据代际

按[当前记录](persistence-current-records.md)或[历史与冻结](persistence-historical-finalized.md)定位本次责任。本页保留固定来源的具体格式、条件、例外和负保证；Session／TypeScript名词与pnpm／scripts命令是来源绑定，不是本产品已提供的持久化执行器。目标需绑定真实根、版本、生成器与检查；缺执行器须报告缺项，不能手填生成哈希或声称验证完成。来源观察与示例验收用例不等于本产品或消费者运行通过。

<a id="persistence-historical-finalized.named-adjacent-migrations"></a>

## 5. V0→V1→V2→V3→V4 具名转换与边界

### 触发

- 需要把旧 Session 读成当前格式；
- 评审某个迁移 codec/spec；
- 判断"类型声明差异"是否等于"迁移步骤"；
- 准备 V4 的写入器变更。

### 前置条件

- 已确定源格式和目标格式；
- 有对应 codec/spec（不是只看 schema 文档）；
- 有 fixture 或真实旧日志样本；
- 明确"物理编码"与"声明类型"的边界。

### 源义务与具名转换

**V0（writer 0）**

- 逻辑/物理 header 的 `version` 都是 `number`；写入器常量决定 V0，数值类型本身不限制为 0。
- 逻辑 header 要求 `isSeeded`；物理 header 用可选 `seedLength`，要求 `delegationDepth` 与 `type: "session"`。
- `assistant/chunk` 是独立事件，`data` 含 `chunk`/`turn`/`step`；`assistant/message` 无内嵌 `stream`；无 `assistant/attempt`。
- 物理 body 使用 packed rows：`text-chunks`/`reasoning-chunks`/`tool-call-chunks`，字段 `seq0`、`time0`、`data.turn`/`step`/`index`/`dt`；文本/推理行带 `texts`，工具调用行带 `id`、可选 `name`、`args`；N 个成员有 N−1 个时间间隔，可为负；成员 k 的 seq 为 `seq0+k`，time 为 `time0` 加前 k 个间隔。
- V0/V1 共享 codec 拥有 packed rows 与范围编码的 `sourceEventSeqs`；物理 body 不是声明类型清单里的额外 root（`deepseek-harness/docs/persistence-changes/historical-formats/v0.md:33-43@687f282e`）。

**V1（writer 1，无 tag）**

- 沿用 V0 物理布局；`SessionHeader.version` 解析为字面量 1；物理 `JsonlHeaderLine.version` 仍为 `number`。
- 逻辑 header 要求 `isSeeded`，物理 header 仍用可选 `seedLength`；重建历史 header 时必须保留这一区别。
- `assistant/chunk` 仍是顶层事件；`assistant/message` 无 `stream`；无 V2 的 `assistant/attempt`。
- V1→V2 migration reference 拥有：chunk 消耗、内嵌 stream、序号重映射；这些转换**不能**从类型 digest 推断（`deepseek-harness/docs/persistence-changes/historical-formats/v1.md:33-43@687f282e`）。

**V2（writer 2）**

- `SessionHeader.version` 为字面量 2；逻辑与物理 header 都要求 `isSeeded`，物理 header 无 `seedLength`。
- `assistant/chunk` 不存在；`assistant/message.data` 与仅日志用途的 `assistant/attempt.data` 都要求内嵌 `stream`。
- surface 替换声明保留 `start`/`end`；系统提示词文本仍在 `request/header.data.header.system`；无 V3 的 `system/message`。
- V2 codec 拥有 one-event-per-row framing、范围编码 source refs、从 `session/end-seed` 推导的 inherited cuts。
- V2→V3 spec 拥有 system-message 插入、PTC 事件名称、canonical envelope conversion。
- seeded V2：最后一个携带 `data.inherited: true` 的 `session/end-seed` 事件按序号位置标识 inherited cut（`deepseek-harness/docs/persistence-changes/historical-formats/v2.md:33-43@687f282e`）。

**V3（writer 3，V4 改动前）**

- `SessionHeader.version` 为字面量 3；逻辑与物理 header 都要求 `isSeeded`，物理 header 无 `seedLength`。
- `system/message`、`user/message`、`assistant/message`、`tool/result` 要求 `surfaceOp`；替换端点为 `startSeq`/`endSeq`；Assistant 消息不携带 `sourceEventSeqs`。
- Assistant stream 仍内嵌在 message/attempt；系统提示词文本属于 `system/message`；PTC 分派事件用 `tool/ptc-dispatch-start` 与 `tool/ptc-dispatch`。
- V3 codec 拥有 canonical event framing 与 source-event range encoding；V2→V3 spec 定义历史转换，其 native V3 admission 规则区分扩展处理与历史来源验证（`deepseek-harness/docs/persistence-changes/historical-formats/v3.md:33-43@687f282e`）。

**V3→V4**

- V3 检查点捕获于 PR #4320 的初始树（writer 3，V4 源码改动前）；V4 finalized 检查点的 acceptedRecords 键序最后一条为 `2026-09-16-session-format-v4`。
- 结构化比较 V3 schema 与 V4 检查点：新增 `event:developer/message`、`event:workspace/changes`；13 个 root digest 变化：`SessionHeader`、`event:agent/inbox/spliced`、`event:assistant/attempt`、`event:assistant/message`、`event:compaction/summary`、`event:request/header`、`event:session/title-llm-request`、`event:system/message`、`event:team/message/queued`、`event:tool/ptc-dispatch`、`event:tool/result`、`event:turn/end`、`event:user/message`。
- 这些差异只说明"声明层变了"；具体转换由 `session-format-v3-to-v4` codec 与其规范拥有，不能从 digest 推断。

**共同禁令**

- 不能把类型 schema 当作迁移算法；不能跳过 codec/spec 直接改 JSON；不能让物理 body 编码成为声明 root；不能把 `surfaceOp` 在旧版可选当成"可以省略 codec/validator 要求的字段"（`deepseek-harness/docs/persistence-changes/historical-formats/v0.md:5092-5092@687f282e`、`deepseek-harness/docs/persistence-changes/historical-formats/v3.md:5623-5623@687f282e`）。

<a id="persistence-open-and-publication"></a>
### 打开方向、只读准备与写入发布

格式号是单调整数，不承诺任意降级。读到高于当前writer的格式时拒绝为unsupported，与损坏区分；诊断明确“由更新版本写入，请升级reader”，同时提供仍可阅读的raw-log入口，不能当损坏日志截断或用空会话替换。未知event默认required并拒绝解释；只有envelope显式ignorable=true才可保留并跳过。

读取旧格式的body前，在内存完成整条相邻Stage链并验证逻辑结果，源路径、字节和inode不变。只读open不编码、不写临时文件、不sync、不发布后继，也不为显示历史要求可写存储。header-only的stat/list不打开body、不发布，只翻译支持的旧header并报告数值最高规范代际；service flush不能把只读准备升级为写入。

写入open先取得进程内claim与跨进程lease，重新解析代际；仍为历史格式时，必须在返回可append的handle前独占发布最终当前代际。中间代际仅存在于stage，不生成已提交文件。发布采用独占临时文件、sync、实际目标验证、比较准备时source identity、no-overwrite发布的顺序；成功发布后不可回滚。目标已存在只接受已验证的精确迁移前缀，append tail另由当前reader校验，不能覆盖winner。

prepared artifact的publish幂等，同一artifact共享终态（包括拒绝），不能重复编码。源identity变化必须拒绝并清理自身临时文件，不静默重新迁移已展示的历史；发布开始后由发布owner负责完成结算，不把调用方取消变成半公开状态。读handle在当前代际出现后只按不缩短历史规则切换，并能观察append tail。没有自动后台发布；缺相邻边在catalog生成／初始化失败，不暴露部分历史链。

验收分别观察：只读打开不产生任何后继／临时写；header-only不读body；写入必须先发布再append；拒绝、source漂移与winner冲突时源不变且不截断、不覆盖、不发布错误后继。mock Worker测试或schema摘要不证明真实发布／资源回收。

来源：`deepseek-harness/.agents/notes/implemented/architecture/2026-08-10-session-log-version-mechanism.md:14-31@687f282e`、`deepseek-harness/.agents/notes/implemented/architecture/2026-08-31-released-session-format-migrations.md:106-118,174-176@687f282e`、`deepseek-harness/.agents/notes/implemented/architecture/2026-09-05-read-only-session-migration-preparation.md:1-170@687f282e`。源实现的Worker并发数、缓存和平台发布API需在目标对应实现核验，本产品不假装提供这些执行器。

### 步骤

1. 识别源格式（§8）与目标 writer。
2. 找到相邻 codec/spec；确认它覆盖源→目标的全部转换（framing、stream、event rename、envelope、sequence、surface endpoints、PTC）。
3. 用源格式 fixture 跑迁移，记录输出；对 seeded Session 特别检查 inherited cut。
4. 校验输出能通过目标格式 validator；不能只比较类型。
5. 对迁移失败采用拒绝：不要 fallback、不要截断日志、不要"修复"成可解析。
6. 在 change record / cookbook 中写清实际执行过的检查。

### 角色

- 迁移 codec 所有者：实现/维护转换；
- 迁移作者：选择正确源格式、运行 fixture；
- 评审者：检查双向可读性、拒绝语义、是否误用 schema 当作算法。

### 完成信号

- 迁移后的日志通过目标格式 validator；
- 源日志未被修改（迁移是派生/预写准备，不是原地修补）；
- 失败样本以明确错误退出，而不是静默产出半截日志。

### 失败处理

- **类型 digest 相同但迁移失败**：说明 digest 不能证明语义/物理布局；回到 codec/spec。
- **V2 seeded cut 错位**：按最后一个 `data.inherited: true` 的 `session/end-seed` 序号定位；不要按时间或数组下标猜测。
- **V3 surface 端点不合法**：检查 `startSeq`/`endSeq` 与 `surfaceOp`；不要退回 V2 的 `start`/`end`。
- **V4 新事件缺失**：确认 migrate 链确实包含 developer/workspace changes；检查 accepted record 链，而不是手改 schema。

### 例外

- 同一格式内可能还有 payload 修订；相邻迁移只保证格式号相邻，不保证覆盖所有同版本变体。
- 外部插件事件、packed body、运行时关系不在类型清单内，需要各自 owner 的 validator。
- 迁移安全性不由历史格式文档建立；失败时必须有独立测试/回放证据。

### 证据边界

- 本域只读到 codec/spec 的"所有权声明"与格式特征，未逐行审阅 `packages/session/session-format-*` 实现；实现证据归 release 域。
- V3→V4 的增删/变更清单是本域对两个 JSON 做结构化比较的结果，不是对 PR diff 的逐行审阅。
- schema 快照不能证明迁移可逆、不能证明旧 reader 的行为。

### 迁移设计

【迁移设计】为每对相邻格式建立 `migrate_N_to_N+1`，输入/输出都是"事件流 + header"，显式列出：
- 物理 framing 变化（packed/one-event-per-row）；
- 载荷位置变化（chunk → embedded stream；system prompt → system/message）；
- 事件重命名（`tool/code-dispatch*` → `tool/ptc-dispatch*`）；
- 信封/端点变化（`start`/`end` → `startSeq`/`endSeq`，`surfaceOp`）；
- 序号/继承切点规则（`session/end-seed` + `data.inherited`）。 每步先断言源格式版本，再转换，再对目标格式做完整校验；任一步失败即拒绝，不写回源日志。

【额外建议】建立"格式特征表"作为迁移 checklist 的单一来源；为每对迁移保留至少一个真实旧日志 fixture 和一个损坏样本（验证拒绝）。

### 验证（计划）

- 正向：V0 fixture 经 V0→V1 codec 后进入 V1 形状；V1 fixture 经 V1→V2 后 chunk 被消费、stream 内嵌；V2 fixture 经 V2→V3 后出现 `system/message`、PTC 名称、canonical envelope；V3 fixture 经 V3→V4 后新增事件可用。
- 拒绝：对 V2 seeded 日志伪造 inherited cut → 迁移/验证失败；对损坏日志 → 明确拒绝，不产生截断输出。
- 恢复：修正输入或使用正确 codec；不得通过改 schema/digest 让坏数据"通过"。

