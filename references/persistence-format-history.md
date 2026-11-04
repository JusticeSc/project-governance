# 历史格式归档、完整快照与类型指纹

按[当前记录](persistence-current-records.md)或[历史与冻结](persistence-historical-finalized.md)定位本次责任。本页保留固定来源的具体格式、条件、例外和负保证；Session／TypeScript名词与pnpm／scripts命令是来源绑定，不是本产品已提供的持久化执行器。目标需绑定真实根、版本、生成器与检查；缺执行器须报告缺项，不能手填生成哈希或声称验证完成。来源观察与示例验收用例不等于本产品或消费者运行通过。

<a id="persistence-historical-finalized.historical-format-coverage"></a>

## 1. 写入器版本驱动的历史格式全集

### 触发

- `SESSION_FORMAT_VERSION` 增加；
- 新增/修改任何 `vN.md`、`vN.zh.md`、`vN.schema.json`；
- 需要回答"旧 Session 的某个字段在当年声明成什么"；
- 发布前检查历史参考是否完整。

### 前置条件

- 已确定当前写入器整数 N；
- 有一个"归一化类型模型"能生成完整声明清单（root 集合 + 所有可达类型）；
- 有稳定的双语模板和配对记录工具；
- 检查器只依赖工作树，不 fetch Git、不查询远端。

### 源义务

1. **每个低于 writer 的整数都必须有独立完整记录。** 不能只写"最新旧版"或把多个版本合并。索引明确列出 0–3，当前 4 使用 catalog；`verify-persistence-formats` 从 `SESSION_FORMAT_VERSION` 推导必需范围，缺一个就失败（`deepseek-harness/docs/persistence-changes/historical-formats/README.md:51-51@687f282e`）。
2. **每条记录四件套齐全**：`vN.md` / `vN.zh.md` 双语参考、`vN.i18n.yaml` 配对记录、`vN.schema.json` 完整机器 schema、以及 `vN.md` 内的 `yaml persistence-format` 机器声明。声明为每个 root key 绑定捕获时的 digest，且必须与 schema、生成指纹表一致（`deepseek-harness/docs/persistence-changes/historical-formats/README.md:42-42@687f282e`、`deepseek-harness/docs/persistence-changes/historical-formats/v0.md:46-113@687f282e`）。
3. **root 覆盖面固定**：逻辑 `SessionHeader`、物理 `JsonlHeaderLine`、`SessionEventEnvelope`、以及该检查点所有第一方事件；每个 root 包含所有可达声明类型（`deepseek-harness/docs/persistence-changes/historical-formats/README.md:42-42@687f282e`）。
4. **历史事实原样保留**：历史可选字段、opaque 值不被当前类型替换；历史标识符只在 schema JSON 与已验证的生成 schema 区域中原样保留，人工正文使用当前术语（`deepseek-harness/docs/persistence-changes/historical-formats/README.md:44-44@687f282e`）。
5. **历史来源不带行号**：历史记录保留文件路径、不保留源码行号，因为选中的历史树与当前 checkout 不同（`deepseek-harness/docs/persistence-changes/historical-formats/README.md:44-44@687f282e`、`deepseek-harness/docs/persistence-changes/historical-formats/v3.md:30-30@687f282e`）。
6. **保留所有更早记录**，不得用后继记录替换前驱（`deepseek-harness/docs/persistence-changes/historical-formats/README.md:60-60@687f282e`）。
7. **索引由已验证快照与 writer 常量生成**，不是手工版本清单（`deepseek-harness/docs/persistence-changes/historical-formats/README.md:25-25@687f282e`、`deepseek-harness/docs/persistence-changes/historical-formats/README.md:62-62@687f282e`）。

### 步骤

