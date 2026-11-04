# 历史格式的来源、双语与证据边界

按[当前记录](persistence-current-records.md)或[历史与冻结](persistence-historical-finalized.md)定位本次责任。本页保留固定来源的具体格式、条件、例外和负保证；Session／TypeScript名词与pnpm／scripts命令是来源绑定，不是本产品已提供的持久化执行器。目标需绑定真实根、版本、生成器与检查；缺执行器须报告缺项，不能手填生成哈希或声称验证完成。来源观察与示例验收用例不等于本产品或消费者运行通过。

<a id="persistence-historical-finalized.historical-evidence-limits"></a>

## 6. 历史快照能证明与不能证明的边界

### 触发

- 有人引用历史格式文档支持"迁移安全"；
- 发布说明/兼容性评审要引用旧 schema；
- 需要判断某个字段在旧版本是否 required；
- 需要决定是否为旧格式补测试。

### 前置条件

- 已读过对应 `vN.md` 的 Verification and limitations；
- 已区分"声明类型"、"codec/恢复不变量"、"运行时行为"三层。

### 源义务

1. **历史参考只描述选定的 schema**，不是历史应用回放，也不建立迁移安全（`deepseek-harness/docs/persistence-changes/historical-formats/README.md:46-46@687f282e`）。
2. **同版本内的事件新增/可选载荷变化可以产生其他有效清单**；一份快照不排除其他有效变体（`deepseek-harness/docs/persistence-changes/historical-formats/README.md:46-46@687f282e`）。
3. **更早的 tag 可能有额外类型差异**，当前快照不替代它们（`deepseek-harness/docs/persistence-changes/historical-formats/v0.md:28-28@687f282e`）。
4. **V1 不是发布**：选中树是中间树，归档中没有 V1 tag；不得虚构产品发布（`deepseek-harness/docs/persistence-changes/historical-formats/v1.md:28-28@687f282e`）。
5. **V3 不是最终 PR 树、也不是产品发布**：它是 V4 改动前的初始树；发布证据由 release-status 负责（`deepseek-harness/docs/persistence-changes/historical-formats/v3.md:28-28@687f282e`）。
6. **schema 完整性不等于迁移安全**：声明字段/可选性不覆盖 codec/restoration 不变量；外部插件 payload、物理范围编码、运行时关系需要各自 validator（`deepseek-harness/docs/persistence-changes/historical-formats/v3.md:5623-5623@687f282e`）。
7. **历史 `surfaceOp` 可选只是声明证据**，不允许省略 codec/迁移 validator 要求的字段（`deepseek-harness/docs/persistence-changes/historical-formats/v0.md:5092-5092@687f282e`、`deepseek-harness/docs/persistence-changes/historical-formats/v1.md:5094-5094@687f282e`、`deepseek-harness/docs/persistence-changes/historical-formats/v2.md:5349-5349@687f282e`、`deepseek-harness/docs/persistence-changes/historical-formats/v3.md:5623-5623@687f282e`）。
8. **verification 只用当前 checkout**：不 replay 历史应用、不查 Git/远端；它验证每个格式到 writer 的范围、schema 完整性、双语声明与生成表（`deepseek-harness/docs/persistence-changes/historical-formats/README.md:51-51@687f282e`、`deepseek-harness/docs/persistence-changes/historical-formats/v0.md:5098-5098@687f282e`、`deepseek-harness/docs/persistence-changes/historical-formats/v3.md:5627-5627@687f282e`）。
9. **opaque 值/未知结构不可见**：`unknown` 等不暴露内部结构；类型图不能证明行为（`deepseek-harness/docs/persistence-changes/README.md:80-80@687f282e`）。
10. **finalization 不表示发布**（`deepseek-harness/docs/session-format-status.md:37-37@687f282e`）。

### 可引用的"能证明"

- 在选定检查点，某 root 的声明结构/字段可选性是什么；
- 某事件在该格式是否存在；
- 两个格式的声明结构是否相同（digest 相同）或哪些 root 变了；
- 旧格式的完整类型清单覆盖了哪些 root/type；
- 某份快照来自哪个 tag/PR/中间树。

### 明确"不能证明"

- 旧应用能否正确回放该日志；
- 迁移是否安全、是否可逆；
- 运行时 validator/恢复逻辑是否接受该数据；
- 外部插件事件、packed body 编码、运行时关系；
- unknown/opaque 值内部是否变化；
- 某个同格式变体是否被快照覆盖；
- 产品是否已发布该格式（看 release record）；
- 检查点与状态记录是否被协同篡改。

