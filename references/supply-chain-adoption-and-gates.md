# 门禁地图、迁移顺序与证据边界（supply-chain §1、§26、§27）

本页触发：决定目标仓库接入哪些供应链检查、按阶段落地本域机制，或核对某条“完成信号”是否有运行证据时，先读本页。共同使用约定：证据基线、证据标记（源义务／源事实／迁移设计／建议／未验证）与源仓库只读边界见入口页 [supply-chain.md](supply-chain.md)；本页 `deepseek-harness/<path>:<start>-<end>@687f282e` 引用指向固定提交 `687f282e`，文中命令是源仓库已有做法，不表示在迁移目标已运行；§1 的 lane 表与 §27 的证据边界都表示这些源命令未在迁移目标执行。

所属领域入口、机制 ID 与主题页索引：[supply-chain.md](supply-chain.md)。

<a id="sc-gate-map"></a>
## 1. Gate 地图：哪条流水线跑什么

聚合入口是 `deepseek-harness/scripts/run-gates.ts`。与供应链直接相关的 lane：

| Lane / 工作流 | 供应链 gate（代表性） | 证据 |
|---|---|---|
| `hygiene` | `rescope-vendor`、`publint`、`constraints`、`default-product-isolation`、`product-use`、`official-bundle-catalog`、`provider-data`、`package-dependencies`、`application-entrypoints`、`dsh-package-licenses`、`node-next-types`、sharedHygiene；再加 `cordis-config`、`runtime-closure`。**不含 `package-meta`，也不含 `vendor-manifest`** | `deepseek-harness/scripts/run-gates.ts:353-358, 784-803@687f282e` |
| `ci-static` | `ciSharedStaticGates`（runtime-closure、package-dependencies、dsh-package-licenses、package-meta、constraints 等）加**除 `doc-typecheck` 外的完整 `docSyncLeafGates`**（`package-paths`、`config-source-ownership`、`dependency-catalog` 都在内），再加 module-graph | `deepseek-harness/scripts/run-gates.ts:366-382, 487-501, 805-874@687f282e` |
| `ci-primary` | `ciSharedStaticGates`、完整 doc-sync、typecheck/lint/coverage/build/publint/node-next/built-bin；这是 PR 主 lane 中最完整的供应链覆盖 | `deepseek-harness/scripts/run-gates.ts:400-431@687f282e` |
| `ci-unit` / `test` | `ci-unit` 直接 `vitest run` 全量单测；`check-all` 也跑 `pnpm run test`。`gen-third-party-notices.spec.ts` 的 freshness 断言在全量 test inventory 内，但没有单独的 `verify-third-party-notices` lane | `deepseek-harness/scripts/run-gates.ts:332-352, 738-748@687f282e` |
| `doc-sync`（`pnpm run doc-sync`） | 完整 `docSyncLeafGates`；`ci-static` 也包含它（仅省略 doc-typecheck），所以它不是“只有 doc-sync 才跑”的专属覆盖 | `deepseek-harness/scripts/run-gates.ts:805-874@687f282e`、`deepseek-harness/.github/workflows/docs-pages.yml:73-75@687f282e` |
| `.git/hooks/pre-commit`（lefthook） | `vendor manifest guard`：仅当 staged 变更命中 `vendor/<pkg>/src/**` 或 `vendor/<pkg>/bin.js` 时，要求同一次提交 stage 了 `vendor/README.md`；不校验 README 内容 | `deepseek-harness/lefthook.yml:5-33@687f282e`、`deepseek-harness/scripts/check-vendor-manifest.sh:1-17@687f282e` |
| `release.yml` dependency job | `verify-package-dependencies`、`verify-npm-install-layout` | `deepseek-harness/.github/workflows/release.yml:80-88@687f282e` |
| `release.yml` pack job | `release:verify`、`release:pack --family dsh`、vendor/landlock tarball、`release:verify-packed-install` | `deepseek-harness/.github/workflows/release.yml:35-110@687f282e` |
| `release-publish.yml` | 对已上传 tarball 重跑 packed install，再发布；不在发布步骤重新构建 | `deepseek-harness/.github/workflows/release-publish.yml:90-131@687f282e` |

| Dependabot | npm（排除 vendor）、uv（`python/sdk`）、github-actions，每天 04:00 Asia/Shanghai，cooldown 30 天 | `deepseek-harness/.github/dependabot.yml:1-38@687f282e` |

