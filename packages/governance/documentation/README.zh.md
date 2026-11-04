# `@project-governance/documentation`

[English](README.md) | 中文

## 摘要

本包把治理体系中的文档闸门实现为一个 Node ESM 包：Markdown 链接、段落换行、常驻文档预算、英中配对记录、仓库引用策略、包组子系统页面、包 README 摘要与注意事项、文档内 TypeScript 编译、字面类型等价、升级指南布局。每个命令只读取目标仓库自己的配置与语料，报告发现的问题，且除调用者显式重录某一双语对外，从不修改目标文档。

## 包的职责范围

一个包，十一个独立触发的命令。目标按自身文档需要启用相应命令；这里没有综合评分、没有隐式语料、也没有内置策略。规则正文留在治理 references 中，本 README 只说明每个命令如何读取目标仓库。

## 前提

- Node.js 22.19.0 或更新版本，由 `engines.node` 声明。
- 本包 `package.json` 固定的 Markdown 与 YAML 解析器，必须在运行任何命令前用 `npm ci --ignore-scripts` 按工作区锁文件安装；缺少解析器是退出码 2，绝不是通过。
- `doc-typecheck` 与 `verify-type-equiv` 使用目标仓库的 TypeScript：二者都从目标根 `package.json` 解析，因此目标必须自带编译器。
- 目标仓库需在 `.doc-gates/` 下声明各命令的配置；本包不提供默认语料，也不提供默认策略。

## 命令

每个命令都登记为本包的 `bin` 入口；可在检出的副本里用 `node <skill>/packages/governance/documentation/src/<command>.mjs` 直接运行，也可通过链接后的可执行名运行。

### Markdown 链接：`verify-md-links`

- 触发：相对链接、锚点、页面搬迁或新归档笔记发生变化。
- 目标配置：`.doc-gates/markdown-links.json`，含 `roots`、`files` 和可选的 `archiveRoots`（默认 `.agents/notes/archived`）。
- 检查：每个仓库相对目标存在，每个片段都能落到渲染标题或 `<a id>` 锚点，百分号编码路径可解码，且目标缺失先于片段不符被报告。
- 不检查：外部、根绝对与协议相对URL，非Markdown目标内的锚点，以及代码围栏和被注释掉的HTML——它们永不产生锚点。页内片段会检查。

### 段落换行：`verify-md-wrap`

- 触发：普通段落、列表项或引用块中新增正文。
- 目标配置：`.doc-gates/markdown-wrap.json`，使用同样的 `roots`、`files` 与 `archiveRoots` 语料字段。
- 检查：每个正文段落只用一行源码，逐条报出硬换行的 `file:line`；围栏代码、HTML 块、表格与 YAML frontmatter 保持豁免。
- 不检查：行长、表格或 HTML 版式、翻译质量，以及归档文档——它们被排除在语料之外。

### 常驻预算：`verify-doc-budgets`

- 触发：项目入口文件之类的常驻文档持续膨胀。
- 目标配置：`.doc-gates/doc-budgets.json`，字面路径到正整数字数上限的映射；`--list` 只打印表格而不报错。
- 检查：整文件的空白分词计数（含 frontmatter、Markdown 语法与代码），以及被预算文件缺失、上限非正、清单为空。
- 不检查：正文质量、分节规模，也不判断某个已审阅上限是否仍然合适。

### 双语配对：`verify-translation-pairing`

- 触发：英文文档或其中文对侧被编辑、新增、归档或删除。
- 目标配置：`.doc-gates/translation-pairing.json`，含 `roots`、`files`、`excluded`、`generatedSources` 与 `publicRepositoryBlobRoot`。
- 检查：对侧存在，`.i18n.yaml` 分节记录与两侧内容一致，语言切换器存在，且标题、列表、表格、代码块与链接目标对齐。
- 不检查：翻译准确度或行文质量，也从不注入生成区块；只有 `--write <pair>` 或 `--write --all` 会写入，`--cached <pair>` 读取暂存区字节。

