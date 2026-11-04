# 翻译、文档与推理轨迹处理

[代理流程索引](agent-workflows.md)只作任务导航，本页拥有具名操作条件。来源标记说明固定提交687f282e的义务、事实及适配，不代表已运行。来源的pnpm／change-scope／gh stack等命令与目录是其绑定；目标须用真实现有工具实现同等作用，不得把未分发的来源命令冒充本产品能力。未有commit的空项目按空树与实际新文件核对范围，不伪造base／head；已有提交或PR则必须验证真实ref及各脏层。

<a id="aw-15"></a>
## 15. 翻译工作流：常规单遍与扩展用户调用

### 15.1 分工

`【源义务】` 常规 agent 工作由工作代理直接单遍更新对应文件，**不**调用翻译技能、不生成 briefing、不单独做翻译评审、不委派子代理。扩展 `dsh-translate-docs` 只在用户显式按名调用时运行（`docs/i18n/README.md:67-69`、`dsh-translate-docs/SKILL.md:10-12`）。

`【源义务】` `dsh-translate-docs` frontmatter 设 `disable-model-invocation: true` 与 `user-invocable: true`，把“只能人工调用”编码进运行时策略，而不是只写在正文里（`dsh-translate-docs/SKILL.md:1-8`）。

### 15.2 扩展技能的三条路径

`【源义务】` 按变更类型分流（`dsh-translate-docs/SKILL.md:18-25`）：

- **Update**（pair 存在、一侧编辑）：briefing 驱动的增量路径。**绝不**为应用更新而整篇重译——最小更新保留未变内容的已评审措辞；重译会丢掉那次评审。
- **New pair**（尚无对应）：整篇路径。
- **Deleted/renamed doc**：同时删除/重命名 counterpart 与 `.i18n.yaml`；否则门禁报告不完整 pair。

`【源义务】` 冻结的 `.agents/notes/archived/` 不是翻译工作；其完整三件套由 archive verifier 封印；归档后永不再更新、重录或修复任一侧（`dsh-translate-docs/SKILL.md:24`）。

### 15.3 更新路径

`【源义务】` （`dsh-translate-docs/SKILL.md:26-35`）：

1. `pnpm run gen-translation-brief <pair 中任一文件>`；无参数则对所有 out-of-sync pair 生成。briefing 按最窄安全对齐粒度映射变更：Markdown 单元（段落、表行、列表项、标题）→ 整节 → 整篇；包含 authored 侧自上次确认一致以来的 diff、每个变更单元的上次确认源文/当前源文/当前 counterpart（带行号）、涉及的术语行、首次出现移动说明、绑定更新规则摘要。
2. **纯机械 diff → `--apply`**：当所有变更都在两侧字节一致的 code fence 内，briefing 会说明；`pnpm run gen-translation-brief --apply <pair>` 把编辑后的 fence 拼进 counterpart 并在写入前做结构校验；无子代理、无手改。
3. **散文 diff → 委派子代理并传 briefing**（或生成它的命令）。briefing 是译者的全部工作集；子代理不重读指导语料、不重推 diff。只有 briefing 留下真正无法回答的具体决定时才升级到整篇来源。
4. **覆盖 diff 的最小编辑**：保留 diff 未触及内容的已评审措辞，逐句对照源文验证改动 hunk：不加、不丢、术语按内联行、code span 逐字。
5. **记录并作用域校验**：`pnpm run verify-translation-pairing --write <pair>` 再 `verify-translation-pairing <pair>`。`--write` 只命名你确认过的 pair；裸跑会被拒绝，批量重录必须显式 `--all`。

### 15.4 整篇路径

`【源义务】` 从头写译文时，编排代理不翻译：spawn 子代理。译者先读权威来源，再整篇翻译；长文档按节推进，每节结构锁源，而不是最后统一修结构。来源：`dsh-translate-docs/SKILL.md:36-47`。