1. 读 `SESSION_FORMAT_VERSION`，算出 `0..N-1` 的缺口。
2. 对每个缺口确定检查点：已发布 tag、PR 树、或已捕获的中间树；写清"这是 tag 还是中间树"（见 §8）。
3. 用归一化类型模型提取 root 与全部可达类型；生成 `vN.schema.json`。
4. 在 `vN.md`/`vN.zh.md` 写：Summary、Source evidence、Format characteristics、机器声明、生成区、Verification and limitations、Dev Note。
5. 机器声明中每个 root 写 64 位小写十六进制 digest；与 schema 中对应 root 的 digest 相等。
6. 生成指纹表与完整类型区；检查 `<!-- persistence-format-schema:start -->` / `end` 标记完整。
7. 生成/刷新 `vN.i18n.yaml`（见 §7）。
8. 刷新索引表（格式、来源、参考、机器 schema、root/type 计数）。
9. 跑 `pnpm run verify-persistence-formats`；再跑 `pnpm run doc-sync`（若项目有对应命令）。
10. 提交；旧记录不动。

### 角色

- 格式维护者：选择检查点、写双语叙述、解释差异；
- schema 提取器：生成归一化类型和 digest；
- 验证器/CI：检查范围、声明、schema、生成表和配对记录；
- 评审者：判断"选中的检查点是否具有代表性"以及格式特征是否解释正确。

### 完成信号

- `pnpm run verify-persistence-formats` 退出 0；
- 索引中每个 `0..N-1` 都有链接，root/type 计数与 schema 解析结果一致；
- 机器声明 roots 数 = schema roots 数 = 指纹表行数；
- 任一历史 schema 的 types 数量与文档"contains X roots and Y reachable types"一致。

### 失败处理

- **缺记录**：补记录，不要放宽范围；检查器不接受"用当前 catalog 顶替旧记录"。
- **编号错误/多余记录**：删除多余项或改正编号，再跑验证。
- **schema 不完整/不一致**：重新从检查点提取；不要手改 JSON 让计数对上。
- **生成区过期**：先修机器数据，再 `--write` 刷新；不要手改生成表。

### 例外

- V0/V2 来自已发布 tag；V1 来自中间树；V3 来自 V4 改动前的初始树。来源类型不同，但都必须是"完整记录"。
- 当前格式（N）本身不使用 `vN.md` 快照，而使用生成的 catalog/schema；但 finalized 检查点是另一条独立权威（§4）。
- 如果某旧格式从未被任何已发布产品写出，仍然保留记录（V1 就是例子），只是明确它不是产品发布。

### 证据边界

- 完整 ≠ 逐行语义审阅。机器 schema 的 415/435/467 个类型在本文中已被穷举结构化解析、与 schema.types 绑定并全量重算 digest，但未逐条语义阅读每个类型定义；"完整"指结构消费完整，不是语义审阅完整。
- 同版本内的事件新增/可选载荷变化可以产生"另一份同样有效"的清单；一份快照不排除同格式的其他有效变体（`deepseek-harness/docs/persistence-changes/historical-formats/README.md:46-46@687f282e`）。
- 格式号不标识该格式内每一次 payload 修订（`deepseek-harness/docs/persistence-changes/historical-formats/README.md:25-25@687f282e`）。

### 迁移设计

【迁移设计】把"必需的旧格式数量"从一个手工清单改成**单一常量 + 派生范围**。产物目录建议：

```
docs/<area>/formats/
  README.md / README.zh.md           # 索引 + 维护规则
  vN.md / vN.zh.md                   # 双语参考
  vN.i18n.yaml                       # 配对哈希
  vN.schema.json                     # 完整归一化 schema
```

检查器伪逻辑：`writer = readConstant(); required = [0..writer-1]; current = parseCurrentCatalog(); assert current.version == writer; for n in required: assert artifacts(n) && declaration(n).roots == schema(n).roots && table(n) == declaration(n)`。

【额外建议】如果项目没有 `doc-sync` 等价物，至少加一个本地链接检查；如果历史格式数量会长期增长，给索引表加"source kind"列（tag / PR / tree），避免后人把中间树误当发布。

### 验证（计划）

- 正向：writer=4 时存在 v0–v3 四套四件套，命令退出 0。
- 拒绝：删除 `v2.schema.json` 或把 v2 编号改成 v5，命令非零并指出缺失/编号错误。
- 恢复：补回 v2 后重跑，退出 0，且 v0/v1/v3 的字节不变。


