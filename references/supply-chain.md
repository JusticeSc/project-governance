# 供应链与包边界治理操作参考（supply-chain）

> 证据基线：`deepseek-harness` 仓库固定提交 `687f282e8625c6b8d11ff58211a90524be2e4317`。本文的 `deepseek-harness/<path>:<start>-<end>@687f282e` 引用均指向该提交。源仓库只读；文中命令是源仓库已有做法，不表示在迁移目标中已运行。
>
> 证据标记：
> - **[源义务]** 源仓库通过 gate、配置或明确文字强制，违反会安装/检查失败。
> - **[源事实]** 源仓库可观察到的约定或结构，但没有找到自动检查。
> - **[迁移设计]** 给目标仓库的落地设计，不是源仓库已实现的保证。
> - **[建议]** 超出源仓库的附加建议。
> - **[未验证]** 该提交下没有运行证据，或依赖外部服务/未提交产物。

## 0. 适用范围

本域覆盖：工作区成员与包管理器；依赖声明面；workspace 协议、版本家族与 release family；包 manifest 的 private/public/experimental/native 分类与发布文件；包目录迁移与文档路径漂移；ESM/exports/publint/NodeNext/顶层 await；可选依赖；vendored 框架同步与重命名；外部补丁；许可证与第三方 notices；可执行部署的运行时闭包；npm 双版本安装布局；packed tarball 安装与发布边界；消费者依赖目录；产品使用、默认产品隔离、实验包策略；配置来源与凭据；依赖更新；Node/pnpm/lockfile 锚定；Python SDK runtime wheel、锁定下载资源与双阶段 PyPI 发布。

本域正文已按消费与发布职责拆分为主题页；本页只保留用途、机制定位与跨页索引，每个主题页第一段说明其触发条件与共同使用约定，程序、证据边界和来源坐标在对应主题页内：

| 主题页 | 原节 | 何时读 |
|---|---|---|
| [工作区与版本](supply-chain-workspace-and-versions.md) | §2、§3、§23 | 新增或移动 workspace 成员、调整 pnpm/Node/lockfile 锚定、修改 workspace 协议或 dsh/vendor 版本家族、bump 后 packed identity 不一致 |
| [依赖与可选加载](supply-chain-dependencies-and-optional-loading.md) | §4、§8、§16、§22 | 声明或移动依赖、把包标为可选或 optional peer、维护消费者依赖目录、响应 Dependabot 更新、排查共享实例／重复安装 |
| [包与安装边界](supply-chain-package-and-installation.md) | §5–§7、§13–§15 | 新增公开包、移动或重命名包、改 exports／files、构建后验证 publint／NodeNext／package-meta、单可执行部署闭包、双版本 npm 布局、packed tarball 安装 |
| [vendor 与许可证](supply-chain-vendor-and-licenses.md) | §9–§12 | 同步／新增／重命名 vendored 包、添加或升级 pnpm patch、生成或校验第三方 notices、引入新许可证 |
| [产品与实验](supply-chain-product-and-experiments.md) | §17–§19 | 新增非实验／实验包、决定是否挂到 profile／bundle 或 optional bundle、排查“无产品使用”与实验包进入默认安装 |
| [凭据与发布](supply-chain-credentials-and-release.md) | §20、§21、§24 | 在 shipped 配置中加凭据／端点、按发布通道选择凭据注入方式、设计 verify→pack→publish 工作流 |
| [Python runtime](supply-chain-python-runtime.md) | §25 | 修改 runtime 平台标签、Node／Python／库版本锁、runtime wheel 内容或运行期资源下载、按 runtime→SDK 顺序发 PyPI |
| [门禁与迁移](supply-chain-adoption-and-gates.md) | §1、§26、§27 | 决定目标仓库接入哪些供应链检查、按阶段落地、核对某条完成信号是否有运行证据 |

总原则（源仓库实际体现）：