Python wheel 的发布专用 gate 不经过 `run-gates.ts`：`build-exe-for-python-sdk.ts` 先跑 `verify-runtime-closure`（该脚本也在 hygiene 中运行），再由 `python-release.yml` 验证六个 wheel、100MB、`twine` 和 `SHA256SUMS`，并按 runtime→SDK 顺序发布（[第 25 节](supply-chain-python-runtime.md#sc-python-runtime)）。

> 上表按当前 `run-gates.ts` 的聚合函数直接核对：`gatesForMode`（`:294-359`）、`ciSharedStaticGates`（`:366-382`）、`ciStaticGates`（`:487-501`）、`ciUnitGates`（`:738-748`）、`hygieneLeafGates`（`:784-803`）和 `docSyncLeafGates`（`:805-874`）。仍不等于对 1,697 行的逐行审计；本域未运行任何 lane。

必须知道的缺口：

- `config-source-ownership`、`dependency-catalog`、`package-paths` 属于 `docSyncLeafGates`；因为 `ci-static` 调用 `ciStaticGates` 时展开该函数，所以它们在 PR 的 `ci-static` 中会跑。旧说法“只在 doc-sync/手动”不成立；`hygiene` 才不跑这三项。
- `package-meta` 只在 `ciSharedStaticGates` 及其调用者（`ci-static`、`ci-primary`）中出现；`hygiene` 与 `check-all` 都不含 `package-meta`。不要用 `pnpm run check-all` 代替 PR 的 `ci-static`。
- `vendor-manifest` 不是 `run-gates.ts` 的 gate，也没有对应 `pnpm run` 脚本；它只由 lefthook pre-commit 调 `scripts/check-vendor-manifest.sh` 执行。单独复现要用 `bash scripts/check-vendor-manifest.sh`，且脚本读取的是**已 staged** 的路径。
- `verify-third-party-notices` 没有接入 `run-gates.ts` 或工作流；提交字节的 freshness 由全量 test inventory 中的 `gen-third-party-notices.spec.ts` 覆盖，standalone 命令是手工检查。
- `verify-npm-install-layout` 只在 release 工作流；本地/PR 默认不跑。
- `publint`、`package-meta`、`package-paths` 的覆盖目录不同：`publint`/`package-meta` 主要读 `packages/*/*`；`package-paths` 是文档/`packages/**/*.ts`；`publint` 不含 apps/vendor。
- `verify-dsh-package-licenses` 通过根 `package.json.workspaces` 找包，因此不覆盖 `benchmarks/`、`python/`（[第 12 节](supply-chain-vendor-and-licenses.md#sc-licenses-notices)）。
- `no-top-level-await` 只覆盖 `packages/*/*/src`，不覆盖 `vendor/`、`apps/`（[第 7 节](supply-chain-package-and-installation.md#sc-esm-payload)）。
- 源仓库没有专门的 `npm audit`/OSV 漏洞 gate；Dependabot 不是漏洞扫描（[第 22 节](supply-chain-dependencies-and-optional-loading.md#sc-dependency-updates)）。

---

<a id="sc-migration"></a>
## 26. 迁移落地顺序

### 阶段 A：最小可运行内核（1-2 天）

1. 固定 Node/pnpm，提交 lockfile，CI frozen install。
2. 写 workspace 成员 glob；两份清单若并存，明确各自消费者。
3. 根 `private: true`、`type: module`；包有 name/version/license/private。
4. 检查 public 包 `main`/`types`/`exports`/`files`；private 包不能有 `publishConfig`。
5. 检查 packed tarball 无 `src`/map；临时安装并 import 每个公开入口。
6. 若使用 vendoring/patches，先建清单；没有就跳过，不要造空目录。

### 阶段 B：依赖与发布边界（3-5 天）

7. 依赖面策略（按源码使用推导，而不是简单禁重复）。
8. workspace 协议与版本家族。
9. 可选依赖静态导入扫描。
10. 许可证/notices 生成与 `--check`。
11. 实验包命名/发布/依赖隔离；默认产品隔离。
12. 运行时部署 manifest 闭包（如果目标有单可执行/离线部署）。

### 阶段 C：完整消费者验证（1-2 周）

13. publint + NodeNext + package-meta（需要构建）。
14. 双版本 npm 布局（如果目标有多 release 共存）。
15. packed install（真实 tarball、entry、optional 两种路径）。
16. 产品使用/默认隔离/实验策略。
17. 配置来源窄检查 + 凭据注入。
18. 发布工作流拆分：verify/pack 与 publish 分离；publish 只上传已验证 tarball；OIDC provenance。
19. 依赖目录（如果目标需要公开消费者解析快照）。

### 参数化表

| 源值 | 目标决策 |
|---|---|
| `@deepseek-ai/dsh*` | 目标 scope/前缀；用于版本家族、workspace 协议、release family |
| `packages/<group>/<pkg>` | 目标目录层级；group 不得有 package.json |
| `lib/index.js`、`lib/types/index.d.ts` | 目标构建输出目录；所有 gate 的路径常量 |
| `pnpm@11.28.5` | 包管理器/版本；release age/allowBuilds 的等价配置 |
| `^22.19.0 || >=24.0.0` | Node 支持矩阵 |
| `vendor/README.md` 的 9 个包 | 目标 vendored 闭包；没有就删相关 gate |
| `patches/` 的 8 个补丁 | 目标补丁清单；每个补丁的原因/移除条件 |
| `apps/desktop` 等排除项 | 目标不发布到 npm 的 app/工具清单 |
| `THIRD_PARTY_NOTICES.md` | 目标 notices 文件名/生成器/分层策略 |
| `python/sdk-runtime` | 目标部署 manifest；如果不用 Python，删 runtime-closure |

### 额外建议（非源义务）

- 用 pnpm `catalog:` 代替"多 manifest 同范围 + 目录检查"，从机制上减少版本漂移。
- 为每个 patch 写 `patches/README.md`（原因、上游 issue、移除条件、测试）；源仓库没有。
- 把 `config-source-ownership`、`dependency-catalog`、`verify-npm-install-layout` 加入 PR lane 或 nightly；源仓库的 lane 安排有缺口。
- 为 `vendor/` 建立机器可读的"上游 commit → 本地修改 → 同步日期 → 负责人"清单。
- 对 native 平台包做消费者机器矩阵测试；源仓库因 musl 工具链排除了部分平台包。
- 用 `npm audit`/OSV 或等价服务补充漏洞扫描；源仓库 gate 不含漏洞数据库检查。
- 如果目标仓库有 "public 包不能依赖 private 包" 的需求，单独实现；源 `verify-package-dependencies` 没有找到该独立检查。

---

<a id="sc-evidence-limits"></a>
## 27. 证据边界与未决项

1. **未运行任何 gate**：没有执行 `pnpm install`、`constraints`、`package-dependencies`、`publint`、`node-next-types`、`runtime-closure`、`npm-install-layout`、`release:verify`、`release:verify-packed-install`、`gen-third-party-notices`。本文的"完成信号"是程序性描述，不是运行证据。
2. **未逐行阅读的实现**：
   - `verify-package-dependencies.ts` 1-1038 全读（含此前遗漏的 593-595、701-703）；`package-dependency-policy.ts` 1-105 全读。
   - `check-workspace-constraints.ts` 1-666 全读；`verify-package-paths.ts` 1-113、`gen-tsconfig-paths.ts` 1-239、`gen-tsconfig-paths.spec.ts` 1-96、`verify-package-paths.spec.ts` 1-73 全读。
   - `verify-npm-install-layout.ts` 既有1-275声明；`verify-runtime-closure.ts` 原1-130已另有131-237补读声明。源码区间完整不等于closure执行、artifact存在或目标原生运行通过。
   - `release/pack.ts` 既有1-108、`release/publish.ts` 1-235、`release/verify-packed-install.ts` 1-126声明；本域`families.ts`为1-12、330-340、345-495，`verify.ts`为40-100，Release另有各自1-495/1-110声明。原分段/peer关系不当作本批新读，任何pack/publish/consumer效果仍须实际运行。
   - `vendor/README.md` 本域声明1-13、15-57、59-73，不称逐行全73行；`scripts/check-vendor-manifest.sh` 1-17、`lefthook.yml` 1-49、`rescope-vendor.ts` 1-661、`gen-third-party-notices.ts` 1-870、`THIRD_PARTY_NOTICES.md` 1-304已有声明，但未运行`--check`。`native/system`与四个平台manifest有既有声明，未作平台运行证明。
   - 8 个 patch 文件均按 hunk/关键 diff 阅读；`exceljs` 806 行未逐行语义审阅，`@yao-pkg/pkg` 的巨型 worker bundle 行未逐字符展开。
   - `.github/workflows/release.yml`、`release-publish.yml`、`release-vendor-publish.yml` 全读；GitHub Environment 的 reviewer/allowed-tag 是远端设置，未验证。
3. **未验证的外部依赖/运行行为**：
   - pnpm 的 `strictDepBuilds`/`minimumReleaseAge` 在 pinned pnpm 下的解析/安装行为；默认值已对 pnpm 11 官方发布说明核对，但未在本机安装观察，也未检查 pinned pnpm 实现。`workspace:` 替换规则已查 pnpm 官方 Workspace 文档，但未实际跑 `pnpm pack` 观察 tarball。
   - npm 的 hoisting/peer 解析在具体版本下的行为；`release:publish` 的 registry 重试只读源码，未对真实 registry 运行。
   - GitHub Actions OIDC/provenance/Environment 的实际配置；源码没有 `--provenance`，provenance 只是迁移增强建议。
   - native 平台包的 musl/架构构建；`release.yml` 的 packed install 不安装这些平台包。
   - Python `uv` lock 与 `python/sdk/uv.lock`/notices 的一致性未运行验证。
4. **源仓库已知覆盖缺口**：
   - `publint`/`package-meta` 只覆盖 `packages/*/*`；`verify-package-paths` 只检查文档/TS 路径漂移，不检查发布文件存在性。
   - **标准 export key set 没有自动 allowlist gate**：`checkWorkspaceManifest` 只检查根 `exports["."]`，`expectedDshPackageFiles`/`verify-package-meta` 只检查特定 locale/icon/subpath，`publint` 是通用 lint。新增未文档化键必须靠评审；文档里"改 owning doc + check"的 check 在已读脚本中未找到。
   - **workspace range 是分层规则，不是冲突**：constraints 覆盖所有成员，对普通目标只要求 `workspace:` 前缀；dependency gate 只覆盖 `apps/*`、`packages/*/*`、`vendor/*`，但在其范围内把所有非 dsh 目标收紧为 `workspace:~`。`workspace:^` 在 gate 外合法；不要声称它已全局退役。
   - dependency gate 的 `WORKSPACE_MANIFEST_GLOBS` 只覆盖 `apps/*`、`packages/*/*`、`vendor/*`；`benchmarks/`、`python/`、`native/` 不在内。`--fix` 只在 policy 无违规时工作，且会刷新 lockfile/module graph。
   - 共享身份/duplicate-safe 证据是单元 fixture + `assertDualDshInstallLayout` 的 synthetic/metadata-only 布局；没有真实重复安装 smoke。
   - `safeHostDependencyExports` 的新增由精确 roster 测试和人工评审阻止，不是运行时禁止；不要写成"policy 会拒绝任何新条目"。
   - `no-TLA` 只覆盖 `packages/*/*/src`。
   - `verify-dsh-package-licenses` 使用 `package.json.workspaces`，不覆盖 `benchmarks/`、`python/`。
   - `verify-npm-install-layout` 只在 release 工作流；它是合成 registry/metadata-only，不是真实安装。
   - `config-source-ownership`/`dependency-catalog`/`package-paths` 在 `ci-static` 中会跑（它展开完整的 `docSyncLeafGates`，只省略 doc-typecheck）；`hygiene` 不跑它们。
   - `package-meta` 不在 `hygiene`/`check-all`；`vendor-manifest` 不是 `run-gates` gate，只在 lefthook pre-commit。
   - `verify-third-party-notices` 不是独立 lane；只有全量 test inventory 的 freshness spec 和手工命令。
   - 没有 `npm audit`/漏洞扫描 gate。
   - 没有 patch 原因/freshness 自动检查；Desktop policy 只记录范围 reason，不是上游 issue/移除版本。
   - `minimumReleaseAgeExclude` 列表长，容易积累过期条目。
   - `gen-third-party-notices` 依赖已安装 store，干净 checkout 不能单独运行；它的 permissive 检查是仓库策略，不是法律意见。
   - `release.yml` packed install 不安装部分平台 native 包。
   - **release family 只有 dsh/vendor**：`releaseFamilies()` 不返回 native；native 由 `node-addon-system-release.yml` 单独处理。不要把 `release:pack --family native` 写成可用命令。
   - **发布不生成 provenance**：`release:publish` 没有 `--provenance`；需要时是额外实现，不是源保证。
   - `release-publish.yml` 的 pack job 会从当前 tree 重新构建，不复用 PR 的 artifact；只有 publish job 不 build。
5. **源仓库内部不一致/待澄清**：
   - `vendor/AGENTS.md` 说"只有构建问题才改 vendored 源码"，`vendor/README.md` 记录大量行为修改；
   - `package.json.workspaces` 与 `pnpm-workspace.yaml.packages` 成员集合不同；
   - `docs/development.md` 说 "Keep dependency build scripts explicitly allowlisted in pnpm-workspace.yaml"，实际键是 `allowBuilds`；
   - `checkWorkspaceManifest` 对 vendored 包跳过 source/map 的 manifest 扫描，但 `release/pack` 仍做 tarball payload 校验；需要确认 vendor 发布策略是否与此一致；
   - `verify-package-dependencies` 没有找到 public→private 依赖检查，若目标需要必须另写；
   - `verify-config-source-ownership` 只做窄的单行检查，不是通用配置来源治理。
6. **未决问题（迁移决策）**：
   - 是否继续 vendoring，还是 registry + patch；
   - 是否维持 dsh/vendor 两个 `releaseFamily`、native 独立工作流，还是把 native 纳入统一 family；
   - 是否允许 app 发布到 npm；
   - 是否要求 provenance（需要公共仓库 + OIDC）；
   - 是否保留私有实验包；
   - 如何处理 Python/其他语言锁与 npm notices 的一致性。

这些未决项不应被隐藏；迁移评审时应逐项给出决策、负责人和验证方式。

---
