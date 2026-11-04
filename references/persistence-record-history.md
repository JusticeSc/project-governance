# 持久化根、摘要、前驱链与未接受刷新

按[当前记录](persistence-current-records.md)或[历史与冻结](persistence-historical-finalized.md)定位本次责任。本页保留固定来源的具体格式、条件、例外和负保证；Session／TypeScript名词与pnpm／scripts命令是来源绑定，不是本产品已提供的持久化执行器。目标需绑定真实根、版本、生成器与检查；缺执行器须报告缺项，不能手填生成哈希或声称验证完成。来源观察与示例验收用例不等于本产品或消费者运行通过。

<a id="persistence-current-records.history-graph"></a>
## 8. 前驱链与历史图

### 触发
新增后继；合并两条改同一根的分支；验证器报告缺失前驱/环/重复后继/摘要不匹配。

### 源仓义务
- **一条**基线记录完整初始清单；后续记录把前驱的 after schema 当作 before schema（`deepseek-harness/docs/persistence-changes/README.md:76-76@687f282e`）。
- 验证器拒绝：缺失前驱、环、同一根的重复后继、摘要不匹配、当前根与最新记录不一致（`deepseek-harness/docs/persistence-changes/README.md:76-76@687f282e`）。
- 独立根可以独立演进；同一前驱上的两个变更在集成后必须形成**一条有序历史**（`deepseek-harness/docs/persistence-changes/README.md:76-76@687f282e`）。
- 已接受记录描述历史转换；添加后继时保留其机器声明与 schema 快照（`deepseek-harness/docs/persistence-changes/README.md:78-78@687f282e`）。
- 基线不依赖 Git 引用、远端服务或已发布版本的检出目录（`deepseek-harness/docs/persistence-changes/README.md:78-78@687f282e`）。

### 【源仓实现事实：当前图】
- 16 条记录、110 条变更条目、65 个不同根；基线 59 个根；没有缺失前驱或重复后继（按声明核对）。
- 每个 `previous` 都是记录 id；`null` 只出现在基线与 6 个新根上。
- `event:subagent/catalog` 的链是 `2026-09-11-initial → 2026-09-20-unknown-child-catalog → 2026-09-19-external-subagent-catalog`：后一条记录的 id 日期**早于**其前驱。日期只是标签，**声明中的 `previous` 才是链**；不要按文件名日期重排历史（`deepseek-harness/docs/persistence-changes/2026-09-19-external-subagent-catalog.md:24-33@687f282e`）。

### 步骤
1. 找到该根的最新记录；`previous` 指向它。
2. 新根写 `previous: null`。
3. 若同一根在本分支已有未合并记录，先把两者整理成一条有序历史（必要时把后一条的 `previous` 改指前一条）。
4. 重新生成快照并核对摘要。
5. 运行验证器；不要手改他人已接受记录的声明。

### 完成信号
每个根的链无环、无重复后继、前驱存在、摘要逐跳匹配；当前根等于最新记录的 after。

