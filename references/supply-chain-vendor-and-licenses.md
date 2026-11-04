# Vendored 框架、外部补丁与许可证 notices（supply-chain §9–§12）

本页触发：同步、新增或重命名 vendored 包，添加或升级 pnpm patch，生成或校验第三方 notices，或引入新许可证时，先读本页。共同使用约定：证据基线、证据标记（源义务／源事实／迁移设计／建议／未验证）与源仓库只读边界见入口页 [supply-chain.md](supply-chain.md)；本页 `deepseek-harness/<path>:<start>-<end>@687f282e` 引用指向固定提交 `687f282e`，文中命令是源仓库已有做法，不表示在迁移目标已运行。

本页机制：[`supply-chain-vendor-sync`](#sc-vendor-sync)、[`supply-chain-vendor-rescope`](#sc-vendor-rescope)、[`supply-chain-vendor-patches`](#sc-vendor-patches)、[`supply-chain-licenses-notices`](#sc-licenses-notices)。领域入口：[supply-chain.md](supply-chain.md)。

<a id="sc-vendor-sync"></a>
## 9. vendored 框架同步（vendor-sync）

### 9.1 源事实

`vendor/` 是 Cordis 框架及基础库的完整源码副本，以 workspace 包形式参与构建/发布。`vendor/README.md` 是权威清单，表头：

`Directory | npm name | Upstream name | Version | Upstream repo | Commit`

证据：`deepseek-harness/vendor/README.md:3-13@687f282e`。

当前 9 个包（`deepseek-harness/docs/rescope.md:18-30@687f282e`）：

| 目录 | npm 名 | 上游名 | 版本 |
|---|---|---|---|
| `vendor/cordis` | `@deepseek-ai/cordis` | `cordis` | 4.0.0-rc.7 |
| `vendor/cosmokit` | `@deepseek-ai/cosmokit` | `cosmokit` | 1.8.1 |
| `vendor/schemastery` | `@deepseek-ai/schemastery` | `schemastery` | 3.18.0 |
| `vendor/loader` | `@deepseek-ai/cordis-plugin-loader` | `@cordisjs/plugin-loader` | 1.0.0-rc.5 |
| `vendor/include` | `@deepseek-ai/cordis-plugin-include` | `@cordisjs/plugin-include` | 1.0.4 |
| `vendor/group` | `@deepseek-ai/cordis-plugin-group` | `@cordisjs/plugin-group` | 1.0.0 |
| `vendor/timer` | `@deepseek-ai/cordis-plugin-timer` | `@cordisjs/plugin-timer` | 1.1.2 |
| `vendor/hmr` | `@deepseek-ai/cordis-plugin-hmr` | `@cordisjs/plugin-hmr` | 1.0.15 |
| `vendor/logger-console` | `@deepseek-ai/cordis-plugin-logger-console` | `@cordisjs/plugin-logger-console` | 1.0.0 |

`vendor/README.md` 规定：

- 复制到 monorepo 的信号：需要接管框架层（调度、插件、schema 校验）与基础库的发布；这是发布决策，不是普通依赖升级。
- 同步流程：先在上游 workspace 同步，不直接在这个仓库改上游包；每个 vendored 包保留 `package.json`，写明版本、repository、exports。
- 本地修改必须记录在 `vendor/README.md` 的 "Local modifications"；`vendor/` 测试失败先判断是上游回归还是本地修改丢失。
- 证据：`deepseek-harness/vendor/README.md:15-57@687f282e`。

自动 guard 只有 lefthook pre-commit 的 `vendor manifest guard`：脚本读取 `git diff --cached --name-only`，只要命中 `^vendor/[^/]+/(src/|bin\.js)` 且同一 staged 批次没有 `vendor/README.md`，就退出 1。它**不**验证 README 是否记录了正确 delta，也不覆盖 `vendor/<pkg>/package.json`、tsconfig、README 等其他文件（`deepseek-harness/lefthook.yml:31-33@687f282e`、`deepseek-harness/scripts/check-vendor-manifest.sh:1-17@687f282e`）。因此“本地修改逐项 diff 为空”只能是人工完成信号，不是自动 gate；`vendor/README.md:37-57` 还要求同步后运行 `npm run test`、`pnpm run build` 并检查 `git diff -U0 vendor/<pkg>`，同样需要执行者实际运行。

本地修改日志（`vendor/README.md:59-73`）覆盖：HMR/timer locale 删除、package manifest、tsconfig、`.ts` 扩展名、tsdown 配置、fiber 生命周期、include refresh/patch、HMR readiness、ESM 条件导出、`applyEntryPatches`、loader observer、`writeTask` 类型、durable writes、延迟配置解析、rescope、禁用插值、loader shape detection、fiber identity、logger disposer、volatile config、module identity、timer locale 等。每一项都写明行为差异与测试覆盖。

`vendor/AGENTS.md` 的实际政策：不得随意编辑 `vendor/*/src/`；每个相对上游的 divergence 都必须在 `vendor/README.md` 的 "Local modifications" 完整登记；`vendor/*/tsconfig.json` 是明确例外，可因 monorepo 集成或 type-checking policy（如 `noImplicitAny`）重生成（`deepseek-harness/vendor/AGENTS.md:1-7@687f282e`）。它没有“只许改构建问题”的规则；README 记录的行为修改与测试覆盖正是按该登记义务存在。迁移时应把“允许的修改类别 + 审批 + 每次同步的 delta 审查”写成明确政策，而不是制造一个源仓并不存在的构建/行为二分。

### 9.2 操作程序：同步一个 vendored 包

1. 在上游 workspace 同步/测试；记录上游 commit（short hash）与版本。
2. 把上游 `src/`（以及 `bin.js`、README、LICENSE）复制到 `vendor/<pkg>/`；保留本仓库的 `package.json` 字段（name、repository、exports、files、private/version）。
3. 按 `vendor/README.md` 的本地修改清单逐项重新应用；不要直接覆盖清单中列出的文件/片段。重新应用后逐项 diff。
4. 更新 `vendor/README.md` 的版本/commit 表；新增/删除本地修改要更新日志（原因、文件、行为、测试）。
5. 若 npm 名/上游名/目录变化，运行 `pnpm run rescope-vendor`（第 10 节）并检查 `docs/rescope.md` 映射。
6. `pnpm install` 更新 lockfile；运行 `pnpm run gen-third-party-notices` 更新 notices；若改 README，运行 translation pairing。
7. 先 stage 改动，再运行 `bash scripts/check-vendor-manifest.sh`（仓库没有 `pnpm run verify-vendor-manifest` 脚本；pre-commit 自动跑同一脚本）与 `pnpm run constraints`；运行该 vendor 包测试与全仓 build。该 guard 只证明 `vendor/README.md` 也被 stage，不证明 delta 记录正确。
8. 发布前运行 `release:pack --family vendor` 与 `release:verify-packed-install --family vendor`。

**完成信号**：staged 集合通过 vendor manifest guard（只证明 README 被 stage）；本地修改逐项 diff 为空；测试通过；notices 更新；lockfile 只含预期变化；vendor tarball 可安装。

**失败处理**：
- 上游覆盖本地修复：从 git diff 恢复，按清单重新应用；不要 `--theirs` 整体覆盖。
- 版本/目录不匹配：修 README 或 package.json，不要只修一边。
- `src/` 缺失：确认该包是否应发布源码；不要直接套用[第 5 节](supply-chain-package-and-installation.md#sc-manifest-publication)的 source/map 规则（vendored 包在 manifest 检查中豁免，但 tarball 仍有 payload 校验）。
- notices 大幅变化：检查是否引入新传递依赖；按第 12 节重生成并审查。

### 9.3 新增 vendored 包清单

- `vendor/<pkg>/package.json`：name `@deepseek-ai/<pkg>`，version 与上游/发布策略一致，repository 指向本仓库，exports/files 指向 `lib`，private 按发布决策。
- `vendor/<pkg>/tsconfig.json`：继承仓库基座；需要时加入 `tsconfig.base.json` paths 与 `tsconfig.host.json` references。
- `vendor/<pkg>/tsdown.config.ts`：只有与仓库默认不同才添加。
- `vendor/README.md`：新增表行（目录、npm 名、上游名、版本、repo、commit）。
- 若发布：加入 vendor release family；运行 publint/node-next/package-meta（注意这些 gate 不自动覆盖 vendor 的 manifest files，需显式纳入）。
- 若带原生构建/安装脚本：加入 `allowBuilds` 并审查。
- 传递依赖：也 vendored，或显式声明 registry 依赖并说明为什么不用 vendoring。避免"一半 vendored、一半 registry"的混合闭包。

**证据边界**：未执行同步；`vendor/README.md` 1-73 与本地修改日志 59-73 已读，但未逐条验证每项修改与上游行为差异。`scripts/check-vendor-manifest.sh:1-17` 与 `lefthook.yml:31-33` 已读；仓库没有 `verify-vendor-manifest` 的 package script，guard 也不检查 README 内容。

---

来源：deepseek-harness/vendor/README.md:1-13@687f282e 来源：deepseek-harness/vendor/README.md:15-57@687f282e 来源：deepseek-harness/vendor/README.md:59-73@687f282e 来源：deepseek-harness/docs/rescope.md:18-30@687f282e 来源：deepseek-harness/vendor/AGENTS.md:1-7@687f282e 来源：deepseek-harness/scripts/check-workspace-constraints.ts:37-47@687f282e 来源：deepseek-harness/scripts/check-vendor-manifest.sh:1-17@687f282e 来源：deepseek-harness/lefthook.yml:5-33@687f282e

<a id="sc-vendor-rescope"></a>
## 10. vendored 包重命名（vendor-rescope）

### 10.1 源事实

`scripts/rescope-vendor.ts` 把 9 个 vendored 包从上游 npm name 迁移到 `@deepseek-ai/*`：

| 目录 | 上游名 | 本地名 |
|---|---|---|
| `cordis` | `cordis` | `@deepseek-ai/cordis` |
| `cosmokit` | `cosmokit` | `@deepseek-ai/cosmokit` |
| `schemastery` | `schemastery` | `@deepseek-ai/schemastery` |
| `loader` | `@cordisjs/plugin-loader` | `@deepseek-ai/cordis-plugin-loader` |
| `include` | `@cordisjs/plugin-include` | `@deepseek-ai/cordis-plugin-include` |
| `group` | `@cordisjs/plugin-group` | `@deepseek-ai/cordis-plugin-group` |
| `timer` | `@cordisjs/plugin-timer` | `@deepseek-ai/cordis-plugin-timer` |
| `hmr` | `@cordisjs/plugin-hmr` | `@deepseek-ai/cordis-plugin-hmr` |
| `logger-console` | `@cordisjs/plugin-logger-console` | `@deepseek-ai/cordis-plugin-logger-console` |

运行模式必须区分：

- **无模式**（`pnpm run rescope-vendor`）是 dry run：只统计将要改的文件/行，不写文件。
- `--apply` 才写文件；`--check` 断言**post-state**：没有残留、每个 exact edit 都已落地、所有 postcondition 命中、再跑一次 `--apply` 是 no-op。
- `--reverse` 反转方向；它必须与 `--apply`/`--check` 组合，例如 `rescope-vendor --apply --reverse`。不要以为裸 `--reverse` 会写文件。

通用替换只改**被引号/`name:` 完整包围的包名 token**：`'old'`、`"old"`、反引号、`'old/subpath'`、YAML `name: old`。它不会改 `cordis.yml`、Loader 的 `cordis:` 前缀、`cordis-config-entry`、`@deepseek-ai/dsh-tool-cordis`、`cordiverse/cordis`；scoped 名中的 `cordis` 前面有 `/`，因此替换是幂等的。Markdown 的全部 fenced code 都跟随重命名；只有 `docs/` 下的 prose 跟随，其他目录的 prose 保留历史事实（例如 Python SDK 的 `cordis` 选项、未 vendoring 的 `@cordisjs/plugin-http`）。

无法用 token 规则表达的站点（点号访问、无引号对象键、正则字面量、vendor manifest 表）列入 `EXACT_EDITS`，每个都带**精确命中次数**；命中数不符、位置移动或重复插入会让整次运行失败，且**不写任何文件**。`GENERIC_SKIPS` 还保护：`schemastery` 的 `Symbol.for` 标识、`cordis` 的 agent preset id、`cordis/*` 事件域、目录名等。`POSTCONDITIONS` 对关键文件做精确计数断言。

排除规则：脚本自身、`.agents/notes/**`（历史记录）、`scripts/snapshots/**`（逐字模型载荷）、`docs/rescope.md`/`.zh.md`（映射文档同时列两名）、`*.i18n.yaml`（配对哈希）、`pnpm-lock.yaml`、`scripts/dependency-catalog/package-lock.json`、`vendor/*/README.md` 与 `vendor/*/LICENSE`（上游原文）不扫描；其他非文本扩展也不扫描。vendor README 的 manifest 表由 exact edit 更新，而不是通用替换。

`AGENTS.md` 只声明 vendor 使用 `@deepseek-ai` rescope 并链接 `docs/rescope.md`；映射表在该文档（已读 1-34），命令块在 `docs/rescope.md:44-51`（`pnpm run rescope-vendor` dry-run、`--apply`、`:check`）；`rescope-vendor:check` 在 `hygiene` 中运行，不在 `ci-static`（`deepseek-harness/AGENTS.md:131-131@687f282e`、`deepseek-harness/docs/rescope.md:44-51@687f282e`、`deepseek-harness/vendor/README.md:51-51@687f282e`）。

### 10.2 操作程序

1. 新增/重命名 vendored 包时，先在脚本 `RENAMES` 与 `docs/rescope.md` 同时加映射；只改一处会导致 dry-run 与文档不一致。
2. 先跑无模式 `pnpm run rescope-vendor`，检查将改的 file/line 分类计数；确认没有把产品 id、事件域或上游原文纳入。
3. 如果新增了 token 规则无法表达的站点，补 `EXACT_EDITS`（含精确 hit count）与必要 `POSTCONDITIONS`；不要靠手工改文件绕过。
4. 运行 `pnpm run rescope-vendor -- --apply`（pnpm 需要 `--` 透传；等价于 `tsx scripts/rescope-vendor.ts --apply`）。
5. 按脚本提示运行 `pnpm install`（更新 lockfile/workspace 链接）、`pnpm run gen-third-party-notices`、并重新录制受影响的 bilingual pairs。
6. 运行 `pnpm run rescope-vendor:check`，再 stage 改动并运行 `bash scripts/check-vendor-manifest.sh`（或依赖 pre-commit）、`constraints`、相关测试与 packed install。
7. 需要回退时用 `--apply --reverse`，再重新 install/notices/pairing；不要只 reverse 一半文件。

**完成信号**：dry-run 报告符合预期；`--apply` 后 `--check` 输出 "post-state verified — no residue, every exact edit landed, idempotent."；vendor manifest guard、constraints、测试通过；lockfile 只出现预期的 workspace 变化；旧 scope 的运行时导入为零（历史 prose/上游文档除外）。

**失败处理**：
- `exact edit ... neither pending nor cleanly applied`：源码站点被上游改动；先修 `find`/`replace`/`expect`，不要手工把文件改成半状态。脚本在写之前已拒绝整次运行。
- `residue: ... still carries a pre-rescope name token`：检查该文件是否被误排除、是否在 `GENERIC_SKIPS` 中、或 token 形态不是被引号完整包围；不要加宽泛 skip 掩盖。
- 文档 prose 没变：非 `docs/` 的 prose 按设计保留历史；如果它实际是用户要执行的配置，改放到 fenced code 或 `docs/`。
- reverse 后产品 id 被改坏：从 Git 恢复该文件，调整 `GENERIC_SKIPS`/`EXACT_EDITS`，再重新 apply；reverse 不是“万能撤销”。
- lockfile 大面积变化：检查是否误改了 registry 依赖；rescope 只应影响 vendored 包的名称/链接。

**例外**：rescope 只处理名称，不处理 API/行为变化；`--check` 的成功还依赖 exact edit 与 postcondition，不只是“搜不到旧名”。vendor 上游 `README`/`LICENSE` 永远保留原文。`docs/rescope.md` 自身同时列上游名和本地名，不能被通用替换。`--check` 不在普通 `ci-static` lane。

**证据边界**：`rescope-vendor.ts` 661 行全读；`docs/rescope.md` 1-34 全读，44-51 的命令块已读；`vendor/README.md:51` 的 rescope 本地修改条目已读。未执行 dry-run/apply/reverse/check；未跑 fixture。`EXACT_EDITS` 的每个站点未逐条在目标文件验证，命中数行为来自源码；reverse 的实际文件结果未观测。

---

来源：deepseek-harness/scripts/rescope-vendor.ts:1-661@687f282e 来源：deepseek-harness/docs/rescope.md:1-34@687f282e 来源：deepseek-harness/docs/rescope.md:44-51@687f282e 来源：deepseek-harness/vendor/README.md:51-51@687f282e 来源：deepseek-harness/AGENTS.md:131-131@687f282e

<a id="sc-vendor-patches"></a>
## 11. 外部补丁（pnpm patchedDependencies）

### 11.1 源事实

`pnpm-workspace.yaml` 注册了 8 个补丁（`deepseek-harness/pnpm-workspace.yaml:108-116@687f282e`），每个键都是**精确包版本**：

| 包 | 补丁 | Desktop 决定 | 补丁作用（源码 diff 观察） |
|---|---|---|---|
| `@earendil-works/pi-ai@1.1.0` | `@earendil-works__pi-ai@1.1.0.patch` | shared；运行时 provider 需要流式参数修复 | 移除 6 个 provider adapter 在每次 delta 上调用 `parseStreamingJson` 的赋值，避免半截 JSON 被提前解析 |
| `@electron/osx-sign@1.3.3` | `@electron__osx-sign@1.3.3.patch` | workspace-only；签名只在 build host 执行 | `walkAsync` 把 `fs.stat` 改为 `fs.lstat`，不跟随 symlink |
| `@fortune-sheet/core@1.0.4` | `@fortune-sheet__core@1.0.4.patch` | workspace-only；补丁代码嵌入 client bundle | HTML 导出改用 `_.escape`；只读模式跳过 freeze line；只读 trackpad 双轴平移 |
| `@fortune-sheet/react@1.0.4` | `@fortune-sheet__react@1.0.4.patch` | workspace-only；补丁代码嵌入 client bundle | 只读公式栏用 `textContent`/`cell.f`；保留 sheet 选择；只读时把 tab 导航宽度计入 scroll 判定 |
| `@yao-pkg/pkg@6.21.0` | `@yao-pkg__pkg@6.21.0.patch` | workspace-only；可执行打包器只在 build host 执行 | 解包 addon 用同目录临时文件 + rename 原子写入；VFS `readdirSync(..., {withFileTypes:true})` 返回 `SEADirent`；worker bootstrap bundle 同步更新 |
| `app-builder-lib@26.17.0` | `app-builder-lib@26.17.0.patch` | workspace-only；DMG 格式校验只在 build host 执行 | 给 DMG `format` 增加 `ULMO`（类型 + scheme） |
| `exceljs@4.4.0` | `exceljs@4.4.0.patch` | workspace-only；补丁 parser 嵌入 client bundle 和 worker | XLSX 解析硬化：XML namespace 规范化、CDATA、关系图重解析、大小写不敏感 part 唯一性、拒绝 external/缺失/冲突 part、UTF-16 BOM |
| `node-pty@1.2.0-beta.15` | `node-pty@1.2.0-beta.15.patch` | shared；运行时终端需要 helper 解析和 Windows worker 清理 | `DSH_NODE_PTY_SPAWN_HELPER` 覆盖、`execPath + '-spawn-helper'` sibling、回退 `native.dir`；kill 后立即 dispose conout worker |

Desktop 不是简单复用整个 patch 列表，而是用 `apps/desktop/scripts/runtime-patch-policy.ts` 给**每个** workspace 补丁显式分类（`shared`/`workspace-only`/`runtime-only`），并写 reason：

- 每个 `pnpm-workspace.yaml.patchedDependencies` 键都必须有 policy 条目；漏一个报 `classify the workspace patch`。
- policy 里的 `shared`/`workspace-only` 条目如果已不在 workspace patch 中，报 `stale workspace patch decision`；`runtime-only` 可以引用仓库内的独立 patch 文件。
- `shared` 复用根 patch 字节，并要求其 sha256 等于根 `pnpm-lock.yaml.patchedDependencies[spec]`；`runtime-only` 用 `path` 指向仓库内文件；`workspace-only` 不进入 Desktop runtime。
- `prepareRuntimePatches` 只写临时 project（拒绝 `projectRoot === repositoryRoot`），把选中的补丁复制为 `patches/desktop-0.patch` 等，并写 `allowUnusedPatches: false`；依赖 override 单独声明，不从 patch 版本推断。当前唯一的 override 是 `@earendil-works/pi-ai@^1.1.0` → `1.1.0`。
- 安装后 `verifyRuntimePatches` 检查：选中的 patch 有实际 runtime 依赖、staged 字节/hash 未变、lockfile hash 匹配、`workspace-only` 包未进入 runtime、解析版本与 patch 版本匹配。

`allowUnusedPatches: true` 只出现在 packed-install fixture（`deepseek-harness/apps/cli/tests/profiles/packed-installation.ts:170-190@687f282e`）；Desktop production 明确写 `false`。源仓库没有 `patches/README.md`，也没有上游 issue/移除版本字段；每个补丁的“为什么”只散落在 Desktop policy 的 reason（且那是 Desktop 范围理由，不完全是 patch 意图）。

### 11.2 操作程序

1. 升级被补丁包时，先确认补丁是否仍适用；`patchedDependencies` 用精确版本键，版本变了不会自动套用。先跑 frozen install 或 `pnpm install`，看是否报 unused patch/应用失败。
2. 用 `pnpm patch <pkg>@<version>` 生成临时目录，修改后 `pnpm patch-commit`；把 patch 放进 `patches/`，更新 `patchedDependencies` 的精确版本键。
3. 如果是 workspace 补丁，更新 `DESKTOP_RUNTIME_PATCHES`：每个新增/删除键都要有显式 `shared`/`workspace-only`/`runtime-only` 决定和 reason；不要用“默认 shared”省掉分类。
4. 审查 patch：只含必要修复，不夹带无关格式化/版本号/构建产物；确认它改的是上游发布文件路径（这些补丁多数直接改 `dist`/`lib`）。
5. 运行 `pnpm install --frozen-lockfile`，确认 patch 应用；再跑受影响测试。若是 Desktop 补丁，运行 `prepare-runtime-patches`/打包并确认 `verifyRuntimePatches` 的 hash/版本/workspace-only 检查通过。
6. 用 packed install/真实消费者验证补丁效果；补丁可能在 workspace 生效但在消费者安装中失效（尤其构建工具补丁）。发布物不包含 `patches/` 时，消费者不会得到补丁；需要推上游或运行时 shim。
7. 更新 notices（补丁不改变许可证，但可能改变分发文件）。
8. 记录移除条件：上游修复版本、目标升级日期、负责人、验证测试。**源仓库没有这些字段**；`patches/README.md` 是迁移建议，不是源码既有机制。

**完成信号**：安装成功；patch diff 只含预期文件；Desktop policy 覆盖所有键且无 stale；受影响测试/消费者验证通过；notices 无异常。

**失败处理**：
- 升级后 patch 不适用：重新生成；不要改 `patchedDependencies` 的版本键复用旧补丁。
- Desktop 报 `classify the workspace patch`：补 policy 条目；报 `stale workspace patch decision`：删除/更新过期条目。
- Desktop 报 shared hash 不等于根 lockfile：先确认根 patch 和 lockfile 是同一份字节；不要手改 lock hash 绕过。
- Desktop 报 workspace-only dependency entered the runtime：检查该包为何进入 runtime；不要把 `workspace-only` 改成 `shared` 图省事。
- patch 在本地生效但发布消费者失败：检查补丁是否只改 workspace 路径/构建脚本；发布物不包含 `patches/` 时消费者不会得到补丁效果。
- 多个包共享同一补丁目标：确认版本键精确匹配，避免升级导致静默失效。

**例外**：生产仓库若开启 `allowUnusedPatches: true`，补丁失效会被静默忽略，是供应链风险；Desktop 明确使用 `false`，不要把它当作便利开关。`workspace-only` 补丁**故意**不进入 Desktop runtime，不能因为 runtime 里没有它而报缺失。`runtime-only` 补丁可以不在根 `pnpm-workspace.yaml` 中，但必须位于仓库内且被 policy 显式引用。

**证据边界**：8 个 patch 文件均按 hunk/关键 diff 阅读；`exceljs` 806 行未逐行语义审阅，`@yao-pkg/pkg` 的巨型 worker bundle 行（patch 122-123）未展开逐字符比对。未运行安装/patch 应用/Desktop 打包/消费者测试。`prepareRuntimePatches`/`verifyRuntimePatches` 1-124 全读，Desktop policy 1-25 全读，`packaging/README.md` 261-265 全读。

---

来源：deepseek-harness/pnpm-workspace.yaml:108-116@687f282e 来源：deepseek-harness/patches/@earendil-works__pi-ai@1.1.0.patch:1-73@687f282e 来源：deepseek-harness/patches/@electron__osx-sign@1.3.3.patch:1-26@687f282e 来源：deepseek-harness/patches/@fortune-sheet__core@1.0.4.patch:1-76@687f282e 来源：deepseek-harness/patches/@fortune-sheet__react@1.0.4.patch:1-138@687f282e 来源：deepseek-harness/patches/@yao-pkg__pkg@6.21.0.patch:1-134@687f282e 来源：deepseek-harness/patches/app-builder-lib@26.17.0.patch:1-27@687f282e 来源：deepseek-harness/patches/exceljs@4.4.0.patch:1-806@687f282e 来源：deepseek-harness/patches/node-pty@1.2.0-beta.15.patch:1-45@687f282e 来源：deepseek-harness/apps/desktop/scripts/runtime-patch-policy.ts:1-25@687f282e 来源：deepseek-harness/apps/desktop/scripts/prepare-runtime-patches.ts:1-124@687f282e 来源：deepseek-harness/apps/desktop/packaging/README.md:261-265@687f282e 来源：deepseek-harness/apps/cli/tests/profiles/packed-installation.ts:130-190@687f282e

<a id="sc-licenses-notices"></a>
## 12. 许可证、第三方 notices 与分发

### 12.1 源义务

- 根 `LICENSE` 是 MIT（`deepseek-harness/LICENSE:1-20@687f282e`）。
- `verify-dsh-package-licenses`：通过根 `package.json.workspaces` 找到所有匹配 `^@deepseek-ai/dsh(?:-|$)` 的包，要求 `license: "MIT"`；不检查根 LICENSE 是否存在，也不覆盖 `benchmarks/`、`python/`（因为 `package.json.workspaces` 不含它们）。证据：`deepseek-harness/scripts/verify-dsh-package-licenses.ts:1-89@687f282e`。
- `gen-third-party-notices` 从以下输入生成 `THIRD_PARTY_NOTICES.md`：
  - **workspace manifest 集合**：由 `pnpm-workspace.yaml.packages` 派生（根 `package.json` + 每个成员 glob），不是硬编码目录；若少于 100 个 manifest 直接报错，防止 glob 过期静默漏包。路径统一为 `/`，避免 Windows 反斜杠把 dev-area 误判为 runtime。
  - 四个依赖面（`dependencies`/`devDependencies`/`optionalDependencies`/`peerDependencies`）的全部外部包；workspace 包名与 `workspace:` range 被排除。
  - `vendor/README.md` 的 vendored manifest 表；**vendor 目录本身才是必须披露的集合**：每个有 `package.json` 的 vendor 目录都必须有表行，表行也必须对应真实目录；所有 vendored 包必须 `license: MIT`（否则生成器报错）。
  - `python/*/pyproject.toml` 的 build-system/project/optional/dependency-groups 需求；本地 project name 排除。
  - 共享 Python distribution lock：`scripts/primary-runtime/lock.json` 的 `pythonPackages`；每个 distribution 必须有 `PYTHON_METADATA` 条目，否则硬错误；同名不同版本/重复 normalized name 也报错。
  - pnpm patch 列表（`pnpm-workspace.yaml.patchedDependencies`）。
  - 浏览器构建实际打包的第三方包：`browserBundledExternals()` + `chrome-devtools-frontend`；若浏览器包没有 workspace 依赖声明，报错。
  - npm 元数据来自已安装的 store：先找 workspace 声明的本地链接，再找根 `node_modules`、`native/system/node_modules` 及 `.pnpm` 虚拟 store；license/repository 解析失败会报错，必须 `pnpm install` 或加 `OVERRIDES`。
  - 证据：`deepseek-harness/scripts/gen-third-party-notices.ts:1-99@687f282e`、`deepseek-harness/scripts/gen-third-party-notices.ts:100-424@687f282e`、`deepseek-harness/scripts/gen-third-party-notices.ts:425-545@687f282e`、`deepseek-harness/scripts/gen-third-party-notices.ts:632-763@687f282e`。
- 分层：
  - `DEV_ONLY_AREAS` 精确为：根 `package.json`、`packages/test-support/`、`packages/test-support/client-runtime/`、`website/`、`native/`；这些区域只做声明披露，不声称运行时可达。
  - 其他区域声明的 runtime 依赖（`dependencies`/`optionalDependencies`）被视为"用户可能从 `cordis.yml` 挂载的插件"，必须披露；同一包只要在任一非 dev-only 区域是 runtime，就标为 runtime。
  - `tsx` 被硬编码为 runtime（源码运行脚本经它的 ESM hook）。
  - `FIRST_PARTY` 原生包（`@deepseek-ai/node-addon-system*`）不列为第三方；`@deepseek-ai/libreoffice-kit*` 有单独段。
  - vendored 包单列，必须同时写本地名（`npmName`）、上游名（`upstreamName`）、上游仓库和 source directory；MIT 归属不能只写本地 scope。
  - Python SDK 直接依赖与 bundled distributions 分表；Chrome DevTools/LibreOffice/Claude Agent SDK 有专门段落。
  - 证据：`deepseek-harness/scripts/gen-third-party-notices.ts:30-99@687f282e`、`deepseek-harness/scripts/gen-third-party-notices.ts:721-763@687f282e`。
- **许可证策略是 fail-closed 的自动检查，不只是披露**：
  - permissive 集合精确为 `MIT, MIT-CMU, ISC, BSD-2-Clause, BSD-3-Clause, Apache-2.0, 0BSD, Unlicense, CC0-1.0, BlueOak-1.0.0, Python-2.0, PSF-2.0`。
  - SPDX `OR` 只要一个 permissive 分支；`AND` 必须全 permissive；带 `+`、exception、未知标识或解析失败一律 false。`/` 被当成 `OR` 兼容非标准 manifest。
  - runtime 包若不在 permissive 集合，必须有精确 owner 授权：仅 `@anthropic-ai/claude-agent-sdk`（身份级），或 `@deepseek-ai/libreoffice-kit*` 且 license 精确 `MPL-2.0`。授权不把条款重新分类为 permissive，也不覆盖相似包/新版本。
  - dev-only 的非 permissive 包不阻止生成，但会在 dev 表后生成“仅开发工具、不链接/分发”的说明。
  - 证据：`deepseek-harness/scripts/gen-third-party-notices.ts:652-706@687f282e`。
- `--check` 比较提交的 bytes 与生成结果；`verify-third-party-notices` 是 `gen-third-party-notices --check`。`gen-third-party-notices.spec.ts` 在 test lane 中执行 freshness 与输入/许可证分支检查。
- 源 notices 明确说：它是**直接依赖**披露；完整 npm 传递闭包在 `pnpm-lock.yaml`，用 `pnpm licenses list` 查看；Python 闭包在 `python/sdk/uv.lock`（`deepseek-harness/scripts/gen-third-party-notices.ts:778-780@687f282e`、`deepseek-harness/THIRD_PARTY_NOTICES.md:8-10@687f282e`）。
- **“complete notices” 的当前处置**：源仓库没有 `completeNotice`/`CompleteNotice` 标识符（全仓搜索无匹配）；唯一 “complete notices” 措辞是 `scripts/gen-third-party-notices.ts:742@687f282e` 的 JSDoc `Render the complete notices document`。这里的 “complete” 指按生成器定义的全部输入渲染完整文档，**不是**完整传递闭包许可证/notice 汇编。当前 `THIRD_PARTY_NOTICES.md` 是 304 行的直接依赖/特殊 payload 披露表：包名、SPDX 标识或声明、repo 链接、vendored/Python/Claude/LibreOffice/Chrome 等选定段落；它不包含每个 npm 包（尤其传递依赖）的完整 LICENSE/NOTICE 正文。`--check` 与 `gen-third-party-notices.spec.ts` 只验证生成字节与 freshness，不验证法律完整性。迁移若要求“完整 notices”，必须改生成器/分发物（例如逐包收集 license text）或在交付说明中明确该缺口，不能把当前文件改名或描述成 complete 法律汇编。
- 当前产物还包含 8 个 patch 条目、9 个 vendored 包、Chrome DevTools frontend、Claude 平台 payload、LibreOffice kit、Python 直接依赖与 bundled distributions，以及 first-party native 说明（`deepseek-harness/THIRD_PARTY_NOTICES.md:12-304@687f282e`）。这些段落有各自的源义务，不能用一个“完整”标签替代逐项审查。

### 12.2 操作程序

1. 新增/升级/删除依赖后，`pnpm install`（生成器读 installed store），再 `pnpm run gen-third-party-notices`。
2. 审查 diff：新增包名/版本/许可证/归属；删除不再使用的条目；vendored 上游 commit 是否更新。
3. 运行 `pnpm run verify-third-party-notices` 或对应 test spec。
4. 运行 `pnpm run verify-dsh-package-licenses`；新增 DSH 包必须 MIT。
5. 引入新许可证时，先看 `isPermissive` 是否接受；不在集合内且不是精确 owner 授权（Claude SDK/LibreOffice）的 **runtime** 包会让生成器直接失败。接受不等于完成法律审查：仍要确认 NOTICE、源码提供、专利/再分发条款。dev-only 非 permissive 只会得到说明，不会自动获得分发许可。
6. 发布前检查 tarball 是否包含必要 LICENSE/notice；普通包依赖 license 字段与根 LICENSE，少数包通过 `files` 带 LICENSE。

**完成信号**：notices check 通过；所有 DSH 包 MIT；tarball license 字段与 notices 一致；vendored 上游归属正确。

**失败处理**：
- notices 与生成结果不一致：重新生成并审查，不要手工编辑生成文件。
- `cannot resolve license for ...` / `cannot resolve repository for ...`：先 `pnpm install`，再检查该包的 manifest；确实缺失时加 `OVERRIDES` 并写清原因，不要伪造 license 字段。
- `runtime ... is not a permissive license`：确认是否真的进入 runtime；若是，取得精确 owner 授权或替换依赖。不要把 `devDependencies` 当成逃避 runtime 披露的开关。
- `vendor/README.md has no manifest-table row for ...`：表格式变了或 vendor 目录未同步；补行/修表，不能只改 notices。
- `vendored ... declares license ...; assumes MIT`：停止；vendored 段只接受 MIT，需重新评估分发条款。
- Python `missing from PYTHON_METADATA`：为已锁定的 distribution 补 license/repo 元数据；生成器不读 wheel 来猜。
- `browser package ... has no workspace dependency declaration`：把浏览器外部包写进某个 workspace manifest，或修正 `browserBundledExternals`；不要让它只在构建配置里出现。

**例外**：
- `native/` 被标为 dev-only area，但原生 prebuilds 可能实际分发；迁移时要确认不会漏掉原生二进制依赖。
- 生成器把 `@anthropic-ai/claude-agent-sdk`、LibreOffice kit 等作为窄授权特例；不要把这些特例扩大到相似包。
- vendored 包在 manifest `files` 检查中豁免 source/map，但 notices 仍必须保留上游许可证。

**证据边界**：未运行生成器/安装/测试；`gen-third-party-notices.ts` 870 行按段全读，`gen-third-party-notices.spec.ts` 1-471 全读，提交的 `THIRD_PARTY_NOTICES.md` 1-304 全读（但这不等于运行 `--check` 或法律审计）。未做法律审计；生成器的 permissive 判定只覆盖其允许列表和精确 owner 授权，不能证明条款兼容性。`license` 字段可能错误，`OVERRIDES` 是人工元数据而非上游事实。当前没有完整传递闭包的逐包 license text；不要把“complete notices document”的 JSDoc 误读成该保证。

---

来源：deepseek-harness/scripts/gen-third-party-notices.ts:1-99@687f282e 来源：deepseek-harness/scripts/gen-third-party-notices.ts:100-424@687f282e 来源：deepseek-harness/scripts/gen-third-party-notices.ts:425-545@687f282e 来源：deepseek-harness/scripts/gen-third-party-notices.ts:549-628@687f282e 来源：deepseek-harness/scripts/gen-third-party-notices.ts:632-706@687f282e 来源：deepseek-harness/scripts/gen-third-party-notices.ts:721-870@687f282e 来源：deepseek-harness/scripts/gen-third-party-notices.spec.ts:1-471@687f282e 来源：deepseek-harness/scripts/verify-dsh-package-licenses.ts:1-89@687f282e 来源：deepseek-harness/LICENSE:1-20@687f282e 来源：deepseek-harness/THIRD_PARTY_NOTICES.md:1-304@687f282e 来源：deepseek-harness/scripts/gen-third-party-notices.ts:741-745@687f282e

**来源坐标补充**：以下坐标对应本页机制（固定提交 `687f282e`）；只用于追溯，不新增正文断言，正文解释以上文小节为准。

- `supply-chain-vendor-sync`：`deepseek-harness/vendor/README.md:1-13@687f282e`、`deepseek-harness/vendor/README.md:59-73@687f282e`
- `supply-chain-vendor-rescope`：`deepseek-harness/scripts/rescope-vendor.ts:1-661@687f282e`、`deepseek-harness/docs/rescope.md:1-31@687f282e`
- `supply-chain-vendor-patches`：`deepseek-harness/patches/@earendil-works__pi-ai@1.1.0.patch:1-73@687f282e`、`deepseek-harness/patches/@electron__osx-sign@1.3.3.patch:1-26@687f282e`、`deepseek-harness/patches/@fortune-sheet__core@1.0.4.patch:1-76@687f282e`、`deepseek-harness/patches/@fortune-sheet__react@1.0.4.patch:1-138@687f282e`、`deepseek-harness/patches/@yao-pkg__pkg@6.21.0.patch:1-134@687f282e`、`deepseek-harness/patches/app-builder-lib@26.17.0.patch:1-27@687f282e`、`deepseek-harness/patches/exceljs@4.4.0.patch:1-806@687f282e`、`deepseek-harness/patches/node-pty@1.2.0-beta.15.patch:1-45@687f282e`、`deepseek-harness/apps/desktop/scripts/runtime-patch-policy.ts:1-25@687f282e`、`deepseek-harness/apps/desktop/scripts/prepare-runtime-patches.ts:1-124@687f282e`、`deepseek-harness/apps/desktop/packaging/README.md:261-265@687f282e`
- `supply-chain-licenses-notices`：`deepseek-harness/scripts/gen-third-party-notices.ts:549-628@687f282e`、`deepseek-harness/scripts/gen-third-party-notices.ts:721-870@687f282e`、`deepseek-harness/scripts/gen-third-party-notices.spec.ts:1-471@687f282e`、`deepseek-harness/THIRD_PARTY_NOTICES.md:1-304@687f282e`
