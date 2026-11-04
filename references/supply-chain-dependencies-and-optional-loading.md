# 依赖面、可选依赖、消费者目录与依赖更新（supply-chain §4、§8、§16、§22）

本页触发：声明或移动依赖、把包标为可选（含 optional peer）、维护消费者依赖目录、响应 Dependabot 更新，或排查共享实例与重复安装时，先读本页。共同使用约定：证据基线、证据标记（源义务／源事实／迁移设计／建议／未验证）与源仓库只读边界见入口页 [supply-chain.md](supply-chain.md)；本页 `deepseek-harness/<path>:<start>-<end>@687f282e` 引用指向固定提交 `687f282e`，文中命令是源仓库已有做法，不表示在迁移目标已运行。

本页机制：[`supply-chain-dependency-faces`](#sc-dependency-faces)、[`supply-chain-optional-deps`](#sc-optional-deps)、[`supply-chain-dependency-catalog`](#sc-dependency-catalog)、[`supply-chain-dependency-updates`](#sc-dependency-updates)。领域入口：[supply-chain.md](supply-chain.md)。

<a id="sc-dependency-faces"></a>
## 4. 四个依赖面：按源码使用事实推导

### 4.1 源义务

`verify-package-dependencies.ts` 不是"禁止任意两段重复"的简单规则，而是先推导每个依赖**应属于哪一段**，再要求实际声明精确等于推导结果。

期望段推导（`expectedPackageDependencies`）：

- `@deepseek-ai/cordis` 固定为 `peer-dev`：`peerDependencies` + `devDependencies`。
- 源码中出现的依赖（`allSourceUses`）默认 `devDependencies`；如果它同时是 Host 运行时使用，则提升为 `dependencies`。
- Host 运行时使用（`hostRuntimeSourceUses`）且是 workspace 包、被标记为 peer-required：`peer-dev`；否则 `dependencies`。
- 非 configured-host 包的浏览器构建输入：`devDependencies`。
- workspace 包的 `dsh.client.inject`：`devDependencies`。
- 已有的非 Cordis peer：`devDependencies`（源注释：existing non-Cordis peer）。
- 没有源码使用但被声明为 required Cordis service：`peer-dev`。

证据：`deepseek-harness/scripts/verify-package-dependencies.ts:704-790@687f282e`；源码/角色/tsdown 事实读取在 `deepseek-harness/scripts/verify-package-dependencies.ts:59-592@687f282e`；`--fix` 的写回在 `deepseek-harness/scripts/verify-package-dependencies.ts:924-1038@687f282e`。

源码范围与角色事实（并非所有 workspace 包都被同一策略覆盖）：

- `readWorkspacePackageManifests` 的 glob：`apps/*/package.json`、`packages/*/*/package.json`、`vendor/*/package.json`；`release` 是 `packages/!(experimental)/*`，`policy` 是 `packages/*/*`（含 experimental）。`benchmarks/`、`python/`、`native/` 不在 dependency policy 内。
- `discoverPackageDependencyScope` 产生三种 role：`client-only`、`client-host`、`configured-host`。`clientFaceInclude`/`clientFaceExclude`/`hostPackages` 的重复项、未知包、同一包同时在 include/exclude、自动发现的 Client 包被冗余 include、`clientFaceExclude` 排除 `packages/client` 或无 `dsh.client` 声明的包，都会报 policy violation。
- Host 运行时事实不是只看 `src/index.ts`：`readHostBuildEntries` 会 import package-local `tsdown.config.ts`，分别在 `DSH_BUILD_FACE=host` 与 `client` 下求值，跳过 `platform: 'browser'` 的配置和 `src/client/` 条目；`readHostRuntimeUses` 从 Host 源码入口、`exports` 中的 Host 子路径、生成的 `typert.host` 递归本地 import；`readAllSourceUses` 扫描 `src/**/*.{ts,tsx,mts,cts}`。
- 生成 typert 在读取事实前完成；生成的 Host 模块也会被扫描，因此只在生成物里出现的 import 不能靠 `src/` 扫描漏掉。
- 证据：`deepseek-harness/scripts/verify-package-dependencies.ts:32-58@687f282e`、`deepseek-harness/scripts/verify-package-dependencies.ts:121-200@687f282e`、`deepseek-harness/scripts/verify-package-dependencies.ts:200-360@687f282e`、`deepseek-harness/scripts/verify-package-dependencies.ts:360-592@687f282e`。

实际声明校验（`collectPackageDependencyViolations`）：

- `peer-dev`：必须恰好是 `peerDependencies` + `devDependencies`，两者 range 相同，并且**不能有** `peerDependenciesMeta[name]`。证据：`deepseek-harness/scripts/verify-package-dependencies.ts:824-850@687f282e`。
- 其他段：实际声明必须恰好一段，且等于期望段；workspace 包的 range 必须等于 `workspaceRange` 结果。证据：`deepseek-harness/scripts/verify-package-dependencies.ts:824-850@687f282e`。
- `peerDependenciesMeta` 的每个键必须有对应 `peerDependencies` 条目；孤立的 meta 报错。证据：`deepseek-harness/scripts/verify-package-dependencies.ts:850-863@687f282e`。
- 根提供的 type 包 `@types/react`、`@types/react-dom`：根 `devDependencies` 必须声明；任何 workspace 包的任一依赖段出现即报错（`--fix` 不删除）。证据：`deepseek-harness/scripts/verify-package-dependencies.ts:853-880@687f282e`、`deepseek-harness/scripts/verify-package-dependencies.spec.ts:1212-1240@687f282e`。

Host/Client 依赖面（`collectHostDependencyExportPolicyViolations`）：

- Host 运行时导出必须分类为 `safe`（可普通依赖）或 `peer-required`（共享/必须由宿主提供）；未分类的 workspace 运行时边报错。
- `duplicateSafePackages` 中的包冗余分类会报错；未使用/无界导出（`''`、命名空间、副作用）不能分类。
- 证据：`deepseek-harness/scripts/verify-package-dependencies.ts:596-655@687f282e`。

策略表（`deepseek-harness/scripts/package-dependency-policy.ts:1-105@687f282e`，源仓库当前值；迁移时应参数化，不要把具体包名当成通用默认）：

- `clientFaceInclude`：空。
- `clientFaceExclude`：`@deepseek-ai/dsh-api-session-controller`、`@deepseek-ai/dsh-api-workspace-controller`。
- `hostPackages`：`@deepseek-ai/dsh-llm`、`@deepseek-ai/dsh-session`。
- `requiredServicePeers`：`@deepseek-ai/dsh-api-terminal-controller` → `@deepseek-ai/dsh-subprocess`。
- `configurationOnlyDevDependencies`：`client-locale`→`api-remotes`；`client-ui-conversation`→`api-remotes`+`client-ui-workspace`；`client-ui-model-selection`→`client-ui-input-trigger`；`client-ui-sidebar`→`client-ui-workspace`；`client-ui-subagent`→`client-ui-input-trigger`；`client-ui-theme`→`api-remotes`；`client-ui-tool`→`api-remotes`。
- `duplicateSafePackages`：`dsh-brand`、`dsh-lazy-require`、`dsh-typert-protocol`、`dsh-util-code-language`、`dsh-util-crypto`、`dsh-util-values`。
- `safeHostDependencyExports`：`dsh-credentials#credentialKey`、`dsh-deque#Deque`、`dsh-llm#callConfigEquals`、`dsh-session-format#sessionFormatLogFilename`、`dsh-timeout#MAX_TIMER_DELAY_MS`、`schemastery#default`。
- `peerRequiredHostExports`：`dsh-experimental-translator#TranslationError`；`dsh-scope#carrierKeyOf/createScope/scopeOf/scopeTarget`；`dsh-session#SESSION_FORMAT_VERSION`；`dsh-session-persistence#SessionPersistenceNotFoundError`。
- `safeHostDependencyExports` 的源注释明确：新增条目默认禁止，自动化代理不得添加例外；每次新增需要明确人工评审，并在 PR 描述中使用单独、醒目的标题。精确 roster 测试（`deepseek-harness/scripts/verify-package-dependencies.spec.ts:208-250@687f282e`）会挑战任何未经同步测试的改动。

重复安装/共享身份：

- `duplicateSafePackages` 的完整 runtime surface 被视为可跨副本；这些包会被跳过 safe/peer 分类，且不能再被 `safeHostDependencyExports`/`peerRequiredHostExports` 冗余分类（`deepseek-harness/scripts/verify-package-dependencies.ts:301-344@687f282e`）。
- 需要共享 `instanceof`/class 身份的导出必须进 `peerRequiredHostExports`，整条边修成 peer+dev；单元测试 `deepseek-harness/scripts/verify-package-dependencies.spec.ts:1062-1134@687f282e` 覆盖了"一个导入导出要求共享身份 → 整条边变 peer"的行为。
- `@deepseek-ai/cordis` 是共享 Cordis 运行时；`deepseek-harness/scripts/verify-npm-install-layout.ts:145-217@687f282e` 的 `assertDualDshInstallLayout` 断言合成双版本安装中**恰好一份** Cordis 位于 `node_modules/@deepseek-ai/cordis`，两个 DSH release 共享它。
- `deepseek-harness/scripts/verify-package-dependencies.spec.ts:1008-1028@687f282e` 接受 Host dependencies + development-only inputs + shared Cordis 的组合。
- **边界**：这是单元测试 + metadata-only 合成布局，不是真实重复安装/运行时 smoke。真实消费者验证在 packed install；不要把它当成"重复安装已验证"。

### 4.2 操作程序

1. 先写清楚这个依赖在运行时由谁提供：本包自带（`dependencies`）、可能缺失（`optionalDependencies`）、宿主提供（`peerDependencies`）、只构建/测试（`devDependencies`）。
2. 对 Host 运行时导入，确认它是否是共享服务/共享导出：是则 `peer-dev`，否则 `dependencies`。不要凭"peer 更安全"随意加 peer。
3. 对 Cordis 运行时：`peerDependencies` + `devDependencies`，range 相同，不写 `peerDependenciesMeta`。源策略要求如此。
4. 对 workspace 包：先确定该 manifest 是否在 `verify-package-dependencies` 的 apps/packages/vendor 范围。范围内按更严规则（dsh=`workspace:*`，其他=`workspace:~`）；范围外的普通内部包只需满足 constraints 的 `workspace:` 前缀，`workspace:^` 仍合法。不要把它写成“两套规则冲突”。
5. 根 type 包只在根声明；包内不要写 `@types/react`/`@types/react-dom` 的任一段。
6. 运行 `pnpm run package-dependencies`。`--fix` 只在 `policyViolations` 为空时工作；它会修 policy-owned 关系、刷新 `pnpm-lock.yaml` 并写 module graph。必须审查 manifest/lockfile/module-graph diff；root type 包不会被 `--fix` 删除。再跑 `pnpm run constraints`、`pnpm run runtime-closure`、packed install。
7. 在 packed install 中确认：所有 `dependencies` 可解析；`optionalDependencies` 缺失时降级；peer 由消费者提供；没有 workspace 协议残留；共享身份边与 duplicate-safe 包在真实安装中没有出现第二个实例（单元/合成布局通过不等于此项完成）。

**完成信号**：`package-dependencies` 无错误；`constraints` 无错误；packed install 成功；`peerDependenciesMeta` 无孤儿。

**失败处理**：
- 报 `must be dependencies-only`：把声明从 `devDependencies`/`peerDependencies` 移到唯一期望段；不要同时保留两段。
- 报 `must be matching peerDependencies + devDependencies`：两段都要写、range 相同、去掉 `peerDependenciesMeta`；如果该 peer 真是 optional，说明它不应走 peer-dev 策略，需要改的是策略/用途，而不是偷偷加 meta。
- 报 `must use workspace:`：先判断是 constraints 的族规则还是 dependency gate 的更严规则；dsh=`workspace:*`，其他 workspace=`workspace:~`。不要用 `workspace:^` 绕过。
- 报 Host export 未分类：在 `PACKAGE_DEPENDENCY_POLICY` 的 `safeHostDependencyExports`/`peerRequiredHostExports` 中精确登记导出；不要用空字符串/命名空间"一把梭"。
- 报根 type 包：从包内删除，只在根 `devDependencies` 保留。

**例外**：
- `peer-dev` 是唯一合法的"两段"形态；它不是"optional peer"。可选的 peer 应使用 `peerDependencies` + `peerDependenciesMeta.optional: true`，但源策略对 `peer-dev` 明确禁止 meta；迁移时要为 optional peer 建立单独策略，不能硬套。
- `configured-host` 包有额外的 Host 运行时边分类；不要把普通包的规则套到它。
- 源策略的 `policy` 子集不等于所有 workspace 包；`vendor`/`benchmarks`/`website`/`python` 的行为需要单独确认，不能假设它们也被覆盖。

**证据边界**：`verify-package-dependencies.ts` 1-1038 全读（含 593-595、701-703）；`package-dependency-policy.ts:1-105` 全读。没有找到"public 包不能依赖 private 包"的独立检查；如果目标仓库需要该规则，必须自行实现，不能引用本文件充当证据。未运行 `--fix`；未运行单元测试；`assertDualDshInstallLayout` 是 synthetic/metadata-only，不是真实重复安装。共享身份与 duplicate-safe 的运行时结论仍需真实消费者验证。

---

来源：deepseek-harness/scripts/verify-package-dependencies.ts:1-58@687f282e 来源：deepseek-harness/scripts/verify-package-dependencies.ts:59-592@687f282e 来源：deepseek-harness/scripts/verify-package-dependencies.ts:596-655@687f282e 来源：deepseek-harness/scripts/verify-package-dependencies.ts:656-703@687f282e 来源：deepseek-harness/scripts/verify-package-dependencies.ts:704-823@687f282e 来源：deepseek-harness/scripts/verify-package-dependencies.ts:824-923@687f282e 来源：deepseek-harness/scripts/verify-package-dependencies.ts:924-1038@687f282e 来源：deepseek-harness/scripts/package-dependency-policy.ts:1-105@687f282e 来源：deepseek-harness/scripts/verify-package-dependencies.spec.ts:208-250@687f282e 来源：deepseek-harness/scripts/verify-package-dependencies.spec.ts:301-344@687f282e 来源：deepseek-harness/scripts/verify-package-dependencies.spec.ts:1008-1038@687f282e 来源：deepseek-harness/scripts/verify-package-dependencies.spec.ts:1062-1134@687f282e 来源：deepseek-harness/scripts/verify-package-dependencies.spec.ts:1-207@687f282e 来源：deepseek-harness/scripts/verify-package-dependencies.spec.ts:345-999@687f282e 来源：deepseek-harness/scripts/verify-package-dependencies.spec.ts:1135-1211@687f282e 来源：deepseek-harness/scripts/verify-package-dependencies.spec.ts:1241-1246@687f282e

<a id="sc-optional-deps"></a>
## 8. 可选依赖：静态 value import 必须为零

### 8.1 源义务

`verify-optional-dependency-imports` 把"可选"定义为：

- `optionalDependencies` 中的包；或
- `peerDependencies` 中带 `peerDependenciesMeta[name].optional === true` 的包。

它只扫描**会发布**的源码：`packages/*/*/src/**` 与 `apps/*/src/**`，不含 `vendor/`。对每个静态 import/re-export：

- 裸 `import 'x'`：加载；
- `import type`：不加载；
- `import defer`：仍加载（phase modifier 不是 TypeKeyword；注释明确说它会解析/链接模块）；
- 默认导入、命名空间导入：加载；
- 命名导入：只有当至少一个绑定在值空间使用时才加载；`verbatimModuleSyntax` 关闭，所以仅类型使用的命名导入会被编译器擦除；
- `export *`/namespace export：加载；具名 re-export 的值绑定才加载；
- 无法解析的符号按"值"处理（fail closed）。
- 两个 compiler face（host/client）都扫描。
- 证据：`deepseek-harness/scripts/verify-optional-dependency-imports.ts:1-213@687f282e`。

### 8.2 操作程序

1. 在 manifest 中把包放到 `optionalDependencies`，或 `peerDependencies` + `peerDependenciesMeta.optional: true`。
2. 搜索静态 import；优先改成 `import type`（如果只是类型），或重构到函数/生命周期内。
3. 动态 `import()` 只作为最后手段：源注释明确"dynamic import 只把失败推迟到首次使用，属于真正需要该包并处理缺失的调用方，不应是默认答案"。
4. 确保降级路径有测试：未安装时功能可用/给出明确错误；已安装时正常。
5. 运行 `pnpm run verify-optional-dependency-imports`；再构建、打包、在临时消费者中分别测试安装/不安装可选依赖。
6. 在 packed install 中检查 `ignoredOptionalDependencies` 的 fixture 行为（`deepseek-harness/apps/cli/tests/profiles/packed-installation.ts:170-190@687f282e`）。

**完成信号**：静态扫描零命中；两种消费者都能加载；缺失时错误可读；构建产物没有把可选依赖内联。

**失败处理**：
- 报静态加载：先判断是否真的需要运行时值；类型导入改 `import type`；不要用 `require` 绕过扫描。
- 动态导入后仍在模块顶层使用：把使用点移到函数内；否则捕获了导入错误仍会崩。
- 打包器把动态导入内联：检查 external 配置；可选依赖不应被 bundle 进主包。

**例外**：`peerDependenciesMeta.optional` 必须先有对应 `peerDependencies`，否则 `check-workspace-constraints` 会报孤儿；optional peer 的静态导入仍禁止。`import defer` 不会被当作类型导入。

**证据边界**：未运行；源文件 213 行已读。它不检查 `vendor/`，也不检查非 `src` 的脚本/测试文件。

---

来源：deepseek-harness/scripts/verify-optional-dependency-imports.ts:1-213@687f282e 来源：deepseek-harness/apps/cli/tests/profiles/packed-installation.ts:130-190@687f282e

<a id="sc-dependency-catalog"></a>
## 16. 消费者依赖目录（dependency-catalog）

### 16.1 源事实

`gen-dependency-catalog` 生成 `docs/dependency-catalog.json`，记录**消费者**安装 `@deepseek-ai/dsh@latest` 时的 npm 解析树，不是 workspace 版本一致性检查：

- 输入是记录在 `scripts/dependency-catalog/package-lock.json` 的 npm lockfile v3，以及 `scripts/dependency-catalog/resolution.json` 元数据（capturedAt、npm、node、platform、arch、registry、installStrategy）。
- 要求：
  - lockfile v3；
  - 消费者只声明 `@deepseek-ai/dsh: latest`；
  - 每个包从公共 `https://registry.npmjs.org/` 解析，无 username/password；
  - 不接受 `link: true`（本地软链）；
  - 排除 dev 包，但保留 optional/peer 标记与 os/cpu/libc；
  - `installStrategy` 必须是 `hoisted`；
  - 去重为 name+version，保留每个安装位置/flags。
- `--check` 逐字节比较 `docs/dependency-catalog.json` 与记录输入；`--refresh` 会创建临时消费者，运行 `npm install --package-lock-only --lockfile-version=3 --ignore-scripts --no-audit --no-fund --include=prod --include=optional --include=peer --install-strategy=hoisted`，更新 lock/metadata/catalog。
- 证据：`deepseek-harness/scripts/gen-dependency-catalog.ts:1-304@687f282e`。

它**不**：

- 比较 workspace 内同一包的版本范围；
- 验证 tarball 可安装；
- 验证 bin/exports；
- 代表 `pnpm-lock.yaml` 的完整传递闭包。

### 16.2 操作程序

1. 需要更新消费者目录时，运行 `pnpm run gen-dependency-catalog --refresh`；它会访问公共 npm，需要网络。
2. 审查 `package-lock.json`/`resolution.json` 的变化：registry 必须是公共 npm，installStrategy 必须是 hoisted，不能出现本地 link。
3. 运行 `pnpm run gen-dependency-catalog` 重新生成 `docs/dependency-catalog.json`；再 `pnpm run verify-dependency-catalog` 做 `--check`。
4. 不要把 `--check` 放进需要离线/无 npm 的 PR lane；它只读记录文件，但 `--refresh` 需要网络。
5. 若目标仓库不用 npm 消费者目录，可以删除该机制；不要把它误当成版本统一 gate。

**完成信号**：`verify-dependency-catalog` 输出 "JSON matches the recorded npm resolution"；目录 diff 只含预期版本/平台变化。

**失败处理**：
- lockfile 有 `link: true`/非公共 registry：说明记录被本地/私有源污染；重新在隔离环境生成。
- 目录 stale：运行 `gen-dependency-catalog`（不 refresh）从记录输入重生成；若记录本身过期，再 `--refresh`。
- 版本与 workspace 不一致：这不是该 gate 的职责；用 `constraints`/`package-dependencies` 检查 workspace。

**例外**：`--refresh` 依赖外部 npm/registry，可能受网络/registry 状态影响；生成结果包含 capturedAt/npm/node/platform，换环境会产生 metadata diff。`--check` 不访问网络，但仍要求提交的记录文件存在。

**证据边界**：未运行；304 行只读了 1-180、180-304 的关键部分。`docs/dependency-catalog.json` 的实际内容未逐行核对。

---

来源：deepseek-harness/scripts/gen-dependency-catalog.ts:1-180@687f282e 来源：deepseek-harness/scripts/gen-dependency-catalog.ts:180-304@687f282e 来源：deepseek-harness/package.json:100-160@687f282e

<a id="sc-dependency-updates"></a>
## 22. 依赖更新节奏与缺口

### 22.1 源事实

`dependabot.yml`：

- npm：根目录，排除 `vendor/**`；cron 每天 04:00 Asia/Shanghai；cooldown 30 天；标签 `kind/dependency` + `area/infra`。
- uv：`/python/sdk`；同样 schedule/cooldown/标签。
- github-actions：根目录；同样 schedule/cooldown/标签。
- 没有 `groups`、`open-pull-requests-limit`、`reviewers`/`assignees`；PR 数量可能不受控。
- 不覆盖 `benchmarks/`、`website/` 或其他 Python 子项目（如果存在）。
- 证据：`deepseek-harness/.github/dependabot.yml:1-38@687f282e`。

另一层是 pnpm 的 release age（[第 2 节](supply-chain-workspace-and-versions.md#sc-workspace-topology)：源仓未显式设置 `minimumReleaseAge`，按 pnpm 11 官方默认 24h 运行，除非精确版本被 `minimumReleaseAgeExclude` 完全排除；本批未做实际安装观察）；Dependabot cooldown 30 天不能替代它。版本豁免必须逐精确版本加入 `minimumReleaseAgeExclude`。

### 22.2 操作程序

1. 每日/每周查看 Dependabot PR；优先安全/运行时依赖；devDependency 可批量。
2. 每个 PR：读 changelog/breaking changes；确认 release age 已满足或有精确豁免；确认没有被 `allowBuilds` 阻断。
3. 本地：`pnpm install`、`pnpm run constraints`、`pnpm run package-dependencies`、`pnpm run runtime-closure`、`pnpm run build`、相关测试。
4. 更新 notices；检查 lockfile 是否引入新传递依赖/平台包。
5. 合并；发布依赖走 release 流程。
6. 每月审查：过期 `minimumReleaseAgeExclude`、可移除 override/patch、未合并 security advisory。

**完成信号**：PR 通过 gate；lockfile diff 可解释；notices 更新；没有新增未审查构建脚本。

**失败处理**：
- PR 太多：先合并基础依赖，再 rebase 其余；不要 `--force` 覆盖 lockfile。
- release age 阻断：等待或加精确豁免并记录原因；不要全局关闭。
- vendor 被尝试更新：确认 `exclude-paths` 生效；vendor 走同步流程。

**例外**：`minimumReleaseAgeExclude` 的精确条目是"已审查"声明，不是永久豁免；升级版本后旧条目应删除。Dependabot 的 `cooldown` 是 PR 冷却，不是安装时 release age。

**证据边界**：未查看实际 Dependabot PR 历史；未验证 GitHub cron/时区行为。`dependabot.yml` 38 行已完整阅读。

---

来源：deepseek-harness/.github/dependabot.yml:1-38@687f282e 来源：deepseek-harness/pnpm-workspace.yaml:57-105@687f282e

**来源坐标补充**：以下坐标对应本页机制（固定提交 `687f282e`）；只用于追溯，不新增正文断言，正文解释以上文小节为准。

- `supply-chain-dependency-faces`：`deepseek-harness/scripts/verify-package-dependencies.ts:656-703@687f282e`、`deepseek-harness/scripts/verify-package-dependencies.ts:704-823@687f282e`、`deepseek-harness/scripts/verify-package-dependencies.ts:824-923@687f282e`、`deepseek-harness/scripts/verify-package-dependencies.spec.ts:301-344@687f282e`、`deepseek-harness/scripts/verify-package-dependencies.spec.ts:1008-1038@687f282e`
- `supply-chain-optional-deps`：`deepseek-harness/apps/cli/tests/profiles/packed-installation.ts:130-190@687f282e`