### 失败处理
- 缺失前驱：补记录或修 `previous`；不要删声明了事。
- 重复后继（两个 PR 各自加一条）：集成时合并为一条历史，保留两条的语义。
- 摘要不匹配：先确认是否只是生成物过期（见 [摘要口径](persistence-record-history.md#persistence-current-records.digest-scope)）；否则补记录。

### 例外
已定稿记录不可改；删除根用 `after: null` 保留 tombstone；独立根不需要互相等待。

来源：deepseek-harness/docs/persistence-changes/README.md:76-78@687f282e 来源：deepseek-harness/docs/persistence-changes/README.zh.md:76-78@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-11-initial.md:24-265@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-12-auto-review-error-metadata.md:24-37@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-14-image-offload.md:24-81@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-19-external-subagent-catalog.md:24-33@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-16-session-format-v4.md:24-85@687f282e


<a id="persistence-current-records.current-root-agreement"></a>
## 9. 当前根与最新记录一致

### 触发
改完类型后本地检查；CI 报“当前根与最新记录不一致”；准备只跑 `--check`。

### 源仓义务
- 验证器拒绝“当前根与最新记录不一致”（`deepseek-harness/docs/persistence-changes/README.md:76-76@687f282e`）。
- 评审者用 `persistence-review` 比较 base 与 head 清单；`--check` 只验证**当前树**一致性，**无法**显示已被某条确认记录覆盖的转换（`deepseek-harness/docs/persistence-changes/README.md:63-63@687f282e`）。
- 摘要描述声明的持久化类型，不描述运行时验证或行为（`deepseek-harness/docs/persistence-changes/README.md:80-80@687f282e`）。

### 步骤
1. 重新生成目录/清单（`pnpm exec tsx scripts/gen-persistence-catalog.ts`）。
2. 运行验证器；若报当前根不一致，比较“当前生成的根摘要”与“该根最新记录的 after”。
3. 若只是生成物过期：重新生成，不新增确认。
4. 若类型真的变了：新增一条记录（走 [兼容性决策](persistence-compatibility.md#persistence-current-records.compatibility-decision)）。
5. 评审时用 `persistence-review` 比较 base/head，避免只看 `--check` 漏掉已覆盖转换。

### 完成信号
当前生成清单逐根等于最新记录 after；`--check` 通过；base/head 差异与新增记录一一对应。

### 失败处理
- 只跑 `--check` 就宣称“没有未记录变化”：不成立；它看不见已被确认覆盖的转换。
- 当前根不一致但不想记录：还原类型改动。

### 例外
生成文本/源码位置变化不影响摘要，重新生成即可；见下一节。

来源：deepseek-harness/docs/persistence-changes/README.md:63-63@687f282e 来源：deepseek-harness/docs/persistence-changes/README.md:76-76@687f282e 来源：deepseek-harness/docs/persistence-changes/README.zh.md:63-63@687f282e 来源：deepseek-harness/docs/persistence-changes/README.zh.md:76-76@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-10-05-ptc-operation-metadata.md:36-45@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-16-session-format-v4.md:107-117@687f282e


<a id="persistence-current-records.root-inventory"></a>
## 10. 根清单与传递类型

### 触发
决定一个改动影响哪些根；新增事件类型；评审快照根集合。

### 源仓义务
生成的目录提供可读声明与摘要；schema 清单包含规范化类型。根覆盖：逻辑 Session 头、物理 JSONL 头行、事件封装，以及**每个仓库内声明的事件**；被引用类型传递地贡献到每个受影响根的摘要（`deepseek-harness/docs/persistence-changes/README.md:29-29@687f282e`）。

### 【源仓实现事实：快照形状】
每个 `.schema.json` 是：

```json
{
  "formatVersion": 1,
  "roots": [
    {
      "key": "event:working-directory/change",
      "kind": "event",              // header | envelope | event
      "event": "working-directory/change",
      "surface": false,             // 观察：仅消息承载根为 true
      "digest": "124aa6…dca3",
      "schema": { "root": 0, "nodes": [ ... ] }
    }
  ],
  "types": []
}
```

节点种类（机器解析全部 16 份快照）：`object`（`properties[{name,type,optional}]`、`indices[]`）、`union`（`types[]`）、`literal`（`value`）、`primitive`（`type`，含 `"never"`）、`array`（`element`）、`tuple`（`elements[{type,optional,rest}]`）、`opaque`（`reason`）。`types` 在本域全部 16 份快照中为空数组，类型通过根内节点图内联。

基线 `2026-09-11-initial`：59 个根 = 2 个 `header`（`SessionHeader`、`JsonlHeaderLine`）+ 1 个 `envelope`（`SessionEventEnvelope`）+ 56 个 `event`；节点计数 object 392 / literal 446 / primitive 129 / union 76 / array 49 / opaque 8 / tuple 4（`deepseek-harness/docs/persistence-changes/2026-09-11-initial.schema.json:1-13557@687f282e`，机器解析）。

### 步骤
1. 从事件类型映射到根：`event:<type>`；header/envelope 单独命名。
2. 找出被引用类型，传递地标记所有受影响根（共享 `Message`/`ContentBlock` 会一次影响多个事件根）。
3. 新增事件类型：加入清单并写新根记录（`previous: null`）。
4. 生成快照；核对根集合与声明根集合完全一致。

### 完成信号
声明根集合 = 快照根集合；每个根有 `key/kind/digest/schema`。

### 失败处理
- 只改了共享类型却只记录一个事件根：验证器会在其他根报摘要不一致。
- 新增事件没进清单：当前根与历史都不覆盖它，评审会漏。

### 例外
`opaque` 类型不暴露内部结构，无法比较隐藏结构；行为变化不在本机制范围。基线快照的根对象省略 `event`/`surface` 字段（较早生成器形态），不要据此回填旧文件；以声明摘要为准（`deepseek-harness/docs/persistence-changes/2026-09-11-initial.schema.json:1-13557@687f282e`，机器解析）。

来源：deepseek-harness/docs/persistence-changes/README.md:29-29@687f282e 来源：deepseek-harness/docs/persistence-changes/README.zh.md:29-29@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-11-initial.md:24-265@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-11-initial.schema.json:1-13557@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-13-working-directory.schema.json:1-76@687f282e


<a id="persistence-current-records.digest-scope"></a>
## 11. 摘要口径与例外类

### 触发
生成物看起来“过期”；重排声明后摘要没变/变了；判断某改动要不要新增确认。

### 源仓义务（逐条）
摘要描述**声明的持久化类型**，不是运行时验证或行为（`deepseek-harness/docs/persistence-changes/README.md:80-80@687f282e`）。

**不影响摘要（例外类）**
- 普通注释；
- 源码位置；
- 别名名称；
- 无害的声明重排；
- 目录文本与源码位置变化。

**影响摘要**
- 兼容性注解（它们是记录下来的策略数据）；
- 对象字段、联合分支、交叉操作数、索引签名**只有在解析类型不变时**才可重排；
- 元组位置与数字枚举值始终显著。

**其他口径**
- 未注解的 version-1 快照保留原有规范化与指纹；带策略的图使用独立指纹域。
- `unknown` 等不透明类型不暴露可比较的隐藏结构。
- 纯行为变更与不透明值中隐藏的结构不在本机制范围。
- 目录文本/源码位置可能变化：重新生成陈旧产物，**不需要**为未变摘要新增确认。

### 步骤
1. 先重新生成，排除“只是文本/位置过期”。
2. 比较摘要：变了才考虑记录。
3. 若只是重排：确认解析类型相同；元组位置/数字枚举值不算“无害重排”。
4. 若加入/修改兼容性注解：按策略数据变更处理，摘要会变。

### 完成信号
同一解析类型重排后摘要不变；注解变化后摘要变化且有对应记录。

### 失败处理
- 为未变摘要新增确认：制造冗余历史，评审应拒绝。
- 把行为变化当成类型变化：本机制不覆盖，走运行时/测试证据。
- 手改摘要：验证器会与其他产物/声明冲突。

### 例外
不透明值、纯行为变化、被别名掩盖的重排；后者的判断依赖提取器的规范化规则，而实现属于发布域。

来源：deepseek-harness/docs/persistence-changes/README.md:80-80@687f282e 来源：deepseek-harness/docs/persistence-changes/README.zh.md:80-80@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-11-initial.schema.json:1-13557@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-12-auto-review-error-metadata.schema.json:1-910@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-16-session-format-v4.schema.json:1-16212@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-18-schedule-optional-title.schema.json:1-302@687f282e


<a id="persistence-current-records.terminal-refresh"></a>
## 13. 末端未接受记录刷新

### 触发
一条记录还没被接受，但其 after schema/声明需要按最新源码刷新；记录被后续记录依赖；记录已被检查点锁定。

### 源仓义务
未被接受的**末端**记录可以显式刷新；命令在产出物之前拒绝：基线、带依赖者的记录、被检查点锁定的记录（`deepseek-harness/docs/persistence-changes/README.md:78-78@687f282e`）。

### 步骤
1. 确认目标记录是末端（没有后继）。
2. 确认它不是基线、不是任何记录的 `previous`、未被 `finalized/*.json` 锁定。
3. 显式刷新并重新生成快照/侧车。
4. 重新运行验证器与 doc-sync。

### 完成信号
只有目标记录及其生成物变化；依赖它的记录/检查点未动。

### 失败处理
- 有依赖者：不能刷新；新增后继记录。
- 被检查点锁定：不可刷新；新增后继或走新版本。
- 基线：永不刷新。

### 例外
“未接受”是前提；已接受但未定稿的记录仍按历史处理（保留声明与快照，新增后继）。

来源：deepseek-harness/docs/persistence-changes/README.md:78-78@687f282e 来源：deepseek-harness/docs/persistence-changes/README.zh.md:78-78@687f282e