<a id="persistence-historical-finalized.format-snapshot-archive"></a>

## 2. 推进写入器前的只读归档与拒绝式写入

### 触发

- 准备把 writer 从 N 推到 N+1；
- 需要补一份缺失的 `vN.schema.json`；
- 生成表/配对记录需要刷新；
- 有人要求"顺手把旧快照改成新类型"。

### 前置条件

- 当前 writer 仍等于要归档的 N；
- 当前 catalog 与当前 schema 描述同一份 N 清单；
- `pnpm run verify-persistence-catalog` 已通过；
- 目标 `vN.schema.json` 不存在（归档命令不覆盖）。

### 源义务

1. **先验证当前 catalog，再归档**：`pnpm run verify-persistence-catalog`，然后 `pnpm run verify-persistence-formats --archive N`；两条命令都必须在 writer 与 current schema 仍描述 N 时运行（`deepseek-harness/docs/persistence-changes/historical-formats/README.md:53-60@687f282e`）。
2. **归档是只读派生产物**：`--archive N` 从当前 inventory 创建 `vN.schema.json`，只保留从 roots 可达的类型，移除源码行号（`deepseek-harness/docs/persistence-changes/historical-formats/README.md:60-60@687f282e`、`deepseek-harness/docs/persistence-changes/historical-formats/v3.md:5619-5621@687f282e`）。
3. **拒绝而不是修复/覆盖**。命令必须拒绝：
   - 目标已存在；
   - N 不等于当前 writer；
   - schema 无效或不完整；
   - 与 `--write` 组合使用。 （`deepseek-harness/docs/persistence-changes/historical-formats/README.md:60-60@687f282e`）
4. **随后补双语记录与来源证据**：用 persistence-format 模板添加 snapshot 的双语记录和 source evidence；保留所有更早记录（`deepseek-harness/docs/persistence-changes/historical-formats/README.md:60-60@687f282e`）。
5. **后继格式使用当前 catalog**；复制一份新的当前 catalog 不能满足"归档前驱"的要求（`deepseek-harness/docs/persistence-changes/historical-formats/README.md:60-60@687f282e`）。
6. **`--write` 先验证机器数据，再更新生成 Markdown 与配对记录**；它保留人工说明、机器声明和 schema（`deepseek-harness/docs/persistence-changes/historical-formats/README.md:70-70@687f282e`）。
7. **默认验证拒绝过期配对记录**；标准文档检查验证翻译与本地链接；current catalog 新鲜度由 `verify-persistence-catalog` 单独负责（`deepseek-harness/docs/persistence-changes/historical-formats/README.md:70-70@687f282e`）。

### 步骤（V3→V4 实例）

```sh
# 仍在 writer=3、current schema 描述 V3 时
pnpm run verify-persistence-catalog
pnpm run verify-persistence-formats --archive 3
```

然后：补 `v3.md`/`v3.zh.md` 的来源证据与格式特征 → 生成配对记录 → 推进 writer 到 4 → 刷新当前 catalog/schema → 跑：

```sh
pnpm run verify-persistence-formats --write
pnpm run verify-persistence-formats
pnpm run doc-sync
```

### 角色

- 维护者：在正确的时间窗口执行归档；
- 归档命令：做版本/完整性/目标存在性拒绝；
- 评审者：确认归档后的记录没有替换旧证据。

### 完成信号

- `vN.schema.json` 存在，root/type 计数正确，source 条目只有文件路径、没有行号；
- 机器声明与 schema 的 roots/digests 一致；
- 后继格式的 catalog 版本等于新 writer；
- 验证命令全绿。

### 失败处理

- **目标已存在**：停止。检查是否已归档；若需修订，走显式变更流程，不要删旧文件重来。
- **版本不匹配**：说明 writer 已推进或选错 N；回到正确 checkout/提交，或在当前树上重新确定可归档版本。历史缺失不能靠"从 Git 重新生成"补——验证器设计上不 fetch Git。
- **schema 无效/不完整**：先修提取器或当前 catalog，再归档；不要手改 JSON。
- **与 `--write` 组合被拒**：拆成两步：先归档，再刷新生成区。

