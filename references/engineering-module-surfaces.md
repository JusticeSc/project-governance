# 模块表面：导出形态、源/产物平面与包边界

本页拥有包对外暴露什么、在哪个平面被解析和编译：§12 插件导出形态（四件套 vs 服务默认导出）、§22 源平面 vs 产物平面、§23 显式编译面与 Host/Client 聚合隔离、§24 包形态与标准导出键、§26 禁止新增 resolve hook、§27 包源码禁止模块级 await。触发：改插件 `src/index.ts`、把 helper 暴露给测试、加 `/client` 导出或使用 default export；跑静态门禁/测试、局部开发、构建、依赖解析、发布 smoke 或 clean checkout；新增包、拆分 Host/Client、改 tsconfig、写 repo-wide `ts.Program` 脚本或 Project Reference；新增 Node loader `resolve` hook；包 `src/**/*.ts|tsx` 出现 `await`/`for await`/`await using`。读本页前先读 [§0 使用约定与证据边界](engineering.md#0-使用约定与证据边界)。

<a id="engineering-plugin-export-forms"></a>
## 12. 插件导出形态：四件套 vs 服务默认导出（engineering-plugin-export-forms）

**触发**：新增/修改插件 `src/index.ts`；把 helper 暴露给测试；为 `/client` 加导出；使用 default export。

**角色与前置**：插件作者选择两种形态之一；评审者检查 Loader 的 `unwrapExports` 行为；测试作者用同包相对导入而非扩大公共 API。

**【源仓义务】**
- **Function plugin** 命名导出 `name`、`inject`、`Config`、`apply`：`name`/`inject`/`apply` 小写，`Config` 大写且同时是 `interface` 和 Schemastery schema 值；不得再有 default export。**Service plugin** 默认导出 service class，由 Loader 加载；在四件套旁加 default 会让 Loader 丢弃 function plugin 的 namespace。`deepseek-harness/docs/defensive-patterns/package-surface.md:7-43@687f282e`、`deepseek-harness/packages/AGENTS.md:5-5@687f282e`
- Host entry 除四件套外，只可导出其他包需要 extend/throw 的 Service Definition class 和 error type；绝不导出 test-convenience value。`deepseek-harness/docs/defensive-patterns/package-surface.md:7-43@687f282e`
- `/client` entry 更严格：只导出 cordis 加载需要的值（`apply`/`inject`/`Config`），以及组件 type-only 消费的 store factory 返回类型；实现组件、helper、常量、store handle 保持内部。新增值导出需要用户签字，而不是“有消费者”即可。`deepseek-harness/packages/client/AGENTS.md:34-40@687f282e`
- 同包测试直接相对导入 `../src/...`（或 `./src/*` subpath），不要为测试扩大公共 API；fixture 不得用相对路径进入另一个包的 `src`（绕过 exports map 和包边界检查）。`deepseek-harness/docs/defensive-patterns/package-surface.md:7-43@687f282e`、`deepseek-harness/packages/client/AGENTS.md:34-40@687f282e`
- **事故证据**：`export default apply` 让 Cordis `unwrapExports` 取到裸函数，丢掉 `inject`/`name`/`Config`，插件在无注入的 fiber 中运行并崩溃；178 个单测和 100% 覆盖率未发现，因为测试手工 `ctx.plugin({name,inject,apply})` 绕过了 Loader。`deepseek-harness/docs/postmortem/0001-acp-default-export-drops-inject.md:27-55@687f282e； deepseek-harness/docs/postmortem/0001-acp-default-export-drops-inject.md:89-99@687f282e`
- `verify-export-jsdoc` 把 `Config`/`inject`/`name`/`reusable`/`apply` 视为插件协议槽，允许其免于普通导出 JSDoc 规则；这也是形态的一部分。`deepseek-harness/scripts/verify-export-jsdoc.ts:16-21@687f282e； deepseek-harness/scripts/verify-export-jsdoc.ts:278-313@687f282e`

**步骤**
1. 选定形态；function plugin 只写四件套，service plugin 只 default export。
2. 检查 `src/index.ts` 无第五个值导出、无 default + 四件套混用。
3. `/client` 只保留加载必需值和类型；测试改相对导入。
4. 加真实 Loader 组合测试：通过 `cordis.yml`/profile 启动，断言 `inject` 生效；对无 inject 的 bundle 插件加 `expect('default' in mod).toBe(false)` 和 `unwrapExports` round-trip（见 Testing 域）。
5. 为回归证明：临时加回 default export 应使测试变红。

**完成信号**：Loader 加载路径测试通过；入口无多余值；测试不靠公共 API；`default` 不存在于 function plugin。

**失败处理**：若测试需要内部 helper，改测试导入路径；若 Loader 加载失败，检查 `unwrapExports` 与 namespace，而不是加 fallback。

**例外**：Host entry 的 Service Definition class/error type 是预期导出；内部模块/helper/hook 仍可导出值。`deepseek-harness/docs/defensive-patterns/package-surface.md:7-43@687f282e`

**迁移裁剪**：非 Cordis Loader 也要明确“插件的模块形态与加载器解包规则”；把“四件套/默认导出”映射为目标框架的注册契约，但保留“不要混用两种形态”和“测试不扩大公共 API”。

**证据与限制**：真实 Loader 测试是必要证据；仅 typecheck/单测不覆盖加载路径。`verify-export-jsdoc` 只覆盖文档，不覆盖形态。

来源：deepseek-harness/docs/defensive-patterns/package-surface.md:7-43@687f282e 来源：deepseek-harness/packages/AGENTS.md:5-5@687f282e 来源：deepseek-harness/packages/client/AGENTS.md:34-40@687f282e 来源：deepseek-harness/docs/postmortem/0001-acp-default-export-drops-inject.md:27-55@687f282e 来源：deepseek-harness/docs/postmortem/0001-acp-default-export-drops-inject.md:89-99@687f282e 来源：deepseek-harness/scripts/verify-export-jsdoc.ts:16-21@687f282e 来源：deepseek-harness/scripts/verify-export-jsdoc.ts:278-305@687f282e

<a id="engineering-source-artifact-plane"></a>
## 22. 源平面 vs 产物平面（engineering-source-artifact-plane）

**触发**：静态门禁/测试、局部开发、构建、依赖解析、Typert 生成、发布 smoke、clean checkout。

**角色与前置**：门禁作者声明消费源还是构建产物；开发者按 surface 选命令；CI 拥有完整构建。

**【源仓义务】**
- 模块系统契约：全仓 ESM（`"type": "module"`）；跨包 import 用包名，局部相对 import 带 `.ts`；配置子进程用构建后的 `lib/` 在 plain Node 运行，源回归用声明的 launcher；`dsh` source launch 走 `node --import tsx/esm`，其可达模块必须保持 ESM（不得有 CJS-only exports），因为 engines 范围内不能用 Node 原生 TypeScript 模式。`deepseek-harness/AGENTS.md:132-132@687f282e`
- 静态分析与测试通过 base `paths` 把 workspace import 解析到 `src`，必须在 clean tree 通过；消费 built `lib/` 的门禁必须显式声明该依赖。`deepseek-harness/AGENTS.md:147-147@687f282e`、`deepseek-harness/docs/development.md:110-110@687f282e`
- 测试解析只走源码平面：每个 vitest config 指向 `tsconfig.base.json`；裸 workspace import 解析到 `src`，绝不通过 package `exports` 到 built `lib/`——陈旧产物会加载第二个 module singleton。`deepseek-harness/docs/testing.md:43-46@687f282e`
- 构建/检查命令按目的选择：迭代源码用 `build:artifacts`；检查 tests/scripts/benchmarks/website 用最新构建后的 `build:check`；声明 TS 完成前用 `build:check` 或 `build`；完整验证用 `build`；无 Web/Desktop 产物的类型检查用 `typecheck`。`deepseek-harness/docs/development.md:91-103@687f282e`
- `build:artifacts` 按生成依赖顺序：native → Host tsc → Host tsdown（内含 Typert）→ Desktop bundle → Client tsc → Client tsdown → Web。`build:check` 只并发跑 `tsc -p tsconfig.host.json` 与 `tsc -p tsconfig.client.json`，读磁盘上已有声明，不编译 reference；缺产物表现为编译错误。`build` 把两组步骤作为一个调度依赖图。`deepseek-harness/docs/development.md:77-90@687f282e`
- `build`/`build:artifacts` 把 root package version、七位 source commit、Git 本地改动 dirty marker 嵌入客户端产物，并写 gitignored record；release packing 和 built Web tests 拒绝缺失 record 或被后续部分构建改动的产物。`deepseek-harness/docs/development.md:108-108@687f282e`
- Typert 从 Host 类型生成 Host 反射和 Host-for-Client Remote 投影；Client tsdown 不启动 Typert；`generate-typert.ts` 无 bundle 运行同一生成并写 byte-identical 文件；bundle-free pass 只从 source 读 workspace 包，若 Host program 会加载 `lib/` 则失败并命名需补的 import/paths alias。`deepseek-harness/docs/development.md:106-106@687f282e`
- 本地 workspace specifier 必须通过 `paths` 到 `.ts`/`.tsx`；解析到 `lib`/`.d.ts` 是产物回退，clean checkout 会坏。`deepseek-harness/scripts/verify-cordis-config.ts:413-448@687f282e`

**步骤**
1. 给每个门禁标注 plane：source / built-lib / mixed-but-explicit。
2. 源测试只解析 `src`；构建后 smoke 才用 `lib`，并声明需要 `build`。
3. 日常开发用 `build:artifacts`；完成前 `build:check`；发布/完整验证用 `build`。
4. 生成器（Typert/module graph/config catalog）从 source 运行，输出 freshness 检查。
5. 检查 clean checkout：删除 `lib`/`dist`/tsbuildinfo 后跑源门禁。

**完成信号**：clean tree 源门禁通过；产物门禁显式依赖 build；构建 record 绑定版本/commit/dirty；无“本地有陈旧 lib 才过”的门禁。

**失败处理**：若源门禁依赖构建，补 `paths` 或把门禁标为 built-lib；不要用已有 `lib` 掩盖。若 build record 缺失，重跑完整 build。

**例外**：生成的 Host-for-Client Remote 声明是显式例外：公共 `typecheck`/`lint`/`doc-typecheck` 先生成它们；内部 `*:contracts-ready` 假定调度器已依赖 Typert 生成。`deepseek-harness/docs/development.md:110-110@687f282e`

**迁移裁剪**：目标构建系统不同则映射“源码解析优先 + 产物显式消费 + 生成物 freshness + 构建身份记录”。没有生成器的项目可省略 Typert 部分，但必须先确认确实没有生成物/freshness 边界并记录该判断；一旦引入生成器，恢复 source/artifact 分离与 freshness 检查，不能把“当前没有生成器”当成永久豁免。

**证据与限制**：`build:check`/`typecheck`/clean checkout 是自动证据；它们不证明发布包内容（由 hygiene/publint/smoke 负责）。

来源：deepseek-harness/AGENTS.md:132-132@687f282e 来源：deepseek-harness/AGENTS.md:147-147@687f282e 来源：deepseek-harness/docs/development.md:59-110@687f282e 来源：deepseek-harness/docs/testing.md:43-46@687f282e 来源：deepseek-harness/scripts/verify-cordis-config.ts:413-448@687f282e 来源：deepseek-harness/package.json:23-23@687f282e 来源：deepseek-harness/package.json:61-61@687f282e

**补充来源坐标：**
- `engineering-source-artifact-plane`：`deepseek-harness/docs/development.md:59-110@687f282e`

<a id="engineering-compiler-faces"></a>
## 23. 显式编译面与 Host/Client 聚合隔离（engineering-compiler-faces）

**触发**：新增包、拆分 Host/Client、改 tsconfig、repo-wide `ts.Program` 脚本、Project Reference。

**角色与前置**：包作者把包注册到恰好一个聚合；face owner 维护 leaf configs；脚本作者从 face 聚合 seed，不用 root solution。

**【源仓义务】**
- Host 与 Client 是两个隔离聚合：普通包只在 `tsconfig.host.json` 或 `tsconfig.client.json` 之一；三个共享 leaf（`host/webserver`、`compaction/compaction`、`typert/registry`）被两边引用以 type-check 同一源码。`deepseek-harness/docs/development.md:59-59@687f282e`
- 分成两个聚合的原因：两边都在相同 key 上 declaration-merge cordis `Context`，一个 program 同时看到两种 merge 会报冲突；冲突只在 `ts.Program` 内，模块解析不触发，所以 solution 可引用两个聚合，一个 paths facade 可跨两边。`deepseek-harness/docs/development.md:69-69@687f282e`
- 三条纪律：`tsconfig.base.json` 永不加 `include`/`files`（会泄漏到每个扩展包并收窄 facade 的 match-all）；repo-wide `ts.Program` 脚本显式 seed `tsconfig.host.json` 或 `tsconfig.client.json`，绝不用 root solution；新包只注册到一个聚合，只有六个 split 包带两个 leaf config，共享 leaf 两边注册。`deepseek-harness/docs/development.md:71-75@687f282e`
- 六个 split 包：`api/remotes`、`api/gateway`、`api/session-controller`、`api/workspace-controller`、`client/connection`、`session-query/session-log-export`；split 包根 `tsconfig.json` 只是 solution，两个聚合并直接消费者分别引用 `tsconfig.host.json`/`tsconfig.client.json`。`deepseek-harness/docs/development.md:75-75@687f282e`
- `tsconfig.base.client.json` 提供浏览器 compiler 设置（`jsx: react-jsx`、DOM libs、`types: [client-build-environment]`），由 Client 聚合和每个 `packages/client/*` 扩展。`deepseek-harness/tsconfig.base.client.json:1-12@687f282e`
- `constraints` 门禁遍历可达 Project Reference 图，检查每个引用项目自己的 compiler face：单 config target 从任一边引用都有效；split target 必须引用与遍历起点匹配的 `tsconfig.<face>.json`；从无 face 的 config 进入 split project 失败。`deepseek-harness/scripts/project-reference-faces.ts:1-129@687f282e`、`deepseek-harness/scripts/check-workspace-constraints.ts:649-659@687f282e`
- `faceConfigs`/`TypeScriptProject` 只从 `tsconfig.<face>.json` seed 并递归 references；根 solution 永远不是 program。`deepseek-harness/scripts/ts-project.ts:1-120@687f282e`

**步骤**
1. 判断包属于 Host、Client 还是真 split；普通双入口 Client 插件仍是一个 Client 包，不拆。
2. 在恰好一个聚合 references 里注册；split 包建 solution-only root + 两个 leaf config。
3. 包 tsconfig 继承 base（Client 继承 base.client），设 `rootDir: src`/`outDir: lib/types`，references workspace 依赖。
4. repo-wide 脚本用 `faceConfigs`/`TypeScriptProject` 从 face seed；禁止 flatten root。
5. 运行 `constraints` + `tsc -b`；修复 face mismatch。

**完成信号**：每个包只在一个聚合（除声明共享/split）；base 无 include/files；脚本不 seed root；`constraints` 绿；两个聚合各自可编译。

**失败处理**：若 Context merge 冲突，检查是否把 Host+Client flatten 进一个 program；拆分或改用 face 聚合。若 split target 被错引用，按 face 选择 leaf。

**例外**：六个 split 包和三个共享 leaf 是显式例外；`api/remotes` 的 Host entry 参与 Host Typert graph，Client entry import 生成的 `/remote` 声明。`deepseek-harness/docs/development.md:75-75@687f282e`

**迁移裁剪**：目标没有 declaration merging 冲突时可合并聚合，但保留“显式 face + 一个包一个 face + 脚本不 flatten”的可维护性。若没有 Project References，用等价的模块边界检查；该检查必须能拒绝跨 face 泄漏，否则把它列为前置条件或阻塞，并记录缺口与再激活触发。

**证据与限制**：`constraints`/tsc 是自动证据；它们不证明运行时分包正确（由 build/bundle 检查负责）。

来源：deepseek-harness/tsconfig.base.json:1-29@687f282e 来源：deepseek-harness/tsconfig.client.json:1-30@687f282e 来源：deepseek-harness/tsconfig.base.client.json:1-12@687f282e 来源：deepseek-harness/AGENTS.md:148-148@687f282e 来源：deepseek-harness/docs/development.md:59-75@687f282e 来源：deepseek-harness/scripts/project-reference-faces.ts:1-129@687f282e 来源：deepseek-harness/scripts/ts-project.ts:1-120@687f282e 来源：deepseek-harness/scripts/check-workspace-constraints.ts:649-659@687f282e 来源：deepseek-harness/tsconfig.host.json:220-223@687f282e 来源：deepseek-harness/tsconfig.host.json:533-536@687f282e 来源：deepseek-harness/tsconfig.client.json:47-53@687f282e 来源：deepseek-harness/tsconfig.client.json:65-75@687f282e 来源：deepseek-harness/tsconfig.client.json:155-155@687f282e

**补充来源坐标：**
- `engineering-compiler-faces`：`deepseek-harness/tsconfig.base.json:1-29@687f282e`、`deepseek-harness/tsconfig.client.json:1-30@687f282e`、`deepseek-harness/AGENTS.md:148-148@687f282e`

<a id="engineering-package-shape-exports"></a>
## 24. 包形态与标准导出键（engineering-package-shape-exports）

**触发**：新增包、改 package.json、加 export subpath、改构建输出、加 `/client`。

**角色与前置**：包作者选择 Host 或 Host+Client 形态；评审者检查是否有第三种形态或手写 external/roster。

**【源仓义务】**
- 新包只有两种形态：Host 包，或 Host+Client 包；两者都是 dynamic plugin package，无第三种、无例外。静态 client 库（`client-store`、`ui-slots`、`ui-primitives`、`ui-dockkit`）和 `packages/util/` 零依赖库是历史封闭集合，新包不得加入。`deepseek-harness/docs/defensive-patterns/package-surface.md:45-73@687f282e`
- 只有真正双面包拆 compiler faces；构建输出到 `lib`；`include`、`external`、roster 列表由扫描 workspace 派生，不手写。`deepseek-harness/docs/defensive-patterns/package-surface.md:45-73@687f282e`
- 包 manifest 不变量（`constraints`）：`private: true`（发布成员例外）、版本匹配 root、`type: module`、`main: lib/index.js`、`types: lib/types/index.d.ts`、`exports["."].types`/`.default` 精确、`@deepseek-ai/cordis` 同时在 peer+dev 且同范围、`files` 精确、`src/types.ts` 只类型。`deepseek-harness/docs/cookbook/adding-a-package.md:7-40@687f282e`、`deepseek-harness/scripts/check-workspace-constraints.ts:420-542@687f282e`
- 包层次严格为 `packages/<group>/<pkg>`；group 目录不得有 package.json；包不得更深嵌套。`deepseek-harness/scripts/check-workspace-constraints.ts:551-570@687f282e`
- `exports` 只用标准键集，每个键仓库级一个含义：`.`、`./package.json`、`./src/*`、`./client`、`./types`、`./typert`、`./remote`、`./locale/*.json`、`./cordis.patch.yml`。集合外的键（`./brand`、`./worker`、`./startup` 等）没有文档化含义，是待评审，不是可复制先例。新增键要先改拥有文档和检查，再落地，并获 domain owner 确认。`deepseek-harness/docs/defensive-patterns/package-surface.md:75-113@687f282e`
- Client 插件包还需 `dsh.client`、`./client` export、`tsconfig.base.client.json`、共享 tsdown preset；新包 checklist 的三个注册面（tsconfig 聚合、`packages/bundle/web-app/cordis.patch.yml`、bundle dependency）缺一会在不同后期点失败。`deepseek-harness/packages/client/AGENTS.md:142-152@687f282e`、`deepseek-harness/docs/cookbook/adding-a-package.md:31-40@687f282e`
- Client 新包 bring-up：`dsh.client` 必须同时有 `./client`；`platform: 'web'`；`immediately: true` 只给 stage-one-prefetch 基础设施；`dsh.client.inject` 只是 informational package edge，不排序 activation；非 baseline `external` 会序列化其动态 supplier；改 bundle 后先重建再 probe live `dsh web`。注册到别的包的 slot 用 `ctx.slots.inject(name, () => ctx.slots.register(...))`，裸 `slots.register` 到未声明 slot 仍是错误；多个注册需要原子回滚时返回 generator。`deepseek-harness/packages/client/AGENTS.md:145-161@687f282e`
- Client 包的 published payload 必须闭合：每个相对 runtime import 和 emitted asset 都要被 `files` 覆盖；仓库 publint pass 检查精确 publication view。`deepseek-harness/packages/client/AGENTS.md:71-71@687f282e`
- `verify-package-meta` 是资源/发布面的自动门禁：扫描 `packages/*/*/package.json`（空语料直接失败），从源 JSON（排除 `node_modules`/`lib`/`tests`）解析 `meta`；locale 资源必须经 exports 解析到源 JSON、以 `en.json` 为 baseline、与英文同目录、被 `files` 覆盖；display manifest/icon 也必须解析到源 JSON 而非 built `lib`；`@deepseek-ai/dsh-*` 的 SVG 必须是 36×36、SVG namespace、仅自包含 geometry、无 script/style/image/foreignObject/text/animation、唯一 id、无 `on*` handler、`href`/`url(...)` 只引用本地 id；嵌套 package 拥有未声明资源，但外层显式 exports 仍要校验。`deepseek-harness/scripts/verify-package-meta.ts:1-285@687f282e`
- `verify-client-packages` 是 Client 包形态自动门禁：每个 client 包必须是 dynamic `dsh.client` 或 `staticLinked` 之一，不能两者都有或都没有；`PLATFORM_MODULES` seeded workspace module 的 owner 必须使用 staticLinked preset；parser-preloaded external 必须有 dynamic `dsh.client` row 和对应 `PARSER_PRELOAD_IDS` row；`dsh.client` 的 external/inject 数组不得为空或重复，external 不得重复 baseline、不得命名自己的 row、feature 包不得请求 runtime external（只共享类型或注入 Cordis service）、必须有生产 runtime import/re-export、supplier 必须存在且无循环；malformed `dsh.client` 对象/数组失败。`deepseek-harness/scripts/verify-client-packages.ts:1-713@687f282e`

**步骤**
1. 选两种形态之一；不要创建静态链接包或第三种 tsconfig。
2. 用标准 manifest 字段和 `files`；让 `include`/`external`/roster 由扫描派生。
3. 只加标准 export 键；需要新键时先改文档/检查并获 owner 确认。
4. 新包加入现有 group；目录严格两层。
5. Client 包补齐三个注册面和 `dsh.client`。

**完成信号**：`constraints`/`verify-client-packages` 绿；manifest 字段精确；无手写派生列表；新增 export 键经过标准键集合评审（该集合没有完整自动 allowlist，不能把 constraints 绿当成键集合已证明）。

**失败处理**：若构建需要手写 external，先修扫描或包形态；不要用局部配置绕过。新增键被拒时改公共 API 或把内部路径留作 internal。

**例外**：已存在的非标准键是待评审遗留，不是新先例；真正需要时按“改文档 + 检查 + owner 确认”处理。`deepseek-harness/docs/defensive-patterns/package-surface.md:75-113@687f282e`

**迁移裁剪**：目标包管理器不同则映射等价 manifest 不变量；保留“两种形态 + 派生列表 + 标准导出键评审”。没有 client/server 分包的项目可省略 `/client`，但不得把“省略 `/client`”外推成“export 键随便加”；没有自动 allowlist 时把键集合评审列为必需证据，并记录缺口与再激活触发（例如引入 manifest schema 检查）。

**证据与限制**：`constraints`/client gate 是自动证据；它们只精确校验根 `exports["."].types`/`.default`、`files` 派生和 `/client` 声明，**不校验完整标准键集合**；`verify-package-meta` 已读全文（`deepseek-harness/scripts/verify-package-meta.ts:1-285@687f282e`），校验 locale/icon/resource export 与 `files`；`verify-client-packages` 已读全文（`deepseek-harness/scripts/verify-client-packages.ts:1-713@687f282e`），校验 client 包形态与 external/supplier 图；两者都不证明运行时 client boot，也不校验完整标准键集合。publint 是通用包 lint。标准键集合目前主要靠评审（源仓明确说计数不写死）；新增键的兼容性仍需消费者测试。

来源：deepseek-harness/docs/defensive-patterns/package-surface.md:45-73@687f282e 来源：deepseek-harness/docs/defensive-patterns/package-surface.md:75-113@687f282e 来源：deepseek-harness/packages/client/AGENTS.md:71-71@687f282e 来源：deepseek-harness/packages/client/AGENTS.md:142-152@687f282e 来源：deepseek-harness/packages/client/AGENTS.md:145-161@687f282e 来源：deepseek-harness/docs/cookbook/adding-a-package.md:7-40@687f282e 来源：deepseek-harness/scripts/verify-package-meta.ts:1-285@687f282e 来源：deepseek-harness/scripts/verify-client-packages.ts:1-713@687f282e 来源：deepseek-harness/scripts/check-workspace-constraints.ts:362-381@687f282e 来源：deepseek-harness/scripts/check-workspace-constraints.ts:420-542@687f282e 来源：deepseek-harness/scripts/check-workspace-constraints.ts:551-570@687f282e

<a id="engineering-resolve-hook-ban"></a>
## 26. 禁止新增 resolve hook（engineering-resolve-hook-ban）

**触发**：新增 Node loader `resolve` hook、包装已有 hook、为某个 specifier 改解析、修源/产物混合。

**角色与前置**：改动者证明两个前置条件同时成立；domain owner 确认；作者自判“这个 case 特殊”不算确认。

**【源仓义务】**
- 新 `resolve` hook 默认拒绝——是明确禁止，不是“尽量避免”。包括包装已有 hook 且重写同一 specifier 的等价形态。`deepseek-harness/docs/defensive-patterns/package-surface.md:188-225@687f282e`
- 真正需要时两个前置条件同时成立：整体重新审计 resolve 策略（解析、热重载、插件管理职责一起，而不是只补当前 specifier）；domain owner 在落地前确认。`deepseek-harness/docs/defensive-patterns/package-surface.md:188-225@687f282e`
- 唯一解析路径是 `dsh` source launch 注册的 tsx ESM hook；其理由在 source-launch Agent Note。`deepseek-harness/docs/defensive-patterns/package-surface.md:188-225@687f282e`、`deepseek-harness/.agents/notes/implemented/architecture/2026-07-29-dsh-source-launch-tsx-esm.md:15-23@687f282e`
- 源仓选择 `node --import tsx/esm`：tsx 的 ESM-only hook 同时负责 TypeScript transform 和 tsconfig `paths`；CJS hook 关闭因为 CLI source graph 是 ESM-only。tsx 不检查 importer 是否声明了 runtime dependency，声明完整性由静态门禁承担。`deepseek-harness/.agents/notes/implemented/architecture/2026-07-29-dsh-source-launch-tsx-esm.md:15-23@687f282e`

**步骤**
1. 先问是否能用现有 `paths`/包导出/构建修复；能用则不新增 hook。
2. 若仍需要，写整体解析策略审计（解析、HMR、插件管理）和 owner 确认。
3. 把确认记录链接到 change；只在此后加 hook。
4. 为解析行为加 smoke，并证明没有把 `src` 与 `lib` 混用。

**完成信号**：没有新 hook；或有两个前置条件记录 + owner 确认 + 全链路审计。

**失败处理**：若只是某个 specifier 不解析，补 `paths`/manifest/构建，不加 hook。

**例外**：仅上述两个前置条件同时成立；没有“这个 case 特殊”例外。

**迁移裁剪**：任何运行时都有解析层；保留“默认禁止新增解析分支 + 整体审计 + owner 确认”。若目标用原生解析且没有 hook/loader 分支，规则可以记录为不适用，但必须实际核验运行时的解析入口与扩展点；一旦引入 hook、alias 或虚拟请求，恢复禁令与整体审计，并保留再激活记录。

**证据与限制**：评审为主；没有自动门禁。解析 smoke 可证明现有路径，不证明未来 hook 安全。

来源：deepseek-harness/docs/defensive-patterns/package-surface.md:188-225@687f282e 来源：deepseek-harness/.agents/notes/implemented/architecture/2026-07-29-dsh-source-launch-tsx-esm.md:15-24@687f282e

**补充来源坐标：**
- `engineering-resolve-hook-ban`：`deepseek-harness/.agents/notes/implemented/architecture/2026-07-29-dsh-source-launch-tsx-esm.md:15-24@687f282e`

<a id="engineering-no-top-level-await"></a>
## 27. 包源码禁止模块级 await（engineering-no-top-level-await）

**触发**：包 `src/**/*.ts|tsx` 出现 `await`、`for await`、`await using`；写模块初始化；可执行文件/`bin`。

**角色与前置**：模块作者把异步工作放进被调用的函数（显式 `main()` 并自己处理 rejection）；门禁解析 AST。

**【源仓义务】**
- 包源模块不得在模块作用域使用 `await`、`for await`、`await using`：模块级等待会让每个 importer 的求值等待，把 rejection 变成模块求值失败，且无法降级到 browser-worker image 的同步 CommonJS wrapper。`deepseek-harness/docs/defensive-patterns/package-surface.md:226-231@687f282e`
- 异步工作放进函数里调用，例如显式 `main()` 并自己处理 promise 失败。`deepseek-harness/docs/defensive-patterns/package-surface.md:226-231@687f282e`
- 门禁解析 `packages/*/*/src/**/*.{ts,tsx}`；只按声明排除可执行文件：源码以 `#!` 开头，或该源是包 `bin` 字段命名的 `lib/` 输出的源。`deepseek-harness/scripts/verify-no-top-level-await.ts:1-22@687f282e； deepseek-harness/scripts/verify-no-top-level-await.ts:64-97@687f282e`
- 门禁证明 corpus 完整：空 corpus、无 `.tsx`、漏掉任何含 TS 源但不在 corpus 的包 `src/` 都抛错，防止“扫少了所以通过”。`deepseek-harness/scripts/verify-no-top-level-await.ts:179-233@687f282e`
- 检测覆盖 `await` 表达式、带 `await` 的 `for...of`、`await using`；函数体/参数内的 await 不算模块级；method 的 computed name/decorator 仍在模块级。`deepseek-harness/scripts/verify-no-top-level-await.ts:100-177@687f282e`

**步骤**
1. 把模块初始化异步逻辑移到 `main()`/`start()`；在调用处 catch/report。
2. 可执行文件用 shebang 或 `bin` 声明排除，不要靠路径特判。
3. 运行 `verify-no-top-level-await`；确认 corpus 计数覆盖所有包。
4. 新增包时确保 glob 能覆盖；门禁会因漏包而红。

**完成信号**：门禁绿；corpus 覆盖所有包；没有 `await` 在模块顶层；可执行排除有声明。

**失败处理**：若门禁报空 corpus/漏包，修 glob/包结构，不要缩小扫描；若报违规，移动代码到函数。

**例外**：shebang 源、包 `bin` 命名的构建输出源；仅此两类。`deepseek-harness/scripts/verify-no-top-level-await.ts:64-97@687f282e`

**迁移裁剪**：映射到目标语言的模块求值规则；若语言允许 top-level await 且经验证不影响 importer/打包，可记录为不适用，但必须用 importer/打包证据证明这一点，并保留“异步启动显式化 + 失败处理”。一旦引入异步初始化或打包器对求值顺序敏感，恢复禁令与负向样例，不能只凭语言允许就豁免。

**证据与限制**：门禁自动且负向测试覆盖；它只检查语法位置，不证明初始化逻辑正确。

来源：deepseek-harness/docs/defensive-patterns/package-surface.md:226-231@687f282e 来源：deepseek-harness/scripts/verify-no-top-level-await.ts:1-22@687f282e 来源：deepseek-harness/scripts/verify-no-top-level-await.ts:64-97@687f282e 来源：deepseek-harness/scripts/verify-no-top-level-await.ts:100-177@687f282e 来源：deepseek-harness/scripts/verify-no-top-level-await.ts:179-233@687f282e 来源：deepseek-harness/scripts/verify-no-top-level-await.ts:234-267@687f282e