### 仓库引用：`verify-repository-references`

- 触发：维护文本可能带有提交标识、被禁止的仓库 URL 或封禁术语。
- 目标配置：`.doc-gates/repository-references.json`，含 `gitRoot`、`roots`、`files`、`excludePrefixes`、`commitIdentifiers`、`forbiddenUrls`、`allowedUrlLiterals`、`bannedTerms`、`ruleExclusions`、`generatedRegions` 与 `gitDiscovery`；`--list` 只报告不报错。
- 检查：能解析到唯一提交对象的十六进制标识、经百分号与 HTML 实体解码后的被禁止 URL、路径与行内的封禁术语，以及声明的逐规则豁免与标记区块。
- 不检查：声明语料之外的内容，也不带任何内置组织清单：每套规则（包括显式声明的空集合）都是目标配置，并且需要真实的 Git 对象库。

### 子系统页面：`verify-subsystem-pages`

- 触发：包组、子系统页面或归属豁免发生变化。
- 目标配置：`.doc-gates/subsystem-pages.json`，含 `packagesRoot`、`docsRoot`、`pageRoot`、`groupReadme`、`manifest`、`pageSuffix` 与 `exemptions`。
- 检查：每个组 README 都链接到页面根下确实存在的页面，且每条豁免都有理由、指向仍存在的组、且不与真实链接自相矛盾。
- 不检查：中文页面、子系统索引文件、间接链接、裸路径以及页面内容；链接按实际解析位置判定，而不是按写法。

### 包 README Summary：`verify-package-readme-summaries`

- 触发：创建包、组或根 README，或重写其摘要。
- 目标配置：`.doc-gates/package-readme-summaries.json`，含 `packagesRoot` 与 `readme`。
- 检查：每个被发现的根、组与包 README 都带有不超过 100 个空白分词的 `## Summary`。
- 不检查：摘要是否准确、非英文 README，以及扫描范围外缺 README 的包。

### 包 README 注意事项契约

- 触发：新增或下线包，或记录、删除了该包的待办工作时应运行 `verify-package-readme-limitations`。
- 目标配置：`.doc-gates/package-readme-limitations.json`，含 `packagesRoot`、`manifest`、`readme` 与 `exemptions`。
- 检查：每个被扫描的包 README 恰有一个 `## Known Limitations and Deferred Work` 小节且含读者可见的顶层 `- ` 条目，每条豁免都指向仍存在的包、且该包确实没有该小节。
- 不检查：条目是否完整或充实，也不接受变体标题、更深标题或并列的非目标小节。

### 文档内编译：`doc-typecheck`

- 触发：文档中出现调用项目 API 的 `ts` 代码块。
- 目标配置：`.doc-gates/typecheck.json`，含语料、`tsconfig` 与 `mode`，`mode` 取 `project` 或 `declarations`。
- 检查：`ts` 代码块按目标 tsconfig 与真实类型编译，`ts ignore-check` 计入退出检查的预算，中文派生文档仅在被检序列完全一致时复用英文检查。
- 不检查：归其他闸门所有的 `ts type-equiv`、`ts public-api` 与各类目录围栏；`declarations` 模式只把 `<dir>/src` 别名映射到 `<dir>/lib/types`，其他布局必须使用 `project` 模式。

### 类型等价：`verify-type-equiv`

- 触发：文档抄录某个真实 TypeScript 符号的声明、投影或增强。
- 目标配置：`.doc-gates/type-equiv.json`，含语料与 `manifest`（默认 `.doc-gates/type-equiv.manifest.json`），条目声明 `doc`、`symbol`、`source`，可选 `projection` 与 `augmentations`。
- 检查：围栏中的声明与目标编译器产生的结果一致（含 JSDoc 与字面内容，忽略琐碎空白与函数体），且清单在整个语料上保持双射。
- 不检查：代码块能否按项目类型通过编译——那是 `doc-typecheck` 的职责；未声明的代码块、重复条目与语料外来源会被拒绝而非推测。

