# 产品角色、默认隔离与实验包策略（supply-chain §17–§19）

本页触发：新增非实验包或实验包、决定它是否进入默认／可选产品组合、把能力挂到 profile／bundle，或排查“无产品使用”与实验包进入默认安装时，先读本页。共同使用约定：证据基线、证据标记（源义务／源事实／迁移设计／建议／未验证）与源仓库只读边界见入口页 [supply-chain.md](supply-chain.md)；本页 `deepseek-harness/<path>:<start>-<end>@687f282e` 引用指向固定提交 `687f282e`，文中命令是源仓库已有做法，不表示在迁移目标已运行。

本页机制：[`supply-chain-product-use`](#sc-product-use)、[`supply-chain-default-product-isolation`](#sc-default-product-isolation)、[`supply-chain-experimental-policy`](#sc-experimental-policy)。领域入口：[supply-chain.md](supply-chain.md)。

<a id="sc-product-use"></a>
## 17. 产品使用：每个维护包必须有明确角色

### 17.1 源义务

`verify-product-use` 检查所有非实验 `packages/*/*` 包（以及 apps/vendor 的包清单）：

- 从实际 shipped profiles（`packages/boot/app-boot/src/profile.ts` 的 `PROFILE_TEMPLATES`、`DEFAULT_PROFILE_BUNDLES`）、on-demand bundles、optional bundles 组合运行时 entries。
- 沿 source imports（TypeScript 解析到源码，不读 `lib/`）、`cordis.yml` Include、group/agent preset、动态挂载声明遍历，得到 default/optional reachability。
- 每个 `packages/*/*` 非实验包必须满足其一：
  - 被 default 或 optional 组合可达；
  - 在 `PRODUCT_PACKAGE_POLICY` 中有显式 `category` + 非空 `reason`。
- 政策类别：`optional`、`test`、`sdk`、`build`、`web-distribution`、`declarations`；每类有目录约束（例如 `test` 必须在 `packages/test-support/`，`sdk` 只能是 `packages/sdk/client`）。
- stale policy 会失败：声明了 policy 但包已默认可达（除 `web-distribution`），或 `web-distribution` 但不可达，或目录不存在/在 experimental。
- 缺失源码路径、未映射的 workspace 导入、未知 `@deepseek-ai/dsh-*` 包、动态挂载非字面量都会失败。
- 证据：`deepseek-harness/scripts/verify-product-use.ts:1-317@687f282e`、`deepseek-harness/scripts/product-package-policy.ts:1-50@687f282e`。

### 17.2 操作程序

1. 新增非实验包时，先决定它是否应进入默认/可选产品组合；是则挂到 profile/bundle，否则在 `PRODUCT_PACKAGE_POLICY` 写 category + reason。
2. `reason` 必须解释"为什么不属于默认产品"，不能写"暂时没有使用"；stale policy 会被检查。
3. 若包只用于 SDK/构建/测试/web 分发/声明，选对应 category，并确保目录符合约束。
4. 更新 `tsconfig.base.json` paths，确保源码导入能解析到 workspace 源码；否则 gate 报 "does not resolve to workspace source"。
5. 动态挂载必须用字面量对象声明（`DYNAMIC_MOUNTS` 的 literal package targets），不能运行时拼接。
6. 运行 `pnpm run verify-product-use`；与 `pnpm run verify-default-product-isolation` 一起跑。
7. 发布前在 packed install 中验证实际入口；产品使用 gate 是源码/组合检查，不是安装检查。

**完成信号**：gate 输出 default/optional 包数与 source 数；无 "no product runtime use"、无 stale policy、无未解析导入。

**失败处理**：
- "no product runtime use"：挂到产品组合，或加 policy；不要把包移到 experimental 来逃避（会改变发布面）。
- "stale optional policy"：如果包已默认可达，删除 policy；不要保留过期声明。
- "does not resolve to workspace source"：补 tsconfig paths 或修正导入；不要用 `lib/` 产物绕过。
- "unknown workspace package"：包名拼写/发布状态错误；不要在源码里引用一个不存在的 `@deepseek-ai/dsh-*`。

**例外**：`web-distribution` 类别用于 `packages/client/web`、`packages/client/ui-dockkit`，它们被 bundle 进 Web 分发而不是运行时挂载；`sdk`/`build`/`test`/`declarations` 也不能默认可达。`vendor` 包只进入 inventory，不要求 policy。

**证据边界**：未运行；317 行已读。它依赖源码/配置的静态分析，不能发现运行时通过任意字符串/服务发现加载的包；这类路径需要额外测试。

---

来源：deepseek-harness/scripts/verify-product-use.ts:1-100@687f282e 来源：deepseek-harness/scripts/verify-product-use.ts:100-317@687f282e 来源：deepseek-harness/scripts/product-package-policy.ts:1-50@687f282e 来源：deepseek-harness/scripts/run-gates.ts:364-380@687f282e

<a id="sc-default-product-isolation"></a>
## 18. 默认产品隔离：实验包不能进入默认安装

### 18.1 源义务

`verify-default-product-isolation` 检查默认产品（`apps/*` 与 `python/sdk-runtime`）的实际可执行/源码/配置：

- 默认安装的 bundles 来自 `PROFILE_TEMPLATES`/`DEFAULT_PROFILE_BUNDLES`；每个 default bundle 必须有 `dsh.bundle.patch`，不能同时是 optional bundle。
- optional bundles 来自 `OPTIONAL_BUNDLES`/`ON_DEMAND_BUNDLES`：它们作为 `apps/cli` 的 runtime dependency 存在，但必须：
  - 有 `dsh.bundle.patch`；
  - 有 `icon` 或 `./icon` export；
  - 有 `./locale/*.json` 展示元数据；
  - 不是 default bundle。
- 默认依赖图（`dependencies`/`optionalDependencies`/`peerDependencies`）中不得出现实验包；`apps/cli` 的 `dependencies` 可以包含 optional bundles（它们被"shipped switched off"安装），其他位置/段不行。
- 扫描实际源码（`src/**/*.{ts,tsx,...}`，排除测试/声明）、bundle patch、`dsh.configTrees`、shipped presets、`apps/web/index.html` 的本地 module entry。
- 实验包通过名称或 `packages/experimental/` 目录判定；外部 `@deepseek-ai/libreoffice-kit` 是允许的外部 kit 特例。
- 证据：`deepseek-harness/scripts/verify-default-product-isolation.ts:1-413@687f282e`。

安装后的版本由 `release/installed-product-isolation.ts` 再验证：沿实际安装的依赖图拒绝实验包；entry 的 optional bundles 允许，但必须安装；别名 `npm:<experimental>` 也会被识别（`deepseek-harness/scripts/release/installed-product-isolation.ts:18-73@687f282e`）。

### 18.2 操作程序

1. 新增实验能力时，默认不挂到任何 shipped profile；若要"随产品安装但默认关闭"，把它加入 `OPTIONAL_BUNDLES`，并确保它是 `apps/cli` 的 runtime dependency，带 bundle patch/icon/locale。
2. 在默认 bundle 中添加依赖前，确认不是实验包；default 组合中不能出现 `packages/experimental/*`。
3. 若实验包必须被某个稳定包引用，改为接口/端口注入或把能力提升为稳定包；不要用 `peerDependencies` 绕过（peer 也会被检查）。
4. 更新 bundle patch/config tree/preset 后，运行 `pnpm run verify-default-product-isolation`。
5. 打包后 `release:verify-packed-install` 会再跑安装图检查；确保 optional bundle 在安装树中存在。
6. 运行 `pnpm run verify-product-use`，确保没有包因隔离而变成"无产品使用"。

**完成信号**：default isolation 零 failure；optional bundle 元数据完整；安装图无实验包；产品使用 gate 仍通过。

**失败处理**：
- "default product must not include experimental packages"：从默认依赖/配置中移除，或改为 optional bundle；不要改 `isExperimental` 判定来放行。
- optional bundle 缺 icon/locale/patch：补齐 manifest 与资源；这些是插件管理器的展示/加载契约。
- optional bundle 同时是 default：从 default 列表移除；不要两边都留。
- 安装后报可选 bundle 缺失：检查 `apps/cli` 的 runtime dependency 与 tarball 是否包含它。

**例外**：`EXTERNAL_KIT_PACKAGES`（`@deepseek-ai/libreoffice-kit`）是独立发布的 kit，不受实验隔离；`apps/web` 的 web preview 入口不在默认检查范围（明确排除 preview）。optional bundle 的 `dependencies` 是唯一允许的实验包 runtime 边。

**证据边界**：未运行；413 行已读。它不检查 `vendor` 内部的实验引用；安装图检查只从 entry 的 runtime sections 出发，不覆盖 devDependencies。

---

来源：deepseek-harness/scripts/verify-default-product-isolation.ts:1-180@687f282e 来源：deepseek-harness/scripts/verify-default-product-isolation.ts:180-413@687f282e 来源：deepseek-harness/scripts/release/installed-product-isolation.ts:18-73@687f282e 来源：deepseek-harness/scripts/run-gates.ts:364-380@687f282e

<a id="sc-experimental-policy"></a>
## 19. 实验包策略：命名、发布与依赖隔离

### 19.1 源义务

- 实验身份：
  - 包名以 `@deepseek-ai/dsh-experimental-` 开头；或
  - 属于 11 个保留名，且位于其声明目录（`EXPERIMENTAL_PACKAGE_NAME_EXCEPTIONS`）。
- 目录必须是 `packages/experimental/<one>`（不能更深）。
- 公开实验包（不在 `PRIVATE_EXPERIMENTAL_PACKAGE_DIRECTORIES`，当前为空）：
  - 不得 `private: true`；
  - 必须 `publishConfig.access: "public"`。
- 私有实验包：
  - 必须 `private: true`；
  - 必须省略 `publishConfig`。
- 保留名必须恰好有一个 workspace owner 在声明目录；移动/重命名/重复会失败。
- 依赖隔离（`checkExperimentalDependencyIsolation`）：
  - 对 standard release member + `python/sdk-runtime`，`dependencies`/`optionalDependencies`/`peerDependencies` 中不得引用实验包；
  - 唯一例外：`apps/cli`（包名 `@deepseek-ai/dsh`）的 `dependencies` 可以包含 `OPTIONAL_BUNDLES` 中的实验包；
  - `peerDependencies` 中的实验包不允许（即使它是 optional bundle）；
  - `npm:<experimental>@version`、`workspace:<experimental>@*` 等别名也会被识别；
  - 证据：`deepseek-harness/scripts/check-workspace-constraints.ts:361-410@687f282e`、`deepseek-harness/scripts/check-workspace-constraints.ts:592-609@687f282e`。
- 安装后的默认产品图由 `installed-product-isolation` 再检查：entry 的 optional bundles 允许，但必须安装；其他实验边拒绝（`deepseek-harness/scripts/release/installed-product-isolation.ts:18-63@687f282e`）。

### 19.2 操作程序

1. 新实验包用 `dsh-experimental-` 前缀；如果要保留旧 npm 名，必须加到 `EXPERIMENTAL_PACKAGE_NAME_EXCEPTIONS` 并在对应目录，且确保唯一 owner。
2. 决定公开/私有：公开则 `publishConfig.access: "public"`；私有则 `private: true` 且不写 `publishConfig`。
3. 不要从稳定 release member（非 `apps/cli`）或 `python/sdk-runtime` 依赖实验包；用产品装配/接口注入。
4. 若确实要随产品安装但默认关闭，把它放到 `OPTIONAL_BUNDLES`，只让 `apps/cli` 的 `dependencies` 引用；peer 不行。
5. 运行 `pnpm run constraints`（命名/发布/依赖隔离/保留名）与 `pnpm run verify-default-product-isolation`。
6. 打包后运行 `release:verify-packed-install`，确认安装图没有实验泄漏。

**完成信号**：constraints 无错误；默认隔离零 failure；保留名唯一；安装图只允许 optional bundles 的 entry 边。

**失败处理**：
- "must set publishConfig.access to public"：补字段；不要改成 private 来逃避（会改变发布面）。
- "retained experimental name must have exactly one workspace owner"：修目录/包名，删除重复 owner。
- "must not reference an experimental package"：从依赖中移除；如果是 optional bundle，只放在 `apps/cli.dependencies`，不要放 peer。
- 安装图报实验包：检查是否通过 `npm:` 别名或传递依赖进入；修根因，不要只改直接声明。

**例外**：`PRIVATE_EXPERIMENTAL_PACKAGE_DIRECTORIES` 当前为空，所以所有 `packages/experimental/<one>` 默认公开；要保留私有实验包，必须显式加入该列表并确保 release family 排除。`apps/desktop`/`desktop-host`/`plugin-market-generator` 不是 standard release member，但仍可能被安装图检查覆盖（如果它们进入 entry 图）。

**证据边界**：未运行；命名/发布规则来自 `check-workspace-constraints`，依赖隔离规则来自同文件 592-609。`installed-product-isolation` 只从 entry 出发，不检查开发依赖。

---

来源：deepseek-harness/scripts/experimental-package-policy.ts:1-67@687f282e 来源：deepseek-harness/scripts/check-workspace-constraints.ts:361-410@687f282e 来源：deepseek-harness/scripts/check-workspace-constraints.ts:592-609@687f282e 来源：deepseek-harness/scripts/release/installed-product-isolation.ts:18-63@687f282e 来源：deepseek-harness/scripts/check-workspace-constraints.spec.ts:106-258@687f282e

**来源坐标补充**：以下坐标对应本页机制（固定提交 `687f282e`）；只用于追溯，不新增正文断言，正文解释以上文小节为准。

- `supply-chain-product-use`：`deepseek-harness/scripts/run-gates.ts:364-380@687f282e`
- `supply-chain-experimental-policy`：`deepseek-harness/scripts/experimental-package-policy.ts:1-67@687f282e`
