# 双语文档：配对、术语与翻译

本页拥有双语事实的三文件合同：配对（§8）、术语与风格校准（§9）、翻译工作流与简报（§10）、提示词流水线（§11）。改变双语文档、术语表、翻译提示词或一致性记录时读本页；常规双语更新与显式扩展工作流按各自小节处理，不合并成一种流程。共同约定：触发定位以[根参考的读者触发索引](documentation.md#reader-triggers)为准；各节保留原节号（页内编号因此可能不连续），`源义务`、`迁移设计`与源证据坐标的含义同根参考开头；本页机制的来源坐标收在文末附录。

## 8. 双语配对

来源：deepseek-harness/AGENTS.md:170-178@687f282e 来源：deepseek-harness/docs/AGENTS.md:43-43@687f282e

<a id="i18n-pairing"></a>
<!-- mechanism-ids: documentation-i18n-pair-contract, documentation-i18n-consistency-record, documentation-i18n-pair-gate -->

**源义务（三文件合同）。** 范围内每篇文档有英文、中文和 `.i18n.yaml` 一致性记录，同目录、无本地化子目录。两侧权威相等；任一侧都可先写，另一侧必须跟上。英文侧用 `English | [中文](X.zh.md)`，中文侧用 `[English](X.md) | 中文`。中文不是英文的从属译文，而是同一合同的另一种语言表达。`deepseek-harness/docs/i18n/README.md:3-17@687f282e`、`deepseek-harness/docs/AGENTS.md:45@687f282e`

**源义务（结构）。** 两侧必须同标题层级与顺序、同列表种类与项数、同表格行列、同链接语义目标、同代码块；段落边界可在同一结构单元内按目标语言调整。语言切换行必须存在且方向正确。`deepseek-harness/docs/i18n/translation-prompt.md:53-62@687f282e`

**源义务（范围与排除）。** 配对范围是仓库内人类文档，包括包 README、指南和 Agent Note。生成参考的英文真源没有语言切换行；中文对应页由生成器渲染并写记录。排除项包括 `vendor/`、`node_modules`、网站生成物、归档 Agent Note、部分历史/发布记录。排除必须显式，不能在发现模式下用“看起来像生成物”推断。`deepseek-harness/docs/i18n/README.md:45-69@687f282e`、`deepseek-harness/scripts/verify-translation-pairing.ts:99-170@687f282e`

**源义务（记录格式）。** `.i18n.yaml` 按英文标题 slug 路径分节；每节三行：`/key`、`  en: <16-hex>`、`  zh: <16-hex>`，键唯一、顺序固定。渲染必须带 canonical 头注释、恢复命令 `pnpm run verify-translation-pairing --write <source>`、稳定排序和恰好一个尾换行。diff 区分“当前新增节（unconfirmed）”“任一侧变更”“记录中已被删除的节”；只有两侧当前哈希与记录都一致才算确认。`deepseek-harness/scripts/translation-pairing-record.ts:1-299@687f282e`、`deepseek-harness/docs/i18n/README.md:21-43@687f282e`

**源调用范围。** 不带pair参数的普通只读检查覆盖工作树语料；命名pair只检查该pair，`--cached`必须带pair路径且读取暂存内容。`--all`只与`--write`同用，不是额外的全量只读模式；不能与命名pair混用。先评审当前内容，再重录已确认pair；全量重录会把未审内容记为已确认，不是翻译修复或语义证明。范围不同的通过结果不得互换。`deepseek-harness/scripts/translation-pairing.ts:252-280@687f282e`

**迁移设计。** 只有项目事实类别中确实没有中文对侧时，才能声明单语并记录非激活条件；不能创建空 `.zh.md` 或跳过记录来冒充完成。若维护双语，范围内每一对文档都必须有三文件、切换行、结构签名和记录；可以分批排期，但未迁移页必须显式列为单语/未配对，不能声称双语覆盖。

## 9. 术语与风格校准

来源：deepseek-harness/docs/i18n/README.md:3-17@687f282e 来源：deepseek-harness/docs/AGENTS.md:45-45@687f282e 来源：deepseek-harness/scripts/verify-translation-pairing.ts:99-170@687f282e 来源：deepseek-harness/scripts/translation-pairing-record.ts:1-299@687f282e 来源：deepseek-harness/docs/i18n/README.md:21-43@687f282e 来源：deepseek-harness/scripts/verify-translation-pairing.ts:1-368@687f282e

<a id="terminology"></a>
<!-- mechanism-ids: documentation-i18n-translation-rules, documentation-i18n-terminology, documentation-i18n-style-samples -->

**源义务（术语表）。** `docs/i18n/terminology.md` 是绑定表：每条给英文、中文、处理方式与约束。首次出现按表处理；表中要求保留英文的术语（如 `agent`、`tool`、`session`、`turn`、`step`、`compaction` 等）不得意译成自造词；禁止的译法要明确。表未收录的新术语先按“保留英文/自然中文”的最小规则处理，并在同一 PR 补表；不要静默自创。`deepseek-harness/docs/i18n/terminology.md:1-17@687f282e`、`deepseek-harness/docs/i18n/translation-rules.md:39-44@687f282e`

**源义务（首次出现）。** 中文正文首次出现英文术语时，若表要求注释，使用表中给出的中文注释；之后不重复注释。缩写首次出现给全称与缩写；不要给已通用的 API/CLI 名称加多余翻译。`deepseek-harness/docs/i18n/terminology.md:3-17@687f282e`

**源义务（翻译规则）。** 忠实：保留每个命题，不增不减；保留行为者、对象、条件、例外、否定、模态、因果与概念区分；合同强度不得削弱、加强、反转或合并。语气：目标语言原生技术写作，正式、精确，不口语化；不因避免被动而虚构责任者。结构：长句可按目标语言断句，但逻辑范围必须保留；代码块注释逐字节保留，不翻译。`deepseek-harness/docs/i18n/translation-rules.md:1-38@687f282e`、`deepseek-harness/docs/i18n/translation-prompt.md:63-127@687f282e`

**源义务（风格样例）。** `style-samples.md` 是校准材料，不是额外规则源。它按“先准确后自然”的顺序给出中英对照；样例只校准其示范的规则，不覆盖具体文档上下文或更高优先级要求。样例本身由人工评审，保持双语并随规则 PR 更新。`deepseek-harness/docs/i18n/style-samples.md:1-12@687f282e`、`deepseek-harness/docs/i18n/style-samples.md:16-87@687f282e`、`deepseek-harness/docs/i18n/translation-rules.md:13-19@687f282e`

**迁移设计。** 术语表按合同影响建立，而不是按词频抽样：凡是会改变合同强度、歧义或禁止译法的词都必须有条目；普通名词可以不成条。每个词写“必须译成/必须保留/禁止”，并给一个反例。把术语表接入翻译提示词，而不是只放在文档里靠人记。

## 10. 翻译工作流与简报

来源：deepseek-harness/docs/i18n/translation-rules.md:1-69@687f282e 来源：deepseek-harness/docs/i18n/translation-prompt.md:63-127@687f282e 来源：deepseek-harness/docs/i18n/terminology.md:1-215@687f282e 来源：deepseek-harness/docs/i18n/translation-rules.md:39-44@687f282e 来源：deepseek-harness/docs/i18n/style-samples.md:1-87@687f282e 来源：deepseek-harness/docs/i18n/translation-rules.md:13-19@687f282e

<a id="translation-workflow"></a>
<!-- mechanism-ids: documentation-i18n-routine-extended, documentation-i18n-briefing -->

**源义务（常规 vs 扩展）。** 常规双语更新由单次翻译工作在同一改动内完成：按术语表定位首次出现，保留未触碰的散文，重录记录；只有用户显式调用 `dsh-translate-docs` 才运行扩展工作流。显式流程仍区分existing-pair最小更新与new-pair整篇翻译；术语迁移或结构重排不自动授权丢弃既有已审措辞。`deepseek-harness/docs/i18n/README.md:67-69@687f282e`、`deepseek-harness/.agents/skills/dsh-translate-docs/SKILL.md:18-38@687f282e`

**源义务（扩展流程）。** 先区分 existing pair 的 update 与 new pair：已有pair由简报定位变动单元，以覆盖diff的最小编辑更新counterpart，保留未触及的已审表述，不能为一次更新整篇重译；无counterpart的新pair才走whole-document路径，读取规范、术语及样本后逐节翻译全文。双侧同时变动或无法对齐的whole-document简报须按翻译规则人工reconciliation，而不是自动覆盖任一侧。删除或改名时连同counterpart及记录同改；归档Note三文件冻结。完成后自审、结构校验、审diff、仅重录已确认pair并做scoped检查；语料级检查在PR层运行一次。`deepseek-harness/.agents/skills/dsh-translate-docs/SKILL.md:18-38,64-70@687f282e`

**源义务（简报）。** `gen-translation-brief <pair>` 读取最后确认状态，按可安全对齐的最窄范围输出变动单元、章节或整篇的三方上下文及术语约束；不带参数覆盖失步pair。`--apply` **有写入副作用**：仅所有变动都位于两侧原本逐字节一致的代码围栏内时，拼接counterpart、验证结果结构，然后写入counterpart；不能用于散文翻译，也不是只读结构检查。任一前提失败就拒绝写入，按简报处理散文或对齐问题。`deepseek-harness/scripts/gen-translation-brief.ts:2-9,233-272@687f282e`、`deepseek-harness/.agents/skills/dsh-translate-docs/SKILL.md:26-34@687f282e`

**完成信号与例外。** 简报范围与实际diff一致；机械写入后仍审查counterpart diff，散文逐命题审阅；两侧结构通过后，仅对已确认pair执行 `pnpm run verify-translation-pairing --write <pair>` 及 `pnpm run verify-translation-pairing <pair>`。只有显式 `--write --all` 才能全量重录，不能把未审语料一并盖章。结构错误先修复，不以自然表达为由改变标题层级、列表项数或表格列。纯路径、链接、数字变动仍需两侧同改与scoped记录，但不因此满足代码围栏专属的 `--apply` 条件。

## 11. 翻译提示词流水线

来源：deepseek-harness/docs/i18n/README.md:57-69@687f282e 来源：deepseek-harness/.agents/skills/dsh-translate-docs/SKILL.md:1-74@687f282e 来源：deepseek-harness/scripts/gen-translation-brief.ts:1-331@687f282e 来源：deepseek-harness/.agents/skills/dsh-translate-docs/SKILL.md:26-34@687f282e

<a id="translation-prompt"></a>
<!-- mechanism-ids: documentation-i18n-prompt-pipeline -->

**源义务。** `docs/i18n/translation-prompt.md` 是机器消费的提示词，不是给人看的说明文。只有三个占位符：`{{source_lang}}`、`{{target_lang}}`、`{{terminology}}`；模板正文取自 `## 模板正文` 的四反引号 `text` 围栏，渲染后不得残留占位符。待译文档不是占位符，而是在固定消息序列末尾追加；源/目标文件名必须是 basename 且方向匹配（`.md`→`.zh.md`，反向亦然）。few-shot 使用五组整篇中英对照（按列出顺序，上下文不足从后往前删），前四组随当前文档更新，第五组保留冻结历史样例；示例只校准语气，不是翻译记忆，也不能覆盖源义/结构/术语表。`deepseek-harness/docs/i18n/translation-prompt.md:3-31@687f282e`、`deepseek-harness/scripts/translation-prompt.ts:1-120@687f282e`

**源义务（输出协议与转义）。** 模型必须只返回三个原始 XML 区段：`<translation>`、`<review>`、`<final>`，顺序固定、各一次；提示词要求不要包 Markdown 围栏，但解析器容忍整体 `xml` 代码围栏，区段外不得有正文。若段体内出现只由框架标签构成的行，必须多写一个反斜杠转义；解析器只去掉一个框架转义。解析后 `correctLanguageSwitcher` 保留 frontmatter、要求 H1、把切换行替换为目标 canonical 行；缺 H1 或 frontmatter 未闭合失败。`deepseek-harness/docs/i18n/translation-prompt.md:128-157@687f282e`、`deepseek-harness/scripts/translation-prompt.ts:120-259@687f282e`

**源义务（验证）。** `verify-translation-prompt` 检查占位符表、双向渲染、示例组装顺序、响应 round-trip、录制响应前缀与 expected snapshot；模板/示例改动必须同步快照。提示词是代码资产，不能只靠运行效果判断。`deepseek-harness/scripts/verify-translation-prompt.ts:1-98@687f282e`、`deepseek-harness/scripts/translation-prompt.expected.spec.ts:1-32@687f282e`

**迁移设计。** 采用方可把提示词拆成“规则 + 输出协议 + few-shot”，但必须让规则与检查器同源；不要在同一提示词里既要求“保留所有列表项”又要求“合并重复项”而不给优先级。**证据边界。** 提示词验证只证明模板形态符合约定，不证明某次模型输出忠实；忠实仍由配对结构与人工/模型审阅承担。

## 机制→来源引用索引（本页机制）

本节只列本页机制的来源区间，固定提交 `687f282e`；其它机制的坐标在其所属页。它只补齐可回溯的引用坐标，不新增正文断言；正文解释仍以本页对应小节为准。

- `documentation-i18n-pair-gate`：`deepseek-harness/scripts/verify-translation-pairing.ts:1-368@687f282e`
- `documentation-i18n-translation-rules`：`deepseek-harness/docs/i18n/translation-rules.md:1-69@687f282e`
- `documentation-i18n-terminology`：`deepseek-harness/docs/i18n/terminology.md:1-215@687f282e`
- `documentation-i18n-style-samples`：`deepseek-harness/docs/i18n/style-samples.md:1-87@687f282e`
- `documentation-i18n-prompt-pipeline`：`deepseek-harness/scripts/translation-prompt.ts:1-259@687f282e`、`deepseek-harness/docs/i18n/translation-prompt.md:1-263@687f282e`