必读：`docs/i18n/README.md`（pairing 契约）、`translation-rules.md`（忠实、结构保持、术语、排版）、`terminology.md`（双向绑定；翻译前加载，不是遇到不确定才加载）、`translation-prompt.md`（自动管线模板；agent 不渲染它）、`dsh-prose-standard`。

`【源义务】` 翻译两遍（`dsh-translate-docs/SKILL.md:48-57`）：

- Pass 1：读一个语义单元，用目标语言的原生技术作者语气重述；保留必需框架，不强行逐句对应。
- Pass 2：逐句对照源文验证：不加不丢、术语按表、code span 逐字。修法是重写句子，不是往句子里补词。
- 完成后单独读译文（不并排源文），重写只有孤立阅读才暴露的别扭表达。
- 只把最终文本写入文件，不写草稿或笔记。
- 术语表每个词按指定渲染；中文目标用中文与首次出现列；未列术语需可引用的中文 OSS/vendor 先例，否则保留英文并标「待定术语」；英文目标用英文列与既有英文术语；歧义源术语保留并加短注，列入 pending。不得内联发明渲染。
- 代码块两侧字节一致，含注释。仓库相对文档链接保持同一语义目标与精确 query/fragment：活跃双语语料内英文侧 `.md`、中文侧 `.zh.md`；缺失 in-scope counterpart 是错误；语料外保持 authored 路径；切换器是跨 locale 例外。
- pairing 门禁检查标题深度、fence、表行列数、列表类型、有序列表起点、列表项数、链接 locale、语义目标；Pass 2 人工验证列表/表顺序、非规范编号、inline code、强调、意义、术语、语气。

### 15.5 找活与收尾

`【源义务】` `pnpm run verify-translation-pairing --list` 打印每个 in-scope 文档的 missing/out-of-sync/ok；missing 与 out-of-sync 是契约违规。编辑配对文档的 PR 中，工作清单就是 diff：每个改动侧都要在同一 PR 更新 counterpart 并重录。收尾（`dsh-translate-docs/SKILL.md:58-71`）：

1. 切换器：中文文件 H1 后 `[English](foo.md) | 中文`；英文文件 H1 后 `English | [中文](foo.zh.md)`；新 pair 两侧都加，但 generator-owned 英文源保持与生成输出字节一致并省略切换器，中文 counterpart 仍回链。
2. `verify-translation-pairing --write <pair>` 重算并记录 per-section hash 到 `foo.i18n.yaml`；PR 中 yaml diff 是“我确认两侧同义”的可评审声明，只有真的确认后才跑。
3. 普通文档不需要 manifest 条目；只有 owning policy 记录真实 generated/instructional/bilingual-by-construction 排除时才改 `scripts/translation-pairing.manifest.json`。
4. PR 前 touched pairs 在作用域检查下为绿；`pnpm run doc-sync`（含全语料 pairing + `verify-md-wrap`/`verify-md-links`）按 `dsh-pre-push-checks` 在 PR 级跑一次，不在每个翻译任务内跑。
5. 保持 PR 可评审：说明哪些 pair 是新建、哪些是最小更新；显著列出「待定术语」。

`【源义务】` 回应翻译评审：遵循 `dsh-code-review` 的报告指导；术语评论以术语表为契约，把评审者的渲染决定应用到 `terminology.md`，而不只是一个文件（`dsh-translate-docs/SKILL.md:72-74`）。

### 15.6 执行卡片