### 失败处理

如果评审问题的答案需要上述"不能证明"的项，停止引用历史文档，改为：
1. 运行 owning codec/validator；
2. 用真实旧日志做迁移/回放测试；
3. 在 compatibility/verification 段落记录实际命令与输出；
4. 若仍无法证明，明确写"未验证"，不要用文档存在性代替证据。

### 角色

- 评审者：拒绝把文档当运行时证据；
- 发布作者：区分"已接受基线"、"已发布"、"历史声明"；
- 读者：按"能证明"清单提问，按"不能证明"清单补测试。

### 完成信号

- 任何关于旧格式的结论都附有层级标签（声明/实现/运行时）；
- 兼容性声明的 Verification 段有实际执行证据，而不是"文档说……"；
- 发布记录与 finalized 记录没有被混用。

### 例外

- 只做"字段考古"（查声明）时，历史文档就是正确证据；
- 历史文档可以证明"源项目当时这样声明"，但不能证明"现在仍然这样运行"。

### 证据边界

本域对 8 份双语历史格式文档完整阅读了人工正文段（标题、摘要、来源、特征、验证/限制、开发备注）；`<!-- persistence-format-schema:start/end -->` 内的中文类型区是生成载荷，机器声明块已与英文逐字节比对。两者都不是独立手动契约，未逐行翻译审阅不列为 blocker。对每份 415–467 个生成类型定义做了逐行穷举结构消费与 schema 绑定（不是抽样），但未做语义审阅；本文所有"不能证明"的结论来自源文档自身的限制声明，而不是我们额外做的运行时实验。

### 迁移设计

【迁移设计】在每份历史记录中强制两个段落：
- `Verification and limitations`：列出该快照覆盖/不覆盖的维度；
- `Compatibility`（若项目有 change record）：分别写旧 reader 看新数据、新 reader 看旧数据的行为，以及实际执行的检查。

【额外建议】在 CI 中加一个"文档措辞"检查：历史格式页若出现"safe"/"compatible"/"verified"等词，必须同时出现实际命令或明确免责声明。

### 验证（计划）

- 正向：用 `v0.md` 的 Characteristics 回答"V0 是否有 assistant/chunk"→有；用 `v3.md` 回答 V3 surface 端点→`startSeq`/`endSeq`。
- 拒绝：在评审中仅凭 `vN.md` 声称"V2→V3 迁移安全"→评审拒绝，要求 codec/spec 测试证据。
- 恢复：补跑迁移/回放测试并记录输出，或在结论中降级为"未验证"。


<a id="persistence-historical-finalized.bilingual-pairing"></a>

## 7. 双语记录与配对哈希：围栏代码块与 BEGIN/END GENERATED 区之外

### 触发

- 编辑 `vN.md` 或 `vN.zh.md` 任一边；
- 新增历史格式记录；
- `--write` 刷新生成表；
- 默认验证报告配对记录过期。

### 前置条件

- 有一对 `X.md` / `X.zh.md`；
- 有 `X.i18n.yaml`（或项目等价配对记录）；
- 生成区有明确标记（如 `<!-- persistence-format-schema:start/end -->`）；
- 机器声明在两侧完全一致。

### 源义务

