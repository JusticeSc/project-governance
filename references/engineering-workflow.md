# 工程工作流：指令归属、检查选择与契约措辞

本页拥有工程域里与每次改动直接相关的规则：§1 指令层级与单一事实归属、§2 按改动面选择检查、§34 导出 JSDoc 与契约措辞、§36 TODO 紧迫性、§37 跨文件重复检测。触发：改根级/子树级 `AGENTS.md`、`CLAUDE.md`、Agent Note、README 或 `docs/` 页面，要提交/推送/开 PR 或声称“完成”，新增或修改导出与命名，在代码里留 `TODO`/`FIXME`，或提取共享 helper、处理复制粘贴。读本页前先读 [§0 使用约定与证据边界](engineering.md#0-使用约定与证据边界)：`【源仓义务】`/`【迁移设计】`/`【建议】` 的区分、证据状态（全部 verification 仍为 `planned`）和迁移裁剪边界对每一节都适用，本页不再重复。

<a id="engineering-instruction-tiers"></a>
## 1. 指令层级、单一事实归属与文档预算（engineering-instruction-tiers）

**触发**：新增或修改根级/子树级 `AGENTS.md`、`CLAUDE.md`、Agent Note、README、`docs/` 页面、技能说明；出现同一规则在多处复述；文档超出预算。

**角色与前置**：改动者负责把事实放到唯一归属层级；文档 owner 决定预算调整；评审者检查是否复制了别处的权威内容。

**【源仓义务】**
- 根 `AGENTS.md` 只放“每个会话都需要在上下文中的常驻命令”，每条 1–3 行并链接其归属文档；故事、完整示例、情境化流程不放根文件。子树 `AGENTS.md` 只放该子树特有规则，不重复根规则。`deepseek-harness/docs/AGENTS.md:15-36@687f282e`
- 文档按层归属：架构图放 `docs/architecture.md`；类型与语义放 `docs/subsystems/`；决策理由放 Agent Notes；评审强制规则放 `docs/defensive-patterns/`；事故叙事放 `docs/postmortem/`；步骤式操作放 `docs/cookbook/`；每包契约放包 README；生成目录只由生成器写入。`deepseek-harness/docs/AGENTS.md:15-36@687f282e`
- 编辑指令时编辑真实文件：根和 `packages/` 的 `CLAUDE.md` 是指向 `AGENTS.md` 的符号链接；保持每条规则自包含并链接高层文档；在清晰度不损失时压缩。`deepseek-harness/AGENTS.md:179-181@687f282e`
- 已实现 Agent Note 用现在时描述“实际已交付的现实”，不写迁移计划、验收清单或“should”；归档 Notes 冻结，永不编辑，也不作为当前权威。`deepseek-harness/.agents/notes/implemented/AGENTS.md:5-13@687f282e`、`deepseek-harness/.agents/notes/archived/AGENTS.md:1-9@687f282e`
- 文档字数有显式上限；`scripts/doc-budgets.manifest.json` 列出被预算的 7 个文件（根 `AGENTS.md` 2080、`docs/AGENTS.md` 1430、`docs/architecture.md` 2410、`docs/cordis-primer.md` 600、`docs/testing.md` 1350、`packages/AGENTS.md` 810、`packages/README.md` 994），`scripts/verify-doc-budgets.ts` 按空白分词计数，拒绝超限、缺失文件和非正整数上限。`docs/AGENTS.md` 的目标值与 manifest 不完全相同（architecture 2400、testing 1300、examples/AGENTS 310 未在 manifest），迁移时以 manifest 为实际门禁，目标值只作评审预算。`deepseek-harness/docs/AGENTS.md:49-59@687f282e`、`deepseek-harness/scripts/verify-doc-budgets.ts:1-58@687f282e`、`deepseek-harness/scripts/doc-budgets.manifest.json:1-9@687f282e`。超限时先迁移内容到正确层级，再压缩，最后才在 PR 中说明理由后提高上限；未列入 manifest 的文档由评审治理，不是自动豁免。
- 归档 Notes 的改动由 pre-commit 与 pre-merge-commit 钩子单独校验（`verify-archived-agent-notes.ts`）；同一 `lefthook.yml` 的 7–11 行和 36–40 行是翻译配对任务，不是归档任务。`deepseek-harness/lefthook.yml:7-11@687f282e`、`deepseek-harness/lefthook.yml:13-15@687f282e`、`deepseek-harness/lefthook.yml:36-40@687f282e`、`deepseek-harness/lefthook.yml:42-44@687f282e`
- 维护文档的引用纪律：当前文件用相对 Markdown link，历史引用用 tag/PR 号；`verify-md-links` 检查本地目标，`verify-repository-references` 拒绝实际 commit 标识和不允许的组织 URL。`deepseek-harness/docs/AGENTS.md:75-77@687f282e` 本域参考按 BRIEF 使用完整 commit anchor 作为来源坐标；这些 anchor 属于治理证据层，不应原样复制进目标仓库的维护文档。
- 文件卫生：每个文件恰好一个尾随换行；pre-commit 的 `git diff --cached --check` 拒绝 staged whitespace 错误。`deepseek-harness/AGENTS.md:165-165@687f282e`、`deepseek-harness/lefthook.yml:24-25@687f282e`

**子树指令矩阵（本域实际读过的源仓文件；只取与本域机制相交的义务）**

| 子树文件 | 本域读取的治理点 | 归属/不复制 |
|---|---|---|
| `packages/AGENTS.md:1-29` | 插件导出两种形态、`ctx.get`、产品可见插件的 REAL-composition 测试、initiator 私有链先 derive 再 capture、一个异步操作一个生命周期控制器、Service Definition 面向所有当前 Consumer、当前 owner/need/公共选择证据、共享状态 owner、业务规则归包、model-facing 契约、在执行操作中强制决策、commit point 发布、完整结果边界、registry disposal、并发 spec 自持端口/路径/子进程、包 tsconfig/命名/README。 | 测试细节归 Testing；文档细节归 Documentation；本域只把它们作为包级横向不变量。 |
| `scripts/AGENTS.md:1-5` | gate 脚本 shell-free 调 pnpm、路径归一化为 `/`、平台适配留在需要的 gate、语法感知发现、拒绝空/被缩窄语料、测试每个 admitted/excluded 边界；spec 自持端口/临时路径/子进程，单独跑才过是 spec 缺陷。 | 测试执行模型归 Testing；本域把它作为“检查必须可证伪”的证据规则。 |
| `packages/web/AGENTS.md:1-5` | 凭据承载的 provider 请求必须拒绝 redirect；回归证明 redirect 目标未被联系，且每个 credentialed provider opt-in。 | 安全/HTTP 细节归 Security 或 Web；本域只记录这条网络边界。 |
| `packages/schedule/AGENTS.md:1-11` | Host storage 拥有 active/ended task；原 Session id + 全局唯一 task id；只有显式删除移除；管理不激活 Session；一个 runtime 扫描；保留 `after/at/every/daily/weekly/cron`；daily 用显式时间和 IANA zone；跳过缺失本地时间、重叠取较早一次；recurring 只补 latest missed；enqueue 后等待持久化再 retire/advance；失败保留 task、无通用 retry；shutdown drain。 | 产品领域规则，不上升为通用工程机制；迁移时若复制调度能力再引用。 |
| `vendor/AGENTS.md:1-7` | 不随意编辑 `vendor/*/src`；每个 divergence 必须登记到 `vendor/README.md`；`vendor/*/tsconfig.json` 是可再生的例外。 | Supply/Release 拥有 vendoring 与同步流程。 |
| `.github/AGENTS.md:1-7` | Windows job 用原生 `pwsh` 与 `windows-*`；`ci.yml` 只跑 PR，master-only 与 manual workflow 分离；Windows packaging 使用专用 self-hosted label；Desktop publication 用 `desktop-test`/`desktop-production` approval Environments。 | Automation/Release 拥有 workflow 图。 |
| `website/AGENTS.md:1-23` | `website/` 只拥有 VitePress 配置、展示资产、发布 manifest；canonical prose 留在 `docs/`；`.generated/`/`.cache/`/`.dist/` 不编辑不提交；生产构建拒绝逃出 site root 的输出并按 link 删除而非穿越；raw Markdown/`llms.txt` 由 manifest 派生；改子树跑 `docs:check`。 | Documentation 拥有站点与投影。 |
| `snapshots/AGENTS.md:1-17` | 该树只放以提交的 session JSONL 为 replay 输入/期望输出的测试；进程经 `dsh` CLI + shipped profile；不新增应用入口/隐藏 CLI/场景驱动；session 文件名版本规则、保留多代、replay/record/refresh 选最高代、不重命名/删除已提交代；committed sessions 是 normalization fixed points；workspace seed 用 `workspace.expected/`；record/refresh 结果逐项 review。 | Testing/Release 拥有 snapshot 语料与迁移覆盖。 |
| `native/system/AGENTS.md:1-28` | Node-API v8、禁用 NAN/V8 C++/实验接口；launcher 只依赖 libc、静态 musl；glibc/musl/macOS 各自二进制；flock 只在异步 worker 尝试 `LOCK_EX|LOCK_NB` 并捕获 errno；无环境变量覆盖运行时二进制；无 install-time compile fallback；platform matrix、prepack 校验、npm pack 保权限、packed-install 验证。 | Native/Release 拥有二进制构建与发布。 |
| `apps/cli/tests/profiles/AGENTS.md:1-7` | profile 集成测试从 `apps/cli/src/bin.ts` + `--profile` 或 shorthand 启动；只有公共 profile 输出无法暴露内部证据时才允许 test-only Loader driver；包特定 fixture 留在包的 `tests/fixtures/`；recorded replay 放顶层 `snapshots/`。 | Testing 拥有 profile 测试与 fixture 放置。 |
| `.agents/notes/AGENTS.md:1-7`、`.agents/notes/implemented/AGENTS.md:1-13`、`.agents/notes/archived/AGENTS.md:1-9` | 每个新 Note 触发 supersession 检查；实现 Note 随实际交付更新事实，不追加变更史；归档 triplet 冻结，不编辑/翻译/修复/删除/移动，只用新 Note 记录变化；归档只允许完整 triplet 迁移 + `Archived` 行 + sidecar 重录 + 入链修复。 | Documentation/Decisions 拥有 Agent Note 生命周期；本域只引用与机制相关的决定。 |

**步骤**
1. 先判定事实的归属层；若已有归属，只写一行链接，不复述。
2. 根规则必须能独立读懂；细节链接到架构、子系统、README 或 Note。
3. 修改真实 `AGENTS.md`，不要改符号链接；保持链接相对路径可解析。
4. 文档行为变化后运行文档门禁；预算超限按“迁移 → 压缩 → 提额”顺序处理。
5. 归档 Note 只读；需要新结论时写新的实现/提议 Note 并声明取代关系。

**完成信号**：同一事实只有一个权威位置；根文件无故事化细节；`verify-doc-budgets`、链接检查、归档检查通过；评审能指出每条规则的家。

**失败处理**：预算红不是“删到目标以下”，而是“把内容送回其归属层”；链接红修目标或路径，不改检查器；归档被改则恢复并用新 Note 记录变化。

**例外**：机械性/局部编辑可免写 Agent Note；局部 UI 改动也在豁免内。`deepseek-harness/AGENTS.md:155-155@687f282e`。文档 owner 可批准提高预算，但必须在 PR 说明理由。

**迁移裁剪**：没有 `docs/` 分层的小仓库仍保留“根/子树两级 + 单一事实归属”和“每个事实一个家”的不变量；把预算机制映射到目标仓库的 markdown lint 或等价字数门禁，并把阈值、缺失文件检查和失败行为纳入迁移记录。层级可以简化，但“同一规则不得在多处复述”“超限先迁移再压缩”不可删除。若目标仓库不允许符号链接，则用一个受检的生成/同步步骤保证 `CLAUDE.md` 与 `AGENTS.md` 内容一致；这是“替代实现 + 检查”，不是删除单源编辑义务。

**证据与限制**：层级归属是人工评审保证；预算和归档有自动门禁（若迁移后实现）。仅通过字数检查不证明内容正确。

来源：deepseek-harness/AGENTS.md:179-181@687f282e 来源：deepseek-harness/AGENTS.md:155-155@687f282e 来源：deepseek-harness/docs/AGENTS.md:15-36@687f282e 来源：deepseek-harness/docs/AGENTS.md:38-48@687f282e 来源：deepseek-harness/docs/AGENTS.md:49-59@687f282e 来源：deepseek-harness/.agents/notes/implemented/AGENTS.md:5-13@687f282e 来源：deepseek-harness/.agents/notes/archived/AGENTS.md:1-9@687f282e 来源：deepseek-harness/lefthook.yml:7-11@687f282e 来源：deepseek-harness/lefthook.yml:13-15@687f282e 来源：deepseek-harness/lefthook.yml:24-25@687f282e 来源：deepseek-harness/lefthook.yml:36-40@687f282e 来源：deepseek-harness/lefthook.yml:42-44@687f282e 来源：deepseek-harness/scripts/verify-doc-budgets.ts:1-58@687f282e 来源：deepseek-harness/scripts/doc-budgets.manifest.json:1-9@687f282e 来源：deepseek-harness/docs/AGENTS.md:75-77@687f282e 来源：deepseek-harness/AGENTS.md:165-165@687f282e 来源：deepseek-harness/package.json:132-132@687f282e

**补充来源坐标：**
- `engineering-instruction-tiers`：`deepseek-harness/package.json:132-132@687f282e`

<a id="engineering-check-selection"></a>
## 2. 按改动面选择检查（engineering-check-selection）

**触发**：公共接口、类型、默认值或错误行为变化；提交、推送、PR、修复 CI、声称“完成”。

**角色与前置**：改动者选择覆盖改动面的最小检查；CI 负责穷举覆盖和平台矩阵。

**【源仓义务】**
- 公共 API 变化同步所有消费者，不因 API 尚未稳定而只改定义。`deepseek-harness/AGENTS.md:5-11@687f282e`。源 `build:check` 检查测试/脚本等聚合程序对最新包声明的消费，不会重建旧产物；包源变化先产生新声明。`deepseek-harness/docs/development.md:77-102@687f282e`
- 推送前按 `dsh-pre-push-checks` 选择检查；只报告真正运行过的命令。`deepseek-harness/AGENTS.md:113-121@687f282e`
- 工具链由根 manifest 固定：`packageManager: pnpm@11.28.5`，`engines.node: ^22.19.0 || >=24.0.0`；所有命令按 pnpm 脚本调用，不混用 npm/yarn 生成的安装状态。`deepseek-harness/package.json:7-10@687f282e`
- 证据必须匹配表面：行为改动跑聚焦行为测试；模型/用户可见输出跑快照；文档跑 `doc-sync`；发布路径跑构建后 smoke；provider 跑真实 API e2e。`deepseek-harness/AGENTS.md:117-118@687f282e`
- 不要把全量测试当默认，也不要为提交/推送重复已通过的检查；只有显式要求、诊断 CI 或不可约的仓库级改动才本地重演全部。`deepseek-harness/AGENTS.md:118-118@687f282e`
- CI 覆盖率门禁是 `test:coverage`（逐文件 100% on `packages/*/*/src`），不是 `test`。`deepseek-harness/AGENTS.md:119-119@687f282e`
- TypeScript 工作声明完成前：最新 `build:artifacts` 之后跑 `build:check`，或直接跑 `build`。`deepseek-harness/AGENTS.md:120-120@687f282e`
- 测试解析只走源码平面；构建产物只由显式 `lib` 模式或 built smoke 消费。`deepseek-harness/docs/testing.md:43-46@687f282e`
- 钩子是快速本地检查点，不是完整测试：`pre-commit` 只做 staged pairing record、staged Oxlint（一次 bounded retry）、whitespace、pi-ai provider metadata、vendor manifest guard；`pre-merge-commit` 重跑 pairing；`pre-push` 跑 `typecheck`（先生成 Typert contracts，再双聚合 tsc）。hooks 有意不跑 tests/snapshots/docs/build/hygiene；`pnpm run check:all` 是显式选择而不是代理指令；CI 拥有 exhaustive 覆盖、built smokes 与 Node 版本矩阵。`deepseek-harness/docs/development.md:135-152@687f282e`
- gate 脚本 shell-free 调 pnpm，在 ingestion 把 repo-relative glob 归一化为 `/`，平台适配留在需要的 gate；源 ownership gate 用 syntax-aware discovery，拒绝空或被缩窄的语料，并对每个 admitted/excluded 边界有测试。spec 并发执行时自持端口、临时路径和子进程；单独跑才过是 spec 缺陷。`deepseek-harness/scripts/AGENTS.md:1-5@687f282e`
- gate 聚合与模式库存由 `scripts/run-gates.ts` 拥有；本域只读了 333-397、790-795、818-832 的片段（product-use、package-meta、client-packages、no-top-level-await 等接线），不能把局部列表当作完整 CI 矩阵；完整模式归 Automation。`deepseek-harness/scripts/run-gates.ts:333-397@687f282e`、`deepseek-harness/scripts/run-gates.ts:790-795@687f282e`、`deepseek-harness/scripts/run-gates.ts:818-832@687f282e`

**步骤**
1. 列出改动面：源码/类型/文档/配置/发布产物/真实 provider。

   【迁移设计】公共形状/默认值/失败语义改变时，用目标语言引用/类型工具追仓内静态消费者，确认它们进入当前编译/检查图；动态拼装、外部调用者和安装面补实际入口证据，不因源码定义通过而宣称所有调用方同步。
2. 选择最小覆盖集；记录命令、版本、环境和结果。
3. 若失败与改动无关，不要静默修复或忽略；在交接中标注并让它进入下一 PR 窗口。
4. 声称完成前补跑该表面要求的最后一道检查（典型是 `build:check`）。

**完成信号**：证据清单与改动面一一对应；没有未运行的“应该会过”；全量套件只在有理由时出现。

**失败处理**：沙箱阻塞 `gh`/`pnpm`/构建/测试时，用最窄的主机提权重试同一命令，并保留沙箱证据；绝不绕过失败或产品沙箱。`deepseek-harness/AGENTS.md:109-111@687f282e`

**例外**：不可约的仓库级改动、CI 诊断、显式用户要求可本地重演全部。

**迁移裁剪**：把“按表面选证据”映射到目标仓库的测试分层，但**证据义务本身不可删除**。若目标缺少快照、e2e 或真实 API harness，这是“需要实现或阻塞”的前置条件，不是自动不适用：必须保留同等的可观察证据（契约测试、集成测试、fixture 回放、人工协议测试等），并在迁移记录中写明替代证据、覆盖缺口、批准人和再激活触发（例如引入快照设施、发布路径变化、provider 变更）。具体命令名可以换，但“行为改动、用户可见输出、文档、发布路径、provider”各自需要哪类证据的映射必须逐项保留并重新验证；不得因为设施缺失而把行为改动降级为只跑单测或只做静态检查。

**证据与限制**：检查选择本身是人工判断；自动门禁只证明被运行的检查通过，不证明选择充分。

来源：deepseek-harness/AGENTS.md:113-121@687f282e 来源：deepseek-harness/AGENTS.md:109-111@687f282e 来源：deepseek-harness/docs/testing.md:7-12@687f282e 来源：deepseek-harness/docs/testing.md:43-46@687f282e 来源：deepseek-harness/docs/development.md:91-103@687f282e 来源：deepseek-harness/docs/development.md:135-152@687f282e 来源：deepseek-harness/scripts/AGENTS.md:1-5@687f282e 来源：deepseek-harness/package.json:7-10@687f282e 来源：deepseek-harness/package.json:23-23@687f282e 来源：deepseek-harness/package.json:61-61@687f282e

**补充来源坐标：**
- `engineering-check-selection`：`deepseek-harness/package.json:23-23@687f282e`、`deepseek-harness/package.json:61-61@687f282e`

<a id="engineering-jsdoc-prose"></a>
## 34. 导出 JSDoc、契约措辞与禁用词（engineering-jsdoc-prose）

**触发**：新增/修改导出、service 方法、README/JSDoc、注释、命名、文档措辞。

**角色与前置**：作者在声明处写完整契约；评审者检查文档是否覆盖行为/失败/时序/所有权；`verify-export-jsdoc` 与 `verify-concrete-terms` 自动检查可机械化的部分。

**【源仓义务】**
- 每个模块和导出都有简洁 JSDoc 说明非显然契约；function-like 导出包含 `@param`/`@returns`；`verify-export-jsdoc` 强制。可继承的 base 成员文档留在声明处；constructor 不被该 gate 检查；类静态协议槽与顶层协议导出按 gate 的例外处理。`deepseek-harness/AGENTS.md:173-173@687f282e`、`deepseek-harness/scripts/verify-export-jsdoc.ts:1-607@687f282e`
- 注释和文档陈述完整契约与上下文，不是推理过程；直接、具体；不用隐喻。写 `contract`/`boundary`/`shape` 前先问是否有更精确词（`response fields`、`JSON validation`、`ESM exports`）；`contract` 只用于前置/后置/不变量/兼容承诺/义务；保留字面的 process/wire/security/transaction/lifecycle boundary。不叙述控制流/测试、不保留评审历史、不复述代码；保留行为、失败、时序、所有权和安全使用事实。`deepseek-harness/AGENTS.md:175-175@687f282e`
- `verify-export-jsdoc` 的精确范围：扫描 `packages/*/*/src/**/*.ts`；若 package.json 没有 `./src/*` export，只检查从 exports 条目可达的名字，否则检查所有 module-level exports；无 import/export 的 script-style `.d.ts` 作为 ambient implicit-export scope。`deepseek-harness/scripts/verify-export-jsdoc.ts:1-607@687f282e`
- 该 gate 的规则：导出声明要有 descriptive prose；函数/公共 class 方法每个参数一个 `@param`（排除 `this`，前导下划线名字归一化），非 void 返回要有 `@returns`；class 本身和 public property/accessor 要有 prose（get/set 对由 getter 覆盖）；overload implementation 豁免，constructor 不检查。类静态协议槽 `Config`/`inject`/`name`/`reusable` 豁免，顶层协议导出另行适用。继承成员只有在 base 是 public、override 不加参数且不写具体返回类型时才继承文档；public override 一个 protected base 成员算新 API。import-alias 到 callable/class/namespace 被拒；只写 prose 的 alias 文档自身；`export =` 被拒；带 module specifier 的 re-export 跳过（走定义模块）；无 specifier 的 `export {…}` 解析本地声明；string-literal module / `declare global` augmentation 跳过；未知 export statement kind fail closed；mixed call/construct/other-member callable literal fail closed（要求命名类型）。inline callable annotation 只接受单一 call signature；命名引用类型把文档留给声明；命名 declarator annotation 可豁免 arrow 的返回契约。`deepseek-harness/scripts/verify-export-jsdoc.ts:1-607@687f282e`
- 禁止一个歧义 origin 标签 `provenance`（十字母 ASCII token，任意大小写变体）出现在 maintained tracked path/text；每处替换为精确本地概念（source-event references、provider metadata、model identity、context producer、configuration source、artifact identity、recorded evidence）。覆盖 source/tests/docs/active Notes/prompts/snapshots/workflows/scripts/identifiers/fields/exported types/filenames；vendor 和 archived Notes 排除；兼容 reader 可在运行时重建旧 durable key，但 maintained text 不嵌入 token。**自指警告**：源仓自己的 Agent Note 刻意把它分写为 `prove` + `nance` 以通过同一 gate；若采用方把本参考或类似治理文档放进被扫描的 tracked tree，必须同样分写，或把该治理文档明确纳入例外，否则 gate 会命中说明本身。`deepseek-harness/.agents/notes/implemented/process/2026-08-26-ban-ambiguous-origin-label.md:13-39@687f282e`
- `verify-concrete-terms` 对 `git ls-files` 的 tracked filenames、symlink targets 与文本行做 NFKC 归一化后 lowercase 匹配，排除 `vendor/`、`.agents/notes/archived/`、release schema JSON 与 historical-format schema/i18n 的标记区内 schema；作为 `doc-sync` 的 quick leaf。`deepseek-harness/scripts/verify-concrete-terms.ts:1-105@687f282e`
- 文档写当前状态，不写历史/状态注解；一个事实一个 home；`docs/AGENTS.md` 的 writing rules 适用于所有 in-scope 文档。`deepseek-harness/docs/AGENTS.md:38-48@687f282e`

**步骤**
1. 在声明处写描述性 JSDoc；function/public method 补 `@param`/`@returns`。
2. 检查是否用隐喻/模糊词；换成精确名词或具体字段。
3. 搜索禁用 token（含路径/标识符）；按本地含义替换，不统一换成更宽的 umbrella term。
4. 运行 `verify-export-jsdoc` 和 `verify-concrete-terms`；历史 schema 例外不手改。
5. 文档变更同步 README/JSDoc 契约，不写推理过程。

**完成信号**：门禁绿；导出有契约；无禁用 token；注释不叙述控制流/测试；术语精确。

**失败处理**：若 gate 报未知导出形态，改成受支持的 ESM named export 或扩展 gate（需 owner）；若是历史 schema 例外，确认在允许区域；不要用 alias 保留 token。

**例外**：类静态协议槽/顶层协议导出、可继承的 base 文档、constructor 不检查；vendor/archived/historical schema 排除。`deepseek-harness/scripts/verify-export-jsdoc.ts:1-607@687f282e`、`deepseek-harness/scripts/verify-concrete-terms.ts:1-105@687f282e`、`deepseek-harness/.agents/notes/implemented/process/2026-08-26-ban-ambiguous-origin-label.md:13-39@687f282e`

**迁移裁剪**：目标没有 AST gate 时，把它列为前置条件或阻塞；可用 lint/API doc 工具做部分替代，但必须保留导出范围、参数/返回、继承/alias/unsupported 形态的可审计规则与负向样例。禁用词是源仓特定历史，迁移时作为可配置词表；词表缺失不是“不适用”，只是尚未实现。

**证据与限制**：JSDoc/terminology gate 自动；语义质量仍靠评审。Gate 通过不证明文档完整；constructor 不检查、prose-only alias、re-export 跳过、unknown fail-closed 都是 gate 的边界，不能解读为这些位置已有语义文档。

来源：deepseek-harness/AGENTS.md:173-173@687f282e 来源：deepseek-harness/AGENTS.md:175-175@687f282e 来源：deepseek-harness/docs/AGENTS.md:38-48@687f282e 来源：deepseek-harness/scripts/verify-export-jsdoc.ts:1-607@687f282e 来源：deepseek-harness/.agents/notes/implemented/process/2026-08-26-ban-ambiguous-origin-label.md:13-39@687f282e 来源：deepseek-harness/scripts/verify-concrete-terms.ts:1-105@687f282e

<a id="engineering-todo-markers"></a>
## 36. TODO 标记的紧迫性语义（engineering-todo-markers）

**触发**：在代码里留已知问题；发布前扫描；评审 `FIXME`。

**角色与前置**：作者按紧迫性选标签；评审者同意 `FIXME` 是否可随发布合并。

**【源仓义务】**
- `FIXME`：应阻塞新发布的问题；发布不应带 open `FIXME`，除非评审者明确同意该改动仍可合并。`deepseek-harness/docs/development.md:196-204@687f282e`
- `TODO`：资源允许时应尽快修。`deepseek-harness/docs/development.md:196-204@687f282e`
- `XXX`：也许 someday 修，最低优先级、无承诺。`deepseek-harness/docs/development.md:196-204@687f282e`
- 选与紧迫性匹配的标签，让扫描者能区分发布阻塞和 someday-maybe。`deepseek-harness/docs/development.md:196-204@687f282e`、`deepseek-harness/AGENTS.md:164-164@687f282e`

**步骤**
1. 判断是否阻塞发布；是则 `FIXME`，否则 `TODO`/`XXX`。
2. 在注释里写清问题与触发条件，不只是标签。
3. 发布前扫描 `FIXME`；需要保留时记录评审者同意。
4. 修复后删除标记。

**完成信号**：标签与紧迫性一致；发布无未同意 `FIXME`；扫描者能区分优先级。

**失败处理**：若不确定，按更低紧迫性并写清条件；发布阻塞项必须升级到评审。

**例外**：评审者明确同意可合并的 `FIXME` 可随发布；但必须记录同意。

**迁移裁剪**：可直接采用；若目标用 issue tracker，保留三档语义并映射标签。

**证据与限制**：人工/扫描；没有自动语义检查。

来源：deepseek-harness/AGENTS.md:164-164@687f282e 来源：deepseek-harness/docs/development.md:196-204@687f282e

<a id="engineering-duplication"></a>
## 37. 跨文件重复检测门禁（engineering-duplication）

**触发**：复制粘贴实现、提取共享 helper、修改 `packages/`/`scripts/` 的相似代码。

**角色与前置**：作者在提交前跑 `duplication`；评审者判断重复是应提取还是有意保留。

**【源仓义务】**
- `pnpm run duplication` 用 jscpd 检测跨文件 TypeScript 克隆；配置 `minTokens: 60`、`minLines: 6`、`mode: mild`、格式 `typescript`/`tsx`、忽略 `**/tests/**` 和 `**/tsdown.config.ts`、`exitCode: 1`。`deepseek-harness/.jscpd.json:1-15@687f282e`
- 复制粘贴不自动等于错误；但 unexplained duplication 是提取信号（与 [§35 的对称性规则](engineering-dependencies-and-classification.md#engineering-dependency-over-handrolling) 一致）。`deepseek-harness/AGENTS.md:153-153@687f282e`（【迁移设计】把两者关联）

**步骤**
1. 提交前跑 `pnpm run duplication`。
2. 对报告：若是同一职责，提取共享 helper/包；若是有意分叉，记录原因。
3. 提取后重跑；不要在测试/配置里用 ignore 掩盖生产重复。

**完成信号**：duplication 绿；重复要么消除要么有理由；共享 helper 有 owner。

**失败处理**：若报告是测试/生成代码，确认 ignore 规则合理；不要为过门禁复制 ignore 到生产。

**例外**：`tests/` 和 tsdown config 被配置排除；生成代码/有意分叉需评审。

**迁移裁剪**：映射到目标 clone detector；阈值按语言调整，但保留“生产重复需解释”。

**证据与限制**：自动门禁；它不判断重复是否应共享。

来源：deepseek-harness/.jscpd.json:1-15@687f282e 来源：deepseek-harness/package.json:59-59@687f282e 来源：deepseek-harness/AGENTS.md:153-153@687f282e 来源：deepseek-harness/.oxlintrc.json:230-252@687f282e

**补充来源坐标：**
- `engineering-duplication`：`deepseek-harness/package.json:59-59@687f282e`
