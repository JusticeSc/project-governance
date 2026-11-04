# 散文审查：完整命题、位置覆盖与痕迹校准

本页是可直接执行的散文审查程序，覆盖 Markdown 正文、公开与内部注释、模块注释、测试说明、README、决策记录与复盘、技能与 agent 指令、prompt、用户或模型可见字符串以及诊断文案。入口编排见 [aw-19](workflow-language-and-prose.md#aw-19)；写作事实、预算与一处一段的当前归属见 [文档结构、放置与写作](documentation-structure-and-prose.md#prose-budgets)；包合同、JSDoc 与可编译示例见 [包 README、注释与 API 文档](documentation-package-and-api.md#code-equivalence)；双语最小更新与重录见 [双语文档](documentation-localization.md#translation-workflow)；链接、锚点与引用策略见 [Markdown 链接、仓库引用与网站投影](documentation-links-and-repository-policy.md#markdown-gates)。本页拥有审查顺序、命题判定、位置责任与正反例校准；它是编辑判断程序，不是检查脚本、评分器或词表，任何搜索命中与门禁输出都不能替代对原文的语义判断。

## 1. 触发、范围、模式与权限

<a id="prose-review"></a>

**触发。** 写作、评审、恢复、删除或压缩上述任一类散文；判断“这段是否像推理残留”；修订 README、JSDoc 或可见字符串；为一次改动查找多余文字或缺失合同时读本页。

**必需输入。** 显式 scope：路径、glob、PR diff 或明确的文件列表，并记录当前分支或 PR base。scope 缺失时报告缺输入并停止；不推断全仓范围，也不为补齐 scope 开始访谈。

**模式。** `mode: automatic | interactive`，默认 `automatic`。mode 只控制是否提问，不授予写权限。automatic 下对已授权的明确改动直接执行，只报告真正的 borderline；interactive 仅在用户明确要求提问或校准时启用。

**权限。** 评审与审计只报告，不把建议写进工作树、不改可见字符串、不顺手修相邻文件。只有明确请求写、修、trim、重构或恢复时才修改，且改动范围仍受 scope 限制。

**排除。** `vendor/` 永远排除，即使 scope 声明为全仓；不跟随符号链接进入。冻结历史区（源仓库为 `.agents/notes/archived/`）只可读，用于理解引用，不现代化其散文或出站链接。生成目录、快照与录制 fixture 是 derivative，不作为散文目标直接改；先改 owner 再重生成。目标明确声明的校准样例是证据，不按正文违规处理。排除规则放在 include 之后，例如搜索参数末尾排除 `vendor/**`，Git 使用 `:(exclude)vendor/**`；scope 只剩被排除内容时报告“无合格文件”，不声明通过。

**不扩大 scope。** 不为追求命中数或删除量扫描无关分支、历史提交或其它仓库；学到新规则后先复查 scope 内同类段落，再决定是否扩大授权。

## 2. 先读事实所有者

判定一段文字之前，先读拥有该事实的地方：根与更具体的常驻规则文件、目标页、其源码、类型、测试、生成器模板、包元数据与当前决策记录。

证据按“源文件/测试/运行输出/生成器”优先于“相邻文档/记忆”；对操作类声明，唯一可采纳的证据是实际运行过它。运行环境不可用就报告覆盖缺口，不保留一条更流畅的猜测。

生成摘要有额外责任：确认生成器抽取哪一句、哪个字段，被抽取片段必须在生成表面自足；不要把完整合同藏在后续段落，也不要在散文审查中只手改生成物。

先读后判：未读 owner 就删除的句子按“不受支持删除”处理；读过 owner 后，处置才可以是 keep、trim 或 restructure。

## 3. 完整命题与位置覆盖

<a id="complete-proposition"></a>

删除或改写任何子句前，列出该段全部命题，逐项确认：行为者与动作；条件、时机与顺序；模态（must/may/never/默认/可能）；否定保证与例外；所有权转移、副作用、失败模式与后果。

只有每个事实子句都存活、且结果更清楚时才删形容词、重复与叙述；词数变少本身不是改进。改写不得把“可能”写成“会”，不得把“默认”写成“总是”，不得把“待迁移的例外”写成“已批准的例外”。

两个必须记录的失败：**命题丢失**——改写后某个相关事实消失、条件或强度改变，或使用点必需的本地合同被移走；删除重复字句但同一命题完整保留不计丢失，非本地细节合法迁至 owner 并留可解析链接也不计丢失。**不受支持声明**——新写或保留的断言没有 owner、测试、运行输出或生成器支持。任一失败成立就不是有效修剪。

检查四类过度修正：把义务翻转成背书；把假设升为已交付特性；把真事实随叙述一起删除；保留数字却丢掉测量来源。同一句混有叙述与合同时删子句，不删整句。

局部覆盖：调用方或维护者在该位置需要的合同（行为、失败、所有权、后果）必须留在本地；架构、理由、算法、历史与扩展示例链接到 owner。一个解释只有一个家，必要合同事实可以在使用点重复，但重复的必须是合同而不是清单。

| 位置 | 本地必须保留 | 细节 owner |
|---|---|---|
| 公开 JSDoc/类型注释 | 调用方可见的返回区分、throws 或 rejection、副作用、所有权、时机、取消、耐久 | [包 README、注释与 API 文档](documentation-package-and-api.md#code-equivalence) |
| 内部注释 | 非局部结构、不变量、竞态顺序、所有权、安全边界、意外失败；删除控制流复述 | [包 README、注释与 API 文档](documentation-package-and-api.md#code-equivalence) |
| 模块注释 | 角色、依赖、职责、非显然架构选择及其链接 | [包 README、注释与 API 文档](documentation-package-and-api.md#code-equivalence) |
| 测试 | 只解释非显然设计：fixture、断言为何观察外部结果、平台适配、真实入口 | [aw-19](workflow-language-and-prose.md#aw-19) |
| cookbook | 前置、动作、真实入口、可观察验证、简明警告 | [文档结构、放置与写作](documentation-structure-and-prose.md) |
| README | 配置、语义、失败、限制、扩展点、模型可见影响；生成目录只链接 | [文档结构、放置与写作](documentation-structure-and-prose.md#prose-budgets) |
| 决策记录 / Agent Note | 独有理由、机制、替代、后果、已实现验证证据与具名覆盖缺口；implemented 陈述已交付现实，删计划清单而不删证据；proposed / 部分实施记录保留所需计划、迁移步骤与验收 | [决策格式与生命周期](decisions.md#note-format) |
| 事故与复盘 | 事件序列、证据、因果链、影响与预防；不删除建立因果所需的独有细节 | [文档结构、放置与写作](documentation-structure-and-prose.md) |
| 技能与 agent 指令 | 行为护栏、显式范围限制（如“指导而非脚本”）、最短工作流与真源链接 | [aw-19](workflow-language-and-prose.md#aw-19) |
| 示例与配置注释 | 访问限制、非显然 wiring 或加载顺序的理由、安全立场、replay、例外、误用 | [文档结构、放置与写作](documentation-structure-and-prose.md#prose-budgets) |
| prompt 与用户可见字符串 | 措辞即行为：文本、可访问名、tooltip、placeholder、格式模板；更新 owning 快照 | [双语文档](documentation-localization.md#translation-workflow) |
| 诊断 | 失败 subject 或 path、违反的规则、非显然的修正方式；删内部执行叙述 | [aw-19](workflow-language-and-prose.md#aw-19) |

## 4. 六类处置与 borderline

对每个候选用且只用一种处置，并在报告中说明依据。

- **keep**：命题完整且位置正确；即使句子较长、含 old/new、issue 号或测量值也保留。长度不是删除理由。
- **add**：该位置缺少调用方或维护者需要的合同；补最小充分句子，不搬整篇架构说明。
- **trim**：只删装饰、重复、推导转录、会话视角，或已有澄清链接的扩展；删后用 §3 复核。
- **restore**：历史修剪丢失了条件、否定、所有权、失败方向或证据源；按 owner 恢复事实，不换成同义但更弱的话。
- **restructure**：事实归属错误或一段混合多个 job；迁到 owner、留链接，并保留本地必要合同。
- **defer**：需要另一个 owner（生成器、可见字符串快照、双语配对、决策记录）或缺少授权与证据；记录推迟对象、原因与缺失证据，不静默并入散文改动，也不把“无法核实”写成确定事实。

borderline 的定义：至少两个版本都满足完整命题规则，且确实在已接受原则之间取舍，而现有 owner 未解决该取舍。只有一个命题保全答案的改写不是 borderline，不在 automatic 模式下提问。

interactive 下按同一原则归组相似段落，给两三个真实可行版本并推荐一个，说明事实或结构差异，不提供劣质陪衬；遵循用户指定渠道，PR 行内校准时把临时推荐放在确切 diff 行并附替代。用户决定后把原则与版本写入目标自己的校准样例（不带 PR 史或评审者叙述），再复查 scope 内同类段落。

不要为满足删除目标制造改动，也不要用“保持原样”回避已确认的合同缺失。

## 5. owner-first、derivative 与可见字符串

先改 owner，再改 derivative：源 JSDoc、生成器模板或场景数据 → 重新生成目录、共享区域与快照 → 复查每个消费者。双语 pair 没有永久 owner，可先写任一侧，另一侧最小更新并重录配对记录；双语代码围栏逐字复制，不分别翻译。

可见字符串按行为处理：用户可见文案归 typed locale dictionary，以显式本地化参数到达无框架基元；一起检查文本、可访问名、tooltip、placeholder 与格式模板；更新 owning 可运行快照并运行目标要求的 UI/i18n 证据。scope 内没有 owning 场景时保持措辞不变并报告 defer（可建议扩大授权范围），不得只改源句或只手改生成物。

模型可见文本同理：属于本包的稳定 prompt、结果与错误文本引用本包 owner；其它包的 schema 与文案只链接，避免两处漂移。

不要依赖源仓库路径、私有消费项目或维护者会话；目标以其自身 owner、命令与路径为准。

## 6. 精确门禁与语义判断的分界

先把“已由机械检查证明的事实”和“需要语义判断的事实”分开。下表是常见边界，具体命令与参数以目标仓库配置为准。

| 检查 | 能证明 | 不能证明 |
|---|---|---|
| Markdown 行与换行门禁 | AST `paragraph`（含列表、引用内段落）未跨物理行；围栏与 HTML 注释行按模型排除 | 标题单行（仍需评审）；语义质量；生成区域内容正确 |
| 文档预算 | 清单内文件的空白分隔词数、缺失文件、非法上限 | 内容应否迁移、目标值是否过时、未列文件是否膨胀、升限理由 |
| 链接、锚点与仓库引用策略 | 目标可解析、锚点存在、声明的引用规则 | 链接文字是否准确、事实是否仍为真、读者能否正确使用 |
| 双语配对与结构签名 | 结构一致、记录时两侧内容块相同 | 译文忠实、语义等价、术语是否恰当 |
| 生成器 `--check` | 生成物与当前源一致 | 被抽取摘要是否在生成表面自足 |
| README、类型等价与骨架门禁 | 形状、元数据、断言覆盖的结构 | 合同真实、限制完整、示例可运行 |

报告时区分“实际运行并通过”“未运行”“不适用于本目标”；不要把门禁绿解释成事实正确，也不要把评审通过说成自动保证。

候选发现只用作文本定位：词表、正则、词数统计与搜索命中都是探针，不是拒绝规则，也不是通过证明。没有批准的禁词表；`contract`、`boundary`、`shape`、`surface`、`seam`、`gate`、`vocabulary` 使用前核对是否有更精确的规则、API、字段、类型或时点术语，确为技术义务或字面边界时保留。

判定推理痕迹时先读 [八类泄漏与保留例外](workflow-language-and-prose.md#cot-leakage-review)：死亡会话引用、PR视角、变更叙述/版本戳、评审编排、面向评审者的辩护、推导转录、hedge/计划残留及作者语言滑落分别判断；可解析性、所在表面和保留规则一起决定，不按词形直接删除。该页拥有完整分类与召回电池，本页拥有命题保全和量化校准，不复制两套规则。

同样不设“散文一律不得被测试”的禁令：稳定且模型或用户可见的字符串可以由 owning 场景或快照钉住，作为行为证据；被禁止的是把文本搜索或快照通过当作语义质量、命题完整性或事实正确性的证明。

## 7. 探针校准与计数

<a id="calibration"></a>

每个探针在用于 scope 前，先证明它能命中一个已知 positive（确为残留或坏散文的实例），并拒绝一个近似合法的 negative。例如 `this PR` 命中 “this PR adds”，但 `this project`、`this process`、`this provider` 只是词形近似；`used to` 命中变更叙述，但 “the key used to sign requests” 是职责描述；`§\d` 命中未提交草稿的节号，但 “RFC 9110 §10.1.5” 与拥有自身节号的已提交文档合法；`reviewer` 命中评审编排，但描述人类评审角色与轮次的流程合同合法。大小写、隐藏目录与排除项按目标工具设置，先验证探针本身再解释命中。

搜索隐藏目录（如 `--hidden` 或等价选项），路径只取授权 scope，末尾排除 `vendor/`、依赖目录、冻结历史区与录制 fixture；不跟随符号链接进入。

不只读命中：对 scope 内最密的散文做无模式通读——模块 JSDoc、README、决策记录与复盘、长诊断、提示词。探针同时会 over-match 和 under-match；每轮实际审查都可能发现探针漏掉的案例，这是程序的已知限制，不是可以把命中数当完整覆盖的理由。

记录计数而不是印象，字段如下。

| 量 | 定义 |
|---|---|
| 候选 C | 探针在 scope 内返回且逐个语义判断过的段落数 |
| 真阳性 TP | 候选中确认为残留、坏散文或合同缺失的段落数 |
| 误报 FP | 候选中判定为合法保留的段落数（C − TP） |
| 漏报 FN | 无模式通读发现、探针未返回的确诊段落数 |
| 命题丢失 ML | 已改动段落中至少一个已列命题消失的次数 |
| 不受支持声明 UC | 新写或保留但无 owner 或证据的断言数 |

precision = TP / C（C>0 时），recall = TP / (TP + FN)。这些量用于校准探针与暴露通读漏报，不设通过阈值，不能当作质量分数；某类案例少时只报告计数与具体样例，不用百分比制造精度。

示例记法（说明如何记录，不是实测值）：一个探针返回 `C` 条候选，语义判断后 `TP` 条确诊、`FP` 条合法保留；无模式通读另发现 `FN` 条探针漏报；本轮改动造成 `ML` 次命题丢失和 `UC` 条不受支持声明。没有实际计数就写“未计数”，不填估计值。

修复后重跑并复核，期望剩余命中只属于受保护保留项：issue 与 PR 引用、suppression 理由、反事实现在时回归 pin、测量边界、运行时 old/new 状态、外部标准或具名外部资源、项目声音与体裁形式，以及本页自身的校准样例。命中数下降不等于质量提高，仍按上表判定。

## 8. 坏例与合法近似例

以下每组给出一个坏例和一个表面相近但合法的版本；判据是命题与可解析性，不是词形。示例只说明原则，不作为文本模板直接复制到目标仓库。

### 8.1 时序与所有权

- **坏：** “Provider work is cancelled during teardown.” 谁请求取消、何时相对于释放子作用域、谁负责 join 全部丢失。
- **合法近似：** “The runtime requests provider cancellation before releasing the child scope; the provider joins its workers before disposal resolves.”
- **判据：** 动作主体、顺序与完成保证都是调用方可见合同；句子在描述过程不构成删除理由，缺少具体主体与保证才是。

### 8.2 失败丢失

- **坏：** “Returns the realm global.” 丢掉未初始化与已释放两种拒绝条件。
- **合法近似：** “Returns the initialized realm global. Throws if initialization has not completed or the realm has already been disposed.”
- **判据：** throws 与前状态是调用方合同；第二句不是对内部状态机分支的复述，而是公开失败面。

### 8.3 叙述与不变量

- **坏：** “循环先检查值是否缺失，缺失就提前返回，否则继续，所以最后断言是安全的。” 复述控制流，读者得不到独立事实。
- **合法近似：** “配置为空时在取得写锁前返回，因此读者不会看到半应用的策略。”
- **判据：** 顺序本身不是问题；没有后果或不变量的推导才是叙述。删推导，不删不变量。

### 8.4 仅会话引用与合法历史或 issue 引用

- **坏：** “(decision 7)”“design §4.7 of the uncommitted draft”“this PR adds”“as of v5 of this note”；HEAD 读者无法解析。
- **合法近似：** “issue #1470 owns the follow-up”；决策记录或复盘中的 “merged in PR #1382 …” 作为证据；“escapes per RFC 9110 §10.1.5”；已提交且拥有自身节号的文档按节引用。
- **判据：** 任何 HEAD 读者无需会话即可解析并验证即合法；但在当前状态表面（README、docs、JSDoc）上，即便可解析的变更故事仍要重述为现在时，历史归其记录 owner。区别在解析性与表面，不在“看起来像历史”。

### 8.5 过度修剪与必要长度

- **坏：** “The adapter normalizes provider errors.” 丢掉转换目标、失败类别与调用方收益。
- **合法近似：** “The adapter converts provider errors into the shared error type so callers can handle authentication, rate-limit, and transient failures uniformly.”
- **判据：** 必要长度来自不同事实；只有链接或邻接合同已列出这些类别时才可以缩短，词数少本身不是理由。

### 8.6 缺失合同与重复清单

- **坏（缺失）：** 模块注释只有 “Worker realm support.” 角色、单次初始化、disposal 终止 worker 并拒绝后续调用全部缺失。
- **坏（重复清单）：** “Search provider 先加载文件系统 provider，再加载策略插件，然后加载 read/write/edit 工具”，而配置文件本身已显示加载顺序。
- **合法近似：** “Owns the worker realm and its host bridge. Realm initialization is single-shot; disposal terminates the worker and rejects later calls. See the worker-isolation note for the protocol rationale.” 或 “Load policy before the model-facing tools so their write and edit calls pass through the read-before-mutation gate.”
- **判据：** 先问代码、配置或生成目录是否已经显示这条信息。已显示则删清单、保留后果；未显示且调用方需要则补最小合同。生成摘要取第一句时，该句必须自足。

## 9. 完成信号与报告

一次散文审查的完成信号：每个改动都能指出保留的命题与依据；owner 先于 derivative，生成物已重生成；可见字符串有 owning 行为证据或明确 defer；最终 diff 只包含归因于本次 scope 的文件，无 `vendor/` 路径、无冻结历史区改动、无未解释的生成物差异；Markdown 散文段落保持一处一段（一个物理行），换行与预算细节归 [写作、预算与审查](documentation-structure-and-prose.md#prose-budgets)；报告列出实际运行与未运行的检查。

报告格式：scope 与 base；明确改动；有意保留及其理由；推迟项与缺失证据；候选计数（§7）；已运行检查及其覆盖；最终 diff 的逐文件核对结果。发现意外文件、vendor 命中或无法解释的生成物差异时报告并保持未决，不声称“已干净排除”。

失败处理：scope 缺失即停；操作声明无法复现则删除或标为覆盖缺口；找不到 owner 先补 owner 再改文字；探针与判断冲突时读原文，不用命中数投票；未获授权不修改。

证据边界：本程序不能自动证明事实正确、命题保全、译文忠实或消费者集成；门禁与探针只覆盖各自形态，语义结论仍归独立评审。

## 来源与归属

本页的审查顺序、命题清单、位置责任与校准样例改写自 DeepSeek Harness 固定提交 `687f282e` 的 `dsh-prose-standard/SKILL.md`、`dsh-prose-standard/references/examples.md`、`dsh-trim-cot-leakage/SKILL.md` 及其 examples 与 recall batteries；许可与再分发条件见仓库 `SOURCE-LICENSE.txt`。示例用于说明原则，不是可直接套用的文本模板；正文不依赖源仓库路径、私有消费项目或维护者会话。