1. **每对文档有配对记录**：`vN.i18n.yaml` 按 heading section 记录英文/中文块的哈希。实际剔除范围是**围栏代码块**与 `<!-- BEGIN GENERATED <slug> -->` / `<!-- END GENERATED <slug> -->` 区；`generatedRegions()` 只识别这一种标记语法；其他标记家族不被识别，其内容（除其中的围栏代码块）仍进入哈希（`deepseek-harness/scripts/translation-pairing.ts:20-25@687f282e`、`:47-83@687f282e`；`deepseek-harness/scripts/translation-pairing-record.ts:148-162@687f282e`）。sidecar 头部把范围概括为“代码块与生成区之外”，该概括只在生成区使用上述语法时成立（`deepseek-harness/docs/persistence-changes/historical-formats/README.i18n.yaml:1-3@687f282e`、`deepseek-harness/docs/persistence-changes/historical-formats/v0.i18n.yaml:1-3@687f282e`）。
2. **机器声明两侧相同**：`yaml persistence-format` 声明必须在 `vN.md` 与 `vN.zh.md` 完全一致；README 明确 pair 有"identical declaration"（`deepseek-harness/docs/persistence-changes/historical-formats/README.md:42-42@687f282e`）。
3. **围栏代码块与识别到的生成区不参与配对哈希，其他生成标记仍参与；翻译区块仍会不同**：`vN.md` 的完整类型区在 `<details>` + `persistence-format-schema` 标记内，但该标记不是 `generatedRegions()` 识别的 `BEGIN/END GENERATED` 语法，因此它的标题、表格与 SHA 行进入配对哈希，只有围栏代码块被剔除。简单类型（如 `"1"`）两侧没有可翻译内容，`en == zh`（`deepseek-harness/docs/persistence-changes/historical-formats/v0.i18n.yaml:35-37@687f282e`）；事件类型含 `required`/`必需`、`Sources`/`来源` 等标签，两侧哈希不同（`deepseek-harness/docs/persistence-changes/historical-formats/v0.i18n.yaml:182-184@687f282e`）。不要用"哈希相等"判断生成区或声明是否一致；机器声明一致性与 schema 完整性由 `verify-persistence-formats` 检查。
4. **改一边必须同步另一边并重录**：头注释给出命令 `pnpm run verify-translation-pairing --write <file>`（`deepseek-harness/docs/persistence-changes/historical-formats/README.i18n.yaml:4-5@687f282e`）。
5. **`verify-persistence-formats --write` 刷新生成 Markdown 与配对记录**，并保留人工说明、机器声明、schema（`deepseek-harness/docs/persistence-changes/historical-formats/README.md:70-70@687f282e`）。
6. **默认验证拒绝过期配对记录**；`doc-sync` 验证翻译与本地链接（`deepseek-harness/docs/persistence-changes/historical-formats/README.md:70-70@687f282e`）。

### 本域解析到的配对记录事实

| 文件 | 行数 | 条目数 | en≠zh | en==zh（全部为类型 section） |
|---|---|---|---|---|
| `README.i18n.yaml` | 28 | 8 | 8 | 0 |
| `v0.i18n.yaml` | 1285 | 427 | 266 | 161 |
| `v1.i18n.yaml` | 1285 | 427 | 266 | 161 |
| `v2.i18n.yaml` | 1345 | 447 | 279 | 168 |
| `v3.i18n.yaml` | 1441 | 479 | 298 | 181 |

`v0` 的 427 条 = 12 个结构 section + 415 个类型 section；`v2` 的 447 条 = 12 + 435；`v3` 的 479 条 = 12 + 467。161 条 en==zh 全部落在类型 section，但并非所有类型 section 都相等：含翻译表格/来源标签的条目两值不同（例如 `event:agent-preset/selected` 的 `required`/`必需`、`Sources`/`来源`）。相等只说明该 section 没有可翻译差异，不能证明生成区或机器声明一致。

【本域复核】用配对解析器逐条解析四份 sidecar 的全部 427/427/447/479 个键，并从当前双语文本重算：与文件记录 0 差异，键层级为 2 个根键、8 个一级 heading、2 个二级、415-467 个生成类型。`v0`/`v1`/`v2`/`v3` 的 en≠zh 分别为 266/266/279/298，en==zh 分别为 161/161/168/181。

【源实现事实·标记语法边界】"配对哈希剔除生成区"只对 `BEGIN/END GENERATED` 标记成立，对**历史格式页不适用**：`generatedRegions()` 只识别 `<!-- BEGIN GENERATED <slug> -->` / `<!-- END GENERATED <slug> -->` 形式的标记（`deepseek-harness/scripts/translation-pairing.ts:20-25@687f282e`、`deepseek-harness/scripts/translation-pairing.ts:47-83@687f282e`），而历史页用的是 `<!-- persistence-format-schema:start/end -->`。对 `v0.md` 逐行变异实测：改指纹表某行 digest、改类型定义旁的 SHA-256 行、改类型标题、改 anchor id，都会改变对应 section 的 en 哈希；只有围栏代码块（` ```yaml persistence-format `）被剔除。因此对这些页面，生成区**参与**配对记录，sidecar 头部与"只覆盖人工正文"的表述在这四份文件上只是概括而非边界（证据：`verification/evidence/raw/p1-historical-payload-structure.json#/pairingCoverageProbe`）。这不是要求改源文档的理由——源标记形式与检查器行为一致且能通过验证——但迁移时必须知道：想真正排除生成区，标记必须用 `BEGIN/END GENERATED` 形式。

