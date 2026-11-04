# 文档治理迁移参考

本参考描述 DeepSeek Harness 在固定提交中的文档治理实践，并给出可迁移到其他仓库的操作步骤。源证据统一写作 `deepseek-harness/<path>:<start>-<end>@687f282e`。文中的“源义务”指源仓库规则；“迁移设计”指本参考为采用方补充的实施建议，不冒充源仓库已自动执行的能力。

按下方触发索引选择专题；各页保留稳定机制 ID、锚点与来源坐标。第 24 节说明共同限制，页内节号用于定位，不表示独立执行顺序。

## 1. 读者触发索引

<a id="reader-triggers"></a>

先按改动对象定位动作，再读对应章节。不要从工具清单反推流程。

| 你要做的事 | 必读 | 必须执行 | 完成信号 |
|---|---|---|---|
| 新增或改写人类文档 | 第 [3](documentation-structure-and-prose.md#3-分层与放置)、[4](documentation-structure-and-prose.md#4-教程参考与页面骨架)、[6](documentation-structure-and-prose.md#6-写作预算与审查) 节 | 判定分层、教程/参考、单一归属；跑写作门禁 | 文档归属正确且预算/换行/链接门禁通过 |
| 改包对外行为 | 第 [5](documentation-package-and-api.md#5-包-readme-合同) 节 | 同一变更更新 README 合同、JSDoc、受影响文档 | README 各类门禁与 JSDoc 门禁通过 |
| 改导出 API 或类型 | 第 [7](documentation-package-and-api.md#7-注释与导出-jsdoc)、[12](documentation-package-and-api.md#12-代码等价与可编译示例) 节 | 更新 JSDoc；更新 `ts type-equiv`/`public-api` 粘贴与清单 | `verify-export-jsdoc`、`verify-type-equiv`、`doc-typecheck` 通过 |
| 改双语文档 | 第 [8](documentation-localization.md#8-双语配对) 至 [11](documentation-localization.md#11-翻译提示词流水线) 节 | 两侧同改，按结构重录一致性记录，跑配对门禁 | 配对门禁对当前内容通过 |
| 新增生成参考 | 第 [13](documentation-generated-content.md#13-生成参考)、[14](documentation-generated-content.md#14-共享生成区域) 节 | 从真源生成两种语言，保留共享区域，跑 `--check` | 生成器 `--check` 无差异 |
| 新增文档链接或锚点 | 第 [15](documentation-links-and-repository-policy.md#15-markdown-链接锚点与换行)、[16](documentation-links-and-repository-policy.md#16-仓库引用与网站投影) 节 | 相对链接、可解析锚点、无提交号引用 | 链接、锚点、引用策略门禁通过 |
| 记录设计决策/事故/升级 | 第 [17](documentation-record-lifecycle.md#17-agent-note-生命周期)、[18](documentation-record-lifecycle.md#18-归档与冻结)、[19](documentation-record-lifecycle.md#19-升级指南) 节 | 选对生命周期与模板，写替代方案与验证 | 格式/归档/升级指南门禁通过 |
| 修改 Skill | 第 [20](documentation-record-lifecycle.md#20-skill-调用元数据) 节 | 同步 frontmatter；若该 Skill 使用 `agents/openai.yaml` 则同步该文件 | 适用的调用元数据门禁覆盖实际修改对象并通过 |
| 修改网站发布面 | 第 [16](documentation-links-and-repository-policy.md#16-仓库引用与网站投影) 节 | 改发布清单与源文档，不手改生成站 | 投影测试与构建通过 |
| 接入新仓库 | 第 [23](documentation-adoption-and-checks.md#23-迁移到新项目) 节 | 建立完整真源/分层映射，并为全部适用义务实现等价检查；仅当事实类别不存在时标记非激活 | 新项目能重复执行并通过自己的验收 |

## 本域分页

| 页 | 原节 | 内容 |
|---|---|---|
| [文档结构、放置与写作](documentation-structure-and-prose.md) | 2–4、6 | 真源与优先级、分层与放置、教程/参考与页面骨架、写作与预算 |
| [包 README、注释与 API 文档](documentation-package-and-api.md) | 5、7、12 | 包 README 合同、注释与导出 JSDoc、可编译示例与类型等价、子系统页归属 |
| [双语文档：配对、术语与翻译](documentation-localization.md) | 8–11 | 双语配对、术语与风格校准、翻译工作流与简报、提示词流水线 |
| [生成参考与共享生成区域](documentation-generated-content.md) | 13、14 | 生成器族与新鲜度、共享区域语法与配对 |
| [Markdown 链接、仓库引用与网站投影](documentation-links-and-repository-policy.md) | 15、16 | 链接/锚点/换行与目标执行器、仓库引用政策与网站发布 |
| [记录生命周期：Note、归档、升级与状态](documentation-record-lifecycle.md) | 17–21 | Agent Note、归档冻结、升级指南、Skill 调用元数据、Session 格式状态 |
| [门禁组合与目标采用](documentation-adoption-and-checks.md) | 22、23 | 门禁组合与执行顺序、迁移到新项目的决定与判据 |

操作卡仍由 [文档治理操作卡](documentation-procedures.md) 拥有，本页不复述。各分页末尾各自保留其机制→来源坐标附录。

## 24. 已知限制与未决问题

<a id="limits"></a>

以下均来自源仓库实际状态，不是迁移建议。采用方不应把源门禁的绿色输出解释为超过其覆盖范围的保证。

1. **行对齐不是通用门禁。** `dsh-doc/references/metadata-links-i18n.md` 和 `dsh-doc` 检查步骤要求“精确物理行数”，但 `verify-translation-pairing` 的结构签名只比较标题层级、列表种类/项数、表格行列、代码块和链接语义目标，不比较行数；`doc-standard.spec` 也只对参考 README 做精确行断言。因此“两侧行行对应”是评审/模板要求，不是全仓自动保证。`deepseek-harness/.agents/skills/dsh-doc/references/metadata-links-i18n.md:66-70@687f282e`、`deepseek-harness/scripts/translation-pairing.ts:99-170@687f282e`、`deepseek-harness/scripts/doc-standard.spec.ts:443-456@687f282e`

2. **预算目标与执行上限不同。** `docs/AGENTS.md` 的目标是 `architecture.md` ≤ 2400、`testing.md` ≤ 1300、`examples/AGENTS.md` ≤ 310；清单上限分别为 2410、1350，且没有 examples 条目。散文明确区分目标与上限，并规定高于目标时冻结上限，所以不能仅从数字差异断言目标过时或规范矛盾。门禁只按清单检查词数、正整数上限与列入文件存在性，不自动检查目标、5% 余量、升限理由或未列文件的内容增长；这些评审义务仍保留。`--list` 无论有无超限都只是退出 0 的报告模式。`deepseek-harness/docs/AGENTS.md:51-63@687f282e`、`deepseek-harness/scripts/doc-budgets.manifest.json:1-8@687f282e`、`deepseek-harness/scripts/verify-doc-budgets.ts:23-55@687f282e`

3. **风格样例含旧机制描述。** `style-samples.md` 的“一致性记录”样例仍说系统采用文件 blob hash、记录模板为 `Foo.md`/`Foo.zh.md`/`Foo.i18n.yaml`；当前活动配对记录是随内容变化的节键哈希（16 位十六进制），归档校验才要求 40 位 Git blob 哈希。样例是校准材料而非规则源，但直接照抄会得到旧机制。`deepseek-harness/docs/i18n/style-samples.md:53-63@687f282e`、`deepseek-harness/scripts/translation-pairing-record.ts:79-243@687f282e`、`deepseek-harness/scripts/archived-agent-notes.ts:140-204@687f282e`

4. **归档 sidecar 与活动 sidecar 哈希格式不同。** 活动记录写 16 位节键哈希；归档校验要求 40 位 blob 哈希。归档时的“重录”必须使用归档序列化，不能直接跑活动 `--write` 后假定归档通过。`deepseek-harness/scripts/translation-pairing-record.ts:79-243@687f282e`、`deepseek-harness/scripts/archived-agent-notes.ts:140-204@687f282e`

5. **生成页语言切换行靠硬编码清单。** 生成英文页不写切换行，是因为 `verify-translation-pairing.ts` 中有一份生成源清单；新增生成页若忘记加入，门禁会要求切换行，生成器却不会生成。该耦合没有从生成器元数据自动推导。`deepseek-harness/scripts/verify-translation-pairing.ts:99-140@687f282e`

6. **根绝对链接不被检查。** `verify-md-links` 跳过 `/...` 形式的站内绝对路径，因为它们属于网站路由；但 GitHub 上这类链接不可解析。写作规范要求相对链接，检查器无法替你抓住所有误用。`deepseek-harness/scripts/verify-md-links.ts:45-73@687f282e`

7. **提交号检测依赖本地对象库。** 浅克隆或缺失对象时，`git cat-file` 无法确认某个十六进制串是提交，因而可能漏报；这是代码注释承认的信任边界。`deepseek-harness/scripts/verify-repository-references.ts:30-105@687f282e`

8. **类型等价只覆盖登记的粘贴。** 未登记的新类型不会被要求文档化；`verify-subsystem-pages` 只检查组 README 是否链接子系统页或给出豁免，不证明每个类型都有页面。源规范明确说“未文档化的新类型不会被抓住”。`deepseek-harness/docs/AGENTS.md:43@687f282e`、`deepseek-harness/scripts/verify-subsystem-pages.ts:1-137@687f282e`

9. **README 内容检查只扫英文，但 kind/骨架检查覆盖双语。** Summary、Model Experience 和限制节的门禁读取英文 `README.md`；中文 `README.zh.md` 不重复“100 词”“精确短形式”或限制节标题/bullet 检查。`doc-standard.spec` 的 frontmatter/kind 与包骨架检查则按 glob 同时覆盖英文和中文 README，因此不能概括为所有 README 检查只读英文。配对门禁只证明结构与逐节哈希，不证明中文语义等价。`deepseek-harness/scripts/verify-package-readme-summaries.ts:1-77@687f282e`、`deepseek-harness/scripts/verify-package-readme-model-experience.ts:1-638@687f282e`、`deepseek-harness/scripts/verify-package-readme-limitations.ts:1-95@687f282e`、`deepseek-harness/scripts/doc-standard.spec.ts:18-24@687f282e`、`deepseek-harness/scripts/doc-standard.spec.ts:154-160@687f282e`、`deepseek-harness/scripts/doc-standard.spec.ts:348-356@687f282e`、`deepseek-harness/scripts/doc-standard.spec.ts:401-406@687f282e`

10. **归档外链不检查。** 归档源（包括其出站链接）被文档门禁跳过；活跃文档可以有意链接进归档，但归档自身不再维护链接。`deepseek-harness/scripts/verify-md-links.ts:45-73@687f282e`、`deepseek-harness/docs/i18n/README.md:45-69@687f282e`

11. **提示词/翻译质量不能由结构门禁证明。** 配对门禁证明结构与记录一致，提示词门禁证明模板形态；两者都不证明译文忠实、术语正确或示例可运行。需要人工/模型审阅和真实运行证据。`deepseek-harness/docs/i18n/README.md:21-43@687f282e`

12. **文档代码块只编译不运行。** `doc-typecheck` 的完成信号是编译器通过；它不执行示例，也不验证示例输出。涉及行为的示例仍需测试或真实运行。`deepseek-harness/scripts/doc-typecheck.ts:1-73@687f282e`

13. **源仓库的门禁不等于平台强制。** 本参考只根据固定提交的脚本、清单和文档判断“存在什么检查”；没有断言远程分支保护、必需检查或发布权限已配置。采用方必须单独收集 CI/分支保护证据。

14. **文档图的事件覆盖偏 Host。** 关系扫描只种 Host 聚合 TypeScript Program；源码注释明确承认 Client 侧监听者会少报（`connection/reset` 漏 `ui-skill`/`ui-agent-preset`），且 Client 声明事件因结构不可见而豁免“必须有 dispatcher”检查。服务角色表是人工分类，`assertServiceRolesComplete` 只保证角色 key 与 Cordis 发现集合对齐，不证明实现/消费者/备注语义完整。`deepseek-harness/scripts/gen-doc-graphs.ts:1098-1103@687f282e`、`deepseek-harness/scripts/gen-doc-graphs.ts:1505-1530@687f282e`、`deepseek-harness/scripts/gen-doc-graphs.ts:958-974@687f282e`

15. **中文 CLI 页不翻译帮助正文。** `gen-cli-help` 从同一组实际 `--help` 输出渲染英文和中文页；中文页只翻译标题、说明、目录和标签，帮助正文保留 launcher 输出原文。因此中文页的存在不证明 CLI 帮助已本地化，也不覆盖帮助文本的语义正确性。`deepseek-harness/scripts/gen-cli-help.ts:230-298@687f282e`

16. **README 结构门禁不证明语义真实、限制完整或译文等价。** Model Experience 门禁断言 H2/H3/H4/H5 形态、白名单、空行、围栏和 tool-catalog 锚点存在；限制节门禁断言唯一标准标题和至少一个顶层 bullet；`doc-standard` 断言 kind/元数据与骨架标题。它们都不判断 README 文字是否真实描述模型可见面、限制是否完整、kind 事实是否合理，也不判断中文译文是否语义等价。`README.i18n.yaml` 的逐节哈希只证明两侧内容块在记录时相同，不证明译文忠实。本提取对 package-contracts-3 的 53 个中文 README 中所有超过 512 字符的行做了逐字符分块复读（30 行、22,300 字符，含 8 行超过先前约 768 字符的显示上限），因此超长行不再构成未读理由；但该复读只覆盖超长行，不等于逐句双语审校。`deepseek-harness/scripts/verify-package-readme-model-experience.ts:366-638@687f282e`、`deepseek-harness/scripts/verify-package-readme-limitations.ts:34-95@687f282e`、`deepseek-harness/scripts/doc-standard.spec.ts:142-160@687f282e`、`deepseek-harness/scripts/translation-pairing-record.ts:79-243@687f282e`、`deepseek-harness/scripts/verify-translation-pairing.ts:99-170@687f282e`