- **前置条件**：`docs/i18n/` 契约存在；pairing 工具可运行；术语表可用。
- **步骤**：先区分常规 one-shot/one-pass 更新与用户明确点名的扩展工作流；常规更新按文档标准最小同步并 scoped 重录，不自动加载扩展技能。仅明确调用扩展工作流时判断 update/new/delete，生成 briefing 后按机械 `--apply`、委派或整篇路径执行，再 scoped `--write`/检查；全域 `doc-sync` 留在 PR 级一次运行。
- **责任者**：工作代理（常规单遍）；用户指定的译者/子代理（整篇）。
- **完成信号**：scoped pairing 检查结构、逐节 hash 与指定链接语义通过；物理行对齐、术语、意义、列表/表格顺序与散文质量另行评审。门禁通过不等于物理行数相等；本地3行/6行 pair 通过已实际观察。
- **失败处理**：结构校验失败时修结构而不是重录；`--write` 拒绝裸跑时显式给 pair；未列术语保留英文并标 pending。
- **例外**：generated 英文源无切换器；`.agents/notes/archived/` 不翻译；`translation-prompt.md` 不配对。
- **证据限制**：绿色 hash 证明记录与当前各节字节一致，不证明译文质量；自动结构与链接检查也不覆盖通用物理行数相等。常规/明确扩展的调用边界仍来自源技能1–12，不能因生成器存在就自动进入扩展路径。

---

来源：deepseek-harness/.agents/skills/dsh-translate-docs/SKILL.md:1-74@687f282e 来源：deepseek-harness/docs/i18n/README.md:7-69@687f282e 来源：deepseek-harness/docs/AGENTS.md:38-48@687f282e 来源：deepseek-harness/scripts/translation-pairing.manifest.json:1-13@687f282e 来源：deepseek-harness/scripts/gen-translation-brief.ts:1-40@687f282e 来源：deepseek-harness/scripts/verify-translation-pairing.ts:1-40@687f282e


<a id="aw-19"></a>
## 19. 文档、散文与推理轨迹工作流（跨域入口）

