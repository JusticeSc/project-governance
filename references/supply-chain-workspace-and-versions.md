# 工作区、版本家族与 Node/pnpm 锚定（supply-chain §2、§3、§23）

本页触发：新增或移动 workspace 成员、调整 pnpm／Node／lockfile 锚定、修改 workspace 协议或 dsh／vendor 版本家族、以及 bump 版本后 packed identity 不一致时，先读本页。共同使用约定：证据基线、证据标记（源义务／源事实／迁移设计／建议／未验证）与源仓库只读边界见入口页 [supply-chain.md](supply-chain.md)；本页 `deepseek-harness/<path>:<start>-<end>@687f282e` 引用指向固定提交 `687f282e`，文中命令是源仓库已有做法，不表示在迁移目标已运行。

本页机制：[`supply-chain-workspace-topology`](#sc-workspace-topology)、[`supply-chain-workspace-protocol`](#sc-workspace-protocol)、[`supply-chain-node-manager-lock`](#sc-node-manager-lock)。领域入口：[supply-chain.md](supply-chain.md)。

<a id="sc-workspace-topology"></a>
## 2. 工作区拓扑、包管理器与 Node 锚定

### 2.1 源事实

- 根 `package.json`：`private: true`、`type: "module"`、`packageManager: "pnpm@11.28.5"`、`engines.node: "^22.19.0 || >=24.0.0"`；`workspaces` 列出 `vendor/*`、`packages/*/*`、`native/system`、`native/system/packages/*`、`apps/*`、`website`（`deepseek-harness/package.json:1-19@687f282e`；`packageManager` 在 7 行，`workspaces` 在 11-19 行）。
- `pnpm-workspace.yaml` 是 pnpm 的真实成员清单，额外包含 `benchmarks` 与 `python/sdk-runtime`（`deepseek-harness/pnpm-workspace.yaml:1-15@687f282e`）。`package.json.workspaces` 不含 `benchmarks`、`python/sdk-runtime`；两份清单并不等价。
- pnpm 版本有三处锚：`packageManager`、根 devDependency `pnpm: 11.28.5`、`minimumReleaseAgeExclude` 中的 `pnpm@11.28.5`（`deepseek-harness/package.json:1-10@687f282e`、`deepseek-harness/package.json:275-275@687f282e`、`deepseek-harness/pnpm-workspace.yaml:105-105@687f282e`）。
- 文档要求 strict symlinked linker，未声明依赖不能靠 hoisting 成功；依赖构建脚本必须显式 allowlist（`deepseek-harness/docs/development.md:27-31@687f282e`）。
- `allowBuilds` 默认拒绝安装/构建脚本；`pnpm-workspace.yaml` 注释说明 pnpm 10+ 将未审查脚本作为硬错误，pnpm 11 官方发布说明把 `strictDepBuilds` 默认改为 true；源仓未显式写该字段，本批未执行实际安装观察。允许的有 `esbuild`、`lefthook`、`node-pty`、`koffi`、`@deepseek-ai/dsh-subprocess-local@file:...`；明确拒绝的有 `@google/genai`、`protobufjs`、`node-addon-require-builtin`、`electron-winstaller`、`msgpackr-extract`（`deepseek-harness/pnpm-workspace.yaml:31-56@687f282e`）。
- `overrides` 固定 `extract-zip>yauzl: 3.4.0`，并把 `@deepseek-ai/cosmokit`/`schemastery` 链接到 `vendor/`（`deepseek-harness/pnpm-workspace.yaml:17-20@687f282e`）。
- `peerDependencyRules.allowedVersions.typescript` 为 `>=5 <7`（`deepseek-harness/pnpm-workspace.yaml:22-24@687f282e`）。
- release age 的配置边界：`pnpm-workspace.yaml` 只写 `minimumReleaseAgeExclude`，没有显式写 `minimumReleaseAge`；24 小时是 pnpm 11 官方发布说明的默认（`minimumReleaseAge` 1440 分钟），源仓 README/测试亦按此描述（`deepseek-harness/apps/desktop/packaging/README.md:227@687f282e`、`deepseek-harness/scripts/local-bundle-registry.spec.ts:513-515@687f282e`），本批未执行实际安装/解析观察。豁免条目覆盖 LibreOffice kit、pi-ai/telemetry、node-addon 系列、Claude Agent SDK 平台包、OpenAI Codex、CUA、Electron、pnpm 等（`deepseek-harness/pnpm-workspace.yaml:57-105@687f282e`）。列表条目是精确 `name@version`；OpenAI Codex 的平台别名用 `||` 连接多个精确版本，仍然不是 semver 范围。迁移时若 pnpm 主版本或目标策略不同，必须在实际解析/安装中重验，不能把 24h 当成通用事实。
- 根 `postinstall` 是 `node scripts/install-lefthook.mjs`（`deepseek-harness/package.json:214-214@687f282e`）；CI 使用 `pnpm install --frozen-lockfile`（`deepseek-harness/.github/workflows/ci.yml:96-102@687f282e`）。
- `benchmarks` 与 `python/sdk-runtime` 是 pnpm 成员，但不在 `package.json.workspaces`，也不在发布/约束检查的 `workspaceGlobs` 中（`deepseek-harness/scripts/check-workspace-constraints.ts:28-36@687f282e`）。

### 2.2 操作程序：新增工作区成员

1. 判定层级：`vendor/`（上游复制）、`packages/<group>/<pkg>`（自有包）、`native/`、`apps/`、`benchmarks/`、`website/`、`python/sdk-runtime`。
2. 在 `pnpm-workspace.yaml.packages` 增加 glob；若该成员需要被 `package.json.workspaces` 感知（许可证扫描、npm workspace 工具），同步两份清单，并记录哪条 gate 读哪份。
3. 若成员带生命周期脚本，先读脚本；在 `allowBuilds` 写 `true`/`false`。不要用 `--ignore-scripts` 掩盖未审查的脚本。
4. 若需要固定传递依赖，加 `overrides`；若需要 peer range 例外，加 `peerDependencyRules.allowedVersions`。
5. 若是发布包，按[第 5 节](supply-chain-package-and-installation.md#sc-manifest-publication)补齐 `private`、`type`、`main`、`types`、`exports`、`files`、`repository`、`publishConfig`、版本。
6. `pnpm install` 更新 lockfile；提交 `pnpm-lock.yaml`。CI 必须 `--frozen-lockfile`。
7. 运行 `pnpm run constraints`、`pnpm run package-dependencies`、`pnpm run publint`（构建后）、`pnpm run package-meta`、`pnpm run verify-dsh-package-licenses`；发布改动再跑 release lane。

**完成信号**：干净环境 `pnpm install --frozen-lockfile` 成功；未允许的安装脚本没有执行；`pnpm -r list` 能看到成员；`constraints`/`package-dependencies` 无错误。

**失败处理**：
- 安装报 ignored build scripts：补 `allowBuilds`，不要关闭 strict。
- lockfile 不同步：本地 `pnpm install --lockfile-only`，审查 diff 后提交。
- 成员只出现在一份清单：先确认使用该清单的 gate，再决定是否同步；不要假设另一份"肯定也会读到"。

**例外**：`benchmarks`、`python/sdk-runtime` 只属于 pnpm 成员；`native/` 在 `package.json.workspaces` 中但被许可证生成器标为 dev-only area（`deepseek-harness/scripts/gen-third-party-notices.ts:30-37@687f282e`）。迁移时若不用 `package.json.workspaces` 相关脚本，可以省略该字段，但不能让两份清单独自漂移。

**证据边界**：`minimumReleaseAge=1440` 与 `strictDepBuilds=true` 的默认值已对 pnpm 11 官方发布说明核对；本批未执行实际安装/解析，也未检查 pinned pnpm 实现。`nodeLinker` 未在 `pnpm-workspace.yaml` 显式写出，文档只声明 strict symlinked linker。迁移时建议显式写 `nodeLinker: isolated`（或等价项）与目标 release-age 值，不要依赖默认值。

---

来源：deepseek-harness/package.json:1-20@687f282e 来源：deepseek-harness/pnpm-workspace.yaml:1-15@687f282e 来源：deepseek-harness/package.json:275-275@687f282e 来源：deepseek-harness/pnpm-workspace.yaml:31-56@687f282e 来源：deepseek-harness/pnpm-workspace.yaml:17-24@687f282e 来源：deepseek-harness/pnpm-workspace.yaml:57-105@687f282e 来源：deepseek-harness/apps/desktop/packaging/README.md:227-227@687f282e 来源：deepseek-harness/scripts/local-bundle-registry.spec.ts:513-515@687f282e 来源：deepseek-harness/docs/development.md:27-31@687f282e 来源：deepseek-harness/.github/workflows/ci.yml:96-102@687f282e 来源：deepseek-harness/scripts/check-workspace-constraints.ts:28-36@687f282e 来源：deepseek-harness/scripts/local-bundle-registry.spec.ts:1-281@687f282e

<a id="sc-workspace-protocol"></a>
## 3. workspace 协议、版本家族与发布替换

### 3.1 源义务

`checkWorkspaceProtocol` 按**依赖目标**决定协议，而不是按消费者：

- `@deepseek-ai/dsh` 或以 `@deepseek-ai/dsh-` 开头的包：必须 `workspace:*`。
- `vendor/`、`native/system`、`native/system/packages/` 中的包：必须 `workspace:~`。
- 其他 workspace 成员：必须使用任意 `workspace:` 协议。

证据：`deepseek-harness/scripts/check-workspace-constraints.ts:628-647@687f282e`。

但 `verify-package-dependencies.ts` 另有一条**作用域不同、更严格**的 `workspaceRange`（`deepseek-harness/scripts/verify-package-dependencies.ts:32-34@687f282e`）：

- `@deepseek-ai/dsh`/`dsh-*` → `workspace:*`。
- **所有其他 workspace 包** → `workspace:~`，包括 `vendor`/`native` 之外的普通内部包。
- 该规则在 `collectPackageDependencyViolations` 中执行（`deepseek-harness/scripts/verify-package-dependencies.ts:807-870@687f282e`），`--fix` 也用它写回（`deepseek-harness/scripts/verify-package-dependencies.ts:967-1038@687f282e`）。
- 它的 manifest 覆盖面是 `WORKSPACE_MANIFEST_GLOBS = apps/*、packages/*/*、vendor/*`（`deepseek-harness/scripts/verify-package-dependencies.ts:35-42@687f282e`），不是全 workspace。

两条规则是**重叠范围上的分层**，不是逻辑冲突：

- `checkWorkspaceProtocol` 覆盖所有 pnpm workspace 成员（根、packages、apps、vendor、native、benchmarks、website、python/sdk-runtime、tools）；按依赖目标：DSH=`workspace:*`，vendor/native=`workspace:~`，其他 workspace 目标只要求以 `workspace:` 开头。测试覆盖了这些消费者目录和四个依赖段（`deepseek-harness/scripts/check-workspace-constraints.spec.ts:35-105@687f282e`）。
- dependency gate 只在 apps/packages/vendor 中运行，但对其中所有 workspace 目标都要求 DSH=`workspace:*`、其他=`workspace:~`。在重叠范围内，它是 constraints 的**加强**：DSH 的 `*` 和 vendor/native 的 `~` 都满足 constraints；普通目标在 gate 内被收紧为 `~`，在 gate 外 constraints 仍允许 `workspace:^`。两者没有互相排斥的义务。
- 因此不要称二者“冲突”，也不要声称 `workspace:^` 已被仓库全局退役。它是合法 pnpm 语法；是否违规取决于目标包和 manifest 是否在 dependency gate 范围。
- `checkWorkspaceProtocol` 620-623 的 `^0.0.1` 注释讲的是**手写 range**：`pnpm pack` 不会改写它，从版本 0.0.2 发布会指向不存在的版本。这条注释不是对 `workspace:^` 的描述；`workspace:` 协议会在 pack 时被替换。

**pack 替换由 pnpm 完成，不是 Harness wrapper**：

- pnpm 官方 Workspace 文档（`https://pnpm.io/workspaces#publishing-workspace-packages`，2026-10-23 查阅）规定：pack/publish 时，`workspace:`、`workspace:*` → 目标成员的确切版本；`workspace:~` → `~<version>`；`workspace:^` → `^<version>`；`workspace:<range>` → 对应 semver range；裸 `workspace:` 等价 `workspace:*`。别名/相对路径也有各自转换。
- Harness 的 `release/pack.ts` 只调用 `pnpm pack`，然后 `validatePackedMember` 检查 tarball 存在、payload、packed identity（`deepseek-harness/scripts/release/pack.ts:22-40`、`deepseek-harness/scripts/release/pack.ts:44-70@687f282e`）；发布路径没有自己的 workspace 改写逻辑。
- 但仓库另有一个 **benchmark-only** `publishWorkspaceRange`（`deepseek-harness/scripts/benchmark-npm-resolution.ts:171-182@687f282e`），用于 synthetic npm resolution benchmark 构造 registry-facing manifest：`workspace:*`→精确版本、`workspace:^`→`^版本`、`workspace:~`→`~版本`、其他 `workspace:<range>`→去掉前缀。它不是 release pack，不要把它当成发布时的替换实现；也不要因为看到它就声称发布路径自己重写 range。
- DSH family 的 `validatePackedManifest` 进一步要求 packed `dependencies`/`optionalDependencies`/`peerDependencies` 中每个 `@deepseek-ai/dsh*` 的 range **等于成员版本**（`deepseek-harness/scripts/release/families.ts:404-414@687f282e`）；所以 DSH sibling 用 `workspace:^` 在 pack 后会得到 `^<version>`，被该检查拒绝。vendor family 只校验 identity/payload（`deepseek-harness/scripts/release/families.ts:424-470@687f282e`），不要求所有 range 等于版本。
- `workspace:^` 会把发布 range 放宽到 caret 兼容范围，可能允许消费者安装比该 release 更新的兼容版本；这不是“打包失败”或“必然重复/无法解析”。需要精确共享身份时用 `workspace:*`；Harness 对非 DSH 选择 `workspace:~` 是范围策略，不是 pnpm 语义要求。

版本与 packed 检查：

- 所有 `@deepseek-ai/dsh`/`@deepseek-ai/dsh-*` 包的 `version` 必须等于根 `version`，包括 private 包（`checkDshFamilyVersion`，`deepseek-harness/scripts/check-workspace-constraints.ts:420-432@687f282e`）。
- 根版本允许 `X.Y.Z` 或 `X.Y.Z-<prerelease>`（`checkRepositoryVersion`，`deepseek-harness/scripts/check-workspace-constraints.ts:573-579@687f282e`）。
- `native/system/packages/*` 的版本必须等于 `native/system` 的版本（`deepseek-harness/scripts/check-workspace-constraints.ts:496-506@687f282e`）。
- 发布包 tarball 的 `validatePackedMember` 校验 tarball 存在、payload 与 packed identity；DSH family 另外要求 packed DSH 图精确等于成员版本（`deepseek-harness/scripts/release/pack.ts:22-40@687f282e`、`deepseek-harness/scripts/release/families.ts:404-414@687f282e`）。
- `release:verify` 在发布模式下要求：成员不得 `private: true`；运行 ref 必须是该家族的 `tagPrefix*`，且 tag 要匹配成员版本（`deepseek-harness/scripts/release/verify.ts:40-100@687f282e`）。

发布家族（`releaseFamily` **只有 `dsh` 与 `vendor`**）：

- `dsh`：`packages/*/*` + `apps/*` 中的公开成员，共享一个版本，tag 前缀 `dsh-v`；private 成员不发布，但版本仍跟随根（`deepseek-harness/scripts/release/families.ts:345-414@687f282e`）。
- `vendor`：`vendor/*`，每个包保留自己的版本线，发布时整族递增；payload 允许上游 `src`，只拒绝空 tarball（`deepseek-harness/scripts/release/families.ts:424-470@687f282e`）。
- **`native` 不是 `releaseFamily` 成员**：`releaseFamilies()` 只返回 dsh/vendor；`releaseFamily('native')` 会抛 `unknown release family`。`native/system` 与平台包由单独的 `node-addon-system-release.yml`/native 发布序列处理；`release:pack --family native` 不可用。`native` 包在依赖中仍使用 `workspace:~`。

`bump.ts` 的行为：

- `--family dsh <major|minor|patch|x.y.z>`：根 + 所有发布成员 + 所有 private DSH 包（`apps/*`、`packages/*/*` 中 `private: true` 的包）统一版本；然后 `pnpm install --lockfile-only`；`git add` + commit；不创建 tag（`deepseek-harness/scripts/release/bump.ts:274-345@687f282e`、`deepseek-harness/scripts/release/bump.ts:350-410@687f282e`）。
- `--family vendor`：没有显式版本参数；每个包根据 manifest 与最新 tag 计算下一个 patch/prerelease 版本；整族一起 bump（`deepseek-harness/scripts/release/bump.ts:140-215@687f282e`、`deepseek-harness/scripts/release/bump.ts:319-345@687f282e`）。
- `--dry-run` 只打印计划；`--prerelease` 只对 vendor 有效（dsh 的 prerelease 写在版本参数里）。

### 3.2 操作程序：版本发布

1. 确认 family：产品包走 `dsh`，vendored 框架走 `vendor`。`releaseFamily` 没有 `native`；原生包走 `node-addon-system-release.yml`，不要传 `--family native`。
2. 运行 `tsx scripts/release/bump.ts --family <family> <version>`（或 `--dry-run` 先看计划）。检查根、所有 DSH 成员、private DSH 包、lockfile 的 diff。
3. 运行 `pnpm run constraints`：版本一致性、workspace 协议、层级、实验包命名/依赖隔离。
4. 运行 `pnpm run release:verify`：publish order、版本基线、packed 前的 tag/publishable 条件（发布模式下）。
5. 打包后运行 `pnpm run release:pack --family <dsh|vendor> --out dist/npm`；该脚本调用 `pnpm pack`（由 pnpm 做 `workspace:` 替换），再执行 payload、packed identity 与 DSH 精确版本图校验。Harness 不自己改写依赖 range。
6. 用 `release:verify-packed-install` 验证临时消费者；发布工作流只上传已验证的字节。

**完成信号**：`constraints` 无错误；`release:verify` 的 publish order 覆盖所有成员；packed identity 与成员一致；临时消费者安装成功；tag 与版本匹配。

**失败处理**：
- 错误 workspace 协议：先看范围。`checkWorkspaceProtocol` 对普通 workspace 目标接受任意 `workspace:` 前缀；dependency gate 在 apps/packages/vendor 内把所有非 DSH 目标收紧为 `workspace:~`。这不是冲突，按更严范围改即可。`workspace:^` 在 gate 外合法，pack 后是 caret range；不要描述成全局禁止，也不要描述成必然重复/无法解析。需要 DSH sibling 精确同版时用 `workspace:*`。
- 版本不一致：运行 bump 脚本，不要手改多个 manifest；手改容易漏 private DSH 包和 lockfile。
- packed identity 不一致：检查 pack 前是否有自定义 manifest 写入/构建覆盖；这是发布阻断项。
- tag 不匹配：停止发布，修版本/tag；不要 force push tag。

**例外**：
- `dsh` 使用 `workspace:*`，发布后 peer 要求匹配的 release；`vendor`/`native` 使用 `workspace:~`，允许同一 minor 的 patch 升级（`deepseek-harness/.agents/notes/implemented/process/2026-08-26-published-dependency-faces.md:36-39@687f282e`）。
- private DSH 包版本跟随根，但不发布；`release:verify` 的 publishable 检查只针对 family 成员。
- `apps/desktop`、`apps/desktop-host`、`apps/plugin-market-generator` 不在 standard release member 中（`deepseek-harness/scripts/check-workspace-constraints.ts:69-72@687f282e`）；不要用 bump 把它们变成 npm 发布物。

**证据边界**：没有执行 bump/verify；`release/bump.ts` 只读了 1-30、140-345、350-416。`release:verify` 的 tag 读取依赖 `GITHUB_REF`，本地默认不触发 publish 检查。`pnpm pack` 的 `workspace:` 替换规则来自 pnpm 官方 Workspace 文档（2026-10-23 查阅），Harness wrapper 的 `release/pack.ts` 只调用 `pnpm pack`，没有独立替换实现；真正的消费验证在 packed install。分层的 workspace range 规则来自 `check-workspace-constraints.ts:628-647` 与 `verify-package-dependencies.ts:32-34,35-42,807-870,967-1038` 的源码对照；`check-workspace-constraints.spec.ts:35-105` 固定了目标包族与消费者目录/四个依赖段的行为。未运行任一 gate，因此规则是静态结论。

---

来源：deepseek-harness/scripts/check-workspace-constraints.ts:600-642@687f282e 来源：deepseek-harness/scripts/check-workspace-constraints.spec.ts:35-105@687f282e 来源：deepseek-harness/scripts/check-workspace-constraints.ts:434-446@687f282e 来源：deepseek-harness/scripts/check-workspace-constraints.ts:573-580@687f282e 来源：deepseek-harness/scripts/check-workspace-constraints.ts:490-500@687f282e 来源：deepseek-harness/scripts/verify-package-dependencies.ts:1-58@687f282e 来源：deepseek-harness/scripts/verify-package-dependencies.ts:813-850@687f282e 来源：deepseek-harness/scripts/verify-package-dependencies.ts:924-959@687f282e 来源：deepseek-harness/scripts/verify-package-dependencies.spec.ts:1008-1028@687f282e 来源：deepseek-harness/scripts/release/pack.ts:1-108@687f282e 来源：deepseek-harness/scripts/release/bump.ts:274-345@687f282e 来源：deepseek-harness/scripts/release/bump.ts:350-416@687f282e 来源：deepseek-harness/scripts/release/families.ts:345-414@687f282e 来源：deepseek-harness/scripts/release/families.ts:424-470@687f282e 来源：deepseek-harness/scripts/release/verify.ts:40-100@687f282e 来源：deepseek-harness/scripts/release/tarball.ts:14-57@687f282e 来源：deepseek-harness/scripts/benchmark-npm-resolution.ts:171-182@687f282e 来源：deepseek-harness/scripts/benchmark-npm-resolution.ts:1-170@687f282e 来源：deepseek-harness/scripts/benchmark-npm-resolution.ts:183-553@687f282e 来源：deepseek-harness/scripts/local-bundle-registry.ts:701-820@687f282e 来源：deepseek-harness/scripts/local-bundle-registry.spec.ts:291-510@687f282e

<a id="sc-node-manager-lock"></a>
## 23. Node、pnpm 与 lockfile 锚定

### 23.1 源义务

- Node：根 `engines.node` 为 `^22.19.0 || >=24.0.0`；根目录没有 `.nvmrc`/`.node-version`（源根文件列表未显示）。
- pnpm：`packageManager: pnpm@11.28.5` + 根 devDependency `pnpm: 11.28.5`；`minimumReleaseAgeExclude` 也豁免 `pnpm@11.28.5`。
- lockfile 提交；CI `pnpm install --frozen-lockfile`（`deepseek-harness/.github/workflows/ci.yml:96-102@687f282e`）。
- `pnpm-workspace.yaml` 的 `overrides`/`peerDependencyRules`/`allowBuilds`/`minimumReleaseAgeExclude`/`patchedDependencies` 都是解析输入；改它们必须更新 lockfile。
- 发布 job 用 `--ignore-scripts`；开发安装不能用它替代构建。

### 23.2 操作程序

1. 新仓库写 `packageManager`、`engines`；CI 使用对应版本，不要让默认 Node 漂移。
2. 修改解析相关字段后 `pnpm install` 更新 lockfile；不要手改 lockfile。
3. CI/发布安装用 `--frozen-lockfile`；本地可用普通安装，但提交前确保同步。
4. 升级 pnpm：同时更新 `packageManager`、devDependency、release age 豁免、CI action；一个 PR 完成。
5. 升级 Node：更新 `engines`、CI matrix、native 构建镜像；跑全量测试 + packed install。
6. 检查 `allowBuilds`：新增原生依赖必须显式审查；拒绝不需要的脚本。

**完成信号**：干净环境 frozen install 成功；CI 版本与 `packageManager` 一致；lockfile diff 只含预期变化。

**失败处理**：
- CI/本地 pnpm 不一致：以 `packageManager` 为准；Corepack 切换。
- lockfile 冲突：重新安装生成，不要手工合并。
- Node 不满足 engines：不要用 `--engine-strict=false` 绕过生产；升级或改 engines。

**例外**：`engines` 允许两个大版本，但 CI 可能只跑一个；迁移时应至少测试最低/最高支持版本。`--ignore-scripts` 只适用于已有构建产物的发布安装。

**证据边界**：未读取 CI 的 Node setup 全部；只从 `engines`/`packageManager`/release 工作流推断。Node 22.19 的具体行为（如 `require(esm)`）未验证。

---

来源：deepseek-harness/package.json:1-10@687f282e 来源：deepseek-harness/package.json:275-275@687f282e 来源：deepseek-harness/pnpm-workspace.yaml:105-105@687f282e 来源：deepseek-harness/.github/workflows/ci.yml:96-102@687f282e 来源：deepseek-harness/docs/development.md:27-31@687f282e

**来源坐标补充**：以下坐标对应本页机制（固定提交 `687f282e`）；只用于追溯，不新增正文断言，正文解释以上文小节为准。

- `supply-chain-workspace-topology`：`deepseek-harness/package.json:1-20@687f282e`、`deepseek-harness/pnpm-workspace.yaml:17-24@687f282e`
- `supply-chain-workspace-protocol`：`deepseek-harness/scripts/check-workspace-constraints.ts:600-642@687f282e`、`deepseek-harness/scripts/check-workspace-constraints.ts:573-580@687f282e`、`deepseek-harness/scripts/verify-package-dependencies.ts:1-58@687f282e`、`deepseek-harness/scripts/release/bump.ts:350-416@687f282e`、`deepseek-harness/scripts/release/tarball.ts:14-57@687f282e`
