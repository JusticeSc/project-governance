# 升级指南

破坏仓库外用户可观察的CLI、配置／profile、持久数据、SDK／wire API或已发布入口时，在引入破坏的同一次改动写指南。类别不是封闭清单。修改尚未发布指南已覆盖的表面时原位更新。唯一免写例外是预稳定的内部API，且所有消费者在同次改动全部更新；不能用于外部消费者或已保存的用户配置。

<a id="upgrade-guides.required-trigger"></a>
## 触发与责任

作者列出实际外部表面、受影响消费者、需写指南或具体免写理由；评审核对遗漏。涉及持久类型时仍须独立完成[持久化确认](persistence-current-records.md)，指南链接该记录，只写读者动作。指南形态门无法从源码变化判断应不应该有指南，作者与评审拥有触发完整性。

<a id="upgrade-guides.same-change-lifecycle"></a>
## 生命周期

目录取写入时根package.json的version：docs/upgrade-guide/v<version>/<item>/。根版本不变时，目录描述从该release到下一release的delta；后续触及同一表面，更新已有item，不能新建重复项。破坏回滚，删除该item全部三件套；版本bump后旧目录冻结，新破坏进入新版本目录。绝不写跨越一个release的指南。

作者维护双语与配对记录；评审判断同改动、原位更新、回滚删除、版本与单跨度；发布负责人确认冻结边界。修改目标版本来源或目录格式属于明确适配，必须同时改模板、验证器和消费者，不能只改命令参数假装已支持其他release制度。

<a id="upgrade-guides.item-layout"></a>
## 文件与元数据

每个item必须有guide.md、guide.zh.md、guide.i18n.yaml。版本是v前缀的三段semver，可有预发布后缀，不允许build metadata；item为小写字母数字及单连字符分隔的kebab-case。禁止根README、附件、第四种文件或额外嵌套。形态门只检查存在的文件，缺少对侧或整项须另由配对与评审发现。

<a id="upgrade-guides.frontmatter"></a>

两份Markdown首行开始的YAML对象恰有kind、description两键。kind为upgrade-guide；description是非空字符串，具体点名破坏面与替换物。不能增加version、owner等键绕过错误；扩展格式先建立真实消费与门禁并迁移既有项。

<a id="upgrade-guides.heading-structure"></a>

正文恰有一个H1，随后两个H2：英文Change、Migration；中文变更、迁移，次序固定。语言切换行不是标题。可以在节内有H3，但不能用它代替或新增H2；背景／References不能另占H2。

<a id="upgrade-guides.word-ceiling"></a>

英文整文件不超过500个空白token，含frontmatter、链接和代码；中文不套该词数算法。超限把理由放Note或owner文档并链接，重复机械动作提成可执行脚本，而非提高阈值或删除必要迁移条件。

<a id="upgrade-guides.change-section"></a>
## 内容与实际验证

Change写明旧行为、新行为与受影响者。可补读者能识别的症状，但不能把症状示例冒充来源的独立硬性字段。Migration按读者执行顺序写精确路径、键、符号与命令；before/after能更短说清时使用，不机械强求每步一个片段。必须有如何确认的步骤；不可逆动作写备份与恢复，失败分支写识别与处理，owner细节链接不复制。不得要求用户移动、覆盖或删除已经提交的数据代际。

<a id="upgrade-guides.migration-steps"></a>

评审在临时checkout／fixture中实际执行关键步骤。不能执行时说明缺失前提与可核对的替代证据，不报告已验证。语言一致性依[双语规则](documentation-localization.md#i18n-pairing)，须同改动评审双方，再显式更新具名配对记录。

<a id="upgrade-guides.verifier-scope"></a>
## 执行器与盲点

形态命令为node <skill>/packages/governance/documentation/src/verify-upgrade-guides.mjs --root <target>；默认guide-root为docs/upgrade-guide。依赖先在Skill根执行npm ci --ignore-scripts。配对、链接、换行及适用的代码示例检查分别由[文档包](../packages/governance/documentation/README.md)拥有，不重复实现。

形态门检查已存在路径、首部YAML、精确键集、kind／description、H1/H2形状和英文词数；接受CRLF及预发布版本。YAML语法错误会抛出，不能当作通过。它不读取package.json，不核对tag、目录版本、冻结、单跨度、语义、步骤可执行性或配对侧车内容；缺整棵树仍返回0，因此绿色不证明指南存在。缺文件、重复item、漏写、用户动作正确性及语义对应由其他门与评审承担。目标CI必须实际接入并保留拒绝错误的运行；本地命令和工作流文本不证明远端必需检查。

<a id="upgrade-guides.review-completeness"></a>
## 完成判断

交付前确认全部实际破坏都有item或合法免写理由，版本／生命周期正确、双语三件套齐、用户能照做并判断结果，形态／配对／链接及适用的编译检查已在真实目标运行。缺外部前提如实记录；不能删树、重录哈希或减少扫描范围制造完成。

来源：[触发、生命周期与模板](https://github.com/deepseek-ai/deepseek-harness/blob/687f282e8625c6b8d11ff58211a90524be2e4317/.agents/skills/dsh-create-upgrade-guide/SKILL.md#L6-L46)、[形态实现及其边界](https://github.com/deepseek-ai/deepseek-harness/blob/687f282e8625c6b8d11ff58211a90524be2e4317/scripts/verify-upgrade-guides.ts#L16-L75)。角色分工、备份恢复与评审操作是本产品的落地流程，不声称来源有相应自动执行器。