### 升级指南：`verify-upgrade-guides`

- 触发：记录发布说明、迁移指南或破坏性变更。
- 目标配置：无配置文件；命令接受 `--root`、`--guide-root`（默认 `docs/upgrade-guide`）、`--sections`、`--max-words` 与 `--print-config`。
- 检查：`v<version>/<item>/guide.md` 布局，带非空 description 的 `kind: upgrade-guide` frontmatter，Change 与 Migration 大纲，以及计入 frontmatter 的 500 词上限。
- 不检查：完全没有指南树的目标（按设计通过），以及未为其声明上限的中文指南字数。

## 容易误读的行为

- 链接和换行语料扫描对空语料或只剩归档的输入返回2。配对及包限制扫描可接受空的已声明范围，不能把这当作覆盖证据。
- 链接和换行扫描排除归档来源，但仍检查入链。配对使用自己的manifest排除规则，不会隐式排除每个归档目录。
- 双语记录只为调用者点名的配对重录，或用 `--write --all` 覆盖整个语料；只改一侧在对侧同步前始终不同步。
- 缺少升级指南树会通过，而缺少子系统页面配置是退出码 2：两个命令对"缺失"的处理是有意不同的。
- 两个类型命令回答不同问题：`doc-typecheck` 把文档片段按目标 API 编译，`verify-type-equiv` 逐字比较抄录的声明文本。

## 退出码

- `0`：选定范围未发现问题，包括该命令明确声明的无树／空范围情形；不证明覆盖完整。
- `1`：对声明的语料报告了问题。
- `2`：调用、配置、语料或前提不可用，包括缺少解析器、编译器或 Git 对象库。

## 运行与验证

```sh
npm ci --ignore-scripts
npm test --workspace @project-governance/documentation
```

本包的测试会在操作系统的临时目录下为每个命令生成一次性目标树；它们需要固定的解析器、固定的编译器，以及 `PATH` 上的 `git`。

## 规则归属

- [documentation.md](../../../references/documentation.md)：文档义务的组合与路由。
- [documentation-structure-and-prose.md](../../../references/documentation-structure-and-prose.md)：文档层级、正文与预算规则。
- [documentation-links-and-repository-policy.md](../../../references/documentation-links-and-repository-policy.md)：链接、锚点与仓库引用策略。
- [documentation-localization.md](../../../references/documentation-localization.md)：双语配对与记录规则。
- [documentation-package-and-api.md](../../../references/documentation-package-and-api.md)：包 README、子系统页面与 API 文档规则。
- [documentation-adoption-and-checks.md](../../../references/documentation-adoption-and-checks.md)：目标如何启用与接线这些命令。
- [upgrade-guides.md](../../../references/upgrade-guides.md)：升级指南的布局、元数据与小节契约。

## 已知限制与待办工作

- `verify-upgrade-guides` 对完全没有指南树的仓库判定通过，因此空的或位置错误的指南根不会被该命令报告。
- `doc-typecheck` 的 `declarations` 模式只理解映射到 `<dir>/lib/types` 的源码别名；构建布局不同的目标必须使用 `project` 模式。
- `verify-type-equiv` 只检查清单中列出的符号并拒绝其他一切，因此新增抄录的声明在更新清单前会失败。
- `verify-repository-references` 需要真实的 Git 对象库，没有就拒绝运行；它无法仅凭文本判定提交标识。
- 仓库引用策略完全来自目标配置：本包不含组织清单、封禁术语或提交扫描默认值。
- `verify-subsystem-pages` 只能证明某条直接链接解析到页面根下；它不判断该页面是否真的描述了该组。
- 这些闸门只读取配置的路径；它们不发现义务、不挑选语料，也不替目标项目维护策略。
