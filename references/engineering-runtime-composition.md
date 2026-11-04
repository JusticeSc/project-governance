# 运行时组合：配置、Loader、启动与事件

本页拥有运行时如何被组装、启动和互相发现：§9 配置化而非硬编码可调项、§10 Loader/组合元数据与预设平面校验、§11 唯一应用启动通道、§13 可选服务用 `ctx.get(name)`、§14 类型化事件与分派模式。触发：插件出现部署相关常量、`DEFAULT_*`、超时/并发/路径/端点选择或新增配置字段；编辑 `cordis.yml`/`patch`/profile/bundle/preset 或测试 Loader fixture；新增应用、CLI、demo、`bin`、root script、SDK argv 入口；读取不在 `inject` 中的服务；新增事件或改 payload、选择 emit/waterfall/parallel/serial/bail。读本页前先读 [§0 使用约定与证据边界](engineering.md#0-使用约定与证据边界)。

<a id="engineering-config-tunables"></a>
## 9. 配置化而非硬编码可调项（engineering-config-tunables）

**触发**：插件里出现部署相关常量、`DEFAULT_*`、测试 hook、超时/并发/路径/端点选择；新增配置字段。

**角色与前置**：插件作者声明 `Config` schema；部署者通过 `cordis.yml` 改；评审者区分“部署可变”与“协议/安全不变量”。

**【源仓义务】**
- 插件中不得硬编码可调项：部署可变选择必须是经校验的 `Config` 字段，可从 `cordis.yml` 修改；`DEFAULT_*` 常量或测试 hook 不是配置化。协议常量、外部规范、安全不变量保持固定。`deepseek-harness/AGENTS.md:142-142@687f282e`
- 显式优于隐式：包边界的 defaulting 是拥有实现里的显式 `resolve(request): Spec` 步骤，不是 `run()` 里隐藏的 `?? default`；`dsh-shell` 的 request/spec split 是模板。`deepseek-harness/AGENTS.md:141-141@687f282e`
- 误配置要响亮失败：自包含时在 load 失败，否则在最早期可解析点失败；绝不静默跳过缺失 referent。`deepseek-harness/AGENTS.md:143-143@687f282e`
- 公共选择需要证据：配置化不能为不支持默认值、公共操作集、格式或引入外部概念背书；用当前 Consumer 证据或相关先例，否则要求显式值或推迟。`deepseek-harness/packages/AGENTS.md:12-12@687f282e`
- Function plugin 的 `Config` 同时以 `interface` 和 Schemastery schema 值导出（Loader 四件套之一）。`deepseek-harness/docs/defensive-patterns/package-surface.md:7-43@687f282e`
- 凭据不走通用 `Config` schema：真实 adapter/demos 从环境或 repo-root 的 gitignored `.env` 读取 `DEEPSEEK_API_KEY` 与可选 `DEEPSEEK_BASE_URL`（省略时用公共 API）；绝不提交真实凭据；没有 key 时真实 API e2e 自跳过，key policy 由 Testing 拥有。`deepseek-harness/AGENTS.md:125-130@687f282e`、`deepseek-harness/docs/development.md:122-132@687f282e`

**步骤**
1. 列出部署可变项；为每项建 schema 字段、默认策略和校验错误。
2. 把默认解析集中到 `resolve(request): Spec`，让 `run()` 只执行已解析 spec。
3. 协议/安全常量加注释说明为何不可配置。
4. 写“缺失/非法/未知 referent”失败测试，确认在最早点响亮失败。
5. 更新配置目录/文档（若目标有生成目录）。

**完成信号**：没有 `DEFAULT_*` 冒充配置；请求到 spec 的默认步骤可命名；错误配置有明确诊断；配置目录与 schema 一致。

**失败处理**：若默认值依赖环境，显式建模为配置层并在启动时校验；不要用 `??` 吞掉缺失。

**例外**：协议常量、外部规范、安全不变量不可配置；测试 hook 不是配置。凭据是环境/秘密输入，不是通用 Config 默认可调项；没有 key 的真实 API e2e 自跳过，不能把缺少凭据误报为通过。

**迁移裁剪**：没有 Schemastery 时用目标 schema 库或显式 validator；保留“interface + runtime schema”双导出。若项目没有配置文件，仍保留 `resolve` 步骤和 fail-loud。

**证据与限制**：配置目录/评测可自动检查 schema 文档；没有门禁时靠评审。配置字段存在不证明默认值有证据。

来源：deepseek-harness/AGENTS.md:141-143@687f282e 来源：deepseek-harness/packages/AGENTS.md:12-12@687f282e 来源：deepseek-harness/docs/defensive-patterns/package-surface.md:7-43@687f282e 来源：deepseek-harness/AGENTS.md:125-130@687f282e 来源：deepseek-harness/docs/development.md:122-132@687f282e

**补充来源坐标：**
- `engineering-config-tunables`：`deepseek-harness/AGENTS.md:141-143@687f282e`

<a id="engineering-loader-composition-validation"></a>
## 10. Loader/组合元数据与预设平面校验（engineering-loader-composition-validation）

**触发**：编辑 `cordis.yml`/`cordis.patch.yml`/profile/bundle/preset；新增具名插件行；新增测试 Loader fixture；修改 `!!js` 表达式。

**角色与前置**：组合 owner 保证每个具名插件能从拥有者 manifest 解析；preset owner 保证 host/preset 平面不重复；评审者检查表达式的可插值位置。

**【源仓义务】**
- 语法是 `!!js`，**绝不用 `!js`**。Loader 只在 entry `config`（声明 inject 激活后、该插件 context）和 `disabled`（每次 mount、loader context）插值；其他 entry 元数据保持字面量，条件组合还用overlay，不能将表达式塞进不求值字段。`deepseek-harness/AGENTS.md:127@687f282e`、`deepseek-harness/scripts/verify-cordis-config.ts:1-12@687f282e`、`deepseek-harness/docs/cordis-primer.md:37-39@687f282e`
- `disabled` 字段本身允许 `!!js` 表达式且必须可解析（parse-only）；嵌套在 `disabled` 之下的表达式不会求值，必须保持字面量。`deepseek-harness/scripts/verify-cordis-config.ts:517-578@687f282e`
- 具名插件必须从拥有 manifest 解析：shipped/test overlay 从 CLI application manifest；package-owned fixture 从该包 manifest；bundle patch 行从 bundle 自己 manifest；fixture 模块的 bare import 也要声明。`deepseek-harness/scripts/verify-cordis-config.ts:240-412@687f282e`
- 每个配置中指向本地 workspace 包的 specifier 必须通过 `tsconfig.base.json` 的 `paths` 解析到 `.ts`/`.tsx` 源文件；解析到 `lib`/`.d.ts` 说明依赖了构建产物，clean checkout 会失败。`deepseek-harness/scripts/verify-cordis-config.ts:413-448@687f282e`
- 每个 preset 行只属于一个平面：host composition 与 per-session preset 不得同时激活同一 row id（否则 host singleton 注册两次或 isolate provider 遮蔽 host）；shipped Web 表面是 host patch + 每 preset 一个 patch 文件。`deepseek-harness/scripts/verify-cordis-config.ts:139-180@687f282e`
- `packages/client` 包导出 `./client` 必须同时声明 `dsh.client`，否则浏览器半永不服务且无错误；只检查该组，Host 包的 `./client` 是 typed wire face。`deepseek-harness/scripts/verify-cordis-config.ts:106-136@687f282e`
- 组合层顺序：profile 的有序 bundles → 其 `cordis.patch.yml` → home patch → `--patch` overlay；patch 按 id 替换整段 config 或插入新行；preset patch 在 `config.plugins` 内做同样操作。`deepseek-harness/docs/architecture.md:13-40@687f282e`

**HMR 重载路径（Loader 的运行时补充）**
- 启用/禁用 HMR 是组合配置，不是代码分支：base 在 launcher 提供 `profileContext` 时以 `root: []` 启用；没有 profileContext 的 host 保持该 entry disabled；headless/SDK/ACP 在 YAML 禁用，后续 profile patch 可重新启用；禁用或省略意味着改动在重启后生效。要监听源码模块，在 profile patch 里配置 `root`；`root: []` 只保留显式 config watch，`awaitWriteFinish` 默认 2 秒，关闭会漏掉快速连续编辑。`deepseek-harness/packages/boot/hmr/README.md:12-12@687f282e`、`deepseek-harness/packages/boot/hmr/README.md:27-27@687f282e`、`deepseek-harness/packages/boot/hmr/README.md:39-49@687f282e`
- 一条队列串行化模块替换、Include 刷新、profile 配置变更；包安装/移除在队列外；`runExclusive()` 串行化配置变更与 Loader 更新并拒绝嵌套事务；HMR 不获取 package writer lock；manifest 通知只在有序 `dsh.profile.bundles` 列表变化时重载；Plugin Manager 的直接操作不等文件事件。`deepseek-harness/packages/boot/hmr/README.md:59-59@687f282e`
- `reconcileProfile()` 由 HMR 的 profile watch 与 Plugin Manager 共享，调用方必须持有 `runExclusive()`；Config Editor 经 app-boot recompose 而不替换模块；app-boot 在缓存或运行中 entry 变化前准备并 preflight 新 generation。`deepseek-harness/packages/boot/hmr/README.md:63-63@687f282e`
- app-boot 拥有 profile 解析与 patch 优先级；HMR 只读 launcher 的 data-only `profileContext`，启动时注册 profile manifest 与两个 user patch watch，等应用 ready 后再处理变更；disposal 关闭 watcher 并取消等待启动的 reload；配置 watcher 在活动事务 context 之外启动，后续通知才能进入队列。`deepseek-harness/packages/boot/hmr/README.md:61-61@687f282e`
- 替换语义：Loader 在 generation 启动 entry 时才 import 当前文件，所以 disabled/removed/incompatible rows 不会执行；替换失败会停掉旧插件并报 `failed`，后续 recomposition 再试；失败替换不恢复旧版本（Known Limitations）。兼容性检查只在 startup、profile recomposition、preset mounting 运行，Loader import 本身不检查；profile 外的 row（preset row、`ctx.loader.create()`）会用替换后的代码重启而不检查。HMR 不重启进程；module replacement 依赖 Node loader internals；仅 `package.json` 变更不被检测；动态 `import()` 的 stale 模块在下一次调用时求值新文件；浏览器 Client module graph 有独立的加载机制；packed worker 只能配置 recomposition，代码替换需重启。`deepseek-harness/packages/boot/hmr/README.md:67-83@687f282e`、`deepseek-harness/packages/boot/hmr/README.md:104-123@687f282e`
- 注册必须可被 HMR 安全撤销：每个贡献都是 `ctx.effect`，dispose fiber 后必须观察到移除；这是 registry contribution 的强制测试。`deepseek-harness/packages/AGENTS.md:19-19@687f282e`、`deepseek-harness/docs/cookbook/extension-cookbook.md:132-132@687f282e`

**步骤**
1. 为每个 entry 检查 `!!js` 只在 `config` 和 `disabled`；其他元数据保持静态字面量。
2. 解析每个具名插件到正确 manifest；为本地包补 `paths` 源映射。
3. 对每个 preset 行做平面归属检查；重复 id 要么删除，要么显式 disable 一个平面。
4. 检查 client 包的 `./client` 与 `dsh.client` 一致。
5. 运行组合校验门禁；把失败诊断定位到 manifest/行/字段。
6. 在 profile patch 中显式决定 HMR 是启用、仅配置监听还是禁用；需要源码监听时配置 `root`，不要依赖“省略即热重载”。
7. 把每个注册写成可撤销的 `ctx.effect`；用 dispose fiber 的测试证明贡献被移除；对 reload 失败、`restart-required`、不支持的替换路径写明处理与证据。

**完成信号**：所有组合文件通过；没有“本地能 boot、clean checkout 失败”的源映射；没有跨平面重复行；client half 声明一致；HMR enabled/root 有明确决定；dispose 测试通过；不支持热替换的路径已被记录为重启或阻塞，而不是默认为可用。

**失败处理**：缺 manifest 依赖补 manifest，不改门禁；表达式放错位置就移动到 `config` 或删除；preset 重复就把行移到正确平面；reload 失败时保留旧实例/报告 `failed` 并让后续 recomposition 重试，不要把失败伪装成成功重启。

**例外**：`disabled` 自身表达式是唯一允许插值的元数据字段。普通插件 config 数据不被解释为新的 Loader entry list（只递归已知 group/preset/include 结构）。`deepseek-harness/scripts/verify-default-product-isolation.ts:140-220@687f282e`

**迁移裁剪**：目标不是 Cordis 时，映射为“组合文件 schema + 表达式允许位置 + 依赖解析 + 平面归属 + 重载/重启语义”。没有 profile/preset 概念时保留单一组合入口和平面归属，不要删掉依赖解析或静态元数据检查；没有 HMR 设施时把它列为前置条件或阻塞，保留“重启后配置/模块刷新可验证”的路径，并记录替代验证与再激活触发。不得因为目标没有 HMR 就把“注册可撤销”降级为可选。

**证据与限制**：`verify-cordis-config` 是自动门禁，覆盖元数据、解析、fixture、源平面、preset 平面、client half；它不执行组合后的运行时行为（由测试/启动 smoke 负责）。HMR 的源码监听、queue、替换失败与兼容性检查依赖 Node loader internals 和测试；README 自述仅 `package.json` 变更不检测、动态 `import()` 的 stale 模块、浏览器 Client graph 独立、packed worker 代码替换需重启等限制；dispose 测试只证明被覆盖的贡献路径。README 还有一处需按阶段解读的张力：实现段说替换失败会移除部分激活并恢复旧模块/插件实现（77），Known Limitations 说 import/start 失败时旧版本不恢复（113）；迁移时不要把“失败自动回滚”当保证，必须用失败替换测试记录旧代码是否仍可运行。`deepseek-harness/packages/boot/hmr/README.md:77@687f282e`、`deepseek-harness/packages/boot/hmr/README.md:113@687f282e`

来源：deepseek-harness/scripts/verify-cordis-config.ts:1-12@687f282e 来源：deepseek-harness/scripts/verify-cordis-config.ts:106-136@687f282e 来源：deepseek-harness/scripts/verify-cordis-config.ts:139-180@687f282e 来源：deepseek-harness/scripts/verify-cordis-config.ts:240-412@687f282e 来源：deepseek-harness/scripts/verify-cordis-config.ts:413-448@687f282e 来源：deepseek-harness/scripts/verify-cordis-config.ts:517-578@687f282e 来源：deepseek-harness/docs/cordis-primer.md:37-39@687f282e 来源：deepseek-harness/docs/architecture.md:13-40@687f282e 来源：deepseek-harness/packages/boot/hmr/README.md:12-27@687f282e 来源：deepseek-harness/packages/boot/hmr/README.md:39-49@687f282e 来源：deepseek-harness/packages/boot/hmr/README.md:59-83@687f282e 来源：deepseek-harness/packages/boot/hmr/README.md:104-123@687f282e 来源：deepseek-harness/scripts/verify-default-product-isolation.ts:140-220@687f282e 来源：deepseek-harness/scripts/verify-cordis-config.spec.ts:49-155@687f282e 来源：deepseek-harness/packages/bundle/web-app/presets/standard.patch.yml:21-26@687f282e

<a id="engineering-application-launch"></a>
## 11. 唯一应用启动通道（engineering-application-launch）

**触发**：新增应用、CLI、demo、package `bin`、root script、SDK argv 入口、可执行 fixture。

**角色与前置**：应用 owner 使用命名 `dsh` profile；评审者检查是否有绕过 profile 的 Node 应用路径；构建/测试工具必须显式分类。

**【源仓义务】**
- 只有 `dsh` profile 启动受支持的 Node 应用；package bin、demo、公共 SDK argv 逃逸都被禁止。shipped profiles 为 `web`、`headless`、`sdk`、`sdk-minimal`、`acp`，用 `dsh --profile <name>` 或 `dsh <name>` 选择；`plugin` 是管理命令，同名 profile 需 `--profile plugin`。`deepseek-harness/AGENTS.md:13-13@687f282e`、`deepseek-harness/docs/architecture.md:41-47@687f282e`
- 自定义插件组合仍是 profile + 有序 patch 文件，不是另一个 executable 或 inline application tree；`sdk-minimal` 是仓库拥有的 standalone bundle，仍走同一 launcher。`deepseek-harness/docs/architecture.md:41-47@687f282e`
- vendored CLI、build-only/test-only executable、直接 in-process mount、私有 browser WebWorker preview 不是 Harness application launcher。`verify-application-entrypoints` 把每个 package bin、可执行源、root demo、`start:web`/`dev:web` 放进显式分类，并拒绝绕过 `dsh` 的 Node 应用路径。`deepseek-harness/scripts/verify-application-entrypoints.ts:1-12@687f282e`
- package `bin` 只允许 `apps/cli` 的 `dsh` 和 WebWorker packer；任何带 shebang 的源必须出现在显式分类表（supported launcher/build-only/test-only/private packaging）；root `demo:*` 必须有分类，`start:web` 直接引用 `apps/cli/src/bin.ts`，`dev:web` wrapper 也必须引用它且不得直接启动 package entry。`deepseek-harness/scripts/verify-application-entrypoints.ts:21-89@687f282e； deepseek-harness/scripts/verify-application-entrypoints.ts:102-174@687f282e`

**步骤**
1. 新应用先建 profile/bundle，不建新 executable；选择或新增 shipped profile。
2. 若必须有可执行文件，把它加入显式分类并说明是 build/test/packaging，非产品入口。
3. root launcher script 直接或经 wrapper 引用 `apps/cli/src/bin.ts`；不得引用 `packages/.../src|lib/...` 作为应用启动。
4. 运行 `verify-application-entrypoints`；为新增分类补负向测试。

**完成信号**：`package bin`/shebang/root scripts 全部分类；没有绕过 profile 的 Node 应用；`--dump-config` 可打印实际插件树。

**失败处理**：若新入口确实需要，先改架构/启动策略并获得 owner 确认；不要把分类表当橡皮图章。

**例外**：build-only/test-only/packaging 可执行文件允许，但必须有显式 allowlist 条目和理由。`deepseek-harness/scripts/verify-application-entrypoints.ts:36-58@687f282e`

**迁移裁剪**：目标没有 profile 概念时，保留“单一受支持启动器 + 所有其他可执行文件显式分类”的效果；把 `dsh` 替换为目标应用入口。

**证据与限制**：门禁是自动的，负向测试覆盖新增 bin/shebang/root script。它不证明 profile 内部组合正确（由组合/隔离/测试门禁负责）。

来源：deepseek-harness/AGENTS.md:13-13@687f282e 来源：deepseek-harness/docs/architecture.md:41-47@687f282e 来源：deepseek-harness/scripts/verify-application-entrypoints.ts:1-12@687f282e 来源：deepseek-harness/scripts/verify-application-entrypoints.ts:21-89@687f282e 来源：deepseek-harness/scripts/verify-application-entrypoints.ts:102-174@687f282e 来源：deepseek-harness/scripts/verify-application-entrypoints.ts:175-203@687f282e

**补充来源坐标：**
- `engineering-application-launch`：`deepseek-harness/scripts/verify-application-entrypoints.ts:175-203@687f282e`

<a id="engineering-optional-service-access"></a>
## 13. 可选服务用 `ctx.get(name)`（engineering-optional-service-access）

**触发**：插件读取一个不在 `inject` 中的服务；实现可降级/可选后端；跨 fiber 调用 service 方法；怀疑 shadow/traceable proxy。

**角色与前置**：插件作者区分硬依赖（`inject`）与可选探测（`ctx.get`）；评审者检查属性代理是否被用于未声明服务。

**【源仓义务】**
- 可选服务用 `ctx.get(name)`；`ctx.<name>` 只保留给已声明 injection。属性代理对拓扑敏感，strict `ctx.get` 读全局 service store。`deepseek-harness/packages/AGENTS.md:6-6@687f282e`
- Cordis 服务访问经 context proxy：从 foreign fiber 获得的 traceable proxy 会把 `this` 重绑到 shadow，属性读取从 shadow 的 fiber 开始“仅祖先”walk；sibling 分支的服务走到 root 就 throw。`ctx.get(name)` 用全局 isolate-keyed store，保持 active-state 检查，拓扑无关。`deepseek-harness/docs/postmortem/0001-acp-default-export-drops-inject.md:56-88@687f282e`
- 教程层面：`inject` 是硬要求；可活在没有该能力时，跳过 `inject` 并在使用点 probe（`ctx.get('greeter')`，可能是 `undefined`）。`deepseek-harness/docs/cordis-tutorial/03-services.md:56-65@687f282e`
- 事故：`AgentLoop.resume` 通过 `this.ctx.sessionPersistence` 读未声明服务，经 shadow 的祖先 walk 失败；修为 `this.ctx.get('sessionPersistence')`。手工 flat mount 测试因顶层 `!runtime` bypass 而漏掉。`deepseek-harness/docs/postmortem/0001-acp-default-export-drops-inject.md:56-99@687f282e`

**步骤**
1. 列出插件读取的每个服务；硬依赖进 `inject`，可选探测用 `ctx.get`。
2. 对可选服务写“缺失时”的行为与报告；不要假设存在。
3. 在真实 Loader/fiber 拓扑下测试，不只顶层手工 mount。
4. 若必须跨 shadow 调用，验证 `ctx.get` 的 active/disposal 语义。

**完成信号**：没有未声明服务的属性读取；缺失后端有显式降级/失败；真实拓扑测试通过。

**失败处理**：若属性代理抛 “without inject”，先判断是硬依赖漏声明还是可选读取；前者补 `inject`，后者改 `ctx.get`，不要用 try/catch 吞。

**例外**：已声明 injection 的服务继续用 `ctx.<name>`；不要把所有读取都改成 `ctx.get` 而丢失依赖等待。

**迁移裁剪**：非 Cordis 框架映射为“声明的依赖注入 vs 容器探测”；保留“可选能力不得伪装成硬依赖，也不得用拓扑敏感代理”的判定。

**证据与限制**：事故和教程是强证据；真实 Loader 测试是验证。静态代码搜索无法证明 fiber 拓扑。

来源：deepseek-harness/packages/AGENTS.md:6-6@687f282e 来源：deepseek-harness/docs/postmortem/0001-acp-default-export-drops-inject.md:56-88@687f282e 来源：deepseek-harness/docs/postmortem/0001-acp-default-export-drops-inject.md:89-99@687f282e 来源：deepseek-harness/docs/cordis-tutorial/03-services.md:56-65@687f282e

<a id="engineering-typed-events"></a>
## 14. 类型化事件、分派模式与 waterfall 契约（engineering-typed-events）

**触发**：新增事件、修改 payload、实现 listener、选择 emit/waterfall/parallel/serial/bail、生成事件目录。

**角色与前置**：Service owner 用 declaration merging 声明事件；listener 作者遵守 `next()`；评审者检查分派模式与 JSDoc。

**【源仓义务】**
- 类型化事件用 declaration merging 和可合并扩展的 map；事件 JSDoc 必须有 `@mode`，payload 参数有 `@param`；公共 service 方法记录参数和非 void 返回。`deepseek-harness/AGENTS.md:134-134@687f282e`
- 分派模式是事件公共契约的一部分：`emit` 不 await、按注册顺序观察、无返回；`waterfall` 不 await、有返回；`parallel` await、并行；`serial` await、按顺序且有返回；`bail` 不 await、按顺序直到一个 listener bail 并有返回。新事件用 `@mode` 让生成目录核对声明；运行时分派点仍需测试证明。`deepseek-harness/docs/cordis-primer.md:12-12@687f282e； deepseek-harness/docs/cordis-primer.md:15-27@687f282e`
- 目录 freshness 是自动门禁：`deepseek-harness/package.json:163-163@687f282e` 的 `verify-cordis-catalog` 运行 `deepseek-harness/scripts/gen-cordis-catalog.ts --check`。生成器头声明投影强制 event mode、JSDoc 参数/返回完整性和签名类型链接覆盖；`deepseek-harness/scripts/gen-cordis-catalog.ts:1119-1170@687f282e` 对每个 service/event scope 做双向 fail-closed 分区检查；`deepseek-harness/scripts/gen-cordis-catalog.ts:1280-1291@687f282e` 对全部 generated artifact 做字节 freshness 失败。生成 region 同时更新双语 pair 与 `.i18n.yaml`，但仅当 region 外无变化（`deepseek-harness/scripts/gen-cordis-catalog.ts:1-18@687f282e`）。
- waterfall 是 around-middleware：listener 收到 `(...args, next)`；调用 `next()` 委托可能被包装的结果，不调用就短路；值通过 `next()` 返回传播；合作式 listener 通常改共享请求/决策对象再委托；只有必须早于普通注册时才用 `prepend: true`。`deepseek-harness/docs/cordis-primer.md:29-35@687f282e`
- 单决策事件短路是设计：拥有决策的 policy listener 可不调用 `next()`；只注解/观察的 listener 必须委托。`deepseek-harness/docs/cordis-primer.md:29-35@687f282e`
- `agent/pre-step`、`agent/request`、`llm/stream`、三个 `tools/*` 是 waterfall，listener 必须 `next()`；`agent/turn-stopping` 是 serial 且没有 `next()`。`deepseek-harness/docs/architecture.md:106-106@687f282e`

**步骤**
1. 在拥有包里用 map→union 声明事件与 payload；写 `@mode` 和 `@param`。
2. 选择分派语义；在事件目录/代码中保持声明与调用点一致。
3. listener 只注解就 `next()`；拥有决策才短路；需要先运行用 `prepend: true` 并说明。
4. 为顺序、短路、异常隔离写测试；生成目录 freshness 门禁。

**完成信号**：事件目录与分派点一致；waterfall listener 不丢 `next()`；payload 类型由声明合并扩展；短路有明确 owner。

**失败处理**：若 listener 静默短路，检查是否漏 `next()`；若是策略决定，文档化 owner 和决策语义。

**例外**：`agent/turn-stopping` 是 serial，不使用 `next()`；只观察的 listener 在 serial 中按顺序执行。

**迁移裁剪**：事件框架不同则映射“声明合并/map→union/分派模式”；保留“模式是公共契约 + around-middleware 必须委托”的规则。没有生成目录时，用等价的、可失败的测试/类型检查替代 freshness；若没有等价检查，把它列为前置条件或阻塞，并记录缺口与再激活触发（例如引入生成器或事件目录）。

**证据与限制**：生成目录门禁可自动核对 event mode、JSDoc 完整性、类型链接、分区覆盖与字节 freshness；它不核对运行时分派点，顺序/短路仍需测试。仅类型/目录正确不证明 waterfall 语义正确。

来源：deepseek-harness/AGENTS.md:134-134@687f282e 来源：deepseek-harness/docs/cordis-primer.md:12-12@687f282e 来源：deepseek-harness/docs/cordis-primer.md:15-27@687f282e 来源：deepseek-harness/docs/cordis-primer.md:29-35@687f282e 来源：deepseek-harness/docs/architecture.md:106-106@687f282e 来源：deepseek-harness/docs/architecture.md:67-77@687f282e 来源：deepseek-harness/package.json:163-163@687f282e 来源：deepseek-harness/scripts/gen-cordis-catalog.ts:1-18@687f282e 来源：deepseek-harness/scripts/gen-cordis-catalog.ts:1119-1170@687f282e 来源：deepseek-harness/scripts/gen-cordis-catalog.ts:1188-1259@687f282e 来源：deepseek-harness/scripts/gen-cordis-catalog.ts:1280-1291@687f282e

**补充来源坐标：**
- `engineering-typed-events`：`deepseek-harness/scripts/gen-cordis-catalog.ts:1188-1259@687f282e`
