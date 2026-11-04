# 持久化版本转换、配对与验证边界

按[当前记录](persistence-current-records.md)或[历史与冻结](persistence-historical-finalized.md)定位本次责任。本页保留固定来源的具体格式、条件、例外和负保证；Session／TypeScript名词与pnpm／scripts命令是来源绑定，不是本产品已提供的持久化执行器。目标需绑定真实根、版本、生成器与检查；缺执行器须报告缺项，不能手填生成哈希或声称验证完成。来源观察与示例验收用例不等于本产品或消费者运行通过。

<a id="persistence-current-records.bilingual-pairing"></a>
## 14. 双语配对与侧车哈希

### 触发
编辑英文或中文任一侧；`*.i18n.yaml` 缺失/过期；doc-sync 报翻译配对失败。

### 源仓义务
- 每条记录有中文对侧，机器声明必须相同；验证器从英文读一次并检查中文相等（`deepseek-harness/docs/persistence-changes/README.md:35-44@687f282e`）。
- `*.i18n.yaml` 是生成的双语一致性记录；文件头写明：按标题分段，对**代码块与生成区域之外**的英/中块取哈希；编辑任一侧后要带另一侧并重新记录（`deepseek-harness/docs/persistence-changes/2026-09-11-initial.i18n.yaml:1-4@687f282e`）。
- 重新记录命令：`pnpm run verify-translation-pairing --write docs/persistence-changes/<file>.md`（同上文件头）。
- doc-sync 包含持久化历史与翻译配对门禁（`deepseek-harness/docs/persistence-changes/2026-09-21-user-question-reply.md:53-57@687f282e`，记录称 42 项检查全部通过）。

### 【源仓实现事实：侧车键语法】
- `/`：首个标题之前的块；记录文件该哈希在 16 条记录中完全相同（`3d5a424ae7d7e46b` / `c22a8e4a62d8cc1a`），说明前置元数据/语言链接的差异被规范化。
- `/<h1-slug>`、`/<h1-slug>/<section-slug>`：逐标题段。README 的 H1 slug 是 `persistence-type-change-records`；记录的 H1 slug 是记录 id。
- 所有 16 条记录的 `/…/declaration` 哈希相同（`6907136f28e48c90` / `02f8298485f3d8e7`），尽管声明内容不同：声明在围栏代码块内，被排除在哈希之外。TOC 与 dev-note 段也全部相同。
- 结论：配对侧车证明“不应翻译的代码块未被改动 + 两侧散文按段同步”，**不**证明中文语义等价；声明相等由验证器单独检查。

### 步骤
1. 先改英文，再改中文（保持声明逐字节相同）。
2. 运行 `pnpm run verify-translation-pairing --write <英文文件>` 重记侧车。
3. 运行验证器与 doc-sync。
4. 评审时看侧车分段哈希是否只在你改动的段落变化。

### 完成信号
侧车分段与两侧标题对应；声明相等；doc-sync 通过。

### 失败处理
- 只改一侧：配对检查失败；补齐另一侧后重记。
- 手改侧车哈希：下次重记会覆盖；不要手改。
- 中文声明漂移：验证器报错；以英文为准修正。

### 例外与边界
标题文字可不同（英/中各一套 slug 在侧车中成对）；代码块内容不参与配对哈希。哈希算法细节由文档域实现拥有，本域未复算。

来源：deepseek-harness/docs/persistence-changes/README.md:35-44@687f282e 来源：deepseek-harness/docs/persistence-changes/README.zh.md:1-90@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-21-user-question-reply.md:53-57@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-11-initial.i18n.yaml:1-28@687f282e 来源：deepseek-harness/docs/persistence-changes/README.i18n.yaml:1-28@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-16-session-format-v4.zh.md:1-120@687f282e


<a id="persistence-current-records.archive-separation"></a>
## 15. 归档分离与发布比较冻结

### 触发
想用旧 tag、alpha/RC 归档或历史格式参考来证明当前兼容性；准备改归档比较。

