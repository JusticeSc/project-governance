# 门禁组合与项目建立、改造

本页命令中的 `<product-root>` 指单独取得的产品仓库根目录，不是复制后的轻量 Skill 座。需解析器或其他 workspace 依赖的产品命令须在该产品根按锁准备依赖；目标工程仍使用自己的配置和入口。

本页拥有门禁组合与项目建立、改造：编辑循环／提交前／CI 的门禁组合（§22），以及把空项目建立或把已有项目改造到同一规范状态的迁移设计、事实触发条件与状态判据（§23，含 §23.1–§23.5）。共同目标状态、固定职责与工程保证归[项目治理标准](project-standard.md#project-standard)，逐步建立与改造操作归[接入流程](adoption.md#adoption)；建立新项目或改造已有项目、调整门禁分层或判定某项义务是已落实／未落实／阻塞／不适用时读本页，单项规则本身仍归其所属页。共同约定：触发定位以[根参考的读者触发索引](documentation.md#reader-triggers)为准；各节保留原节号（页内编号因此可能不连续），`源义务`、`迁移设计`与源证据坐标的含义同根参考开头；本页机制的来源坐标收在文末附录。

## 22. 门禁组合与执行顺序

来源：deepseek-harness/scripts/doc-standard.spec.ts:162-299@687f282e 来源：deepseek-harness/docs/session-format-status.md:1-56@687f282e

<a id="gate-composition"></a>
<!-- mechanism-ids: documentation-gate-composition -->

**源义务（快速集）。** `pnpm run test:docs` 运行 `doc-quick`：所有标记 `quick` 的文档门禁，包括 `verify-package-readme-summaries`、`verify-package-readme-model-experience`、`verify-package-readme-limitations` 与 `vitest run scripts/doc-standard.spec.ts`；排除 `doc-typecheck`，也不构建网站。适合编辑循环，不是合并前完整证据。`deepseek-harness/package.json:130@687f282e`、`deepseek-harness/scripts/run-gates.ts:850-862@687f282e`、`deepseek-harness/scripts/run-gates.ts:872@687f282e`、`deepseek-harness/scripts/run-gates.ts:881-883@687f282e`

**源义务（完整集）。** `pnpm run doc-sync` 运行完整文档门禁：`doc-typecheck`、网站构建、生成图/CLI/链接/类型等价/Cordis 目录/工作流 guest/Mermaid/配对/换行/客户端目录/导出 JSDoc/工具/配置/插件包/依赖/持久化目录与历史/发布引用/具体术语/文档引用/子系统页/包路径/README 三类/Agent Note 三类/Skill 元数据/翻译提示词/预算/升级指南/文档标准测试/网站投影与片段/包限制。`deepseek-harness/scripts/run-gates.ts:805-875@687f282e`

**源义务（网站专用）。** `pnpm run docs:check` 是网站投影测试、构建和片段检查的聚焦入口；`pnpm run docs:build` 只构建并验片段。它不等于 `doc-sync`，不能替代文档类型/配对/引用等检查。`deepseek-harness/package.json:134-137@687f282e`

**操作步骤。** 编辑循环与例行提交前，根据完整 diff 选择最小充分检查；需要完整文档组时运行 `pnpm run doc-sync`，网站专用入口不能代替它。CI 保留完整覆盖及其平台矩阵，已有效且未被改动失效的证据无需重复执行；聚焦通过不能冒充完整集通过。若某门禁不可用，必须报告不可用，而不是用“已人工检查”替代自动保证。**完成信号。** 命令退出 0 且输出覆盖预期文件数/范围；对生成器还要看计数未意外缩小。**失败处理。** 先修根因；不要通过扩大排除、降低预算或删除测试来变绿。

**迁移设计。** 目标项目应把门禁分成“编辑循环、提交前、CI”三层，但三层的规则来源必须相同。为每个门禁记录：检查什么、不检查什么、失败如何修。**证据边界。** `doc-sync` 通过只证明该组检查通过；远程 CI 是否真正阻塞合并仍需分支保护/工作流证据。

## 23. 迁移到新项目

来源：deepseek-harness/package.json:104-140@687f282e 来源：deepseek-harness/scripts/run-gates.ts:805-883@687f282e

<a id="migration"></a>

**本节的地位。** 这里是文档域首组可直接消费的**迁移设计**，不是自动接入器、不是所有项目的封闭义务清单，也不把维护者的来源判断改写成消费者的实施许可。建立与改造都要达到[共同目标状态](project-standard.md#project-standard)和标准[§1 的固定职责](project-standard.md#governance-owners)，本节只补充文档域的对象、参数、检查入口和状态判据；其他领域按各自触发条件继续核对，不因本组清单完整而判整体合规。维护者负责源义务→保留项/例外→分类→参数化→机械工具能力的判断；目标项目负责真实事实、现有 owner/语料/命令/权限、参数值、运行与报告。参数是可配置值，不是可取消的义务；任何一项都不会因为“不在本组”或“目标没有现成工具”而消失。

**建立与改造流程（空项目或已有项目）。** ①核实目标事实：读目标现有规则、唯一状态 owner、工具链、脚本和 CI，实际运行相关入口；区分已有事实、本次将创建的文件与未知项，事实不是提议。已有 owner 只有实际满足[标准](project-standard.md#governance-owners)的目标、验收、状态/证据、未决与接续合同才复用，存在不等于合规。②套用已发布迁移设计：对每个决定填写目标参数与 owner，判断触发是否成立，选用本文已交付的真实入口；本组未列的义务按其章节条件继续核对。目标项目不需要为每条来源重做提取，也不需要为每个语义单元新开上下文。③复核与评审：变更计划按项目正常评审接受必要决策、风险与权限，核对触发、保留义务、参数/owner、入口和拒绝/恢复；不再以“是否接受体系”为认证或实施前置。④实施与回归：在目标既有入口落地，保留原有行为和验收；正常、拒绝、恢复在同一入口观察。评审通过不代表实施完成，元数据齐全也不是许可。

**参数化。** 源仓库的路径、包前缀、预算数字、门禁名、语言对和网站框架都是参数。替换参数或实现必须保留机制效果；例如“每段一行”保留，格式器实现可替换；“生成参考不可手改”保留，生成器实现可替换。

**状态判据（全组共用）。** **已落实**要求触发事实已登记、义务有 owner 和真实入口、入口可运行，且正常/拒绝/恢复证据已记录；入口已接入但验收尚未复验，或触发后入口、语料、回归、CI 接线尚未补齐，都是**未落实**（对应 Skill 的“已接入且待复验”“待接入”），应在当前权限内实施；只有依赖、工具、事实、权限等前提不可达才是**阻塞**（“触发但阻塞”），须写明缺什么、已尝试什么与解除条件；只有该事实类别在项目中确实不存在时才记**不适用**，并写重新激活条件。工具缺失、凭据或 CI 权限不可达、仓库或页面规模小都不是不适用。

**来源核对边界。** 本组核心义务定向复读了固定提交中的 `deepseek-harness/docs/AGENTS.md:7-59,75-77@687f282e`、`deepseek-harness/AGENTS.md:175@687f282e`、`deepseek-harness/package.json:104-140@687f282e`、`deepseek-harness/scripts/run-gates.ts:805-883@687f282e`、`deepseek-harness/scripts/verify-doc-budgets.ts:1-58@687f282e`、`deepseek-harness/scripts/verify-md-links.ts:34-73@687f282e` 与 `deepseek-harness/scripts/verify-md-wrap.ts:40-86@687f282e`；其余决定沿用各小节已登记的坐标，不声称完整源审核。发现来源支持不足、相互冲突或工具行为与描述不符时，带具体坐标交回维护者；影响验收的未决项保持阻塞，不能用改弱义务或断言通过来收场。

### 23.1 事实归属与文档分层

**触发。** 新增、搬迁、合并或重写人类文档；新增事实类别；发现同一事实存在两处权威叙述。纯代码注释的局部修正不触发分层迁移，但仍受[§7](documentation-package-and-api.md#comments-jsdoc)约束。

**保留的义务与例外。** 每个事实只有一个家：所有者层级、代码或生成器；别处只链接，不手抄目录、JSDoc、测试/包/状态清单或版本状态。范围内每篇文档归为教程或参考；作用域由主题加树位置固定，只描述自己的主题，直接子主题只写目的、职责和高层行为，更低层细节链接到 owning descendant。每类文档写“这里放什么/不放什么”；历史理由、事故、操作步骤、类型定义、包合同、常驻命令和生成参考各自归层，不能因规模省略类别。生成参考的英文真源与区域不得手改，中文侧按配对/生成更新。`deepseek-harness/docs/AGENTS.md:7-40@687f282e`

**消费者参数与 owner。** 在目标仓库提供“事实→所有者→检查”表，列出目录/模板和每类的唯一 owner（文件、生成器、清单或人审记录）；事实类别按目标实际枚举，不能只抄本组五项。新事实先补 owner，再写文档。

**机械入口与限制。** 没有自动判定“归属正确”的工具；可机械部分只有链接（§23.4）、生成区域标记（[§14](documentation-generated-content.md#generated-regions)）等。层级、类别和重复叙述由评审负责。

**语义评审。** 核对每个事实是否只有一处权威、别处是否只有链接；新页能否回答读者触发点、第一段看到什么、下一层去哪。发现两处矛盾叙述时，先判定 owner，删除或降级另一处为链接，再补能拒绝重复的检查（若可机械化）。

**正常、拒绝与恢复。** 完成信号是所有事实类别都有 owner、抽查事实在唯一 owner、重复处已链接。拒绝信号是同一事实两处权威或手抄生成内容；恢复为判定 owner、降级另一处、必要时新增重复叙述检查。只有目标确实没有该事实类别时才记不适用。

### 23.2 条件性状态 owner

**触发与保留义务。** 跨会话状态责任属于标准固定职责，完整触发条件与唯一owner复用规则由[项目治理标准](project-standard.md#governance-owners)、[状态建立与接续](state-owner.md)和[交接的连续会话补充](workflow-integration-and-handoff.md#aw-11)拥有：用户要求初始化、跨会话继续/暂停/交接、压缩前保存，或同一目标确需多个会话/另一位执行者接续。已有任务板、Issue/PR 台账、交接文件或 `PROJECT.md` 只有实际承载当前目标、阶段、验收结果、未决、证据位置和一个可执行下一动作时才作为 owner 复用，存在不等于合规；不合规处原位补齐或迁移，不保留双状态源。没有这些触发条件的单会话任务不新建状态文件，初始化也不自动扩展为跨会话状态。已有状态、nextAction和完成声明须按当前请求与仓库事实复核，不创造执行许可。

**消费者参数与 owner。** 只登记既有 owner 的路径与格式（或明确不启用状态协议）、记录者与复核者；字段、写入/读取时机和完成信号按所链接协议与既有 owner 执行，本节不复述。

**机械入口与限制。** 本产品的 CLI 只有 `check`（按清单执行命令）与 `install`（安装 Skill），不检查、不写入也不推断状态文件；状态记录里的元数据是否齐备、`nextAction` 是否已撤销、归档项是否仍现役，都由状态 owner 与评审核对。元数据齐全不是执行许可，`phase: complete` 不证明交付已完成。

**语义评审。** 核对现有 owner 是否真正权威、状态与仓库事实是否一致、未完成项是否有 owner、下一命令能否被独立执行。

**正常、拒绝与恢复。** 完成信号是唯一 owner 可读、下一命令可执行、当前已撤销动作不在队列。拒绝信号是双状态源、状态与仓库冲突后仍继续，或把状态记录里的 `phase: complete` 当完成。恢复为以仓库和当前请求修正记录，保留原失败记录，不追认原状态。没有所链接Skill §3.0的任一启用条件时不启用该协议，这不是“治理不适用”。

### 23.3 常驻文档预算

**触发。** 修改预算清单内的常驻文档，或新增必须常驻上下文的规则。未列入预算的层级不触发此计数器，但仍由评审治理，不是自动豁免。

**保留的义务与例外。** 根据文档职责与目标工作上下文确定受预算文件，不照搬源清单或给全部文档套同一阈值；超限按“迁移到其他层→压缩→有理由提高上限”处理。上限是护栏不是缩减目标：在目标或以下时至少保留 5% 余量；高于目标时冻结上限，直到迁移或压缩回到目标以下；只有文档仍有空间时才降低上限。源数值（如 root 2080、architecture 2400、子树 600 等）是源事实，不是所有目标项目的默认阈值。未列入预算的层级记录理由、owner 和重新激活条件。`deepseek-harness/docs/AGENTS.md:51-59@687f282e`、`deepseek-harness/scripts/verify-doc-budgets.ts:1-58@687f282e`

**消费者参数与 owner。** 非空 `.doc-gates/doc-budgets.json`，键为常驻文档的仓库相对路径，值为评审后的正整数上限；同时登记未预算层的 owner/理由。预算 owner 与内容 owner 可以不同，但都要写清。

**机械入口与限制。** 从目标 cwd 执行 `node <product-root>/packages/governance/documentation/src/verify-doc-budgets.mjs`；异地可用 `--root <目标> --config <仓库相对清单>`。普通模式在超限、清单指向的缺失文件或非法上限时退出 1；配置缺失/不可读/非对象/空清单或调用无效退出 2。`--list` 只列用量并退出 0，即使存在 OVER/MISS/BAD，因此不能用于 CI 阻断。它只统计空白分隔词数和清单内文件，不判断内容质量，也不阻止新增未列入清单的膨胀文档。

**语义评审。** 判断文档是否必须常驻、超限内容应迁移到哪一层、提高上限的理由、5% 余量是否保留，以及未预算层的理由与重新激活条件。

**正常、拒绝与恢复。** 完成信号是清单非空且覆盖已决定纳入预算的受约束文档、普通模式在真实语料上退出 0、未预算层有 owner/理由。拒绝与恢复：制造真实超限或缺失条目应退出 1，按迁移/压缩恢复后退出 0；提高上限须有理由，不能靠放宽上限变绿。依赖或配置在当前权限内可补齐却未补齐属于未落实；确实不可用或配置不可读导致的退出 2 是阻塞，不是通过或不适用。

### 23.4 完整 Markdown 语料：链接、锚点与换行

**触发。** 任何 Markdown 链接、标题或文件移动；受检 Markdown 的散文编辑；归档移动。源码注释中的文档路径、Mermaid 语法和网站投影各由[§16](documentation-links-and-repository-policy.md#reference-policy)等小节拥有，不由此决定替代。

**保留的义务与例外。** 当前文件用相对 Markdown 链接，历史引用用 tag 或 PR 号；不写 `/docs/...` 之类站内绝对路由，该禁令只由写作评审执行。锚点按 GitHub slug 规则匹配，显式 `<a id="...">` 也算目标，标题改名视为接口变更并须同改入站引用。每个散文段落占一个物理行；自动谓词只拒绝 GFM AST 中跨行的 `paragraph`（含列表/引用内段落），标题、围栏、表格、HTML 和代码注释不在该谓词内，标题单行仍是评审义务。冻结归档源不作为扫描语料，但活跃页指向归档的目标/锚点继续验证；生成区域内的 prose 不是一概豁免。链接与换行共享同一组固定版本解析器和语料模型，但发现配置独立。`deepseek-harness/docs/AGENTS.md:42,75-77@687f282e`、`deepseek-harness/scripts/verify-md-links.ts:34-73@687f282e`、`deepseek-harness/scripts/verify-md-wrap.ts:40-86@687f282e`

**消费者参数与 owner。** 分别为 `.doc-gates/markdown-links.json` 与 `.doc-gates/markdown-wrap.json` 声明真实语料：`roots`（递归目录）、`files`（单文件）、`archiveRoots`（只跳过源扫描；缺省为源归档路径，目标更换归档位置时同步）。纳入全部适用文档、包说明、指令、技能文档和 expected Markdown 输出，不以示例路径代替完整语料；归档树不存在时省略相应字段，不伪造目录。

**机械入口与限制。** 先按[§15.1](documentation-links-and-repository-policy.md#markdown-gates)准备固定解析器依赖，再从目标 cwd 执行 `node <product-root>/packages/governance/documentation/src/verify-md-links.mjs` 与 `node <product-root>/packages/governance/documentation/src/verify-md-wrap.mjs`；异地可用 `--root/--config`。成功退出 0，缺目标/`.md` 锚点或跨行段落逐项输出 `file:line` 并退出 1，配置、语料、解析器或调用不可用退出 2；两个程序只检查不重写。链接程序跳过外部 URL、协议相对地址和根绝对路径，因此 `/docs/...` 误用抓不住；非 Markdown 片段交给渲染器，不判锚点。

**语义评审。** 核对语料是否完整、链接文字与目标语义是否相符、标题是否单行、是否依赖站内绝对路由、归档外的出站链接是否仍应维护。

**正常、拒绝与恢复。** 完成信号是两个执行器在声明的完整语料上退出 0，且正常、拒绝、恢复都观察到。拒绝与恢复：制造断链或跨行段落应退出 1 并给出 `file:line`，精确恢复后退出 0。解析器/依赖可在当前权限内补齐却未准备属于未落实；实际安装或读取前提不可达导致的退出 2 是阻塞，记录解除条件；不得把缺依赖记成“没有触发面”，也不得用局部语料通过冒充全量。

### 23.5 本地与 CI 同入口

**触发。** 任何文档改动、提交前、CI 或发布前；新增或变更文档检查。纯代码改动仍可能触发 JSDoc、类型等其他域检查。

**保留的义务与例外。** 编辑循环、提交前和 CI 三层可以不同宽度，但规则来源必须相同；例行本地检查依据完整 diff 选择最小充分集，CI 保留完整覆盖及平台矩阵。quick 是完整集的子集，不能替代完整集；网站专用入口不能替代完整文档组。已有效且未被本次改动失效的证据可以复用，不因层级名称重复执行。本地脚本可被绕过，只有 CI 必需检查与分支保护才是强制。分别记录“检查器存在”“CI 运行”“合并被阻塞”三种证据，不能混为一谈。失败先修根因，不通过扩大排除、降低预算或删除测试来变绿；门禁不可用时报告不可用，不用“已人工检查”替代自动保证。`deepseek-harness/package.json:104-140@687f282e`、`deepseek-harness/scripts/run-gates.ts:805-883@687f282e`

**消费者参数与 owner。** 复用目标已有顶层入口（脚本、`verify.ps1`、`npm run check` 等），或使用 `node <product-root>/apps/cli/bin/governance.mjs check <repo> --policy <仓内清单>`；省略 `--policy` 时读取仓库根的 `governance-checks.json`。清单只登记命令，不复制需求或进度。另需 CI 工作流、分支保护/required checks 的配置权限与负责人。

**机械入口与限制。** 接线验收要求本地与 CI 复用检查定义、公共入口及失败传播；例行本地可选择最小充分子集，不能据此宣称 CI 完整集通过。`check` 只按清单顺序执行命令并报告退出码：策略缺失/无效/检查为空退出 2，任一命令失败退出 1；它不推导检查、不证明语义完整、不证明平台强制。工作流文件存在不等于远端已配置；没有授权不改生产保护或凭据。

**语义评审。** 核对 quick 子集是否覆盖本组决定、每条触发义务是否有入口、失败诊断是否指向规则 owner、是否有入口被排除后仍宣称完整。

**正常、拒绝与恢复。** 接线完成信号是本地与 CI 复用的入口和定义覆盖全部已声明检查、正常退出 0，且真实义务破坏在该入口被拒绝、精确恢复后通过；例行聚焦检查另记覆盖范围，不能替代完整集或远端证据。拒绝信号是靠排除门禁、降低预算或删除断言变绿；恢复为修根因后在原入口复跑。缺远端权限时保留平台层“未验证”的阻塞状态，不把工作流文件当强制。没有 CI 平台时记录本地入口与重新激活条件，不能宣称合并阻断。

**其余按事实触发的条件。** 本组不是封闭清单：文档类型/页面骨架（[§4](documentation-structure-and-prose.md#authoring-quality)）、包 README 合同与三类门禁（[§5](documentation-package-and-api.md#package-readme)、[§6](documentation-structure-and-prose.md#prose-budgets)）、注释与导出 JSDoc（[§7](documentation-package-and-api.md#comments-jsdoc)）、双语三文件与配对/翻译（[§8](documentation-localization.md#i18n-pairing)至[§11](documentation-localization.md#translation-prompt)）、类型等价与可编译示例（[§12](documentation-package-and-api.md#code-equivalence)）、生成参考与共享区域（[§13](documentation-generated-content.md#generated-references)、[§14](documentation-generated-content.md#generated-regions)）、仓库引用与网站投影（[§16](documentation-links-and-repository-policy.md#reference-policy)）、Agent Note/归档/升级指南（[§17](documentation-record-lifecycle.md#agent-notes)至[§19](documentation-record-lifecycle.md#upgrade-guide)）、Skill 元数据与 Session 格式状态（[§20](documentation-record-lifecycle.md#skills)、[§21](documentation-record-lifecycle.md#session-status)），被目标事实触发时按对应小节保留全套条件、例外、参数与评审。触发后缺入口、语料、回归或 CI 接线是未落实，应按当前权限补齐；工具、依赖或权限等前提不可达是阻塞，不是没有触发；只有事实类别确实不存在才不适用。

**建立或改造完成。** 每项已触发义务均须有owner、真实检查或评审入口及所需的正常/拒绝/恢复证据，所有影响当前验收的未落实、阻塞或争议已解决；真正不适用项有事实依据与重新激活条件。最后按[变更流程](change-workflow.md)与[采用交棒判据](adoption.md#adoption-continuation)核对冷接续、实际接入层级及准确原交接，不能仅因缺口已列理由而报完成。检查器存在、单次绿灯、页面数量或引用计数都不单独证明语义要求已达成。

## 机制→来源引用索引（本页机制）

本节只列本页机制的来源区间，固定提交 `687f282e`；其它机制的坐标在其所属页。它只补齐可回溯的引用坐标，不新增正文断言；正文解释仍以本页对应小节为准。

- `documentation-gate-composition`：`deepseek-harness/package.json:104-140@687f282e`、`deepseek-harness/scripts/run-gates.ts:805-883@687f282e`