### 步骤

1. 修改英文侧正文（摘要/特征/限制等）。
2. 同步修改中文侧，保持语义一致；机器声明逐字节一致。
3. 运行 `pnpm run verify-translation-pairing --write <md 路径>` 重录哈希。
4. 若改了 schema/生成区来源，运行 `pnpm run verify-persistence-formats --write`。
5. 运行 `pnpm run verify-persistence-formats` 与 `pnpm run doc-sync`。
6. 检查配对记录中新 heading 的 en/zh 哈希；不要以相等判断正确性，含翻译标签的 section 两值不同是正常的，只有没有可翻译差异的简单类型才相等。

### 角色

- 作者：双语内容与机器声明；
- 配对工具：生成/更新哈希；
- 验证器：拒绝过期配对；
- 评审者：判断翻译语义，而非只看哈希。

### 完成信号

- `X.i18n.yaml` 无过期条目；
- 两侧机器声明完全相同；
- 新 heading 有对应条目；
- `verify-persistence-formats` 与 `doc-sync` 退出 0。

### 失败处理

- **只改英文**：默认配对检查失败；补中文并重录，不要手改哈希。
- **手改生成区**：`--write` 会用已验证 schema 覆盖；若 `--write` 拒绝，先修机器数据/schema。
- **新增 heading 未进配对**：重跑 `verify-translation-pairing --write`。
- **en/zh 机器声明不一致**：这是硬错误；以 schema/声明为准统一，不能靠配对哈希掩盖。

### 例外

- 纯生成 section 若没有可翻译表格/标签，两侧哈希可能相等；含 `required`/`必需`、`Sources`/`来源` 等标签的 section 两值不同是正常翻译差异，不能据此判断生成区错误。
- 代码块内容不参与配对哈希，但仍需两侧语义一致。
- 配对哈希只覆盖被剔除的围栏代码块与识别到的生成区之外的内容，不覆盖代码块内的命令/字段名；未被 `generatedRegions()` 识别的生成区仍被覆盖。

### 证据边界

- 哈希相等只证明"两侧块内容相同/同步重录"，不证明翻译质量、术语正确或技术内容正确。
- 配对记录不验证 schema 与声明的一致性；那由 `verify-persistence-formats` 负责。
- 本域对 i18n 文件是全文结构化解析 + 头部/尾部抽样，没有逐条人工阅读 400+ 个哈希。

### 迁移设计

【迁移设计】配对记录生成器按 heading slug 递归记录 `{en, zh}` 哈希；剔除围栏代码块与工具识别的生成标记区间（默认只认 `BEGIN/END GENERATED`；其他标记不会自动豁免）；提供 `--write` 与只读检查两种模式。把"机器声明必须一致"作为独立检查，不要依赖配对哈希。

【额外建议】给配对记录加 `generatorVersion`，避免升级哈希算法后全量误报；对生成区标记做嵌套/闭合检查。

### 验证（计划）

- 正向：同时修改 en/zh 后 `--write`，再检查退出 0，配对条目更新。
- 拒绝：只改 `v0.md` 的 Summary → 配对检查非零（过期条目）。
- 恢复：补 `v0.zh.md` 并重录，再跑 `--write`/验证/`doc-sync`，退出 0。
- 拒绝：手改 `v0.schema.json` 的生成表 → `--write` 从 schema 重建，人工说明不变。


<a id="persistence-historical-finalized.source-checkpoint-provenance"></a>

## 8. 来源检查点声明与"不虚构发布"

### 触发

- 新增历史格式记录；
- 评审来源证据；
- 需要判断某快照能否代表"该版本"；
- 发布说明引用历史检查点。

### 源义务

