# 包 README、注释与 API 文档

本页命令中的 `<product-root>` 指单独取得的产品仓库根目录，不是复制后的轻量 Skill 座。需解析器或其他 workspace 依赖的产品命令须在该产品根按锁准备依赖；目标工程仍使用自己的配置和入口。

本页拥有代码与包的对外文档合同：包 README（§5）、注释与导出 JSDoc（§7）、可编译示例、类型等价与子系统页归属（§12）。改包对外行为、导出 API、公共类型，或新增包组与文档化类型时读本页；写作与预算见[文档结构、放置与写作](documentation-structure-and-prose.md)，双语侧见[双语文档：配对、术语与翻译](documentation-localization.md)。共同约定：触发定位以[根参考的读者触发索引](documentation.md#reader-triggers)为准；各节保留原节号（页内编号因此可能不连续），`源义务`、`迁移设计`与源证据坐标的含义同根参考开头；本页机制的来源坐标收在文末附录。

## 5. 包 README 合同

来源：deepseek-harness/docs/AGENTS.md:15-19@687f282e 来源：deepseek-harness/.agents/skills/dsh-doc/references/structure-hierarchy.md:4-87@687f282e 来源：deepseek-harness/.agents/skills/dsh-doc/references/style.md:5-49@687f282e 来源：deepseek-harness/scripts/doc-standard.spec.ts:18-24@687f282e 来源：deepseek-harness/scripts/doc-standard.spec.ts:40-49@687f282e 来源：deepseek-harness/scripts/doc-standard.spec.ts:57-160@687f282e 来源：deepseek-harness/scripts/doc-standard.spec.ts:339-406@687f282e 来源：deepseek-harness/scripts/doc-standard.spec.ts:443-456@687f282e 来源：deepseek-harness/scripts/verify-package-readme-summaries.ts:1-77@687f282e 来源：deepseek-harness/scripts/verify-package-readme-model-experience.ts:1-638@687f282e 来源：deepseek-harness/scripts/verify-package-readme-limitations.ts:1-95@687f282e 来源：deepseek-harness/scripts/run-gates.ts:805-885@687f282e 来源：deepseek-harness/package.json:119-120,130,140@687f282e

<a id="package-readme"></a>
<!-- mechanism-ids: documentation-package-readme-kinds, documentation-package-readme-summary, documentation-package-readme-model-experience, documentation-package-readme-limitations -->

**源义务。** 每个 `packages/<group>/<pkg>/package.json` 必须有同目录 README；包 README 是“该包合同”：配置、语义、限制、扩展点和 Model Experience。不得复述 JSDoc、生成目录或其他包的关切。`deepseek-harness/docs/AGENTS.md:33@687f282e`、`deepseek-harness/scripts/verify-package-readme-limitations.ts:47-53@687f282e`、`deepseek-harness/scripts/verify-package-readme-model-experience.ts:366-370@687f282e`

**种类判定。** `dsh-doc` 按包形态选模板：路径深度不超过三层的 `packages/<group>/README.md` 是 group；有 `dsh.bundle.patch` 的是 bundle；登记为 library 的是 library；其余插件包是 reference。模板分别规定骨架、Metadata、Model Experience 与限制节。`deepseek-harness/.agents/skills/dsh-doc/SKILL.md:18-31@687f282e`、`deepseek-harness/.agents/skills/dsh-doc/references/metadata-links-i18n.md:3-10@687f282e`

**机器校验的 kind。** `doc-standard.spec.ts` 对 glob 匹配的 `packages/README.md`、`packages/README.zh.md` 及两级包 README 读取 YAML frontmatter，按路径段数、`package.json` 的 `dsh.bundle.patch` 和 `PACKAGE_LIBRARIES` 推导 expected kind 并断言相等；`description` 必须非空，出现 `name`、`audience`、`tags` 或 `i18n` 任一字段即失败。该测试还断言 persistence 文档 kind：`docs/persistence-changes/*.md` 为 `persistence-change`、`releases/dsh-*.md` 为 `persistence-release`、`historical-formats/v*.md` 为 `persistence-format` 且数量为当前 writer 版本×2。`deepseek-harness/scripts/doc-standard.spec.ts:18-24@687f282e`、`deepseek-harness/scripts/doc-standard.spec.ts:40-49@687f282e`、`deepseek-harness/scripts/doc-standard.spec.ts:57-160@687f282e`、`deepseek-harness/scripts/doc-standard.spec.ts:339-406@687f282e`

**自动骨架。** 路径深度恰为四段的包 README（英文与中文）还受精确标题检查：英文必须含 `## Summary`、`## Table of Contents`、`## Dev Note`（`Dev Note` 允许 H2/H3），中文必须含 `## 概述`、`## 目录`、`## 开发备注`（`开发备注` 允许 H2/H3）。`deepseek-harness/scripts/doc-standard.spec.ts:154-160@687f282e`、`deepseek-harness/scripts/doc-standard.spec.ts:401-406@687f282e`

**自动执行。** 这些不是仅评审建议：`run-gates.ts:850-862,872,881-885` 把 Summaries、Model Experience、Limitations 与 `vitest run scripts/doc-standard.spec.ts` 标为 quick，`package.json:130` 的 `test:docs` 运行 doc-quick；`package.json:119-120,140` 暴露对应单门禁脚本。门禁失败以退出码 1 结束。`deepseek-harness/scripts/run-gates.ts:850-862@687f282e`、`deepseek-harness/scripts/run-gates.ts:872@687f282e`、`deepseek-harness/scripts/run-gates.ts:881-885@687f282e`、`deepseek-harness/package.json:119-120@687f282e`、`deepseek-harness/package.json:130@687f282e`、`deepseek-harness/package.json:140@687f282e`

**源义务（Metadata）。** 包 README 以 YAML frontmatter 开始，`description` 与 `kind` 必填；`kind` 必须与机械推导一致，并选择唯一 README 模板。除 `name`、`audience`、`tags`、`i18n` 这四个会被测试拒绝的字段外，其他自定义字段不由该测试治理；仍不要重复文件名、包清单或门禁已经拥有的字段；除非有仓库 taxonomy 与搜索消费者，不要加 `tags`。`.i18n.yaml` 是 YAML 一致性记录，不是 TOML。`deepseek-harness/.agents/skills/dsh-doc/SKILL.md:50-60@687f282e`、`deepseek-harness/.agents/skills/dsh-doc/references/metadata-links-i18n.md:3-30@687f282e`

**源义务（Summary）。** 英文包 README 的 `## Summary` 最多 100 个 `wc -w` 式单词；超出即失败，并提示先读对应模板。摘要写用户或 agent 能用包“做什么”、何时选、主要代价、最重要边界；不要写“这是一个用于……的包”。`deepseek-harness/scripts/verify-package-readme-summaries.ts:8-17@687f282e`、`deepseek-harness/scripts/verify-package-readme-summaries.ts:44-75@687f282e`、`deepseek-harness/.agents/skills/dsh-doc/templates/package-reference.md:19-25@687f282e`

**目标Summary入口。** 已交付零外部依赖的 `packages/governance/documentation/src/verify-package-readme-summaries.mjs`。在目标 `.doc-gates/package-readme-summaries.json` 写真实布局，例如 `{"packagesRoot":"packages","readme":"README.md"}`；字段省略使用这两个默认值，但配置文件必须存在。扫描包根README、每组README和每包README，与源三层范围对应；普通仓库最外层README不因此自动纳入。项目布局不同可改包根/英文文件名，不能配置单文件清单或提高100词上限来规避扫描。

```bash
node <product-root>/packages/governance/documentation/src/verify-package-readme-summaries.mjs
```

在目标根运行，异地用 `--root <目标根>`，另一个配置用 `--config <仓库相对JSON>`。产品仓内入口为 `node packages/governance/documentation/src/verify-package-readme-summaries.mjs --root <目标根>`。包作者收到超限/缺节/空扫描退出1后，按完整包kind合同及目标真实模板重写、恢复语料并重跑；配置/参数/读取失败退出2，先修前提。源诊断指向源自己的dsh-doc模板，目标诊断显示kind并指向本已安装参考，不声称那些源模板已安装。计数通过不证明用户结果、选型代价或命题无损，评审者仍须检查；把实际入口接入目标已有顶层检查及适用CI，并另取CI必跑/平台阻断证据。

该执行器的判定：恰 100 词正常 0，101 词/缺组 Summary/空扫描拒绝 1，对应修改后恢复 0，缺配置 2 及恢复 0。原始文本 H2 正则也会接受代码围栏里的伪 Summary（实际 0），这是源边界，不是 AST 骨架验证；不以它替代仍待落实的 Model Experience、限制节、Metadata/kind 及双语语义检查。入口通过不是完整 Skill 安装、独立采用或可信 CI 证明。

**目标限制节入口。** 已交付 `packages/governance/documentation/src/verify-package-readme-limitations.mjs`，以目标包清单发现两级包而不是沿用来源包名。在 `.doc-gates/package-readme-limitations.json` 声明真实布局与逐包审计豁免：

```json
{
  "packagesRoot": "packages",
  "manifest": "package.json",
  "readme": "README.md",
  "exemptions": {}
}
```

执行 `node <product-root>/packages/governance/documentation/src/verify-package-readme-limitations.mjs`（异地 `--root`，另一配置 `--config`；产品仓内入口 `node packages/governance/documentation/src/verify-package-readme-limitations.mjs --root <目标根>`）。包必须有唯一原文H2 `## Known Limitations and Deferred Work` 且至少一个读者可见顶层列表项；标题变体、深度错误、多个近似节、只在代码围栏或HTML注释里的条目都被拒绝。确实无延迟工作的包须逐项登记理由，指向不存在包或理由为空同样失败。退出1按诊断修文档或审计豁免，退出2先修配置/解析器前提。

目标比源多做一处显式适配：用 Markdown AST 删除代码块和渲染消失的HTML注释后再要求可见`- `行，因此围栏里的伪条目不会冒充限制。判定为正常 0、九类拒绝 1、修复恢复 0、缺解析器 2；采用方须在本仓真实包语料上重现这些结果。形态通过仍不证明限制真实、完整、最新，也检查不到中文侧；不是完整 Skill 安装、独立采用或可信 CI。

**源义务（Model Experience 入口）。** 每个含 `packages/*/*/package.json` 的包 README 要么有唯一 H2 `## Model Experience`，要么在 `NO_MODEL_EXPERIENCE_SECTION` 审计白名单中（模型无关包；白名单条目必须仍对应扫描包并保留理由）。有该节时它必须是最后 H2，或倒数第二 H2 且紧跟唯一 `## Known Limitations and Deferred Work`。H2 名称必须逐字符匹配；大小写或深度变体失败。扫描集来自 `packages/*/*/package.json`，且只读英文 `README.md`。`deepseek-harness/scripts/verify-package-readme-model-experience.ts:1-31@687f282e`、`deepseek-harness/scripts/verify-package-readme-model-experience.ts:32-45@687f282e`、`deepseek-harness/scripts/verify-package-readme-model-experience.ts:366-427@687f282e`

**源义务（短形式）。** 只有 `SENTENCE_MODEL_EXPERIENCE` 白名单可使用短形式：恰好一句 `None, as … .` 或 `Indirectly, through … .`，空行，精确 `#### KV Cache effect`，空行，一个非空段落。白名单条目必须保留理由且不能与“无该节”白名单重叠；不在白名单却写 `None.` 或短句失败。白名单本身覆盖 47-250，并校验成员存在、理由非空且不与无节白名单重叠。`deepseek-harness/scripts/verify-package-readme-model-experience.ts:47-250@687f282e`、`deepseek-harness/scripts/verify-package-readme-model-experience.ts:345-364@687f282e`、`deepseek-harness/scripts/verify-package-readme-model-experience.ts:429-480@687f282e`

**源义务（结构化）。** 其余包有一个或多个 `###` 模型上下文条目；条目标题非空且 fragment 唯一。条目下恰好三个 H4，按顺序 `#### What the model sees`、`#### Token effect`、`#### KV Cache effect`；每个 H4 后空行加一个非空段落，字段不得用本地 `](#...)` 链接。字段段落之后可选接 `#####` 标题加精确的非空 `markdown` 语言围栏；每个 H5 恰好一个围栏，标题在条目内唯一，标题前空行。标题含 system prompt 的条目在 `What the model sees` 下必须有嵌套围栏；标题含 schema/schemas 的条目必须在 `What the model sees` 链接 `../../../docs/tool-catalog.md#<存在的 H2 fragment>`；至少一个条目用行内代码、嵌套 markdown 或工具目录锚点落到具体文字。`deepseek-harness/scripts/verify-package-readme-model-experience.ts:252-330@687f282e`、`deepseek-harness/scripts/verify-package-readme-model-experience.ts:481-627@687f282e`、`deepseek-harness/scripts/verify-package-readme-model-experience.ts:629-638@687f282e`

**源义务（限制）。** 每个非白名单包必须有唯一 H2 `## Known Limitations and Deferred Work`，且至少一个顶层 `- ` 列表项；不得出现变体标题（含 limitations、deferred work、non-goals 等近似写法）。确实无限制的包必须加入 `NO_LIMITATIONS` 白名单并逐包写理由；白名单条目若指向已重命名/删除的包也失败。`deepseek-harness/scripts/verify-package-readme-limitations.ts:1-95@687f282e`

**迁移设计。** 采用方必须对每个适用包实现完整 README 合同：Summary、Model Experience（含 H3 条目、三个 H4 字段、H5 `markdown` 围栏、白名单/短形式、system-prompt 与 schema 证据）和限制节；包数量少不是省略理由。若项目确实没有包 README 或 Model Experience（事实类别不存在），记录不适用与重新激活条件，不得用简化三节冒充等价。**证据边界。** Summary、Model Experience 与限制节门禁只读英文 `README.md`；`doc-standard.spec` 的 frontmatter/kind 与包骨架检查按 glob 同时覆盖 `README.md` 与 `README.zh.md`。中文限制节/Model Experience 的结构与语义不由这三个内容门禁检查；配对门禁只比较结构与逐节哈希，不证明语义等价。结构通过也不证明 README 描述与代码一致。

## 7. 注释与导出 JSDoc

来源：deepseek-harness/docs/AGENTS.md:51-63@687f282e 来源：deepseek-harness/scripts/verify-doc-budgets.ts:1-58@687f282e 来源：deepseek-harness/scripts/doc-budgets.manifest.json:1-8@687f282e 来源：deepseek-harness/docs/AGENTS.md:65-71@687f282e 来源：deepseek-harness/.agents/skills/dsh-doc/SKILL.md:79-125@687f282e 来源：deepseek-harness/.agents/skills/dsh-prose-standard/SKILL.md:14-63@687f282e 来源：deepseek-harness/.agents/skills/dsh-doc/references/review.md:4-67@687f282e 来源：deepseek-harness/docs/AGENTS.md:37-39@687f282e 来源：deepseek-harness/AGENTS.md:173-177@687f282e 来源：deepseek-harness/docs/AGENTS.md:41-41@687f282e 来源：deepseek-harness/scripts/verify-md-wrap.ts:1-86@687f282e 来源：deepseek-harness/docs/i18n/translation-rules.md:25-32@687f282e 来源：deepseek-harness/scripts/verify-export-jsdoc.ts:1-607@687f282e 来源：deepseek-harness/packages/core/agent/tests/verify-export-jsdoc.spec.ts:1-561@687f282e

<a id="comments-jsdoc"></a>
<!-- mechanism-ids: documentation-comments-export-jsdoc -->

**源义务。** 注释和 JSDoc 写完整合同，不写推理过程；保留行为、失败、时序、所有权、模态、例外、后果和非显然方向；删除逐步实现叙述、测试走查、评审分析和代码复述。局部合同就地写，理由链接到 Agent Note。`deepseek-harness/AGENTS.md:173-177@687f282e`、`deepseek-harness/docs/AGENTS.md:43@687f282e`

**源义务（范围）。** 每个非 vendor 包的 `packages/*/*/src/**/*.ts` 都要有 JSDoc；声明需描述性文字；函数和公共类方法需每个参数一个 `@param`、非 void 结果需 `@returns`。`this` 参数不要求，参数名前导下划线按 lint 约定归一化。类还要求类级说明、公共属性/访问器说明（get/set 对由 getter 覆盖）；重载实现免检（签名承担文档），构造器不检查。内联可调用注解只接受单一 call signature；混合 call/construct 与其它成员的 callable literal 失败关闭，要求抽成命名类型。`deepseek-harness/scripts/verify-export-jsdoc.ts:1-43@687f282e`、`deepseek-harness/scripts/verify-export-jsdoc.ts:140-180@687f282e`、`deepseek-harness/scripts/verify-export-jsdoc.ts:188-260@687f282e`

**源义务（例外与导出形态）。** 框架协议槽 `Config`、`inject`、`name`、`reusable` 作为类的静态成员免检；顶层导出还可含 `apply`。继承成员仅在基类公开且本次没有新增参数/具体返回时继承文档；公共覆写受保护基类视为新 API。`import x =` 别名若指向 callable/class/namespace，拒绝，要求直接导出声明；仅指向纯 prose 目标时别名自身写说明。`export =` 拒绝；带 `moduleSpecifier` 的再导出跳过（定义模块自会遍历）；无 specifier 的 `export { … }` 解析到本地声明；string-literal module / `declare global` 增强跳过；未识别的导出语句失败关闭。`deepseek-harness/scripts/verify-export-jsdoc.ts:260-430@687f282e`、`deepseek-harness/scripts/verify-export-jsdoc.ts:430-540@687f282e`

**源义务（公共面裁剪）。** 仅在包没有 `./src/*` 导出时，按 package.json `exports` 指向的入口收集可达名称，只检查这些名称；其余包遍历全部模块级导出。脚本式 `.d.ts`（无 import/export）视为环境作用域，成员隐式导出。`deepseek-harness/scripts/verify-export-jsdoc.ts:540-607@687f282e`

**迁移设计。** 采用方必须对完整公共导出面启用：公共入口、公共类方法、重载、命名空间、内联 callable、属性/访问器、别名与协议槽都按源规则检查；若没有 AST 检查器，用等价的人工/结构化检查并明确其非自动化状态，不能把“先检查入口”当作完成。不要把“有 JSDoc”当成“合同完整”：检查器只能看标签存在和描述非空，不能判断语义是否准确。**证据边界。** `verify-export-jsdoc` 不检查注释中的行为真假，也不替代类型检查。

**源义务（失败关闭与继承覆盖，测试证据）。** 非标识符 default export 与括号/`satisfies` 包裹的函数初始化器仍按函数合同检查；ambient `declare namespace` 成员隐式导出并逐个检查；`export import` 别名自身需说明，指向 callable/class/namespace 时拒绝；`export =`、混合 callable literal、hybrid call/construct 签名失败关闭。继承覆盖时，基类未命名的参数（含 binding pattern）必须由覆写补 `@param`；下划线重命名视为同一参数；公共覆写 protected-only 基类成员按新 API；基类 void 而覆写产生具体返回值（含 checker 推导）时恢复 `@returns` 义务；基类已承担 `@returns` 时保留完整豁免。`deepseek-harness/packages/core/agent/tests/verify-export-jsdoc.spec.ts:334-561@687f282e`

## 12. 代码等价与可编译示例

来源：deepseek-harness/scripts/translation-prompt.ts:1-259@687f282e 来源：deepseek-harness/scripts/verify-translation-prompt.ts:1-98@687f282e 来源：deepseek-harness/scripts/translation-prompt.expected.spec.ts:1-32@687f282e 来源：deepseek-harness/docs/i18n/translation-prompt.md:1-263@687f282e

<a id="code-equivalence"></a>
<!-- mechanism-ids: documentation-doc-typecheck, documentation-type-equiv, documentation-subsystem-page-ownership -->

**源义务（可编译围栏）。** `doc-typecheck` 扫描根 `README.md`、`.agents/notes/**/*.md`、`docs/**/*.md`、`packages/*/*.md`、`packages/*/*/*.md`，排除归档 Agent Note；只编译 info 恰为 `ts` 的围栏。`ts ignore-check` 记为 opt-out；`ts type-equiv`/`public-api`/`cordis-catalog`/`persistence-catalog`/`config-catalog` 跳过，由 type-equiv 或对应生成器门禁负责。字节相同的 `.zh.md` 副本复用无后缀英文兄弟的编译结果，内容不同则独立编译。`deepseek-harness/scripts/doc-typecheck.ts:1-73@687f282e`、`deepseek-harness/scripts/doc-typecheck.ts:200-252@687f282e`

**源义务（诊断与 opt-out 比例）。** 编译诊断映射回原 Markdown 文件、围栏起始行和块内位置；类型、语法或导入解析错误使门禁失败。没有待编译块时提前退出0，全部都是`ignore-check`时也不会执行比例检查。只在存在待编译块时计算`ignored / (checked + ignored)`，分母≥4且比例>0.5才失败；其它owner的围栏不稀释分母。理由属于评审义务，脚本不校验；Markdown解析器补全未闭合围栏也不等于本编译器会拒绝。`deepseek-harness/scripts/doc-typecheck.ts:196-252@687f282e`

**源义务（类型等价）。** ` ```ts type-equiv ` 保存“原始类型声明 + 原 JSDoc”，用于证明文档粘贴与源声明等价；` ```ts public-api ` 保存去掉函数体的公共类声明。两者必须登记在 `scripts/type-equiv.manifest.json`，清单与围栏一对一；任何未登记围栏、孤儿清单项、结构/JSDoc 差异、投影差异都失败。`deepseek-harness/scripts/verify-type-equiv.ts:1-120@687f282e`、`deepseek-harness/scripts/verify-type-equiv.ts:214-391@687f282e`、`deepseek-harness/scripts/type-equiv.manifest.json:1-3@687f282e`

**源义务（何时用哪种）。** 教程式用法示例用普通 `ts`；逐字重述源类型用 `type-equiv`；展示公共类形状用 `public-api`；不要为了绕过编译把真实示例标成 `type-equiv`。源码改名/改字段时，先改源声明，再运行等价检查定位所有粘贴。`deepseek-harness/docs/AGENTS.md:41-43@687f282e`、`deepseek-harness/docs/development.md:99-110@687f282e`

**迁移设计。** 采用方必须为所有声明可运行的文档代码块提供真实编译（真实编译器或等价虚拟文件编译）；无法编译的块必须标注为非可运行/未验证，不能声称示例可运行。不要用 `// ...` 省略关键 API 后仍声称示例可运行。**证据边界。** `doc-typecheck` 不运行示例，只编译；`type-equiv` 不证明语义正确，只证明声明与源一致。

**目标执行器。** 从目标项目根目录运行，不从Skill目录推断项目。目标须已有自己的TypeScript开发依赖和可加载的真实tsconfig；本模块不下载编译器，也不回退使用Skill的发布者测试依赖。准备文档模块的固定Markdown解析器后，在目标的`.doc-gates/typecheck.json`声明实际语料，例如：

```json
{
  "roots": ["docs"],
  "tsconfig": "tsconfig.json",
  "mode": "project"
}
```

```bash
node <product-root>/packages/governance/documentation/src/doc-typecheck.mjs
```

将这条命令接入目标现有的顶层检查入口和适用CI，不另建一套竞争检查清单。`--root`指定真实目标根，`--config`指定根内配置；语料复用本模块的`roots`/`files`/`archiveRoots`规则，默认不把冻结Note当源。空语料、缺解析器/编译器、坏配置退出2，不冒充通过；非空语料里没有受编译`ts`块则保留源规则的退出0边界。

`project`模式继承目标编译选项和真实项目引用，由目标的`tsc -b`构建引用并检查临时文档项目。临时配置与所选tsconfig处于同一目录，保留`${configDir}`的所有者语义；用明确的`files`选择每个提取块，不依赖跨目录glob再次发现。该模式须能写目标根、所选配置目录以及真实引用项目的构建产物；临时片段不发射输出，结束后删除自有临时目录和配置文件，不覆盖同名既有文件。目标原有`include`/`exclude`不会吞掉文档输入，项目引用仍由TypeScript按其owner配置解析。

`declarations`模式用于已有协调构建产物的源式布局：将tsconfig别名的`/src`、`/src/*`、`/src/file.ts`和`/src/dir`映射到`/lib/types`对应声明，源例外`/examples/`保留原路径。无法映射会阻塞，不猜替代目录；其它布局用`project`模式。该模式不发射文件、不重建依赖，也不证明声明新鲜度；调用者须先实际完成自己的协调构建。字节相同的**完整受识别围栏序列**才使中文复用英文，部分或变化序列独立编译。

两种模式对文档输入都强制`noCheck:false`，不能因目标采用只发射配置而静默跳过类型检查；引用项目仍保留各自选项。`declarations`模式在禁用声明发射时同时清除`emitDeclarationOnly`，避免把有效的声明构建配置变成无效组合。这是目标配置适配，不是声称固定来源已覆盖这些选项。

**编译器证据边界。** 初始12条命令保留原始版本观察。独立复核发现配置缺陷后，新增物理默认安装座的7条目标顶层命令，观察嵌套`${configDir}`别名/typeRoots、真实引用重建、继承`noCheck`时的类型错误拒绝、`emitDeclarationOnly`兼容、两模式修复恢复与每次临时产物清理；当前证据绑定修复后的模块及目标编译器/解析器分发文件。初始比例、缺编译器和显式目标根观察不重复运行，也不把旧模块hash当作当前产物认证。已实际验证TypeScript6.0.3，其它版本未认证。这些是本地编译效果，不是示例行为执行、独立采用、完整安装认证或真实required-CI/平台阻断；catalog owner的执行缺口仍分别保留，类型等价由下述独立owner检查。

**类型等价目标入口。** `packages/governance/documentation/src/verify-type-equiv.mjs`复用相同的目标语料和固定GFM解析器；TypeScript必须由目标的`package.json`位置解析，不下载或回退使用发布者编译器。采用方在`.doc-gates/type-equiv.json`声明适用的全部语料，例如`{ "roots": ["docs"], "manifest": ".doc-gates/type-equiv.manifest.json" }`。配置缺省清单即该路径；支持相同的`files`、`archiveRoots`、`--root`和`--config`规则。清单是`entries`数组，每项声明目标根相对的`doc`、`source`和`symbol`；完整声明不写`projection`，公共类写`"projection": "public-api"`。显式模块合并只用于完整接口：可加`"augmentations": [{ "source": "src/runtime.ts", "module": "./api.ts" }]`，其中module精确匹配源码的字符串字面量模块名，而不是自动发现所有扩展。

```bash
node <product-root>/packages/governance/documentation/src/verify-type-equiv.mjs
```

将该命令并入目标现有顶层检查/适用CI。门禁扫描全部声明语料，不只扫描清单中的文件；完整声明和公共投影分别以文档、符号、投影为键，重复围栏/清单、孤儿、缺源码符号、未闭合围栏、结构或原JSDoc漂移退出1。缺真实语料/编译器/解析器、坏配置或清单退出2。非空语料里没有等价围栏且清单为空时退出0；未要求全部新类型必须写文档。只有字节相同、顺序/数量/投影均相同的完整等价围栏族才使中文复用英文；变化的中文围栏仍需自己的清单/源匹配，不是翻译语义认证。

完整声明保留原声明与JSDoc；公共类保留源码附着的类/成员JSDoc、泛型、继承、公开字段/构造/方法/访问器签名，去掉实现体、字段初始化、私有/受保护成员与静态块。显式接口合并保留原附着JSDoc、基接口泛型及所有指定成员。**目标适配。** 使用TypeScript解析后的真实token比较结构，普通注释与token间空白忽略，字符串/模板里的空白和注释样文本不擦除；只移除声明级export/default。JSDoc仅规范空白，内容与顺序保留。多个接口继承类型合为一个有效extends列表。这比固定来源的全字符串正则归一化更适合任意目标；不冒充来源实现，也不证明这些声明本身类型正确或示例已经执行。

**类型等价证据边界。** 必须覆盖字面量/JSDoc 漂移、公共类、显式合并、清单双射、中文序列和 GFM 围栏，命令侧覆盖正常、漂移拒绝、源先改后同步文档的恢复、孤儿、重复、缺目标编译器与异地指定根。执行器使用目标自己的编译器与固定解析器，不下载也不回退发布者依赖。真实源码和方法体含会抛错的表达式但没有被执行；本门禁只读/解析/比对声明，不执行或类型检查。初次物理探针的字面量分号不一致结果保留为失败教训：修探针，不放宽门禁。其它编译器版本、完整安装/独立采用、全目标适用范围及真实 CI 阻断均未认证。

### 子系统页归属：组链接检查与类型完整性分开

**来源义务与自动边界。** 新增包组、重塑已文档化类型或调整归属时，类型作者先确定声明包组的 owning 页，文档作者在同一变更更新该页，评审者检查语义、类型和双语完整性。来源门禁用 `packages/*/README.md` 与 `packages/*/*/package.json` 的组名并集发现检查对象：即使组只由子包 manifest 发现，也必须有英文组 README。每组须链接至少一个存在的独立 `docs/subsystems/*.md` 页，或有显式非空理由豁免。代码、注释、图片、子系统索引 `README.md` 和 `.zh.md` 对应页不计 owning 页；空理由、已删除组的孤儿豁免、已有页链接却保留豁免都失败。来源五个豁免组的理由是项目政策，不是“纯内部组均豁免”的通用规则。`deepseek-harness/scripts/verify-subsystem-pages.ts:1-137@687f282e`、`deepseek-harness/docs/AGENTS.md:43-44@687f282e`

**目标配置与入口。** 已交付 `packages/governance/documentation/src/verify-subsystem-pages.mjs`；不依赖源仓、不需要目标 TypeScript 编译器。准备可选文档模块的固定解析器后，在目标 `.doc-gates/subsystem-pages.json` 写真实布局，例如：

```json
{
  "packagesRoot": "packages",
  "docsRoot": "docs",
  "pageRoot": "docs/subsystems",
  "groupReadme": "README.md",
  "manifest": "package.json",
  "pageSuffix": ".md",
  "exemptions": {}
}
```

`exemptions` 必须是“组名→具体理由”的对象，不是数组；没有豁免就保留 `{}`。包组所有者确认确实没有独立 owning 页后才能登记理由，不能为恢复绿色随意加豁免。字段省略时采用上述目录/文件名默认值；配置文件本身仍须存在。布局不同就改字段并核对发现的组数，不能把“0组通过”当作完整目标覆盖证据。

```bash
npm ci --prefix <product-root> --ignore-scripts
node <product-root>/packages/governance/documentation/src/verify-subsystem-pages.mjs
```

从目标项目根目录运行；异地调用用 `--root <目标根>`，`--config <配置路径>` 默认相对该根解析。在产品仓内可直接运行 `node packages/governance/documentation/src/verify-subsystem-pages.mjs --root <目标根>`。采用者须把同一命令加入目标既有顶层检查和适用 CI；上述本地入口存在不等于可信 CI 已必跑或 forge 已阻断合并。

**落点适配。** 固定来源只接受 `../../docs/subsystems/<page>.md`（可带 fragment）的字面形式。目标把 Markdown AST 中的直接 `link` 从组 README 所在目录解析，去掉 query/fragment，规范化后必须处于配置的 `pageRoot`、具有指定后缀且是存在的文件；不读取已废弃的 `linkPrefix`。规范化后等效的相对路径可以通过，离开页目录的 `../` 不会因文本“看起来像” owning 页而通过。这是目标布局适配，不声称与源程序逐输入完全等价，也不是任意链接、锚点、页面内容或生成区域的完整校验。

`groupReadme` 可以是嵌套文件，例如 `docs/OWNERS.md`；链接基准是该文件所在目录，而不是包组目录。`components/compute/docs/OWNERS.md` 指向 `guide/owners/compute.md` 的正确相对链接是 `../../../guide/owners/compute.md`，不能少一个 `../`。已修复独立复核发现的这一落点误判，仍按实际文件检查，不限制配置来回避问题。

**失败与恢复。** 合同违反退出1，诊断列出组 README、缺失 owning 页或无效豁免：补组 README/正确链接/真实 owning 页，或移除过期豁免后重跑同一入口。坏配置、缺配置、错误参数或缺安装座解析器退出2：先恢复输入/依赖，不将不可运行状态记为通过。成功退出0并报告发现组数、已链接数和显式豁免数；评审者还须核对未被配置发现的实际包组。

**消费观察点。** 该执行器必须在非源产品的目标布局上按同一个顶层入口反复执行，覆盖正常、缺链接/实际落点越界/缺页/过期豁免的退出 1 及修复恢复，以及缺安装座解析器的退出 2 和恢复。在固定源树上做只读语料观察（含移除豁免后的拒绝）既不是源脚本执行，也不是源生产设置证明；局部模块消费也不是完整 Skill 安装或独立采用。

嵌套路径必须以实际页为准：错误落点拒绝 1、正确链接恢复 0、删除实际页拒绝 1、恢复实际页通过 0；这些是当前执行器必须重现的行为，不是历史版本的结论。

**不能由门禁推出的结论。** 实际临时目标含一个未文档化的新导出类型，链接检查仍成功，证明本门禁不枚举所有类型。类型粘贴漂移归 `type-equiv`，是否遗漏新类型、页语义是否完整、中文是否正确、同一变更是否联动、豁免理由是否合理由对应程序和评审承担。组链接/文件检查不替代索引内容、生成标记或 freshness gate；本地正常/拒绝/恢复不替代真实 required-CI、平台阻断、完整安装、独立采用或源仓反向查漏。

## 机制→来源引用索引（本页机制）

本节只列本页机制的来源区间，固定提交 `687f282e`；其它机制的坐标在其所属页。它只补齐可回溯的引用坐标，不新增正文断言；正文解释仍以本页对应小节为准。

- `documentation-package-readme-kinds`：`deepseek-harness/.agents/skills/dsh-doc/SKILL.md:18-31@687f282e`、`deepseek-harness/.agents/skills/dsh-doc/SKILL.md:59-62@687f282e`、`deepseek-harness/.agents/skills/dsh-doc/references/metadata-links-i18n.md:3-10@687f282e`、`deepseek-harness/.agents/skills/dsh-doc/references/metadata-links-i18n.md:50-61@687f282e`、`deepseek-harness/scripts/doc-standard.spec.ts:18-24@687f282e`、`deepseek-harness/scripts/doc-standard.spec.ts:40-49@687f282e`、`deepseek-harness/scripts/doc-standard.spec.ts:57-160@687f282e`、`deepseek-harness/scripts/doc-standard.spec.ts:339-406@687f282e`
- `documentation-package-readme-summary`：`deepseek-harness/scripts/verify-package-readme-summaries.ts:8-17@687f282e`、`deepseek-harness/scripts/verify-package-readme-summaries.ts:44-75@687f282e`、`deepseek-harness/.agents/skills/dsh-doc/templates/package-reference.md:19-25@687f282e`
- `documentation-package-readme-model-experience`：`deepseek-harness/scripts/verify-package-readme-model-experience.ts:1-638@687f282e`、`deepseek-harness/docs/cookbook/adding-a-package.md:1-170@687f282e`
- `documentation-package-readme-limitations`：`deepseek-harness/scripts/verify-package-readme-limitations.ts:1-95@687f282e`
- `documentation-comments-export-jsdoc`：`deepseek-harness/scripts/verify-export-jsdoc.ts:1-607@687f282e`、`deepseek-harness/packages/core/agent/tests/verify-export-jsdoc.spec.ts:1-561@687f282e`
- `documentation-doc-typecheck`：`deepseek-harness/scripts/doc-typecheck.ts:1-252@687f282e`、`deepseek-harness/scripts/doc-typecheck-paths.ts:1-24@687f282e`
- `documentation-type-equiv`：`deepseek-harness/docs/subsystems/README.md:74-76@687f282e`
- `documentation-subsystem-page-ownership`：`deepseek-harness/docs/subsystems/README.md:1-76@687f282e`