### 例外

- 没有历史 checkout 时，**不能**凭空生成旧格式；只能使用事先捕获的 tag/树快照。
- V0/V2 使用预发布归档中的 tag；V1 使用中间树；这类来源的历史 schema 可能不是由 `--archive` 现场生成，但同样必须完整并标明来源。
- 归档失败不是"可以手工修 JSON"的授权；失败意味着证据链条件不满足。

### 证据边界

- 归档只证明"当前 checkout 在 N 时的声明清单被复制并裁剪"，不证明运行时行为、不证明迁移安全（`deepseek-harness/docs/persistence-changes/historical-formats/v3.md:5621-5625@687f282e`）。
- 移除行号是设计要求，不是信息丢失事故；历史树与当前 checkout 行号不可比。
- 归档命令自身不判断"这份格式是否值得接受"；接受由 finalized 检查点/评审负责（§4）。

### 迁移设计

【迁移设计】把归档做成"单向、不可覆盖、只读输出"的 CLI：
- `archive(outgoingVersion)` 读取当前 inventory，断言 `inventory.version == outgoingVersion == SESSION_FORMAT_VERSION`；
- 目标文件存在即抛错；
- 写临时文件后原子 rename，避免半成品；
- 输出对象只含 `formatVersion`、`roots`、`types`，types 只保留 root 可达闭包；
- source 字段序列化时删除 `line/start/end`。

【额外建议】在 CI 中把"归档后的文件 hash"记入构建产物；在 writer bump 的 PR 模板里加一行"已运行 --archive N"。

### 验证（计划）

- 正向：writer=3 时 `--archive 3` 生成 `v3.schema.json`，root 可达类型数 = 467。
- 拒绝 A：再次 `--archive 3` → 非零并拒绝（目标已存在）。
- 拒绝 B：writer=3 时 `--archive 2` → 非零并拒绝（版本不等于当前 writer）。
- 拒绝 C：`--archive 3 --write` → 非零并拒绝（与 `--write` 组合）。
- 恢复：不覆盖旧文件，改用已有快照或正确版本；验证器保持绿。


<a id="persistence-historical-finalized.schema-fingerprint-equivalence"></a>

## 3. 传递性类型指纹与声明/快照/生成表等价

### 触发

- 比较两个历史格式的 root 是否"真的相同"；
- 判断某个字段改动是否只是 alias/注释/顺序变化；
- 生成表、机器声明、schema JSON 三者对不上；
- 兼容性评审需要引用 digest。

### 前置条件

- 有归一化类型模型：对象字段、联合、交叉、索引签名、tuple、enum、literal、opaque 都有稳定表示；
- digest 函数确定"哪些元数据参与、哪些不参与"；
- 生成区有明确标记，人工区与生成区可分离。

### 源义务

1. **digest 覆盖完整可达结构**：每个定义只出现一次；引用保留共享与递归；定义旁的 SHA-256 包含其完整可达结构；源码名称和位置标识声明来源，但**不参与** digest（`deepseek-harness/docs/persistence-changes/historical-formats/v0.md:183-183@687f282e`、`deepseek-harness/docs/persistence-changes/historical-formats/v3.md:195-195@687f282e`）。
2. **root digest 覆盖所有引用字段**：完整 schema 的说明明确"Digests include all referenced fields"（`deepseek-harness/docs/persistence-changes/historical-formats/v0.md:117-117@687f282e`、`deepseek-harness/docs/persistence-changes/historical-formats/v3.md:123-123@687f282e`）。
3. **等价规则**（源项目在兼容性文档中给出完整版本）：
   - 普通注释、源码位置、alias 名称、无害的声明重排**不影响** digest；
   - 对象字段、联合分支、交叉操作数、索引签名可以在 resolved type 不变时重排；
   - tuple 位置、数字 enum 值仍然重要；
   - 兼容性注解/策略数据是记录下来的 policy，**会**影响 digest；
   - 未注解的 version-1 快照保留原归一化与指纹；带 policy 的图使用独立指纹域（`deepseek-harness/docs/persistence-changes/README.md:80-80@687f282e`）。