本域只保留**入口与工作流编排**；文档结构、预算、双语、站点发布属于 documentation 域，散文覆盖、编辑判断与校准程序见 [散文审查](prose-review.md#prose-review)，泄漏分类与保留例外由[推理轨迹分类](workflow-language-and-prose.md#cot-leakage-review)拥有。

### 19.1 `dsh-doc`

`【源义务】` 触发：创建/重构/评审/审计/迁移 Markdown、包 README、文档站点。工作流（`dsh-doc/SKILL.md:26-38`）：

1. 读根与更具体 `AGENTS.md`、`docs/AGENTS.md`、目标页、其源码/测试、导航 owner、双语记录。
2. 按一个主 job 与读者分类：产品 quick start、用户任务指南、贡献者教程、架构概览、包/子系统参考、生成参考、agent 指令、决策记录、scratch。
3. 放到最近 owner：包契约在包代码旁；`docs/` 用于跨包学习、用户、开发者、架构、讨论、会过期的 scratch。
4. 先定义读者起点、可观察结果、可能的失败、恢复路径、下一有用深度。
5. 加/改 YAML metadata，`kind` 映射模板；按 Summary、Table of Contents、用户内容、开发者内容、可选 Further Exploration、最终 Dev Note 顺序写。
6. 同 pass 更新双语 counterpart；标题、列表、表格、代码、链接、frontmatter 布局、物理行数对齐。
7. 对照代码/测试/生成器/包元数据/当前决策 owner 验证每个声明，并**运行页面指示的操作**。
8. 跑聚焦检查，再 `test:docs`、`doc-sync`、`lint`、`git diff --check`；先读完整 diff 查正确性，再读简洁性与仓库契合。

`【源义务】` Fact-check：操作声明的唯一可采纳证据是运行过它。分类 subject 前读事实（`package.json` 的 `dsh.bundle.patch`、入口形状）；对当前 checkout 运行每个声明操作；无法复现就删除声明；`git fetch origin` 后与 `origin/master` 比较旧页；每次编辑后重录 pair（如果启用双语）。来源：`dsh-doc/SKILL.md:39-48`。

`【源义务】` kind 系统：8 个 kind 各映射一个模板（package-group、package-reference、package-library、package-bundle、persistence-change、persistence-release、persistence-format、upgrade-guide）。新增 kind 必须同时有独立模板、明确仓库位置或声明 owner、聚焦检查。来源：`dsh-doc/SKILL.md:49-63`、`dsh-doc/references/metadata-links-i18n.md:30-52@687f282e`。

`【源义务】` Voice：Summary 说 subject 能做什么，不说角色/类型/内部身份；开发者节解释概念不枚举 API；Dev Note 是唯一 slop zone；普通文档只描述当前状态；受控技术英语（明确 actor、一词一概念、直接动词、拆开堆叠指令与条件、保留 modality 与例外）。来源：`dsh-doc/SKILL.md:64-73`。

**执行卡片**：前置=已知 scope 与目标页；步骤=读层级→分类→放置→元数据→写作→双语→验证；责任者=文档作者；完成信号=kind/模板/结构/预算/链接/双语/操作复现全通过；失败处理=声明无法复现则删；例外=tiny machine-owned/generated/parser-owned 格式可省 Summary/ToC；证据限制=绿色门禁不证明内容正确。

### 19.2 `dsh-prose-standard`

`【源义务】` 必须有显式 scope；缺失则报告并停止。`mode: automatic | interactive`，默认 automatic；mode 控制提问，不控制写权限。评审/审计只报告，明确请求的写/修/trim 才改。**总是排除 `vendor/`**，即使 scope 是全仓；不要跟随符号链接进入；排除放在 include 之后。也排除 `.agents/notes/archived/`。生成目录、快照、fixture 是 derivative；先改 owner 再重生成。双语 pair 无永久 owner；按 lightweight routine 更新并重录。来源：`dsh-prose-standard/SKILL.md:14-27`。

`【源义务】` 删任何词前先枚举命题，保留每个相关的：actor/action；condition/timing/ordering；modality（must/may/never）；negative guarantee/exception；ownership/side effect/failure mode/consequence。只有每个事实子句存活且结果更清晰时才删形容词、重复、叙述；更少词数本身不是改进。来源：`dsh-prose-standard/SKILL.md:28-43`。

`【源义务】` `contract/boundary/shape/surface/seam/gate/vocabulary` 是使用前核对的术语，不是禁词表：更精确的规则、API、字段、类型或时点优先；确为技术义务或字面进程/安全边界时保留。只有两个以上版本都保留完整命题且确有原则取舍才算 borderline。automatic 对已授权明确改动直接执行、真正边界只报告，不为了改写制造问题。interactive 只在用户明确要求时启用：按原则归组、给两三种真实可行版本、推荐与差异、不设劣质陪衬；遵循指定渠道，PR行内校准将临时推荐放在确切diff行并附替代。用户决定后把原则/版本存入目标自己的样例（不写PR史），再检查范围内同类段落。来源：`dsh-prose-standard/SKILL.md:10,18-20,65-81`。

`【源义务】` 按位置的最低覆盖（`dsh-prose-standard/SKILL.md:44-62`）：公开 JSDoc（返回区分、throws/rejections、副作用、所有权、时机、取消、耐久）；内部注释（非局部结构、invariant、race ordering、ownership、security boundary、意外失败）；模块注释（角色、依赖、职责、非显然架构选择）；测试（只解释非显然设计）；cookbook（前置、动作、真实入口、可观察验证、警告）；README（消费者契约）；Agent Notes（独有理据、机制、替代、后果、shipped 验证证据、命名覆盖缺口）；postmortems（事件序列、证据、因果链、影响、预防）；技能与 agent 指令（行为护栏、显式范围限制）；示例与配置注释（访问限制、非显然 wiring/load order、安全立场、replay、例外、误用）；prompt 与可见字符串（措辞即行为；typed locale dictionary；跑 `verify-client-ui-i18n`；更新 owning 快照）；诊断（失败 subject/path、违反规则、修正）。

**执行卡片**：前置=scope + mode + 分支/PR base + 适用 AGENTS；步骤=读文档标准与 owner→检查范围→分类 keep/add/trim/restore/restructure/defer→先改 owner→跑窄检查与 `git diff --check`→报告；完成信号=每个改动保留完整命题、owner 先于 derivative、无 vendor 路径；失败处理=scope 缺失即停；例外=vendor 与 archived 排除；证据限制=编辑判断不可自动证明。

<a id="cot-leakage-review"></a>

### 19.3 `dsh-trim-cot-leakage`

`【源义务】` 一条测试：**HEAD 上的读者，无法访问任何 session transcript、PR thread 或未提交草稿，能否解析每个引用并验证每个声明？** 否则把存活事实按仓库视角重述并删除其余；能则不是泄漏。但可解析只过本技能门槛；当前状态面（README、docs、JSDoc）上的可解析变更故事仍是 change narration，归 class 3。来源：`dsh-trim-cot-leakage/SKILL.md:8-13`。

`【源义务】` 8 类：死亡设计会话引用（`(decision 7)`、`(audit C2)`、`design §4.7`、phase label、`(B ruling)`）；栈/PR 视角（"a later PR in this stack"、"this PR adds"）；变更叙述与版本戳（"used to"、"no longer"、"v1"、"this cut"）；评审编排（"Rejected in review"、draft ordinal）；面向评审者的辩护（"the cast is safe — it simply…"）；复述与推导转录（control-flow narration、test walkthrough）；hedge 与计划残留（"probably fine for now"）；作者语言滑落（英文中的中文片段，或反向）。来源：`dsh-trim-cot-leakage/SKILL.md:14-24`。

`【源义务】` Keep 规则（`dsh-trim-cot-leakage/SKILL.md:25-38`）：issue 引用；Agent Note/postmortem 中的 merged-PR/issue 引用；suppression 理由（`oxlint-disable … -- reason`、coverage-ignore、空 catch 解释）；反事实现在时回归 pin；测量边界；运行时 old/new 状态；note change-story 节内的历史阶段名；仓库外按设计解析的引用（RFC 节、Figma 帧名）；项目声音与体裁形式。

`【源义务】` 工作流（`dsh-trim-cot-leakage/SKILL.md:39-45`）：先只读审计，跑 recall batteries（带 `--hidden` 搜 `.agents/`），每个探针先用 known positive 与 near-miss negative 校准；电池是探针不是定义，还要无模式读最密散文。修 owner-first：生成目录→追消费者→改源 JSDoc/模板→重生成；`type-equiv` fence→改源 JSDoc→两侧重贴；双语散文→最小更新并重录；双语 fence→逐字复制到两侧再重录；模型/用户可见字符串→按 prose standard 且只在有 owning 行为证据时改，否则报告推迟。删前枚举命题并查 overcorrection traps（把义务翻转成背书、把假设升为 shipped、删真事实、丢证据源）。验证：重跑电池，期望只剩 sanction keep、技能自身目录、owning note 引用证据；确认每个剩余引用在 HEAD 可解析；跑 touched surface 门禁。

**执行卡片**：前置=scope + 排除 vendor/archived；步骤=只读审计→语义判断→owner-first 修→命题检查→重跑；完成信号=无未解析引用、无变更叙述、keep 项有理由；失败处理=不确定时保留并报告；例外=keep 规则；证据限制=电池 over-match 且 under-match，必须人工判断。

#### 可执行的召回与校准

把以下正则分别交给可搜索隐藏目录的搜索工具，搜索路径仅取明确授权的 scope。使用 `--hidden` 或工具等价选项，同时最后排除 `vendor/`、`node_modules/`、`.agents/notes/archived/`、录制 fixture/snapshot；不跟随符号链接进入这些目录。源技能自身的校准目录也排除；目标技能中明确引用的校准材料是证据，不是正文使用违规。不要扩大 scope 来追求命中数。这里的搜索结果都是候选，**不是自动拒绝规则**。

英文探针中第一条区分大小写；第2–6条忽略大小写；第7条搜索节号本身。每条先确认能命中一个已知 positive，并拒绝一个 near-miss negative，然后才用于实际 scope：

1. `\(decision \d|\(audit [A-Z]\d|design §|plan §|design ledger|\(B ruling|\bP-I\b|\bW\d\b|\bT\d\b`
2. `\bthis PR\b|\bthis branch\b|\bthis stack\b|\blater PRs?\b|\bprevious commits?\b|\bthis commit\b`
3. `\bused to\b|\bno longer\b|\bpreviously\b|\bthe old\b|\bwas renamed\b|\bwas moved\b`
4. `\bv1\b|this cut|\bcut \d|\btoday\b|\bfor now\b|roadmap`
5. `rejected in review|review round|reviewer|as of v\d`
6. `probably |should be enough|should suffice|it simply|is safe —|is safe --`
7. `§\d`

中文与工作语言残留探针按表面限制，而不是跨全仓混搜：

- 中文 counterpart 的变更/评审叙述：`评审|上一?轮|旧版|老的|不再|以前|本版|遗留`，只搜 `*.zh.md`。
- 英文 Markdown 的中文残留：`设计稿|评审|上一?轮|旧版|老的|不再|以前|本版|遗留|私有|(^|[^a-zA-Z])端([^a-zA-Z]|$)`，搜 `*.md` 且排除 `*.zh.md`。
- 英文 TS/JS/CSS 注释：`(^[[:space:]]*(//|/\*|\*)|//|/\*)[^\r\n]*(设计稿|评审|上一?轮|旧版|老的|不再|以前|本版|遗留|私有|端)`，只搜相应源码扩展名。
- 英文 Python 注释：`#[^\r\n]*(设计稿|评审|上一?轮|旧版|老的|不再|以前|本版|遗留|私有|端)`，只搜 `*.py`。中文中的英文标识/代码很常见，不以通用 ASCII 探针判断翻译残留，而是对照新增散文与 counterpart。

例如 `this PR adds` 是已知 positive，`this project`、`this process`、`this provider` 是词界 near-miss negative；`used to` 探针必须能找到变更叙述，但 `the key used to sign requests`、`the old connection drains before the new one accepts` 仍要语义保留。`/v1/chat` 是协议路径，RFC 的可解析 `§N`、issue 引用、note 的 Alternatives-considered、运行时日期与录制时间戳也不能按词命中删除。保留 suppression 的必要解释与测量来源。每轮仍无模式阅读最密的实际散文；零命中不证明完整。

修复先列出全部命题，再按 owner-first 路径处理；禁止把“pending migration”的义务改成“sanctioned”背书、把假设改成 shipped、连同叙述删除事实，或去掉数字的测量来源。来源：`dsh-trim-cot-leakage/references/recall-batteries.md:1-52`、`references/examples.md:1-275@687f282e`。这是源手工评审方法的可用化，不是新自动内容门禁或独立审计证据。

---

来源：deepseek-harness/.agents/skills/dsh-doc/SKILL.md:1-132@687f282e 来源：deepseek-harness/.agents/skills/dsh-doc/references/metadata-links-i18n.md:1-78@687f282e 来源：deepseek-harness/.agents/skills/dsh-doc/references/review.md:1-67@687f282e 来源：deepseek-harness/.agents/skills/dsh-doc/references/structure-hierarchy.md:1-87@687f282e 来源：deepseek-harness/.agents/skills/dsh-doc/references/style.md:1-49@687f282e 来源：deepseek-harness/.agents/skills/dsh-doc/references/website-sync.md:1-95@687f282e 来源：deepseek-harness/.agents/skills/dsh-prose-standard/SKILL.md:1-81@687f282e 来源：deepseek-harness/.agents/skills/dsh-prose-standard/references/examples.md:1-169@687f282e 来源：deepseek-harness/.agents/skills/dsh-trim-cot-leakage/SKILL.md:1-45@687f282e 来源：deepseek-harness/.agents/skills/dsh-trim-cot-leakage/references/examples.md:1-275@687f282e 来源：deepseek-harness/.agents/skills/dsh-trim-cot-leakage/references/recall-batteries.md:1-52@687f282e 来源：deepseek-harness/docs/AGENTS.md:1-77@687f282e

