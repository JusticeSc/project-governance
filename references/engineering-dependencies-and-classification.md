# 依赖与分类：依赖策略、产品角色与实验隔离

本页拥有依赖声明与产品/实验分类：§25 包依赖声明与 workspace 范围策略、§28 非实验包的产品使用或显式分类、§29 实验包状态、发布与默认产品隔离、§35 依赖优先、当前 owner 与对称性。触发：新增/修改依赖、修 dependency scan、加 Host/Client import、提升包或建立 peer 关系；新增/移动 `packages/<group>/<pkg>`、包不再被默认组合使用、清理发布包或政策条目陈旧；新增/提升 experimental 包、改默认 profile/Web 入口或发布检查；手写协议/解析/重试/glob/SSE、新增依赖、移除抽象、发现并行值不对称或评审“Not Invented Here”。读本页前先读 [§0 使用约定与证据边界](engineering.md#0-使用约定与证据边界)。

<a id="engineering-dependency-policy"></a>
## 25. 包依赖声明与 workspace 范围策略（engineering-dependency-policy）

**触发**：新增/修改依赖、修 dependency scan、加 Host/Client import、提升包、peer 关系。

**角色与前置**：包作者按 faces 声明；`verify-package-dependencies` 和 policy file 拥有规则；domain owner 批准策略/扫描变更。

**【源仓义务】**
- 内部依赖语法按包族：`@deepseek-ai/dsh` 和 `@deepseek-ai/dsh-*` 用 `workspace:*`，其他内部包用 `workspace:~`；策略上 `workspace:^` 已退役。`verify-package-dependencies` 对 `packages/*/*` 强制该规则；`check-workspace-constraints` 对普通包只要求任意 `workspace:` 前缀，因此不要把前者的覆盖外推到 `apps/*`/`vendor/*` 全部。同一依赖名在每个 workspace 写法一致；策略不匹配是硬失败，但自动门禁的覆盖面有上述差异。`deepseek-harness/docs/defensive-patterns/package-surface.md:148-186@687f282e`、`deepseek-harness/scripts/verify-package-dependencies.ts:32-34@687f282e`、`deepseek-harness/scripts/check-workspace-constraints.ts:600-642@687f282e`
- Harness 包在 `peerDependencies` 和 `devDependencies` 同时声明 `@deepseek-ai/cordis`，范围相同。`deepseek-harness/AGENTS.md:131-131@687f282e`
- `@types/react`/`@types/react-dom` 只在 root `devDependencies`；`verify-package-dependencies` 拒绝 `apps/*`、`packages/*/*`、`vendor/*` 中的声明，但包仍声明自己 import 的 `react`/`react-dom`。`deepseek-harness/scripts/verify-package-dependencies.ts:28-34@687f282e； deepseek-harness/scripts/verify-package-dependencies.ts:853-867@687f282e`
- Host 运行时 import 只有在其精确 specifier + runtime export 出现在 `safeHostDependencyExports` 时才进 `dependencies`；需要共享身份的 export 进 `peerRequiredHostExports`，整条边同时保留在 peer+dev。未分类 export 在 `--fix` 写 manifest 前被拒。`deepseek-harness/packages/client/AGENTS.md:61-73@687f282e`、`deepseek-harness/scripts/verify-package-dependencies.ts:593-655@687f282e`
- Browser/type 关系是 development-only：workspace/第三方 Client import、type-only import、module augmentation、TS references、`dsh.client.inject`、metadata-only peer 只进 `devDependencies`；配置专用条目在 policy 里列。`deepseek-harness/packages/client/AGENTS.md:61-73@687f282e`
- 策略由 `package-dependency-policy.ts` 拥有：`clientFaceInclude`（空）、`clientFaceExclude`（2 个 API controller）、`hostPackages`（`llm`、`session`）、`requiredServicePeers`（terminal-controller→subprocess）、`configurationOnlyDevDependencies`（7 项）、`duplicateSafePackages`（6 个 util/protocol 包）、`safeHostDependencyExports`（6 个精确 export）、`peerRequiredHostExports`（4 个共享身份 export）。`safeHostDependencyExports` 新条目默认禁止，自动化代理不得添加例外；每次新增需显式人工评审并在 PR 描述中设醒目标题。`deepseek-harness/scripts/package-dependency-policy.ts:1-105@687f282e`
- 修红的方式是修 manifest 它命名的 section，不是改扫描或放宽 policy；改扫描/policy 不是普通编辑，需 domain owner 确认并把理由记录在 change 上。`deepseek-harness/docs/defensive-patterns/package-surface.md:115-147@687f282e`
- `vendor/` 是固定上游 SHA 的 source copy，不是普通 workspace 依赖：只按 `vendor/README.md` 的同步流程更新，重新应用或退役已记录的本地修改，并重跑 `pnpm run test && pnpm run build`。具体 vendoring 目录/补丁/升级策略由 Supply 域展开；本域只规定“不要把它当可随手编辑的包”。`deepseek-harness/AGENTS.md:183-185@687f282e`

**步骤**
1. 判断包的 role（client-only/client-host/configured-host）和 import 的 runtime/type 性质。
2. 按 face 放入 dependencies/devDependencies/peer+dev；workspace 范围用族规则。
3. 新增 Host runtime export 前查 policy 分类；未分类则不要用 `--fix` 写。
4. `--fix` 只用于修复 owned relationships；写前校验整批，失败不改任何 manifest。
5. 运行 `verify-package-dependencies` 和 `constraints`。

**完成信号**：扫描绿；同一依赖名/范围一致；peer+dev 成对；root type 包不泄漏；policy 无新增未评审 export。

**失败处理**：诊断命名 manifest/section/dependency/expected range；改 manifest；若需要新策略，单独评审。

**例外**：非 workspace 成员的 same-namespace 包用普通第三方范围（如 `@deepseek-ai/libreoffice-kit`）；`duplicateSafePackages` 的完整运行时 surface 可跨重复安装。`deepseek-harness/docs/defensive-patterns/package-surface.md:148-186@687f282e`

**迁移裁剪**：包管理器不同则映射 workspace 协议/peer 规则；保留“按 face 声明 + policy 拥有例外 + 不改检查器过关”。没有 peer 概念时用共享实例检查或等价的重复安装测试替代；若替代设施也不存在，把它列为前置条件或阻塞，并记录缺口与再激活触发，不能把“没有 peer”写成“无需验证共享身份”。

**证据与限制**：扫描/`--fix` 是自动证据；`--fix` 不证明语义正确。`safeHostDependencyExports` 的新增由精确 roster 测试 + 人工评审阻止（policy 注释要求 PR 醒目标题），不是运行时禁令；不要把它描述成运行时强制。重复安装/共享身份在源仓只有单元测试 + `verify-npm-install-layout` 的合成 registry/metadata 布局断言，没有真实消费者安装 smoke；`scripts/release/verify-packed-install.ts` 是另一条未执行的打包安装检查。迁移时必须分别记录“策略/单元/合成布局/真实安装”的证据等级，不能把前三者当成真实安装已通过。peer 关系仍需要真实重复安装 smoke（Release/Supply 域）。

来源：deepseek-harness/AGENTS.md:131-132@687f282e 来源：deepseek-harness/docs/defensive-patterns/package-surface.md:115-186@687f282e 来源：deepseek-harness/scripts/verify-package-dependencies.ts:28-34@687f282e 来源：deepseek-harness/scripts/verify-package-dependencies.ts:593-655@687f282e 来源：deepseek-harness/scripts/verify-package-dependencies.ts:853-867@687f282e 来源：deepseek-harness/scripts/package-dependency-policy.ts:1-105@687f282e 来源：deepseek-harness/packages/client/AGENTS.md:61-73@687f282e 来源：deepseek-harness/AGENTS.md:183-185@687f282e 来源：deepseek-harness/scripts/verify-package-dependencies.spec.ts:1-207@687f282e 来源：deepseek-harness/scripts/verify-package-dependencies.spec.ts:345-999@687f282e 来源：deepseek-harness/scripts/verify-package-dependencies.spec.ts:1039-1061@687f282e 来源：deepseek-harness/scripts/verify-package-dependencies.spec.ts:1135-1211@687f282e 来源：deepseek-harness/scripts/verify-package-dependencies.spec.ts:1241-1246@687f282e

**补充来源坐标：**
- `engineering-dependency-policy`：`deepseek-harness/AGENTS.md:131-132@687f282e`、`deepseek-harness/docs/defensive-patterns/package-surface.md:115-186@687f282e`

<a id="engineering-product-classification"></a>
## 28. 非实验包的产品使用或显式分类（engineering-product-classification）

**触发**：新增/移动 `packages/<group>/<pkg>`、包不再被默认组合使用、发布包清理、政策条目陈旧。

**角色与前置**：包 owner 证明产品 runtime 使用或声明受维护角色；政策 owner 维护 `product-package-policy.ts`；评审者拒绝“装了但没用到”的孤儿。

**【源仓义务】**
- 非实验 runtime 包必须有产品使用或显式分类；SDK、build、test、声明基础设施有单独分类。`deepseek-harness/AGENTS.md:79-79@687f282e`、`deepseek-harness/packages/README.md:87-92@687f282e`
- `PRODUCT_PACKAGE_POLICY` 键是仓库相对包目录，值含 `reason` 和 category：`optional`、`sdk`、`build`、`test`、`web-distribution`、`declarations`。`optional` 不得用于 `test-support`；`test` 只用于 `test-support`；`sdk`/`build`/`web-distribution`/`declarations` 有精确路径约束。`deepseek-harness/scripts/product-package-policy.ts:1-50@687f282e`、`deepseek-harness/scripts/verify-product-use.ts:277-304@687f282e`
- `verify-product-use` 从真实产品入口构建 effective runtime 图：读取 `tsconfig.base.json` paths，按源 import 递归；读 shipped profiles 的 bundle 列表、bundle patch、Include（应用后）、preset、Web HTML module entry、Desktop main；把 default reachability 与 optional（`OPTIONAL_BUNDLES`/`ON_DEMAND_BUNDLES`）分开。`deepseek-harness/scripts/verify-product-use.ts:58-249@687f282e`
- 不读 built workspace outputs；若 workspace specifier 不能解析到 source，失败并提示加 `tsconfig.base.json` paths；生成 Remote 贡献只按声明识别，不加载 Host 实现。`deepseek-harness/scripts/verify-product-use.ts:58-249@687f282e`
- 每个非实验包必须满足：default 或 optional 可达，或 policy 有条目；否则失败“no product runtime use; mount it, declare its maintained role, or move it to experimental”。policy 条目若目录缺失、位于 experimental、reason 为空、category 非法、default 使用却仍声明（除 web-distribution）都失败。`deepseek-harness/scripts/verify-product-use.ts:250-275@687f282e`
- 负向测试覆盖（已读测试体，不只标题）：即使 app manifest 安装孤儿也拒绝；type-only import/export 不计数，runtime import/export/await import/require 计数；相对跨包 import 归到一个 source owner；只跟随 reached local modules（含 cycles/worker URLs）；Desktop/Web 入口可达；acp/headless/sdk/sdk-minimal profile 独立组合；disabled Include children/group/preset/nested initial/conditional disabled 表达式都尊重；Include patch 先应用；未匹配/后被替换/disabled 行忽略；只访问启用 preset 的 nested entries；optional shipped/on-demand 选择与 runtime closure 和 default 分开，target 缺失的 optional patch 不计数；生成 Remote metadata 只按声明识别；on-demand catalog 必须有 `dsh.bundle.patch`；缺失 workspace source mapping 被拒而不是查 built exports；bundle 内相对插件按声明位置解析；directory-picker 动态 mount 及其 client face 可达；declaration-only 基础设施/非法 policy category/stale policy 被拒；`web-distribution` 必须 source-reachable；shipped profile corpus 不能被缩窄。`deepseek-harness/scripts/verify-product-use.spec.ts:1-302@687f282e`

**步骤**
1. 新增包先接入真实产品入口（profile/bundle/UI/tool），或明确它是 optional/sdk/build/test/declaration。
2. 在 policy 写 reason；不要用 policy 掩盖“忘记挂载”。
3. 运行 `verify-product-use`；看 diagnostic 的包和修正建议。
4. 移动/删除包时同步删 policy 条目，否则 stale 红。
5. 对 optional 能力验证它只在显式选择后可达。

**完成信号**：每个非实验包 default/optional 可达或有合法分类；policy 无 stale/空 reason；source graph 无缺失 paths；optional 不混入 default。

**失败处理**：孤儿先挂载或移 experimental；不要先加 policy。若 source import 不解析，补 paths，不要让门禁去读 `lib`。

**例外**：`web-distribution` 包可以不在 default 图但仍是产品角色；`optional` 不得用于 test-support。`deepseek-harness/scripts/verify-product-use.ts:277-304@687f282e`

**迁移裁剪**：目标没有 profile 概念时，用“真实入口 + 依赖图 + optional 目录”的等价分析；保留“无使用即分类或移实验”的判定和“分类必须有 reason/当前角色”的义务。小型仓库可以缩小扫描面，但仍必须从真实入口出发并覆盖 default/optional 分离；若没有可分析的入口或运行时，先把“建立入口图”列为前置条件或阻塞，不能把“仓库小”当作免检，也不能只看 manifest 安装关系。

**证据与限制**：门禁自动且负向测试覆盖上述断言；它不执行运行时，不证明 reachable 包真的工作。测试体已确认覆盖 source reachability 与 effective Loader composition 的边界，但不覆盖真实 provider/API、打包产物或用户触发的每一条路径；这些仍需 Testing/Release 证据。

来源：deepseek-harness/AGENTS.md:79-79@687f282e 来源：deepseek-harness/packages/README.md:87-92@687f282e 来源：deepseek-harness/scripts/product-package-policy.ts:1-50@687f282e 来源：deepseek-harness/scripts/verify-product-use.ts:58-249@687f282e 来源：deepseek-harness/scripts/verify-product-use.ts:250-275@687f282e 来源：deepseek-harness/scripts/verify-product-use.ts:277-304@687f282e 来源：deepseek-harness/scripts/verify-product-use.spec.ts:1-302@687f282e

<a id="engineering-experimental-isolation"></a>
## 29. 实验包状态、发布与默认产品隔离（engineering-experimental-isolation）

**触发**：新增/提升 experimental 包、加依赖、加 optional bundle、改默认 profile/Web 入口、发布检查。

**角色与前置**：experimental owner 维护状态与发布策略；release owner 保证默认安装不依赖实验包；Testing/Release 拥有 runtime smoke。

**【源仓义务】**
- **Experimental** 表示完整公共能力仍在评估、不是产品支持承诺；行为/API 可变、能力可撤回；工程、安全、文档、测试、released-data 义务仍适用。包只有在完整公共契约都是 experimental/internal-only 时才放这里；产品包里的 experimental 选项留在产品角色。`deepseek-harness/packages/experimental/README.md:24-34@687f282e`
- **Optional** 是用户显式选择；**Official** 是项目维护并列入 Plugins 页面；两者都不描述成熟度；发布、默认安装、GUI 可见性也不决定成熟度。`deepseek-harness/packages/experimental/README.md:24-34@687f282e`
- Promotion 需要：命名产品角色、文档化公共行为和限制、当前 consumer、release 内容、测试证据；把包移到产品组、应用该组命名规则、同步更新受影响 consumer。`deepseek-harness/packages/experimental/README.md:24-34@687f282e`
- Release 包和 apps 不得在 `dependencies`/`optionalDependencies`/`peerDependencies` 中命名 experimental 包；默认产品隔离还检查传递安装、runtime import、shipped composition。Experimental 包可以依赖 release 包和彼此；测试可用 `devDependencies`；examples 可显式加载。`deepseek-harness/packages/experimental/AGENTS.md:5-9@687f282e`
- 发布 experimental 不提升状态、不加稳定性承诺；命名默认 `@deepseek-ai/dsh-experimental-*`，保留名例外表；`PRIVATE_EXPERIMENTAL_PACKAGE_DIRECTORIES` 中的目录才 `private: true` 并省略 `publishConfig`，其他公共实验包省略 `private` 并设 `publishConfig.access: public`。`deepseek-harness/scripts/experimental-package-policy.ts:1-67@687f282e`、`deepseek-harness/scripts/check-workspace-constraints.ts:362-381@687f282e`
- 默认产品隔离 `verify-default-product-isolation` 跟随 runtime/optional/peer 依赖、解析 workspace/npm alias、按 npm 前缀或目录识别 experimental；检查源 import、installation-owned profile bundle 列表、bundle patch、shipped presets、declared config trees；用生产 patch parser/composer 计算 effective rows 和 patched Include；disabled 行仍检查，普通插件 config 不被当 entry list。`deepseek-harness/scripts/verify-default-product-isolation.ts:1-30@687f282e； deepseek-harness/scripts/verify-default-product-isolation.ts:45-300@687f282e`
- Web 默认源图从实际 HTML module scripts 出发，含 inline modules 和本地 Worker entries；独立 experimental preview 可以在，但默认入口 import 它就失败。构建期检查覆盖两个 browser bundling stage：client preset 拒绝非实验输出中的实验输入，Web graph 检查跟随 Vite 实际输出边（lazy chunks、workers、CSS、assets）。`deepseek-harness/.agents/notes/implemented/process/2026-09-12-default-product-experimental-isolation.md:11-36@687f282e`
- 运行时 smoke 用真实 Web profile/Chromium 读取实际 Loader/fiber/module cache，要求所有交付 entry 处于 active，并用显式 negative control 验证会拒绝实验插件；这些属于 Testing/Release 证据。`deepseek-harness/.agents/notes/implemented/process/2026-09-12-default-product-experimental-isolation.md:11-36@687f282e`
- Optional bundles 是唯一声明例外：`OPTIONAL_BUNDLES` 拥有安装默认关闭的选择；每个 bundle 必须声明 `icon` 和导出 `./locale/*.json` 的 `meta.title`/`meta.description`；必须是 `apps/cli` runtime dependency、声明 `dsh.bundle.patch`、不是 default bundle；隔离检查仍拒绝非实验 bundle 的实验依赖。`deepseek-harness/.agents/notes/implemented/architecture/2026-09-21-experimental-capabilities-as-optional-bundles.md:11-30@687f282e`、`deepseek-harness/scripts/verify-default-product-isolation.ts:80-110@687f282e`
- `constraints` 的 `checkExperimentalDependencyIsolation` 对 release 成员和 Python runtime 检查 runtime sections；`@deepseek-ai/dsh` 的 `dependencies` 可保留 `OPTIONAL_BUNDLES` 中的实验 bundle，其他引用失败。`deepseek-harness/scripts/check-workspace-constraints.ts:593-613@687f282e`

**步骤**
1. 判断包完整公共契约是否 experimental/internal-only；若是，放 experimental，按命名策略发布。
2. 保证 release 包/apps 不依赖它（含 alias/传递）；需要用户选择就做 optional bundle（默认关闭、icon/locale、bundle patch、app runtime dependency）。
3. 改变默认 profile/Web 入口时，运行 default-product isolation 的静态/source/composition/build-input 检查。
4. 在真实 Web/CLI smoke 中观察实际 Loader/module cache；用 negative control 证明拒绝。
5. Promotion 时一并移动包、改命名、更新 imports/config、重审公共契约/限制/测试/发布 payload/runtime dependents/owner。

**完成信号**：静态图和真实 runtime 都不含实验依赖；optional bundle 元数据/开关正确；实验包发布但不进默认安装；promotion 有完整证据。

**失败处理**：若默认图出现实验包，先删除/替换依赖或把它降为 optional；不要用 `disabled: true` 逃避检查（disabled 行仍检查）。若 bundle 缺元数据，补 icon/locale/patch，不要改隔离检查。

**例外**：`OPTIONAL_BUNDLES` 是唯一声明例外；`sdk-minimal` 不应用 `dsh-base` 是另一个组合例外。`deepseek-harness/.agents/notes/implemented/architecture/2026-09-21-experimental-capabilities-as-optional-bundles.md:11-30@687f282e`、`deepseek-harness/docs/architecture.md:13-40@687f282e`

**迁移裁剪**：目标没有 experimental 组时，保留“成熟度 ≠ 发布/可选/可见性”的定义和“默认产品不得依赖实验”的隔离；把 optional bundle 映射为目标功能开关，但要求默认关闭 + 元数据 + 隔离检查。没有多阶段打包时，必须确认确实没有构建产物边界后再省略 build-input 检查，并记录该判断与再激活触发；source/composition 检查、真实入口的运行时 smoke 和 negative control 只要存在交付组合就仍然适用，缺少 harness 时列为前置条件或阻塞，不能自动降级为“只做 source”。

**证据与限制**：静态隔离、构建输入、真实 runtime smoke 是相互独立的证据；它们不覆盖每个后续用户触发路径或显式安装的 profile 扩展（源仓自己声明）。发布策略不决定成熟度。

来源：deepseek-harness/packages/experimental/README.md:24-34@687f282e 来源：deepseek-harness/packages/experimental/AGENTS.md:5-9@687f282e 来源：deepseek-harness/scripts/experimental-package-policy.ts:1-67@687f282e 来源：deepseek-harness/scripts/verify-default-product-isolation.ts:1-30@687f282e 来源：deepseek-harness/scripts/verify-default-product-isolation.ts:45-300@687f282e 来源：deepseek-harness/.agents/notes/implemented/process/2026-09-12-default-product-experimental-isolation.md:11-36@687f282e 来源：deepseek-harness/.agents/notes/implemented/architecture/2026-09-21-experimental-capabilities-as-optional-bundles.md:11-30@687f282e 来源：deepseek-harness/scripts/check-workspace-constraints.ts:362-381@687f282e 来源：deepseek-harness/scripts/check-workspace-constraints.ts:593-613@687f282e

<a id="engineering-dependency-over-handrolling"></a>
## 35. 依赖优先、当前 owner 与对称性（engineering-dependency-over-handrolling）

**触发**：手写协议/解析/重试/glob/SSE；新增依赖；移除抽象；发现并行值不对称；评审“Not Invented Here”。

**角色与前置**：改动者证明依赖净删除 owned code/tests；评审者区分“特性决策”与“简化”；supply-chain owner 看健康度/传递足迹。

**【源仓义务】**
- 引入维护良好的外部依赖（或引擎下限内的 Node builtin）覆盖手写表面时，替换是首选方向；但必须真正缩小 owned 面（实现 + 专用测试 + 文档/契约），不是把复杂度搬到 wrapper 后面。`deepseek-harness/.agents/notes/implemented/process/2026-07-26-dependencies-over-hand-rolling.md:11-25@687f282e`、`deepseek-harness/AGENTS.md:140-140@687f282e`
- 新依赖门槛：净删除（替换真实 owned code，不是假想未来代码；纯加能力是特性决策）；健康（活跃维护、广泛使用、合理传递足迹）；边界契合（包语义覆盖实际契约，仍需手写的残余语义算反对）；不是已定 seam（schemastery、vendored Cordis、twin adapters 等已记录决策不被此策略重开）。`deepseek-harness/.agents/notes/implemented/process/2026-07-26-dependencies-over-hand-rolling.md:11-25@687f282e`
- `packages/util/` 的“零依赖” charter 是**导出纪律**（不依赖 harness 包），不是禁外部包；若外部包更好，替换而不是为 charter 保留。`deepseek-harness/.agents/notes/implemented/process/2026-07-26-dependencies-over-hand-rolling.md:11-25@687f282e`
- 每个抽象、状态机、选项、防御性拷贝、兼容路径都要绑定当前契约或生产 consumer；行为留在拥有插件/service。`deepseek-harness/packages/AGENTS.md:11-11@687f282e`
- 并行值优先对称；无法解释的不对称通常意味着漏了提取。`deepseek-harness/AGENTS.md:153-153@687f282e`
- 命名要命名“存在的稳定职责”，不是第一个实现、未来扩展或 Cordis 基类；interface 包命名能力，实现包加机制/协议/环境/vendor；`ctx` key 单数用于一个 engine/runtime/policy/controller/resolver/store/current config，复数用于 registry/多命名成员；class role 与 key 数一致；不重用同一 Context key 给不兼容 host/client 声明。`deepseek-harness/docs/cookbook/adding-a-package.md:46-75@687f282e`

**步骤**
1. 先搜索已有依赖/内置能力；列出可删除的实现 + 专用测试 + 文档。
2. 评估健康度和残余语义；若只是“加能力”，走特性决策而非简化。
3. 用 dependency-swap 提案记录候选、可删表面、残余语义、supply-chain 考虑。
4. 删除 owned 代码/测试，不保留 wrapper 兼容层（除非有当前契约）。
5. 检查并行值对称性；命名按角色表。

**完成信号**：净删除可量化；依赖健康/边界契合；无当前 owner 的抽象被删；并行的值解释得通；命名与实际职责一致。

**失败处理**：若无法净删除，保留手写并记录理由；若依赖只包一层，拒绝迁移。若不理解不对称，先找漏提取。

**例外**：已记录 seam/依赖决策不被重开；纯加能力是特性决策。`deepseek-harness/.agents/notes/implemented/process/2026-07-26-dependencies-over-hand-rolling.md:11-25@687f282e`

**迁移裁剪**：任何仓库都适用；supply-chain 评审可映射到目标策略。没有 util charter 的项目可以省略该例外，但只省略例外本身，不省略净删除、健康度、边界与当前 owner 的判定；在迁移记录中写明为何没有 charter，以及新增共享工具时的再激活路径。

**证据与限制**：评审为主；净删除可量化。依赖健康度是判断，不是自动证明。

来源：deepseek-harness/AGENTS.md:140-140@687f282e 来源：deepseek-harness/AGENTS.md:153-153@687f282e 来源：deepseek-harness/.agents/notes/implemented/process/2026-07-26-dependencies-over-hand-rolling.md:11-31@687f282e 来源：deepseek-harness/packages/AGENTS.md:11-11@687f282e 来源：deepseek-harness/docs/cookbook/adding-a-package.md:46-75@687f282e

**补充来源坐标：**
- `engineering-dependency-over-handrolling`：`deepseek-harness/.agents/notes/implemented/process/2026-07-26-dependencies-over-hand-rolling.md:11-31@687f282e`