4. **三处一致**：`yaml persistence-format` 的每个 root digest = `vN.schema.json` 中该 root 的 digest = 生成指纹表中的 SHA-256；生成区之外的人工表不得与生成区矛盾（`deepseek-harness/docs/persistence-changes/historical-formats/v0.md:119-179@687f282e`、`v0.schema.json` 结构）。
5. **过期生成区必须失败**，不能静默重写；`--write` 先验证机器数据，再更新生成 Markdown 与配对记录，并保留 authored/machine/schema（`deepseek-harness/docs/persistence-changes/historical-formats/README.md:62-70@687f282e`）。
6. **历史标识符只保留在 schema JSON 与已验证生成区**；人工正文使用当前术语（`deepseek-harness/docs/persistence-changes/historical-formats/README.md:44-44@687f282e`）。

### 可操作判据

- 两个 root digest 相同 ⇒ 在声明的归一化模型下，二者完全可达结构相同（不是"运行时行为相同"）。
- SessionHeader 每代都变是正常的：V0 `001ed6f6…`、V1 `88b77fa5…`、V2 `15918d78…`、V3 `2a8b1146…`、V4 `1a3440e3…`。
- JsonlHeaderLine 在 V0/V1 同为 `63496702…`，在 V2/V3/V4 同为 `18ee62b8…`——说明 V1→V2 改了物理 header，而 V2 之后保持。
- SessionEventEnvelope 在 V0/V1/V2 同为 `04184edc…`，在 V3/V4 同为 `5776e555…`——说明 V2→V3 改了信封，V3→V4 未再改。
- 同一 digest 可以出现在不同版本的 root 中（如 `event:agent-preset/selected` 在 V0–V3 都是 `a10c1747…`），这是"声明未变"的证据。

### 步骤

1. 解析 `vN.schema.json`：`roots[].key/kind/digest/schema`、`types["<id>"].digest/schema/names/sources`。
2. 对每个 root 计算/读取 digest；若手工比较，先确认比较的是同一归一化域（policy vs 非 policy）。
3. 比较两代：root 集合增删、root digest 变化、types 增删/变化。
4. 对 digest 变化做兼容性分类：可选字段新增、required→optional、普通事件新增可 same-version；required 化、类型改变、删除/重命名需要评审或 version bump（跨域规则，见 `deepseek-harness/docs/persistence-changes/README.md:49-63@687f282e`）。
5. 若声明/表/schema 不一致：先修机器数据，再 `--write`。
6. 提交后跑 `verify-persistence-formats` 与文档检查。

### 角色

- 提取器：生成归一化类型与 digest；
- 验证器：比较声明、schema、生成表；
- 评审者：解释 digest 变化的语义，不能把"digest 没变"当成"行为没变"。

### 完成信号

- 声明 roots = schema roots = 指纹表行；
- 每个 root digest 为 64 位小写十六进制；
- 生成区之外没有手写 digest；
- `verify-persistence-formats` 退出 0。

### 失败处理

- **digest 不匹配**：检查是否选了错误的检查点、是否把当前类型替换进旧快照、是否跨指纹域比较；不要改 digest 迁就文档。
- **生成表过期**：修 schema/机器声明后 `--write`；若 `--write` 也拒绝，先修机器数据。
- **alias/源码位置导致差异**：按等价规则应从 digest 中排除；若没有排除，修归一化器，而不是在文档里解释"这是等价变化"。
- **opaque 类型**：`unknown` 等不暴露内部结构，digest 无法发现其内部变化；需要运行时/编解码器测试补充。

### 例外

- 历史 version-1 快照与带 policy 的图的指纹域不同；跨域比较无意义。
- 普通注释/源码位置变化可以导致 catalog 文本或行号变化，但不应导致 digest 变化；这类"文本变了但 digest 没变"不需要新增兼容性确认（`deepseek-harness/docs/persistence-changes/README.md:80-80@687f282e`）。
- 生成区的 HTML 注释标记是边界；标记外的内容由作者负责。