1. **V0**：来源是已发布 tag `dsh-v0.1.2-rc.1`，writer 0；它是预发布归档中最后一个 V0 tag；tag record 保留发布背景；更早 V0 tag 有额外类型差异，不被本快照替代（`deepseek-harness/docs/persistence-changes/historical-formats/v0.md:28-28@687f282e`）。
2. **V1**：来源是 `dsh-v0.1.3-alpha.1` 祖先中"首次 V2 writer 变更之前"的最后一个 V1 树，关联 PR #3349（分支 `worktree/session-format-03-v0-v1-migration`），源码变更日期 2026-09-02，标题 `fix(session): close live assistant framing races`；这是中间树，不是最终合并 PR 树；归档没有 V1 tag，不得虚构产品发布（`deepseek-harness/docs/persistence-changes/historical-formats/v1.md:28-28@687f282e`）。
3. **V2**：来源是已发布 tag `dsh-v0.1.3-alpha.2`，writer 2；tag record 描述相邻发布变化；完整清单同时包含未变化和变化的 root（`deepseek-harness/docs/persistence-changes/historical-formats/v2.md:28-28@687f282e`）。
4. **V3**：来源是 PR #4320 在 `release/session-log-v4` 上的初始树，空提交日期 2026-09-16，标题 `chore(session): initialize V4 release integration PR`；它包含 writer 3 的 master 树、V4 源码改动之前；catalog freshness 检查通过后，V3 archive 在 writer 推进前捕获清单；它既不是最终 PR 树，也不是新产品发布；发布证据由 release-status reference 负责（`deepseek-harness/docs/persistence-changes/historical-formats/v3.md:28-28@687f282e`）。
5. **来源位置语义**：历史记录的 source locations 指向历史树，不是当前文件；V3 明确"without line numbers"（`deepseek-harness/docs/persistence-changes/historical-formats/v3.md:28-30@687f282e`）。
6. **区分发布与检查点**：alpha/beta/RC 产品发布也建立 released 义务，GitHub prerelease 标记不使持久数据可丢弃；缺失 release record 不是"未发布"的证据（`deepseek-harness/docs/session-format-status.md:24-24@687f282e`）。

### 步骤

1. 确定检查点是 tag、PR 树还是本地捕获树。
2. 写清标识：tag 名、PR 号、分支、提交日期/标题；如果是中间树，明确"不是最终合并树/不是发布"。
3. 写清 writer 常量。
4. 写清与 release archive/tag record 的关系；没有 tag 就直说。
5. 在 Verification/limitations 中写清该检查点的代表性与缺口。
6. 评审时把"来源声明"与"发布声明"分开检查。

### 角色

- 作者：精确记录来源；
- 评审者：拒绝把中间树/初始 PR 树写成发布；
- 发布维护者：在真正发布后更新 release record，而不是改历史来源。

### 完成信号

- 每条记录都有 Source evidence 段；
- 中间树/无 tag 的情况有明确否定句；
- writer 常量与索引一致；
- 发布状态只在 release record 中声明。

### 失败处理

- **虚构 tag/发布**：删除发布声明，改为"中间树/无 tag"，并引用归档证据。
- **来源树无法复现**：明确写"来源为历史树，当前 checkout 无行号/无法直接 diff"；不要用当前文件冒充。
- **writer 与来源不一致**：以检查点实际 `version` 为准，修索引/声明。

### 例外

- 历史来源可以是 PR 初始树；这不降低其"声明快照"价值，但降低其"发布证据"价值。
- 同一 writer 可能有多个树；记录必须指明选中的检查点，不能声称代表整个格式号。

### 证据边界

- 本域无法从当前 checkout 验证 Git 历史事实（无 fetch、无 reflog）；来源声明是源文档的记录，不是本域独立证明。
- V1 的中间树识别、V3 的空提交信息均来自源文档；若迁移项目无法访问历史，需保留原始 tag/commit 元数据作为附件。

### 迁移设计

【迁移设计】给每份历史记录加结构化来源字段：

```yaml
source:
  kind: tag | pullRequest | tree
  tag: <name>            # kind=tag
  pullRequest: <number>  # kind=pullRequest
  branch: <name>
  commit: <sha>
  date: <YYYY-MM-DD>
  title: <commit title>
  isRelease: false
```

生成索引时把 `kind` 显示出来，避免把中间树当发布。

【额外建议】在 release archive 中为每个 tag 保存 manifest（tag、commit、writer 常量、捕获时间），历史格式记录的 source 只引用 manifest 条目，不重复叙述。

### 验证（计划）

- 正向：V0/V2 记录指向 tag；V1 明确"无 tag/中间树"；V3 明确"初始 PR 树，非发布"。
- 拒绝：把 V1 的 Source evidence 改成"发布 tag"→评审拒绝，因为没有 tag record。
- 恢复：改回中间树描述并引用 PR/日期/标题；发布状态留给 release record。

