# 发布 manifest、包路径、ESM 与安装边界（supply-chain §5–§7、§13–§15）

本页触发：新增公开包、移动或重命名包、修改 manifests 的 exports／files、构建后验证 publint／NodeNext／package-meta、检查单可执行部署闭包、双版本 npm 布局或 packed tarball 安装时，先读本页。共同使用约定：证据基线、证据标记（源义务／源事实／迁移设计／建议／未验证）与源仓库只读边界见入口页 [supply-chain.md](supply-chain.md)；本页 `deepseek-harness/<path>:<start>-<end>@687f282e` 引用指向固定提交 `687f282e`，文中命令是源仓库已有做法，不表示在迁移目标已运行。

本页机制：[`supply-chain-manifest-publication`](#sc-manifest-publication)、[`supply-chain-package-paths`](#sc-package-paths)、[`supply-chain-esm-payload`](#sc-esm-payload)、[`supply-chain-runtime-closure`](#sc-runtime-closure)、[`supply-chain-install-layout`](#sc-install-layout)、[`supply-chain-packed-install`](#sc-packed-install)。领域入口：[supply-chain.md](supply-chain.md)。

<a id="sc-manifest-publication"></a>
## 5. 发布 manifest：分类、private/public、files、exports

### 5.1 发布树与排除

`check-workspace-constraints.ts` 的 `workspaceGlobs` 只覆盖：

- `vendor/`（深度 1）
- `packages/`（深度 2，即 `packages/<group>/<pkg>`）
- `native/`（深度 1）
- `native/system/packages/`（深度 1）
- `apps/`（深度 1）

`benchmarks/`、`website/`、`python/` 不在发布 manifest 检查范围。证据：`deepseek-harness/scripts/check-workspace-constraints.ts:28-36@687f282e`。

Release member 判定（`standardReleaseMemberDirectory`）：

- 包含 `packages/<非 experimental>/<pkg>`、`apps/<非 desktop/desktop-host/plugin-market-generator>`、`vendor/<pkg>`。
- 显式排除 `apps/desktop`、`apps/desktop-host`、`apps/plugin-market-generator`。
- `packages/ssh/ssh-helper-runtime` 被排除（以可执行归档分发，不作为 npm application）。
- 实验包另由 `isPublicExperimentalPackageDirectory` 决定。
- 证据：`deepseek-harness/scripts/check-workspace-constraints.ts:62-88@687f282e`、`deepseek-harness/scripts/check-workspace-constraints.ts:399-402@687f282e`。

### 5.2 public release member 的必备字段

对每个 release member：

- `private` 不得为 `true`；
- `publishConfig.access` 必须为 `"public"`；
- `repository.type` 必须为 `"git"`，`repository.url` 必须是源仓库 URL，`repository.directory` 必须等于包目录；
- 证据：`deepseek-harness/scripts/check-workspace-constraints.ts:452-477@687f282e`。

public native 包（5 个 `@deepseek-ai/node-addon-system*`）：

- 必须 public、`publishConfig.access: "public"`、repository 字段匹配；
- 版本必须等于 `native/system` 的版本；
- 证据：`deepseek-harness/scripts/check-workspace-constraints.ts:469-503@687f282e`。

private 包：

- 必须 `private: true`（非实验、非 release member 的 packages/apps）；
- 不得有 `publishConfig`（实验包分支明确要求 omit）；
- 不得有 `dsh.client`（源码 public/private 分支中的检查；见 5.4）。
- 证据：`deepseek-harness/scripts/check-workspace-constraints.ts:423-460@687f282e`。

### 5.3 实验包与 native 包

实验包判定：目录匹配 `packages/experimental/<one>`，或包名以 `@deepseek-ai/dsh-experimental-` 开头，或属于 11 个保留名：

`@deepseek-ai/dsh-cua`、`dsh-tool-session-query`、`dsh-session-title-all-prompts-llm`、`dsh-tool-terminal`、`dsh-tool-ralph`、`dsh-skill-badge`、`dsh-hook-protocol`、`dsh-hooks-claude-code`、`dsh-hooks-codex`、`dsh-webhook`、`dsh-webhook-github`。

证据：`deepseek-harness/scripts/experimental-package-policy.ts:5-18@687f282e`。

规则：

- 公开实验包（`packages/experimental/<one>` 且不在 `PRIVATE_EXPERIMENTAL_PACKAGE_DIRECTORIES`，当前为空）：必须 `publishConfig.access: "public"`，不得 `private: true`。
- 私有实验包：必须 `private: true`，必须省略 `publishConfig`。
- 包名必须以前缀开头，或精确匹配其目录对应的保留名；保留名必须恰好有一个 workspace owner 在声明目录，不能移动/重命名/重复。
- 证据：`deepseek-harness/scripts/check-workspace-constraints.ts:361-410@687f282e`。

### 5.4 DSH 包的 ESM 与 files

对 `packages/` 下所有 `@deepseek-ai/dsh-*` 包（包括 private）：

- `type: "module"`；
- `main: "lib/index.js"`；
- `types: "lib/types/index.d.ts"`；
- `exports["."].types === "./lib/types/index.d.ts"`；
- `exports["."].default === "./lib/index.js"`；
- `@deepseek-ai/cordis` 必须同时是 `peerDependencies` 和 `devDependencies`，两者 range 相同；
- `files` 必须精确等于 `expectedDshPackageFiles(manifest)`。

证据：`deepseek-harness/scripts/check-workspace-constraints.ts:509-545@687f282e`。

`expectedDshPackageFiles` 不是固定列表，而是从 manifest 推导：

- `icon`/`exports` 中的 icon 文件；
- `exports` 中的 locale JSON；
- `lib/index.js`；
- 有 `bin` 时加 `lib/bin.js`；
- `./worker` 为 `lib/worker.cjs`/`lib/worker.js`；
- `./client` 为 `lib/client.js`/`lib/client.browser.js`，以及 `node` 条件的 `lib/client.node.js`；
- `./loader`、`./store`、`./startup` 的独立 bundle；
- `packageFileExtras` 的包特有条目；
- `lib/types/**/*.d.ts`；
- `./typert`/`./client/typert` 的生成对；
- `./remote` 的 `typert.remote-client` 对。
- 证据：`deepseek-harness/scripts/check-workspace-constraints.ts:261-320@687f282e`。

`packageFileExtras` 是硬编码映射，覆盖 CUA、webhook 示例、worker bootstrap、CSS、Python 源码、assets、SSH、subprocess、hashed chunk 等（`deepseek-harness/scripts/check-workspace-constraints.ts:180-250@687f282e`）。新增发布文件必须改这里或让文件从 exports/bin/字段推导；否则 `files` gate 失败。

App 包的特例（`appPackageFiles`）：

- `@deepseek-ai/dsh`：`['lib/*.js', 'lib/types/*.d.ts']`；
- `@deepseek-ai/dsh-desktop-host`：`['lib/index.js', 'lib/cli.js']`；
- `@deepseek-ai/dsh-web-frontend`：`['dist', '!dist/**/*.map', '!dist/preview.html', '!dist/preview']`。
- 证据：`deepseek-harness/scripts/check-workspace-constraints.ts:79-88@687f282e`。

### 5.4.1 标准 export key set：文档/评审约束，不是自动 gate

`deepseek-harness/docs/defensive-patterns/package-surface.md:75-113@687f282e` 规定标准键集合：`.`、`./package.json`、`./src/*`、`./client`、`./types`、`./typert`、`./remote`、`./locale/*.json`、`./cordis.patch.yml`。集合外键（如 `./brand`、`./worker`、`./startup`、`./runner`、`./protocol`）是待评审遗留，不是新先例；新增键要求同时改 owning document 与 check，并获 domain owner 确认。

但**没有找到自动执行完整 key-set allowlist 的 gate**：

- `checkWorkspaceManifest` 只强制根入口 `exports["."].types` 与 `exports["."].default`（`deepseek-harness/scripts/check-workspace-constraints.ts:509-545@687f282e`）。
- `expectedDshPackageFiles` 会读取 locale/icon 键和 `./client`、`./worker`、`./loader`、`./store`、`./startup`、`./typert`、`./remote` 等特定子路径来推导 `files`，但不会拒绝集合外的其他键（`deepseek-harness/scripts/check-workspace-constraints.ts:261-320@687f282e`）。
- `deepseek-harness/scripts/verify-package-meta.ts:128-253@687f282e` 只检查 locale/icon 资源与发布文件，不检查键集合。
- `deepseek-harness/scripts/publint-all.ts:1-245@687f282e` 是通用 package lint，没有本仓库的键 allowlist。
- 因此：**新增未文档化 export key 不会被 constraints 自动拒绝**。迁移评审必须显式检查；在目标仓库补上真正的 allowlist gate 之前，不要把文档声明当成已实现强制。

### 5.5 源码/map 禁令

- `isForbiddenPublicationFile` 拒绝：路径 `src`、`src/**`、`*.d.ts.map`、`*.js.map`（`deepseek-harness/scripts/publication-payload.ts:30-45@687f282e`）。
- `validateTarballPayload` 对 packed tarball 成员执行同样规则（`deepseek-harness/scripts/publication-payload.ts:47-55@687f282e`）。
- `checkWorkspaceManifest` 对 `manifest.files` 中列出的路径做同样检查，唯一允许的源文件是 `@deepseek-ai/node-addon-system` 的 `src/main.c`、`src/flock.c`（`publicationSourceAllowlist`；`deepseek-harness/scripts/check-workspace-constraints.ts:56-58@687f282e`）。
- **例外**：`checkWorkspaceManifest` 在检查 `files` 前，如果包名在 `vendoredPackages` 集合中会直接返回，因此 vendored 包的 manifest `files` 不受 source/map 扫描（`deepseek-harness/scripts/check-workspace-constraints.ts:478-505@687f282e`）。但 `release/pack.ts` 对每个成员的 tarball 调用 `family.validatePayload`，所以 packed tarball 仍受 payload 校验；不要把"manifest 豁免"误读成"tarball 豁免"。

### 5.6 操作程序：新增公开包

1. 选目录：`packages/<group>/<pkg>`；group 不得有 `package.json`（第 6 节）。
2. 写 name/version/license/repository；version 按[第 3 节](supply-chain-workspace-and-versions.md#sc-workspace-protocol)与根对齐（DSH 家族）。
3. 写 `private`/`publishConfig`：public 不写 `private`，写 `publishConfig.access: "public"`；private 写 `private: true`，不写 `publishConfig`。
4. 写 `type: "module"`、`main`、`types`、根入口 `exports["."]` 的 types/default；其他 export 键先对照标准 key set，新增键需改文档/检查/owner，不能只靠 gates。
5. 写 `files`：优先让 `expectedDshPackageFiles` 从 exports/bin/locale/icon 推导；确实需要额外文件时补 `packageFileExtras` 并写理由。
6. 对 DSH 包写 `@deepseek-ai/cordis` 的 peer+dev 同 range。
7. 构建后运行 `pnpm run constraints`、`pnpm run package-meta`、`pnpm run publint`、`pnpm run verify-package-paths`（文档路径，不是发布路径）。
8. 打包后运行 `release:pack` 与 `release:verify-packed-install`；检查 tarball 没有 `src`/map。

**完成信号**：`constraints` 无错误；`files` 与 tarball 清单一致；publint/package-meta 通过；packed install 可加载每个公开入口。

**失败处理**：
- `files` 不匹配：先判断文件是否应发布；应发布则补推导/extra，不应发布则从构建/复制步骤删除。不要为了让 gate 通过而把 `src` 加进白名单。
- `exports` 多入口：根入口固定，但标准 subpath（`./client`、`./types`、`./remote`、`./locale/*.json` 等）是允许且实际存在的；只有标准集合之外的新键才需要先改文档/检查并获 owner 确认，不要在单包里偷偷加。
- 源码/map 进入 tarball：修构建器的 sourcemap/复制配置；不要在 `files` 里用负模式掩盖（负模式可能被 publint 的 files 视图忽略）。
- app 包 `files` 不匹配：用 `appPackageFiles` 的精确列表，不要套普通包模板。

**例外**：vendored 包在 manifest 检查中豁免 source/map 扫描，但 tarball 仍由 `validateTarballPayload` 检查；如果确实需要发布源码，必须扩展 allowlist 并记录审计理由。`@deepseek-ai/dsh-experimental-cua-macos` 的 `native/*` 文件通过 `packageFileExtras` 发布，不是通用 `src` 例外。

**证据边界**：未构建/打包；`expectedDshPackageFiles` 的完整 60 行只读了入口和代表项，未逐项验证所有导出条件。`validateTarballPayload` 对 vendor family 的调用路径需要看 `families.ts` 的 `validatePayload` 实现（源文件 390+ 行）；本文只确认 `pack.ts` 调用了它。

---

来源：deepseek-harness/scripts/check-workspace-constraints.ts:28-36@687f282e 来源：deepseek-harness/scripts/check-workspace-constraints.ts:37-58@687f282e 来源：deepseek-harness/scripts/check-workspace-constraints.ts:62-88@687f282e 来源：deepseek-harness/scripts/check-workspace-constraints.ts:180-250@687f282e 来源：deepseek-harness/scripts/check-workspace-constraints.ts:261-320@687f282e 来源：deepseek-harness/scripts/check-workspace-constraints.ts:434-549@687f282e 来源：deepseek-harness/scripts/publication-payload.ts:1-55@687f282e 来源：deepseek-harness/scripts/release/pack.ts:22-35@687f282e 来源：deepseek-harness/scripts/check-workspace-constraints.ts:91-361@687f282e 来源：deepseek-harness/docs/defensive-patterns/package-surface.md:75-113@687f282e 来源：deepseek-harness/scripts/check-workspace-constraints.spec.ts:288-475@687f282e 来源：deepseek-harness/apps/cli/package.json:5-7@687f282e 来源：deepseek-harness/apps/cli/package.json:14-19@687f282e 来源：deepseek-harness/apps/cli/package.json:165-172@687f282e

<a id="sc-package-paths"></a>
## 6. 包目录层级与文档中的包路径漂移

### 6.1 源义务

`checkHierarchyShape`：

- `packages/<group>/<pkg>` 恰好两层；
- `packages/<group>/` 下不能有 `package.json`；
- `packages/<group>/<pkg>/` 下必须有 `package.json`，不能更深；
- `localArtifactDirs`（如 `node_modules`）跳过。
- 证据：`deepseek-harness/scripts/check-workspace-constraints.ts:549-570@687f282e`。

`verify-package-paths.ts` 是**文档/TypeScript 中的包路径漂移检查**，不是发布文件存在性检查：

- 扫描 `README.md`、`.agents/notes/**/*.md`、`docs/**/*.md`、`packages/*/*.md`、`packages/*/*/*.md`、`AGENTS.md`、`packages/AGENTS.md`、`packages/**/*.ts`；
- 匹配 `packages/<path>` 引用；glob/占位符/brace 会被终止符排除；
- 只有缺失路径的某个 segment 是当前真实包名时才算 drift（避免把提案/笔误当错误）；
- 排除 `vendor/`、`lib/`、`.d.ts`、归档 Agent Note；
- 未构建的 `lib/` 路径在已存在的 depth-two 包根下忽略；
- 持久化历史区域（`docs/persistence-changes/historical-formats/**` 中标记的 generated schema region）保留旧源码路径，不视为 drift；标记必须成对、顶格、非嵌套、非行内，否则退回严格检查（`deepseek-harness/scripts/verify-package-paths.spec.ts:1-73@687f282e`）。
- 证据：`deepseek-harness/scripts/verify-package-paths.ts:1-113@687f282e`。

`gen-tsconfig-paths.ts` 是 **TS 路径别名生成器**，不是另一个手写检查：

- 它只扫描 `packages/<group>/<pkg>`，选择 manifest `name` 以 `@deepseek-ai/dsh-` 开头且存在 `src/` 的包；
- 生成的 alias 只覆盖 `name === @deepseek-ai/dsh-<目录名>` 的包；名字与目录不一致的包（例如 `@deepseek-ai/dsh-typert-protocol`）必须由手写 alias 覆盖，生成器不会臆造映射；
- alias 写入 `tsconfig.base.json` 的 `// BEGIN generated package aliases — pnpm run gen-tsconfig-paths` / `// END generated package aliases` 标记区，标记外内容不动；标记缺失或顺序错误直接报错；
- 两个目录声明同一 specifier 时报错，因为显式 map 无法表达旧 wildcard 的 group 顺序 tiebreak；
- 生成后检查每个 `@deepseek-ai/dsh-` 包都被某个 alias 覆盖；未覆盖包会经 workspace symlink 解析到 `lib/` 构建产物，造成“源码/产物平面泄漏”，所以这是 gate 失败；
- `--check` 只在字节过期时报错；`pnpm run gen-tsconfig-paths` 写回；它已删除 `@deepseek-ai/dsh-*` 的 group wildcard（`deepseek-harness/scripts/gen-tsconfig-paths.ts:1-239@687f282e`、`deepseek-harness/scripts/gen-tsconfig-paths.spec.ts:1-96@687f282e`）。

`tsconfig.base.json` 同时是 `vite-tsconfig-paths` 的解析 facade：文件头明确禁止添加 `include`/`files`（否则会把 match-all 范围泄漏到每个继承包）；基础选项是 `module: esnext`、`moduleResolution: bundler`、`allowImportingTsExtensions: true`、`rewriteRelativeImportExtensions: true`、`verbatimModuleSyntax: false`，`paths` 中另有生成区。`tsconfig.base.client.json` 在它之上加 React JSX 与 DOM lib；`tsconfig.host.json`/`tsconfig.client.json` 是两个独立 typecheck 单元，并各自把 `rewriteRelativeImportExtensions` 设为 `false`（`deepseek-harness/tsconfig.base.json:1-30@687f282e`、`deepseek-harness/tsconfig.base.client.json:1-12@687f282e`、`deepseek-harness/tsconfig.host.json:1-10@687f282e`、`deepseek-harness/tsconfig.client.json:1-15@687f282e`）。迁移时若目标仓库不用 bundler/tsx，必须重新选择 moduleResolution；不要把这里的 bundler 配置当成 NodeNext 消费证明。

### 6.2 操作程序：移动/重命名包

1. 用 `git mv` 保留历史；确保新目录仍是 `packages/<group>/<pkg>` 两层。
2. 更新所有引用：`tsconfig.base.json` 生成区（若包名与目录名一致，运行 `gen-tsconfig-paths`；否则必须手写 alias）、`tsconfig.host.json`/`tsconfig.client.json` references、package.json 的 workspace 依赖、release family glob（若适用）、docs/AGENTS/notes。
3. 运行 `pnpm run verify-package-paths`（文档/TS 漂移）和 `pnpm run verify-tsconfig-paths`（即 `gen-tsconfig-paths --check`；检查 alias 字节与未覆盖包）。
4. 运行 `pnpm run constraints`（层级、workspace 协议、版本）。
5. 构建后运行 `pnpm run verify-package-meta` 与 `pnpm run publint`，确认发布文件引用仍然有效。
6. 运行 `pnpm run verify-doc-refs`、`verify-md-links` 等相关文档 gate（若目标仓库有）。

**完成信号**：`verify-package-paths` 无 broken refs；`verify-tsconfig-paths` 无错误；`constraints` 通过；构建/发布检查通过。

**失败处理**：
- 文档引用旧路径：更新文档；如果是提案中的未来包，给引用加反引号/占位符让 gate 跳过，或明确标注"planned"。
- `tsconfig` 引用旧路径：更新 base paths 与 project references；否则源码解析仍指向旧目录。
- 层级错误：把包移到正确 group；不要为了让 gate 通过而在 group 下加 `package.json`。

**例外**：`verify-package-paths` 只检查"缺失且 segment 命中真实包名"的引用；纯 typo/未来包不会报错。`lib/` 未构建路径在 depth-two 包根下被忽略，因此它不是构建产物存在性检查。`vendor/` 被排除，vendor 内部路径漂移不在该 gate 范围。持久化历史区域中的旧路径是有意保留的，但标记畸形会把该区域重新纳入严格检查。`gen-tsconfig-paths` 只为“包名等于目录名”的包生成 alias；名字不一致的包必须手写 alias，否则 `uncoveredPackages` 会失败，而不是静默回退到 `lib/`。

**证据边界**：未运行；`verify-package-paths.ts` 1-113 全读，`verify-package-paths.spec.ts` 1-73 全读；`gen-tsconfig-paths.ts` 1-239、`gen-tsconfig-paths.spec.ts` 1-96 全读。未单独逐行阅读 `repo-files.ts`/`historical-schema-region.ts` 的标记解析实现，标记规则依据 spec 的行为断言。`tsconfig.base.json` 只读 1-30，`tsconfig.host.json`/`tsconfig.client.json` 只读 1-80；其余 compilerOptions/references 未逐行核对。

---

来源：deepseek-harness/scripts/check-workspace-constraints.ts:549-570@687f282e 来源：deepseek-harness/scripts/verify-package-paths.ts:1-113@687f282e 来源：deepseek-harness/scripts/verify-package-paths.spec.ts:1-73@687f282e 来源：deepseek-harness/scripts/gen-tsconfig-paths.ts:1-239@687f282e 来源：deepseek-harness/scripts/gen-tsconfig-paths.spec.ts:1-96@687f282e 来源：deepseek-harness/package.json:100-160@687f282e 来源：deepseek-harness/tsconfig.base.json:1-30@687f282e 来源：deepseek-harness/tsconfig.base.client.json:1-12@687f282e 来源：deepseek-harness/tsconfig.host.json:1-10@687f282e 来源：deepseek-harness/tsconfig.client.json:1-15@687f282e 来源：deepseek-harness/tsconfig.base.json:207-214@687f282e 来源：deepseek-harness/tsconfig.base.json:333-365@687f282e 来源：deepseek-harness/tsconfig.base.json:366-366@687f282e 来源：deepseek-harness/tsconfig.base.json:560-560@687f282e

<a id="sc-esm-payload"></a>
## 7. ESM、exports、publint、NodeNext、顶层 await 与 package-meta

### 7.1 源义务

- 根与 DSH 包使用 ESM：根 `type: module`（`deepseek-harness/package.json:6-6@687f282e`）；`packages/` 下 DSH 包必须 `type: module`、`main: lib/index.js`、`types: lib/types/index.d.ts`，以及 `exports['.'].types: ./lib/types/index.d.ts`、`exports['.'].default: ./lib/index.js`（`deepseek-harness/scripts/check-workspace-constraints.ts:509-545@687f282e`）。`checkWorkspaceManifest` 只强制根入口；包可以并实际拥有额外标准 subpath（如 `./client`、`./types`、`./remote`、`./locale/*.json`、`./src/*`），不得把根入口检查误读为单入口限制。
- `AGENTS.md` 还要求不要从 `tsx` 可达路径引入仅 CJS 的包（`deepseek-harness/AGENTS.md:132-132@687f282e`）。这没有看到独立的自动 gate；主要靠构建/运行时测试暴露，属于 [源事实]/[未验证]。
- **顶层 await 禁止**：`verify-no-top-level-await` 用 TypeScript AST 扫描 `packages/*/*/src/**/*.{ts,tsx}`，检测模块作用域的 `await`、`for await`、`await using`。
  - 排除：以 `#!` 开头的可执行文件；manifest `bin` 指向的 `lib/<path>.js` 对应源码（仅当 `bin` 在 `lib/` 下）。
  - 没有 Cordis 特殊允许列表；`vendor/`、`apps/`、`native/` 不在 corpus。
  - corpus 完整性：glob 为空、没有 `.tsx`、或漏掉任一含 TS 源码的 `packages/*/*/src` 目录，直接失败。
  - 证据：`deepseek-harness/scripts/verify-no-top-level-await.ts:1-267@687f282e`。
- **publint**：`publint-all` 对 `packages/*/*`（仅此目录）构造 publication view：
  - 从 `package.json` + `files` 模式 + `README*`/`LICENSE*`/`CHANGELOG*`/`NOTICE*` 收集文件；
  - 递归包含 dotfiles（与 npm pack 一致）；
  - 用 `publint({ pkgDir: 'package', pack: { files } })` 检查；
  - 额外检查发布 JS 中的相对 import 是否都能在发布视图中解析；
  - 过滤 `isBrowserBundleFormatFalsePositive` 的已知误报；
  - 有 error 或 closure violation 即失败。
  - 证据：`deepseek-harness/scripts/publint-all.ts:1-245@687f282e`。
- **NodeNext 类型消费**：`verify-node-next-types`：
  - 包集合是 `vendor/*` + `packages/*/*`，不含 `apps/`；
  - 先检查 `lib/types/**/*.d.ts` 的相对 specifier 是否都有扩展名；
  - 从 `types` + 非通配 exports 的 `types` 条件收集公开 specifier；
  - 在临时目录建立 `node_modules` 软链（它自己软链 workspace 包），写 `type: module`、`module/moduleResolution: NodeNext`、`skipLibCheck: true`、`preserveSymlinks: true`，用 `tsc --noEmit` 编译所有公开入口；
  - 需要先 `pnpm run build`。
  - 证据：`deepseek-harness/scripts/verify-node-next-types.ts:1-164@687f282e`。
- **package-meta**：`verify-package-meta` 对 `packages/*/*` 检查：
  - locale JSON 的 `name`/`meta` 形状、`exports` 是否暴露 `locale/*.json`、`en.json` 基线、同一 locale 目录、`files` 是否包含这些源 JSON；
  - icon 导出/`icon` 字段是否解析到源 JSON；DSH 包的 SVG 必须 36x36、`viewBox="0 0 36 36"`、有几何、无 script/style/image/foreignObject/text/animation、id 唯一、引用本地 id；
  - 嵌套包/plugin 的 locale 资源必须被外层 exports 暴露。
  - 不验证构建输出（明确说"reading built output would make the result depend on stale artifacts"）。
  - 证据：`deepseek-harness/scripts/verify-package-meta.ts:1-285@687f282e`。

### 7.2 操作程序

1. `exports['.']` 固定为 `types`→`./lib/types/index.d.ts`、`default`→`./lib/index.js`；`main`/`types` 也固定。需要子路径时，优先使用源仓已出现的标准键（`./package.json`、`./src/*`、`./client`、`./types`、`./typert`、`./remote`、`./locale/*.json`、`./cordis.patch.yml`）；这些键不是 gate 枚举的封闭 allowlist——`checkWorkspaceManifest` 不校验额外键，新增键不会被当前 constraints 拒绝，因此必须单独评审并用 publint/NodeNext/packed install 验证，不能假装 gate 已覆盖。
2. 源码用 `import type` 做类型导入；不要留下运行时对 devDependency 的引用。
3. 禁止模块作用域 await；把异步工作放进显式 `main()`/`initialize()` 或 Cordis 生命周期。
4. 构建后运行 `pnpm run publint`、`pnpm run verify-node-next-types`、`pnpm run verify-package-meta`、`pnpm run verify-package-dependencies`。
5. 打包后运行 `release:pack`、`release:verify-packed-install`；在临时消费者中 `import` 每个公开入口。
6. 新增 locale/icon 时，同时更新 `exports`、`files`、`expectedDshPackageFiles` 的推导/extra，并运行 package-meta。

**完成信号**：publint 无 error/closure；NodeNext 临时消费者编译通过；package-meta 无 locale/icon/files 错误；packed install 每个入口可加载；TLA 扫描零命中。

**失败处理**：
- NodeNext 报相对 specifier 无扩展名：修构建产物的 `.d.ts` 生成（源文件导入带 `.js`），不要加 `paths` 兜底。
- publint 报 types 不在 files：让 `files` 包含声明文件，或从 exports 移除该 types 条件。
- package-meta 报 locale 未暴露：在 `exports` 添加对应 `./locale/*.json`，并确保 `files` 包含；不要只把文件复制到 `lib`。
- TLA 报错：改成显式异步函数；如果确实需要 TLA，源仓库不支持该路径，迁移时要建立例外/评审机制。
- publint 浏览器字段误报：确认是已知 false positive 后，在 `publint-browser-format.ts` 的精确规则中排除；不要全局关闭 publint。

**例外与边界**：
- `publint`/`package-meta` 只覆盖 `packages/*/*`；`apps/*`、`vendor/*`、`native/*` 不在内。
- `node-next-types` 覆盖 vendor+packages，但不覆盖 apps；它用软链 workspace 包，不能证明真实安装/hoisting；真实安装由 packed install 证明。
- `no-TLA` 只覆盖 `packages/*/*/src`；`vendor/`、`apps/`、`native/` 的 TLA 不会被它发现。
- `package-meta` 只对 `@deepseek-ai/dsh-*` 的 SVG 执行官方图形规范；其他包/栅格图标只做元数据与发布检查。
- 顶层 await 的 `bin` 排除依赖 manifest 的 `bin` 映射；`bin` 指向 `lib/` 外时不会排除任何源码。

**证据边界**：未运行这些 gate；publint 的 `isBrowserBundleFormatFalsePositive` 细节未逐行阅读。NodeNext 的 `skipLibCheck: true` 会跳过第三方声明噪声，但源仓库另有显式扩展名扫描来补足。

---

来源：deepseek-harness/package.json:6-6@687f282e 来源：deepseek-harness/AGENTS.md:132-132@687f282e 来源：deepseek-harness/scripts/check-workspace-constraints.ts:509-545@687f282e 来源：deepseek-harness/scripts/publint-all.ts:1-245@687f282e 来源：deepseek-harness/scripts/verify-node-next-types.ts:1-164@687f282e 来源：deepseek-harness/scripts/verify-no-top-level-await.ts:1-110@687f282e 来源：deepseek-harness/scripts/verify-no-top-level-await.ts:140-220@687f282e 来源：deepseek-harness/scripts/verify-package-meta.ts:1-285@687f282e

<a id="sc-runtime-closure"></a>
## 13. 可执行部署的运行时闭包（runtime-closure）

### 13.1 源义务

`verify-runtime-closure` 检查的是**单可执行部署 manifest** `python/sdk-runtime/package.json`，不是全仓 production graph：

- 读取 `python/sdk-runtime/package.json` 与 `python/sdk-runtime/platforms.json`（目标平台列表）。
- 读取 `packages/bundle/web-app/presets/*.patch.yml` 中的 agent preset。
- 对每个 preset 的 active plugin（按平台判断 `disabled`），要求它在 runtime manifest 的 `dependencies` 中以 `workspace:` 声明；如果声明了非 workspace range，也报错。
- 从 runtime manifest 的直接 workspace 依赖出发，遍历 workspace 包的 `dependencies`/`optionalDependencies`；每个 workspace peer 如果非 optional，且不是 runtime manifest 的直接 `workspace:` 依赖，则报"缺失 peer"。
- 预设为空、平台列表为空也失败。
- 证据：`deepseek-harness/scripts/verify-runtime-closure.ts:131-237@687f282e`（错误/辅助函数在 1-130）。

它**不**检查：

- 普通 workspace 包的 devDependency 泄漏；
- `apps/cli`/`apps/web` 的 production graph；
- Python wheel 内的实际 import；
- 所有包的完整传递闭包（只沿 runtime manifest 可达的 workspace 包走）。

### 13.2 操作程序

1. 新增/重命名 agent preset，或新增 runtime 可达插件时，更新 `python/sdk-runtime/package.json` 的 `dependencies`，用 `workspace:` 指向对应包。
2. 如果插件只在某平台启用，确认 `disabled` 条件与 `platforms.json` 对齐；条件不匹配会导致 gate 把它当 active。
3. 若 workspace 包声明了非 optional peer，确保 runtime manifest 直接或传递地提供它；否则在 runtime manifest 加 `workspace:` 依赖，或把 peer 标记 optional 并确认运行时可缺。
4. 运行 `pnpm run verify-runtime-closure`；再跑 `release:pack --family dsh` 与 `release:verify-packed-install`。
5. 在 packed install 中驱动安装后的 CLI，确认插件加载；runtime-closure 通过不等于运行时能加载。

**完成信号**：gate 输出 preset 数/workspace 包数且无 failure；packed install 的 CLI 能启动并加载 shipped presets。

**失败处理**：
- 报 preset plugin 缺失：把包加入 runtime manifest `dependencies`；不要改 preset 去引用不存在的包。
- 报 required peer 缺失：加 runtime 直接依赖，或把 peer 改 optional 并验证降级；不要用 `peerDependenciesMeta.optional` 掩盖实际必需。
- 平台条件误判：检查 `disabled.__jsExpr` 只支持 `process.platform ===/!== 'win32'|'linux'|'darwin'` 的简单形式；复杂表达式不会被识别（`disabledOnPlatform`，`deepseek-harness/scripts/verify-runtime-closure.ts:160-190@687f282e`）。

**例外**：runtime manifest 直接依赖里的 workspace 包可以继续提供自己的 optional 依赖；gate 对 optional peer（`peerDependenciesMeta.optional: true`）跳过。平台包在 release 验证中可能被排除（musl 工具链），这是覆盖缺口。

**证据边界**：未运行；本记录实际阅读 `scripts/verify-runtime-closure.ts` 1-237，包括 preset/平台/target 解析、`activeBarePluginPackages`、`disabledOnPlatform`、`processPlatformForTarget`、`barePackageName`、workspace 闭包与错误链辅助函数。它不证明 Python 运行时真实 import 闭包，只证明 manifest/preset/peer 关系。

---

来源：deepseek-harness/scripts/verify-runtime-closure.ts:1-130@687f282e 来源：deepseek-harness/scripts/verify-runtime-closure.ts:131-237@687f282e

<a id="sc-install-layout"></a>
## 14. npm 双版本安装布局（双 release 共存）

### 14.1 源义务

`verify-npm-install-layout` 模拟**两个不兼容的 DSH release 同时安装**，检查 npm 的物理放置：

- 用当前 workspace 的 DSH 包清单构造合成 registry，把每个 DSH 包复制成两个版本：`0.1.0`（嵌套 alias `dsh-previous`）与 `0.2.0`（根）。
- 合成版本的内部 DSH 依赖统一改为 `^<version>`，外部依赖保持不变。
- 用 npm 解析出 package-lock（metadata-only，不下载 archive；`archiveRequests` 必须为 0）。
- 断言：
  - 两个版本的 DSH 包分别位于根 `node_modules/<name>` 和 `node_modules/dsh-previous/...`；
  - 每个 DSH 内部依赖边解析到**同一版本**；
  - 两个版本包含的包集合相同；
  - 只有一个共享的 `@deepseek-ai/cordis` 在根；
  - React/React-DOM 不能出现在这个 DSH-only 合成消费者中；
  - optional/optional peer 的缺失允许；普通依赖/peer 缺失报错。
- 预算：`dshPackagesPerVersion * checkedDshEdges <= 875_000`；超出需重新测量并修改 `MAX_RESOLUTION_WORK_UNITS`。挂起保护是预算的 4 倍。
- 证据：`deepseek-harness/scripts/verify-npm-install-layout.ts:1-275@687f282e`；共享 Cordis/双版本隔离断言在 `deepseek-harness/scripts/verify-npm-install-layout.ts:145-217@687f282e`。

### 14.2 操作程序

1. 发布前运行 `pnpm run verify-npm-install-layout`；它需要 workspace 版本与 `apps/cli` 版本。
2. 若新增 DSH 包/内部边，检查预算输出；不要在没有测量时直接提高 `MAX_RESOLUTION_WORK_UNITS`。
3. 若改变 Cordis 的 peer/依赖形态，确认仍然只有一个根 Cordis；否则双版本会各自带一份运行时。
4. 运行 `release:pack` 与 `release:verify-packed-install`；双版本布局通过不等于真实 tarball 安装通过。

**完成信号**：gate 输出两个版本、内部边数、预算使用；无错误；packed install 通过。

**失败处理**：
- 内部边解析到另一版本：检查 DSH 包是否把内部依赖写成 `^0.1`/`latest` 而不是 `workspace:*`/同版本；合成 registry 会把 DSH 内部 range 改成 `^<version>`，所以问题通常在原始 manifest 的 range 或额外 DSH 依赖。
- 只在一个版本出现某包：检查包是否被 private/实验排除，或依赖图不对称。
- Cordis 出现两份：检查 Cordis 是否被错误地作为普通 dependency 而非 peer/共享根。
- 超预算：测量新图，记录计数，再改常量；不要跳过 gate。

**例外**：这是合成 registry + metadata-only 解析，不验证 tarball 内容、bin、exports 或真实 npm 缓存；真实安装由 `release:verify-packed-install` 覆盖。React 被显式排除，因为它是浏览器构建输入，不是 DSH-only 消费者依赖。

**证据边界**：未运行；275 行已读。npm 的 hoisting 行为依赖 npm 版本；源代码通过 `benchmark-npm-resolution.ts` 调用 npm，具体版本可能随环境变化。

---

来源：deepseek-harness/scripts/verify-npm-install-layout.ts:1-275@687f282e 来源：deepseek-harness/.github/workflows/release.yml:80-88@687f282e 来源：deepseek-harness/scripts/verify-npm-install-layout.ts:129-217@687f282e

<a id="sc-packed-install"></a>

**补充源码引用（尾部区间复读分派实际读取）**：`deepseek-harness/apps/cli/tests/profiles/packed-installation.ts:1-129@687f282e`

## 15. Packed tarball 安装与发布边界（packed-install）

### 15.1 源义务

- `release/pack.ts` 是发布边界：无凭据运行，从当前 checkout 生成所有 tarball，写出 `publish-order.txt`；脚本本身不校验 Git commit，CI 通过同一 checkout 提供一致性。它**调用 `pnpm pack`**，由 pnpm 负责把 `workspace:` 协议替换为目标成员版本；Harness 只做 `family.validatePayload` 和 `validatePackedMember`（tarball 存在、payload、packed identity）。DSH family 额外要求 packed DSH 依赖图精确等于成员版本（`deepseek-harness/scripts/release/pack.ts:22-70@687f282e`、`deepseek-harness/scripts/release/families.ts:404-414@687f282e`）。
- `release/verify.ts` 在 build 前解析 publish order；`RELEASE_PUBLISH=true` 时检查成员非 private、ref 是该 family 的 tag、tag 匹配成员版本。
- `release/verify-packed-install.ts`：
  - 在仓库外的临时目录创建消费者；
  - 把传入目录中的所有 `.tgz` 作为 `file:` 依赖；可传多个 `--from`（dsh + vendor + landlock）；
  - 使用独立 npm cache（随消费者删除）；
  - 安装后驱动 `installedEntry` 的 bin，检查版本/启动；
  - 对安装后的 entry 运行 `verifyInstalledProductIsolation`，沿实际安装的 `dependencies`/`optionalDependencies`/`peerDependencies` 遍历，拒绝实验包，允许 optional 缺失，但普通依赖/peer 缺失报错；
  - 允许 entry 的 `OPTIONAL_BUNDLES` 作为 `dependencies` 存在，但要求它们确实安装；其他位置的实验边界报错。
- `release/publish.ts` 逐包检查 registry：不存在则发布；已存在且 integrity 相同则跳过；已存在但 integrity 不同则失败（提示 bump version 或调查可重复构建）。`release-publish.yml` 只上传 `dist/npm`，vendor tarball 只用于验证。
- 证据：`deepseek-harness/scripts/release/pack.ts:1-108@687f282e`、`deepseek-harness/scripts/release/verify.ts:40-100@687f282e`、`deepseek-harness/scripts/release/verify-packed-install.ts:1-126@687f282e`、`deepseek-harness/scripts/release/installed-product-isolation.ts:18-73@687f282e`、`deepseek-harness/scripts/release/publish.ts:1-60@687f282e`。

### 15.2 操作程序

1. `pnpm run build:official`（或目标发布构建）。
2. `pnpm run release:pack --family dsh --out dist/npm`。
3. 若 dsh 依赖 vendor/landlock，另外 `--family vendor` 与 Landlock entry pack；把它们作为 `--from` 传给验证，但不要发布它们。
4. `pnpm run release:verify-packed-install --family dsh --from dist/npm --from dist/npm-vendor --from dist/npm-landlock`。
5. 检查临时消费者：入口 bin 可执行、版本正确、没有实验包、optional 缺失可降级、没有 workspace 软链/协议残留。
6. 发布：`release:publish`（或工作流）只使用已打包目录；不要重新 build。
7. 发布后核对 registry integrity 与本地 tarball；失败时 deprecate 而不是删除版本。

**完成信号**：packed install 零错误；所有入口可加载；bin 可执行；没有实验包泄漏；registry 上已存在同版本时 integrity 一致。

**失败处理**：
- 安装时 peer 冲突：检查 `autoInstallPeers`/peer range；发布物的 peer 必须由消费者提供，不要偷偷改成 dependency。
- native 包缺失：确认平台包是否被 `ignoredOptionalDependencies` 排除；如果排除，测试应覆盖降级路径。
- workspace 泄漏：真实的 `pnpm pack` 会替换 `workspace:`；若 tarball 仍含协议，说明产物不是 pnpm pack 生成的（或 packed manifest 被后续步骤覆盖）。检查 pack 调用路径/后处理，不要把“自己实现 range 重写”当成修复。
- DSH packed range 不是精确成员版本：DSH family 会拒绝。确认 `workspace:*`/`workspace:~` 经 pnpm 替换后的结果，以及是否有额外手写 range。
- integrity 不一致：停止发布，调查构建不可重复/缓存；不要覆盖已发布版本。

**例外**：`release.yml` 的 packed install 不安装平台 native 包（musl 工具链），这是已知覆盖缺口。`installed-product-isolation` 只沿安装后的实际依赖图；它不替代静态 `default-product-isolation`。

**证据边界**：未运行；`release/pack.ts` 1-108 全读，`release/families.ts` 404-470 全读，`verify-packed-install.ts` 1-126 全读；未逐行读消费者生成/缓存清理的剩余部分。`pnpm pack` 的 range 替换依据 pnpm 官方 Workspace 文档（2026-10-23 查阅），未执行实际 pack 观察 tarball。发布工作流的实际 environment/token 配置未验证。

---

来源：deepseek-harness/scripts/release/pack.ts:1-108@687f282e 来源：deepseek-harness/scripts/release/verify.ts:40-100@687f282e 来源：deepseek-harness/scripts/release/verify-packed-install.ts:1-126@687f282e 来源：deepseek-harness/scripts/release/installed-product-isolation.ts:18-73@687f282e 来源：deepseek-harness/scripts/release/publish.ts:1-235@687f282e 来源：deepseek-harness/scripts/release/families.ts:404-470@687f282e 来源：deepseek-harness/scripts/release/tarball.ts:14-57@687f282e 来源：deepseek-harness/scripts/local-bundle-registry.spec.ts:282-290@687f282e 来源：deepseek-harness/.github/workflows/release.yml:1-180@687f282e 来源：deepseek-harness/.github/workflows/release-publish.yml:1-131@687f282e 来源：deepseek-harness/apps/cli/tests/profiles/packed-installation.ts:1-129@687f282e 来源：deepseek-harness/scripts/local-bundle-registry.ts:1-387@687f282e 来源：deepseek-harness/scripts/local-bundle-registry.ts:471-700@687f282e 来源：deepseek-harness/scripts/local-bundle-registry.ts:701-820@687f282e 来源：deepseek-harness/scripts/local-bundle-registry.spec.ts:1-281@687f282e 来源：deepseek-harness/scripts/local-bundle-registry.spec.ts:291-510@687f282e 来源：deepseek-harness/scripts/local-bundle-registry.spec.ts:518-559@687f282e

**来源坐标补充**：以下坐标对应本页机制（固定提交 `687f282e`）；只用于追溯，不新增正文断言，正文解释以上文小节为准。

- `supply-chain-manifest-publication`：`deepseek-harness/scripts/check-workspace-constraints.ts:37-58@687f282e`、`deepseek-harness/scripts/check-workspace-constraints.ts:434-549@687f282e`、`deepseek-harness/scripts/publication-payload.ts:1-55@687f282e`、`deepseek-harness/scripts/check-workspace-constraints.ts:91-361@687f282e`
- `supply-chain-package-paths`：`deepseek-harness/package.json:100-160@687f282e`
- `supply-chain-packed-install`：`deepseek-harness/scripts/release/families.ts:404-470@687f282e`、`deepseek-harness/scripts/local-bundle-registry.spec.ts:282-290@687f282e`