### 证据边界

- digest 只描述**声明的持久化类型**，不描述运行时校验、默认值、恢复逻辑或行为（`deepseek-harness/docs/persistence-changes/README.md:80-80@687f282e`）。
- 同一段声明文本可能引用不同的嵌套类型；只看显示表达式会漏掉变化，这是采用传递性 digest 的原因。
- 本域对 415/435/467 个类型做了穷举结构与全量 digest 重算：每个 root 与 type 的 digest 都用 `schemaDigest(canonicalizeSchema(...))` 重算并与记录值比对，0 不匹配；但这证明的是"记录值等于按当前算法重算的值"，不是该算法在产品语义上正确，验证仍依赖项目的提取器测试。

### 生成区的生产者与消费者

【源实现事实】`<!-- persistence-format-schema:start/end -->` 之间的内容不是人工维护的表，而是从 `vN.schema.json` 渲染出来的：

- 生产者：`scripts/persistence-format-facts.ts:21-47` 的 `historicalSchema()` 拼装"完整 schema"标题、简介、`<details>` 包装，并调用 `scripts/render-persistence-schema.ts:273-320` 的 `renderPersistenceSchemaIndex()`（指纹表）与 `renderPersistenceSchemaDefinitions()`（每个类型的 anchor/标题/SHA-256/声明）。区域替换本身由 `scripts/persistence-format-facts.ts:12-19` 的 `replaceRegion()` 完成，它要求标记恰好出现一次（`deepseek-harness/scripts/persistence-format-facts.ts:12-19@687f282e`、`deepseek-harness/scripts/render-persistence-schema.ts:273-320@687f282e`）。
- 消费者：`scripts/persistence-formats.ts:59-135` 的 `machineBlock()`（两侧声明逐字节相等）、`parseRecord()`（root 键与 digest 形态）、`validateInventory()`（root/可达类型闭包、版本字段）与 `validateDocument()`；`scripts/persistence-formats.ts:207-231` 的 `runPersistenceFormats()` 比较重渲染结果与磁盘内容，只读模式下报 stale，`--write` 才写回。
- 因此"生成区过期"的判据是**重渲染结果与磁盘字节不等**，而不是某种语义检查；生成器未运行过就不存在对产物正确性的独立证明。

【本域结构化核对】对 V0-V3 的四个区域做了逐行穷举解析（不是抽样、不是计数）：八份文档（EN/ZH 各四份）的生成区内部共 41352 行（每语言 20676 行）全部由有序语法逐行消费，每个被消费行都带一个 ledger 类别（空行/锚点/标题/散文/表头分隔/root 行/wrapper/SHA 行/来源行/表格行/union 项/单行体），未分类 0 行、未消费尾部 0 行，ledger 计数再与独立行正则计数交叉核对。3464 个渲染定义（每语言 1732）逐一按 anchor 顺序、label 与 digest 绑定到 `vN.schema.json` 的 `types`，并把每个定义体与该类型自身 schema 节点重导出的 body 逐行比对（0 差异）。三个投影对齐：`yaml persistence-format` 声明 roots、生成指纹表行、`vN.schema.json` 的 `roots[]`，四代均 0 差异：54/54/56/60 个 root，key、kind、digest 三处一致；`types` 分别为 415/415/435/467 个且无重复 digest；schema 顶层键恰为 `formatVersion`/`roots`/`types`，source 条目不含行号；每个 root 与 type 的 digest 都用 `schemaDigest(canonicalizeSchema(...))` 重算一致。每份文件另按"声明栅栏 + 生成区 + 人工正文"三分且无重叠（合计等于文件行数）。中英区域比较的是机器投影（root 行、定义 digest/anchor/label/bodyKind/facts、声明块哈希、ledger 类别串），四代全部相等；但**区域字节不等**——本地化标签使两侧 interior SHA-256 不同，因此不主张字节相等。作为补充（不是替代）把生成区与 `renderPersistenceSchemaIndex()`+`renderPersistenceSchemaDefinitions()` 的纯渲染输出逐行比对，8/8 完全相等（证据：`verification/evidence/raw/p1-historical-payload-complete-structure.json`）。