### 源仓义务
- 较早的 tag 使用预发行归档；它重建 alpha/RC 类型差异，供**历史阅读与格式校验**；其观察**不作为当前兼容性确认**（`deepseek-harness/docs/persistence-changes/README.md:13-13@687f282e`）。
- 按 Session 格式查看完整 schema 时使用格式参考；其覆盖由写入器常量决定，包括没有发布 tag 的中间格式（`deepseek-harness/docs/persistence-changes/README.md:15-15@687f282e`）。
- 已发布的 V0–V3 校验器与已记录的前驱代际保持不变；V3 读取器拒绝更新的 generation（`deepseek-harness/docs/persistence-changes/2026-09-16-session-format-v4.md:94-94@687f282e`）。
- 已有 V4 文件不会重新运行迁入边（`deepseek-harness/docs/persistence-changes/2026-09-16-session-format-v4.md:98-98@687f282e`）。

### 步骤
1. 当前兼容性只看当前树的记录 + 最新记录 + 定稿检查点。
2. 归档只用于回答“旧版本当时长什么样/如何校验旧文件”。
3. 需要引用旧版本差异时，在记录中明确标注为历史证据，不写成当前决策依据。
4. 不改动已冻结的归档比较与旧 generation 校验器。

### 完成信号
记录中的兼容性论证不依赖归档观察；归档文件保持只读。

### 失败处理
- 用 RC 归档证明“现在兼容”：评审应拒绝，要求当前读取器行为证据。
- 想“顺手更新”旧 generation：不必要且破坏冻结；新增 generation 而非改旧。

### 例外
格式参考可以覆盖未打 tag 的中间格式；这仍是历史阅读材料，不是当前确认。

来源：deepseek-harness/docs/persistence-changes/README.md:11-15@687f282e 来源：deepseek-harness/docs/persistence-changes/README.zh.md:11-15@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-16-session-format-v4.md:94-94@687f282e


<a id="persistence-current-records.version-bump-migration"></a>
## 16. 版本提升与迁移边

### 触发
分类器/评审决定必须 bump；需要改 `SessionHeader.version`；需要写 V3→V4 这类迁移。

### 源仓义务
- 显式 `version-bump` 必须自带递增的 `SessionHeader.version` 转换；同版本决策不能豁免 header 版本变化（`deepseek-harness/docs/persistence-changes/README.md:61-61@687f282e`）。
- 版本提升记录按 Session 格式流程处理（README 指向 `../cookbook/adding-a-session-format-version.md`）。
- 记录必须覆盖**整个转换**，包括同时发生的多个根变化（`deepseek-harness/docs/persistence-changes/README.md:61-61@687f282e`）。

### 【源仓实现事实：V3→V4 的完整案例】
`2026-09-16-session-format-v4` 一个记录改了 14 个根：`SessionHeader` + 13 个事件根；全部 `decision: version-bump`（`deepseek-harness/docs/persistence-changes/2026-09-16-session-format-v4.md:24-85@687f282e`）。关键行为：

