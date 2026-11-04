# 文档结构、放置与写作

本页命令中的 `<product-root>` 指单独取得的产品仓库根目录，不是复制后的轻量 Skill 座。需解析器或其他 workspace 依赖的产品命令须在该产品根按锁准备依赖；目标工程仍使用自己的配置和入口。

本页拥有文档的事实归属与写作层：真源与优先级（§2）、分层与放置（§3）、教程／参考与页面骨架（§4）、写作、预算与审查（§6）。新增、搬迁、合并或重写人类文档，或判定一段内容属于哪一层时读本页；包与 API 合同见[包 README、注释与 API 文档](documentation-package-and-api.md)，门禁组合与采用判据见[门禁组合与目标采用](documentation-adoption-and-checks.md)。共同约定：触发定位以[根参考的读者触发索引](documentation.md#reader-triggers)为准；各节保留原节号（页内编号因此可能不连续），`源义务`、`迁移设计`与源证据坐标的含义同根参考开头；本页机制的来源坐标收在文末附录。

## 2. 真源与优先级

<a id="source-of-truth"></a>

**源义务。** 事实只有一个家：所有者层级或代码/生成器。文档不得手抄权威目录、JSDoc、测试清单、包状态或版本状态；需要时链接到所有者。`docs/AGENTS.md` 把根 `AGENTS.md` 定为“常驻命令”，子树 `AGENTS.md` 只放该子树特有规则，架构图只放组成与扩展点地图，子系统页只放类型与语义，Agent Note 只放决策理由与被放弃项，postmortem 只放事故叙事，cookbook 只放步骤，包 README 只放该包合同，生成参考只放可再生产物。`deepseek-harness/docs/AGENTS.md:7-36@687f282e`

**源义务。** 文档写当前状态，不写变更史或“已实现/未来”状态。历史留在提交、PR、Agent Note、postmortem 或受范围约束的持久化记录。通用 Session 格式叙述链接到版本/状态权威页，只有版本特定合同、示例或证据才保留具体数字。`deepseek-harness/docs/AGENTS.md:37-39@687f282e`、`deepseek-harness/AGENTS.md:173-177@687f282e`

**迁移设计。** 为每个事实指定唯一所有者，并在采用方仓库写一张“事实→所有者→检查”表。所有者可以是源文件、生成器、清单或人审记录。没有所有者的新事实先补所有者，再写文档。检查只能验证其覆盖的形态，不能把“门禁绿”解释成“事实正确”。

**失败处理。** 发现两处互相矛盾的权威叙述时，不要挑一处改字；先判定哪一处是所有者，删除或降级另一处为链接，再补一个能拒绝重复叙述的检查（若可机械化）。

## 3. 分层与放置

<a id="tier-placement"></a>
<!-- mechanism-ids: documentation-tier-placement -->

**源义务。** 文档按“主题 + 树位置”确定作用域：只以适当细节描述自己的主题，直接子主题只描述目的、职责和高层行为，更低层细节链接到拥有它的后代。文档类型不能扩大作用域；参考只可对自己的主题穷尽。测试机制、夹具和 harness 放在最低拥有层，高层只链接。`deepseek-harness/docs/AGENTS.md:7-13@687f282e`

**源义务。** 每篇范围内文档必须归为教程或参考。教程按达成结果的顺序组织，只引入当前步骤所需概念；参考定义查找范围和当前行为，不承担教学顺序。两者内容都较多时分开；任一部分较小时显式标注。教程写作前先私下判定读者起点和每个概念的初/中/高级，先修前置再讲依赖，逐步提高难度，把不必要的进阶材料移到后续教程或参考。`deepseek-harness/docs/AGENTS.md:15-19@687f282e`

**放置决策。** 缺陷→postmortem；理由→Agent Note；操作步骤→cookbook；类型定义→subsystems；包合同→包 README；常驻命令→根 `AGENTS.md` 并链接理由；评审强制规则→`defensive-patterns/`。`deepseek-harness/docs/AGENTS.md:36@687f282e`

**源义务。** 不要把以下内容放错层：

- 根 `AGENTS.md` 不收故事、完整示例、情境流程或已链接家中的重复规则。
- 子树 `AGENTS.md` 不收根文件已有的全仓规则。
- 架构页不收类型定义、逐包细节、决策理由、实现状态标注。
- 子系统页不收行为叙述。
- 已实现 Agent Note 不收迁移计划、验收清单、夹具走查或“should”式规格语。
- defensive-patterns 不收类型定义与语义、决策理由。
- postmortem 是唯一允许“战史叙事”的层。
- 包 README 不收 JSDoc 复述、生成目录复述、其他包关切。
- 生成参考的英文真源与区域禁止手改。

`deepseek-harness/docs/AGENTS.md:21-35@687f282e`

**迁移设计。** 采用方必须映射全部事实类别（命令、架构、子系统、决策、事故、流程、包合同、生成参考等）；合并文档时必须保留每类事实的唯一所有者、边界和链接，不能因规模省略类别。对每一类写一句“这里放什么/不放什么”，这比目录约定更能阻止漂移。

**完成信号。** 新文档能回答“读者何时来、第一段看到什么、下一层去哪”；同一事实在别处只有链接。**失败处理。** 若无法判定归属，先问“读者在哪个触发点需要它”，再把内容放到该触发点的最低层。

## 4. 教程、参考与页面骨架

来源：deepseek-harness/docs/AGENTS.md:7-36@687f282e 来源：deepseek-harness/AGENTS.md:170-178@687f282e 来源：deepseek-harness/.agents/skills/dsh-doc/SKILL.md:79-125@687f282e

<a id="authoring-quality"></a>
<!-- mechanism-ids: documentation-tutorial-vs-reference, documentation-page-skeleton -->

**源义务。** 在格式所有者允许时，人工页按YAML元数据、H1、双语切换行、Summary、目录、正文和最终Dev Note组织；生成片段、Agent Note、事故复盘和解析器定义格式遵循各自具名骨架。包README的元数据测试要求`kind`和非空`description`，不统一要求`title`字段。`deepseek-harness/.agents/skills/dsh-doc/references/structure-hierarchy.md:19-30@687f282e`、`deepseek-harness/scripts/doc-standard.spec.ts:142-159@687f282e`

**源义务。** Summary用三至五个解释性句子说明读者能做什么、为何关心、运行模型和重要边界；英文包README另有100词门禁，不能当作所有页面的普遍阈值。目录指向H2。Dev Note是显式非权威的活动工作上下文，允许假设、粗略备选、进度与未决；稳定行为、限制和已接受理由归普通所有者。关闭后提升持久结论、保存适当决策/复盘或删除已解决讨论。包README最后两个H2是Model Experience与Known Limitations and Deferred Work，最终Dev Note置于限制节内H3。空白写`None.`，具名机器/解析器格式可省略。`deepseek-harness/.agents/skills/dsh-doc/references/structure-hierarchy.md:19-30@687f282e`、`deepseek-harness/.agents/skills/dsh-doc/references/structure-hierarchy.md:79-87@687f282e`

**源义务。** 标题是描述具体主题的名词短语，不是口号、问句或“深入理解 X”。首段在展开前给出导航：这段是什么、读者何时用、下一节去哪。`deepseek-harness/.agents/skills/dsh-doc/SKILL.md:123-124@687f282e`

**源义务。** 写完教程后做新手测试：只读首屏能否判断是否来对地方；跳过目录能否在三次点击内到达目标；是否在不假设内部历史的情况下可完成。`deepseek-harness/.agents/skills/dsh-doc/references/review.md:10-17@687f282e`

**迁移设计。** 保留读者首屏导航、稳定内容与非权威活动上下文的分层；章节名称和元数据按目标格式所有者确定。模板与实际执行合同一致，具名例外不强套另一格式。**证据边界。** 包README元数据/选定骨架受`doc-standard.spec`检查，Summary语义、新手测试和其余格式仍需评审；结构通过不是内容正确。

## 6. 写作、预算与审查

来源：deepseek-harness/.agents/skills/dsh-doc/SKILL.md:18-31@687f282e 来源：deepseek-harness/.agents/skills/dsh-doc/SKILL.md:59-62@687f282e 来源：deepseek-harness/.agents/skills/dsh-doc/references/metadata-links-i18n.md:3-10@687f282e 来源：deepseek-harness/.agents/skills/dsh-doc/references/metadata-links-i18n.md:50-61@687f282e 来源：deepseek-harness/scripts/doc-standard.spec.ts:18-24,40-49,57-160,339-406@687f282e 来源：deepseek-harness/scripts/verify-package-readme-summaries.ts:8-17@687f282e 来源：deepseek-harness/scripts/verify-package-readme-summaries.ts:44-75@687f282e 来源：deepseek-harness/.agents/skills/dsh-doc/templates/package-reference.md:19-25@687f282e 来源：deepseek-harness/scripts/verify-package-readme-model-experience.ts:1-638@687f282e 来源：deepseek-harness/docs/cookbook/adding-a-package.md:1-170@687f282e 来源：deepseek-harness/scripts/verify-package-readme-limitations.ts:1-95@687f282e

<a id="prose-budgets"></a>
<!-- mechanism-ids: documentation-prose-budgets, documentation-slop-checklist, documentation-complete-proposition, documentation-current-state, documentation-fact-check-evidence, documentation-one-physical-line -->

**源义务（当前状态与直接表达）。** 写当前事实；点名行为者；保留可搜索的机制名与有意义的模态、时间、否定强调；装饰性强调要收敛。禁止用“gate”“vocabulary”“surface”等隐喻替代确切术语；在写 `contract`、`boundary`、`shape` 前先问是否有更精确词；`contract` 只留给前置/后置条件、不变量、兼容承诺等义务。`deepseek-harness/AGENTS.md:173-177@687f282e`、`deepseek-harness/docs/AGENTS.md:37-39@687f282e`、`deepseek-harness/.agents/skills/dsh-prose-standard/SKILL.md:14-63@687f282e`

**源义务（完整命题）。** 删除一句话必须能指出它不属于本主题、由别处拥有、重复、已过时或不可核验；不能只因为“读起来像废话”。保留否定、条件、例外、范围、时序、所有权、失败方向与量词。改写时不得把“可能”写成“会”，不得把“默认”写成“总是”。`deepseek-harness/.agents/skills/dsh-prose-standard/SKILL.md:14-63@687f282e`

**执行程序。** 编辑/审查散文先按 [完整命题与位置审查](prose-review.md#prose-review)确认 scope、owner、最低覆盖和处置；痕迹探针需正例/合法近似反例校准并保留无模式通读。这里继续拥有写作、预算与文档放置义务，不另设语义评分器。

**源义务（反 slop 清单）。** 审查以下九类：重复规则；历史越层；正文/图中的实现状态标注；手抄目录、JSDoc、测试/包/状态清单；推理流水账；兄弟方法旁重复理由；段落墙；强调膨胀；已实现 Agent Note 中的规格语。`deepseek-harness/docs/AGENTS.md:65-71@687f282e`

**源义务（一处一段）。** 每个散文段落在源文件中占一个物理行；使用编辑器软换行。标题保持单行是评审义务；列表/引用内形成 `paragraph` 的正文由自动门禁检查，非 `paragraph` 结构保持原格式，代码注释遵守 linter 列宽。**实际自动边界：** `verify-md-wrap` 只拒绝跨行的 AST `paragraph`，包括列表/引用内段落；不检查 `heading` 节点，也不 blanket 排除生成区域。标题规则仍须评审，不能把它误标为该脚本自动保证。`deepseek-harness/docs/AGENTS.md:41@687f282e`、`deepseek-harness/scripts/verify-md-wrap.ts:40-86@687f282e`

**源义务（预算）。** `scripts/doc-budgets.manifest.json` 对常驻文档设上限；`verify-doc-budgets` 拒绝超限或清单指向的缺失文件。超限时按“迁移到其他层→压缩→有理由地提高上限”顺序处理；上限是护栏不是缩减目标。低于目标时至少保留 5% 余量；高于目标时冻结上限，直到迁移或压缩把文档带回目标以下；只有在文档仍有空间时才降低上限。未列入预算的层级由评审治理，不是自动豁免。`deepseek-harness/docs/AGENTS.md:51-63@687f282e`、`deepseek-harness/scripts/verify-doc-budgets.ts:1-58@687f282e`

**源写作目标，不是所有目标项目的默认阈值。** `docs/AGENTS.md:59` 给出 root2080、architecture2400、默认子树 AGENTS600（具名 packages810、docs1430、examples310）、packages README994、cordis-primer600、testing1300。这些目标与 manifest 硬上限分别保留；目标项目按自身常驻上下文与必要内容评审上限，不默认扫描所有子树并强制600。降低上限须仍有空间；未登记层仍须评审。

**源义务（审查顺序）。** 先把变更与 `origin/master` 的旧文档对照，确认旧文档未覆盖的事实；再跑操作/示例/代码片段；无法复现的说法要么重跑要么删除；证据按“源文件/测试/运行输出/生成器”优先于“相邻文档/记忆”。`deepseek-harness/.agents/skills/dsh-doc/references/review.md:4-67@687f282e`

**迁移设计。** 预算清单只应列“必须常驻上下文”的文档。源仓库只对清单中的常驻文档设上限；未列入预算的层级仍由评审清单治理，不是自动豁免。采用方必须写明哪些常驻文档由预算约束、哪些非驻留层级由评审覆盖，并记录未预算文件的理由、所有者与重新激活条件；不能把“未列预算”当成无审查或无限扩张许可。**证据边界。** 预算门禁只算空白分隔词数并只检查清单内文件；它不判断内容质量，也不阻止新增未列入清单的膨胀文档。

**目标执行器。** 已交付零额外依赖的 `packages/governance/documentation/src/verify-doc-budgets.mjs`。采用方在目标仓库写 `.doc-gates/doc-budgets.json`：JSON 对象的键是常驻文档的仓库相对路径，值是评审后的正整数上限，例如 `{ "AGENTS.md": 2000 }`；示例数值不是源仓上限或自动建议。安装后从目标 cwd 执行 `node <product-root>/packages/governance/documentation/src/verify-doc-budgets.mjs`；从其他目录调用时可用 `--root <目标目录> --config <仓库相对清单>`。普通模式在超限、列入清单但缺失文件或非法上限时退出 1，配置缺失/不可读/非对象/空清单或调用无效时退出 2；`--list` 只列用量，即使有 OVER/MISS/BAD 也退出 0，所以 CI 应运行普通模式。空清单拒绝是目标激活前提，不是源空清单行为的声明。

**行为边界。** 清单、词数与退出码可自动检查（正常 0、超限/缺文件/非法上限拒绝 1、诊断列表不阻断、不提高上限的恢复 0）；源文中的目标、至少 5% 余量、内容应否迁移与升限理由仍须按上述程序评审。数值目标与执行上限是两个概念，源文明确允许超目标时冻结上限，不能仅因两者不等就判目标过时。入口通过不证明目标 CI 必跑、平台阻断、全仓预算覆盖、实际评审已执行或独立验收完成。

## 机制→来源引用索引（本页机制）

本节只列本页机制的来源区间，固定提交 `687f282e`；其它机制的坐标在其所属页。它只补齐可回溯的引用坐标，不新增正文断言；正文解释仍以本页对应小节为准。

- `documentation-tier-placement`：`deepseek-harness/AGENTS.md:170-178@687f282e`、`deepseek-harness/.agents/skills/dsh-doc/SKILL.md:79-125@687f282e`
- `documentation-tutorial-vs-reference`：`deepseek-harness/.agents/skills/dsh-doc/references/structure-hierarchy.md:4-87@687f282e`
- `documentation-page-skeleton`：`deepseek-harness/.agents/skills/dsh-doc/references/structure-hierarchy.md:4-87@687f282e`、`deepseek-harness/.agents/skills/dsh-doc/references/style.md:5-49@687f282e`、`deepseek-harness/scripts/doc-standard.spec.ts:110-118@687f282e`、`deepseek-harness/scripts/doc-standard.spec.ts:154-160@687f282e`、`deepseek-harness/scripts/doc-standard.spec.ts:401-406@687f282e`、`deepseek-harness/scripts/doc-standard.spec.ts:443-456@687f282e`