1. **声明面就是运行时契约。** `dependencies`/`devDependencies`/`optionalDependencies`/`peerDependencies` 分别回答"谁提供、是否会缺、是否由消费者提供"；源仓库用源码使用事实推导每个包应落在哪一段（[第 4 节](supply-chain-dependencies-and-optional-loading.md#sc-dependency-faces)），而不是靠人工感觉。
2. **发布物必须按消费者视角验证。** workspace 测试通过不等于 tarball 可安装；源仓库在打包后临时目录安装、按 Node 解析规则加载入口（[第 15 节](supply-chain-package-and-installation.md#sc-packed-install)），并单独模拟 npm 的双版本 hoisting（[第 14 节](supply-chain-package-and-installation.md#sc-install-layout)）。
3. **默认拒绝，逐项放行。** 构建脚本、发布源码、私有实验包、例外 range、补丁都必须显式列出；未列出即失败或不可发布。
4. **版本家族是发布边界。** `dsh` 家族共享一个版本；`vendor` 每个包各自一条版本线；`native` 有自己的版本。一个家族发布不重新发布另一个（[第 3 节](supply-chain-workspace-and-versions.md#sc-workspace-protocol)）。
5. **检查存在不等于覆盖完整。** 很多 gate 只覆盖 `packages/*/*` 或 `vendor/*`，不覆盖 `apps/*`/`native/*`/`python/*`；本文逐项标注覆盖边界。

## 0.1 机制 ID 与锚点

本参考的每一节对应一个稳定机制 ID；迁移或审计时按 ID 绑定，不要只按标题匹配。

机制 ID 与锚点保持原值（不重建 ID），每个机制只在一个主题页拥有正文：

| 机制 ID | 主题页 | 锚点 |
|---|---|---|
| `supply-chain-workspace-topology` | [工作区与版本](supply-chain-workspace-and-versions.md) | `#sc-workspace-topology` |
| `supply-chain-workspace-protocol` | [工作区与版本](supply-chain-workspace-and-versions.md) | `#sc-workspace-protocol` |
| `supply-chain-dependency-faces` | [依赖与可选加载](supply-chain-dependencies-and-optional-loading.md) | `#sc-dependency-faces` |
| `supply-chain-manifest-publication` | [包与安装边界](supply-chain-package-and-installation.md) | `#sc-manifest-publication` |
| `supply-chain-package-paths` | [包与安装边界](supply-chain-package-and-installation.md) | `#sc-package-paths` |
| `supply-chain-esm-payload` | [包与安装边界](supply-chain-package-and-installation.md) | `#sc-esm-payload` |
| `supply-chain-optional-deps` | [依赖与可选加载](supply-chain-dependencies-and-optional-loading.md) | `#sc-optional-deps` |
| `supply-chain-vendor-sync` | [vendor 与许可证](supply-chain-vendor-and-licenses.md) | `#sc-vendor-sync` |
| `supply-chain-vendor-rescope` | [vendor 与许可证](supply-chain-vendor-and-licenses.md) | `#sc-vendor-rescope` |
| `supply-chain-vendor-patches` | [vendor 与许可证](supply-chain-vendor-and-licenses.md) | `#sc-vendor-patches` |
| `supply-chain-licenses-notices` | [vendor 与许可证](supply-chain-vendor-and-licenses.md) | `#sc-licenses-notices` |
| `supply-chain-runtime-closure` | [包与安装边界](supply-chain-package-and-installation.md) | `#sc-runtime-closure` |
| `supply-chain-install-layout` | [包与安装边界](supply-chain-package-and-installation.md) | `#sc-install-layout` |
| `supply-chain-packed-install` | [包与安装边界](supply-chain-package-and-installation.md) | `#sc-packed-install` |
| `supply-chain-dependency-catalog` | [依赖与可选加载](supply-chain-dependencies-and-optional-loading.md) | `#sc-dependency-catalog` |
| `supply-chain-product-use` | [产品与实验](supply-chain-product-and-experiments.md) | `#sc-product-use` |
| `supply-chain-default-product-isolation` | [产品与实验](supply-chain-product-and-experiments.md) | `#sc-default-product-isolation` |
| `supply-chain-experimental-policy` | [产品与实验](supply-chain-product-and-experiments.md) | `#sc-experimental-policy` |
| `supply-chain-config-source-ownership` | [凭据与发布](supply-chain-credentials-and-release.md) | `#sc-config-source` |
| `supply-chain-secrets` | [凭据与发布](supply-chain-credentials-and-release.md) | `#sc-secrets` |
| `supply-chain-dependency-updates` | [依赖与可选加载](supply-chain-dependencies-and-optional-loading.md) | `#sc-dependency-updates` |
| `supply-chain-node-manager-lock` | [工作区与版本](supply-chain-workspace-and-versions.md) | `#sc-node-manager-lock` |
| `supply-chain-release-consumer` | [凭据与发布](supply-chain-credentials-and-release.md) | `#sc-release-consumer` |
| `supply-chain-python-runtime` | [Python runtime](supply-chain-python-runtime.md) | `#sc-python-runtime` |

---