【已纠正的先前缺陷】此前同名的"完整结构解析"由 `payload()` 循环完成，它只匹配 root 行、类型 anchor、标题与 SHA-256 行，静默丢弃解析类型体、属性/索引/tuple 表、union 项与 `<details>` wrapper，因此"每一行内部行都被分类"并未被那个探针证明（独立评审 P2，见 `_working/audit/p1-tail-independent-review-before.json`，该 adverse 记录原样保留）。同一轮 coverage 曾记 `zhRegionInteriorEqualsEn: true`，与两侧不同的 interior SHA-256 矛盾；现更正为 false 并保留字节差异。旧 sidecar 证据仍然有效：四份配对记录的 427/427/447/479 个 section 被重新解析并从当前双语文本重算，0 差异，旧字段逐项复现。

【声明解析的独立追查修复】探针会覆盖声明source中的重复 `tag`/`pullRequest` 键。V0/V3双语四例修复前均误接受；赋值前检查重复键后全部拒绝，连同原23项共27/27拒绝，八份原始文档仍通过。当前证据为 `verification/evidence/raw/p1-historical-declaration-duplicates-after.json`；before与不利复核保留。原complete-structure的正文ledger仍有效，但不是重复键拒绝的证明；这不是生产检查器运行或历史真实性证明。

### 迁移设计

【迁移设计】定义 `normalize(type) -> canonical graph`，再 `digest(graph)`；明确 exclusion 集合（source names/locations、aliases、comments、order-insensitive containers），明确 significance 集合（tuple index、enum numeric value、policy annotations）。把 `declaration.roots`、`schema.roots`、`generated.table` 三者做成同一函数的三个投影，验证器只比较投影结果。

【额外建议】给 digest 算法加版本号（如 `fingerprintDomain: 1|2`），避免未来改变归一化规则时把历史 digest 误判为内容变化。

### 验证（计划与已观测）

已观测（只读探针 + 内存变异控制，未运行生产检查器）：上述八份文档的 41352 行生成区内部行全部被消费、3464 个定义全部绑定 schema.types、纯渲染 8/8 相等；23 个内存变异（属性行类型/存在性、类型体、属性表头、union 项、指纹表 kind、定义 SHA、wrapper、尾部多余行、重复锚点、重复标记、声明 root/多余标量、schema 缺类型/重复类型/改属性/改 root digest）全部被拒绝，原始文件同时通过。证据：`verification/evidence/raw/p1-historical-payload-complete-structure.json#/controls`。

仍为计划（CLI 级，本域未执行）：
- 正向：V0/V1 的 `JsonlHeaderLine` digest 相同；V2/V3 的相同；V3/V4 的 `SessionEventEnvelope` 相同。
- 拒绝：只改生成指纹表中的一个 SHA-256 → `verify-persistence-formats` 非零（生成区过期）。
- 拒绝：只改声明中的 root digest → 验证非零；只改 schema 中嵌套类型 → digest 变化被检出。
- 恢复：`--write` 从已验证 schema 重建生成表，人工说明与机器声明不变，再验证通过。


## 9. 端到端维护清单

推进一次格式版本时，按顺序执行：

1. 确认 `SESSION_FORMAT_VERSION` 与当前 catalog/schema 一致。
2. `pnpm run verify-persistence-catalog`。
3. `pnpm run verify-persistence-formats --archive N`（writer 仍为 N）。
4. 补 `vN.md`/`vN.zh.md` 的来源、特征、声明、限制。
5. 生成/刷新 `vN.i18n.yaml`。
6. 推进 writer、更新当前 catalog/schema。
7. `pnpm run verify-persistence-formats --write`。
8. `pnpm run verify-persistence-formats`。
9. `pnpm run doc-sync`。
10. 若格式被接受：生成新的 `finalized/vN.json`，更新 `latestFinalizedVersion`，不覆盖旧检查点。
11. 若已发布：单独更新 release record 与 `evidenceTag`。
12. 代码评审：来源真实性、same-version 解释、验证证据、检查点/发布分离。