- **共享类型导致多根变化**：从内容块联合移除 `tool-result` 并按角色细化消息，会改变 inbox、消息事件、compaction 摘要、标题请求、团队消息、PTC dispatch 等可达 schema；这不是新增十套协议（`deepseek-harness/docs/persistence-changes/2026-09-16-session-format-v4.md:90-90@687f282e`）。
- **header 版本**：快照中 `SessionHeader.version` 从字面量 3 变为 4（`deepseek-harness/docs/persistence-changes/2026-09-16-session-format-v4.schema.json:1-16212@687f282e`，机器解析）。
- **迁移保留**：V3→V4 把已发布的 user 角色工具结果提升为 tool 角色消息（必需 `toolCallId`、可选 `isError`）；保留每个已接纳源事件与继承切分点；从同一持久化根的直属子日志补缺失的父级 `subagent/catalog` 记录。
- **子日志证据集**：历史正文恢复要求显式 child-evidence 集合，没有子日志也要传空集合；descriptor 缺失/多条/版本未知则跳过该子项补全；身份、时间戳或模式冲突则**拒绝迁移且不发布**。
- **打开语义**：历史读取打开在内存准备结果；写入打开重新校验子成员与修订后，把当前后继发布到未修改的前代文件旁；delivery-generation 检查防止历史确认变成活动 V4 水位。
- **fork 结果**：迁移为 forked 的 `turn/end.reason` 增加变体；精确切分的 fork 在继承标记后追加子自有错误结果与结束事件；V4 接纳经校验的 not-started fork 结果，使用确定性分支 ID 与措辞（`deepseek-harness/docs/persistence-changes/2026-09-16-session-format-v4.md:94-94@687f282e`）。
- **developer 事件与历史 header**：developer 事件保留角色并要求 open step；每次新增存 `toolName`，`developer/message.headerSeq` 指向此前恰好包含一个完整匹配 `ToolSchema` 的历史 request/header；同一事件的所有新增共享该历史 header 修订，纯删除与其他 developer 消息省略 `headerSeq`；准入拒绝缺失/前向/非 header/未知/歧义/不完整/已退役内联定义；替换、重启、fork、surface replacement 与压缩保留历史 schema 身份，不咨询最新 header 或 registry（`deepseek-harness/docs/persistence-changes/2026-09-16-session-format-v4.md:102-102@687f282e`）。
- **退役字段**：`request/header` 的 `system` 键记录为禁止（见 [禁止字段](persistence-compatibility.md#persistence-current-records.reserved-field)）。
- **生产者来源**：未知生产者归属保留每个自有 JSON 属性；原生读写打开在暴露 Session 前校验 source 字段；已有 V4 文件不重跑迁入边。
- **PTC kind**：`tools-code-mode`/`tools-ptc` 作为历史查找键映射到 `ptc-mode`。
- **验证**：报告 1,523 / 447 / 884 等测试与 100% 覆盖率；比较生成清单报告 4 个变化根、447 个未变指纹（`deepseek-harness/docs/persistence-changes/2026-09-16-session-format-v4.md:107-117@687f282e`）。

### 步骤
1. 在声明中列出**所有**受影响根，并统一 `decision: version-bump`。
2. 修改 `SessionHeader.version` 字面量，生成快照确认递增。
3. 实现迁移边：保留旧事件/切分点；定义缺失/冲突时的跳过与拒绝条件；拒绝时不得发布。
4. 明确读写打开的语义（内存准备 vs 发布后继）。
5. 保持已发布校验器与旧 generation 不变。
6. 记录迁移中退役/保留的字段与查找键映射。
7. 运行聚焦测试与清单比较，把实际数字写进 Verification。

### 完成信号
header 版本递增；所有受影响根在同一 bump 记录中；迁移对缺失/冲突有明确、可测试的拒绝；旧 generation 未改。

### 失败处理
- 只 bump header 不处理迁移：读取旧文件失败或语义丢失。
- 多根变化拆成多条 bump 记录：历史链允许，但同一转换应可被一条记录完整解释；评审要求覆盖完整转换。
- 迁移冲突时发布后继：违反“拒绝且不发布”。

### 例外
没有 shipped profile 发出的记录类型（如 developer 记录）可以只定义持久化形状，provider 序列化/自动发出/UI 支持延后；但读取接纳必须明确。

来源：deepseek-harness/docs/persistence-changes/README.md:51-61@687f282e 来源：deepseek-harness/docs/persistence-changes/README.zh.md:51-61@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-16-session-format-v4.md:24-106@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-16-session-format-v4.md:107-117@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-16-session-format-v4.schema.json:1-16212@687f282e


<a id="persistence-current-records.verifier-trust-boundary"></a>
## 17. 验证器信任边界

### 触发
准备说“验证通过所以兼容/安全”；评审 CI 绿灯；设计迁移验收。

### 源仓义务与实现事实
自动检查能证明：
- 历史图结构正确、摘要匹配、当前根与最新记录一致（`deepseek-harness/docs/persistence-changes/README.md:76-76@687f282e`）；
- 英文/中文机器声明相等（`deepseek-harness/docs/persistence-changes/README.md:44-44@687f282e`）；
- 记录中写下的 `decision: same-version` 满足历史/schema/header 版本约束（`deepseek-harness/docs/persistence-changes/README.md:63-63@687f282e`）；
- 保留检查点的哈希未被改动（`deepseek-harness/docs/persistence-changes/README.md:78-78@687f282e`）；
- 当前树一致性（`--check`）（`deepseek-harness/docs/persistence-changes/README.md:63-63@687f282e`）。

自动检查**不能**证明：
- 记录是如何编写的、是否有**人**评审过（`deepseek-harness/docs/persistence-changes/README.md:63-63@687f282e`）；
- 兼容性说明中的读取器行为真的成立（检查器只校验声明与类型分类，`deepseek-harness/docs/persistence-changes/README.md:69-69@687f282e`）；
- 类型之外的运行时验证/行为（`deepseek-harness/docs/persistence-changes/README.md:80-80@687f282e`）；
- 检查点与其权威记录没有被**一起**修改（`deepseek-harness/docs/persistence-changes/README.md:78-78@687f282e`）；
- 已被某条确认记录覆盖的转换（`--check` 看不见，`deepseek-harness/docs/persistence-changes/README.md:63-63@687f282e`）；
- 基线来自某个 Git ref/远端/发布检出（基线只在树内，`deepseek-harness/docs/persistence-changes/README.md:78-78@687f282e`）。

### 使用规则
1. 把验证器当“形式一致性门禁”，不是语义安全证明。
2. 记录里的 Verification 段落是**证据索引**，评审要能复跑命令。
3. 涉及安全解释的结论必须由人给出双向读取器论证。
4. 不把 CI 绿灯写成“兼容性已被证明”。

### 失败处理
- 验证器通过但语义可疑：评审阻塞，要求行为测试/旧读取器证据。
- 检查点哈希通过但怀疑联合篡改：走权限/审计，不是重跑验证器。
- `--check` 通过但 base/head 有差异：用 `persistence-review` 补看。

来源：deepseek-harness/docs/persistence-changes/README.md:61-63@687f282e 来源：deepseek-harness/docs/persistence-changes/README.md:69-69@687f282e 来源：deepseek-harness/docs/persistence-changes/README.md:76-80@687f282e 来源：deepseek-harness/docs/persistence-changes/README.zh.md:63-63@687f282e 来源：deepseek-harness/docs/persistence-changes/README.zh.md:78-78@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-16-session-format-v4.md:96-96@687f282e


<a id="persistence-current-records.commands"></a>
## 18. 命令、字段与文件速查

| 名称 | 类型 | 用途/出处 |
|---|---|---|
| `kind: persistence-change` | 前置元数据 | 标识变更记录（`deepseek-harness/docs/persistence-changes/README.md:35-35@687f282e`） |
| `schemaVersion: 1` | 声明字段 | 当前声明格式版本 |
| `baseline: true/false` | 声明字段 | 仅初始清单为 true |
| `previous` / `after` / `decision` | 声明字段 | 前驱记录 id / after 摘要 / `same-version`\|`version-bump` |
| `pnpm exec tsx scripts/gen-persistence-catalog.ts` | 生成 | 生成当前目录/清单（`deepseek-harness/docs/persistence-changes/2026-09-11-initial.md:273-277@687f282e`） |
| `pnpm run persistence-changes --baseline <id>` | 生成 | 创建基线及其快照（同上） |
| `--decision same-version` | CLI | 对被分类器标记的变更显式选择同版本（`deepseek-harness/docs/persistence-changes/README.md:61-61@687f282e`） |
| `--check` | CLI | 只验证当前树一致性（`deepseek-harness/docs/persistence-changes/README.md:63-63@687f282e`） |
| `persistence-review` | 评审工具 | 比较 base/head 清单（`deepseek-harness/docs/persistence-changes/README.md:63-63@687f282e`） |
| `createPersistenceFinalizationCheckpoint` | helper | 写新版本检查点并推进 `latestFinalizedVersion`（`deepseek-harness/docs/persistence-changes/README.md:42-42@687f282e`） |
| `pnpm run verify-translation-pairing --write <file.md>` | 生成 | 重记双语配对侧车（`deepseek-harness/docs/persistence-changes/2026-09-11-initial.i18n.yaml:4-4@687f282e`） |
| `pnpm run doc-sync` | 门禁 | 含持久化历史与翻译配对（`deepseek-harness/docs/persistence-changes/2026-09-21-user-question-reply.md:57-57@687f282e`） |
| `finalized/vN.json` | 生成/只追加 | 已接受基线的根分类/摘要与记录语义哈希（`deepseek-harness/docs/persistence-changes/README.md:40-40@687f282e`） |
| `YYYY-MM-DD-slug.{md,zh.md,i18n.yaml,schema.json}` | 四件套 | 见 [四件套](persistence-record-format.md#persistence-current-records.record-quadruple) |

**快照节点速查**：`object`（`properties`/`indices`）、`union`（`types`）、`literal`（`value`）、`primitive`（`type`，含 `never`）、`array`（`element`）、`tuple`（`elements`）、`opaque`（`reason`）。根对象字段：`key`、`kind`、`event?`、`surface?`、`digest`、`schema{root,nodes}`；顶层为 `formatVersion`、`roots`（根数组）、`types`（本目录 16 个快照中均为空数组）。


<a id="persistence-current-records.adoption"></a>
## 19. 迁移到其他项目（参数化）【迁移设计】

1. **保留四件套与声明语义**，替换命名：`root` 用你的 header/envelope/event 命名；`previous` 用你的记录 id；摘要算法可换，但必须只覆盖声明类型。
2. **先立基线**：一次性为完整根清单写 `baseline: true` 记录，所有 `previous: null`。
3. **绑定完整决策表**：按[兼容性owner](persistence-compatibility.md#persistence-current-records.compatibility-decision)分类；新增根仅kind=event且surface=false可进入已确立same-version，surface／非event新增及任意root删除均需评审，header版本变化必须bump。
4. **实现最小验证器**：检查声明 YAML 可解析、`previous` 存在且无环/无重复后继、`after` 与快照摘要一致、当前生成清单与最新记录一致、中英声明相等。
5. **生成快照**：根 + 规范化节点图 + 每根摘要；删除根用 tombstone。
6. **配对侧车**：按标题分段哈希，代码块排除；提供 `--write` 重记命令。
7. **定稿检查点**：只追加 `finalized/vN.json`，记录不变的根摘要与记录语义哈希；双语文档同步版本字段。
8. **CI 接线**：把上述检查放进必过 job；注意 CI 只做形式接受，语义评审另设。
9. **归档分离**：历史 tag 比较单独存放，明确标注“不作为当前确认”。

**必需支持**：可解析的YAML声明、确定性摘要、生成器、前驱图校验、双语／分段哈希工具、只追加检查点存储及评审清单。缺任一支持时记录缺项、已有证据与解除条件，补齐前暂停依赖它的接受、发布或兼容声明；不得以手填生成物、缩减四件套或人工评审替代机器义务。


<a id="persistence-current-records.limits"></a>
## 20. 证据限制

- 本域只覆盖 `docs/persistence-changes/` 的 67 个当前记录文件；验证器、生成器、定稿 helper、发布归档、模板与配对实现均由其他域拥有，行为以 README 的声明为据，未在本域复跑。
- 16 份 `.schema.json` 采用结构解析（根集合、节点种类、摘要、`never`/union 分支、与声明逐根比对），**不是**逐行散文阅读。
- 本域无法验证：CI 是否真的挂了这些门禁；检查点与权威记录是否被联合篡改；记录是否经人评审；中文与英文的逐句翻译质量（16 份中文正文与 `README.zh.md` 已逐行 raw 阅读并与英文机制对照，长行按 768 显示单元上限单独复读——中文 v4 第 94/102 行、中文 README 第 67 行；机器声明逐字节相等，但未做翻译质量审计）。
- 记录 id 的日期不保证等于历史顺序：`2026-09-19-external-subagent-catalog` 的 `previous` 是 `2026-09-20-unknown-child-catalog`；以声明图为准。
- `--check` 不能发现已被确认记录覆盖的转换；必须配合 base/head 清单比较。
- 摘要不是运行时验证，也不覆盖纯行为变化或不透明值内部结构。

