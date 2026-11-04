# Python SDK runtime wheel、锁定资源与双阶段发布（supply-chain §25）

本页触发：修改 runtime 平台标签、Node／Python／库版本锁、runtime wheel 内容或运行期资源下载，以及按 runtime→SDK 顺序发布 PyPI 时，先读本页。共同使用约定：证据基线、证据标记（源义务／源事实／迁移设计／建议／未验证）与源仓库只读边界见入口页 [supply-chain.md](supply-chain.md)；本页 `deepseek-harness/<path>:<start>-<end>@687f282e` 引用指向固定提交 `687f282e`，文中命令是源仓库已有做法，不表示在迁移目标已运行。

本页机制：[`supply-chain-python-runtime`](#sc-python-runtime)。领域入口：[supply-chain.md](supply-chain.md)。

<a id="sc-python-runtime"></a>
## 25. Python SDK runtime wheel、锁定资源与双阶段发布

### 25.1 源义务

Python 侧有两个发行物，不能混成一个 wheel：

- `deepseek-harness-sdk`：纯 Python wheel，`py3-none-any`，包含 SDK 模块、`LICENSE`，并精确依赖 `deepseek-harness-runtime-bin==<version>`。
- `deepseek-harness-runtime-bin`：平台 wheel，包含 `dsh` 可执行文件、ripgrep/macOS spawn-helper sidecar，以及一个 `downloads.json`/Office skills 资源目录；只发布 wheel，不发布 sdist。

`build-python-release.py` 的 `stage_sdk`/`stage_runtime` 是打包事实源：SDK wheel 写入 `LICENSE`；runtime wheel 写入 `LICENSE` + `THIRD_PARTY_NOTICES.md`；runtime 可执行文件必须与 `platforms.json` 的 `executable` 名称完全一致，平台 tag 由构建环境 `DSH_RUNTIME_PLATFORM_TAG` 指定（`deepseek-harness/scripts/build-python-release.py:128-215@687f282e`）。`hatch_build.py` 在构建时再次拒绝：

- `sdist`：runtime 包是 wheel-only；
- 非空但缺文件、或多出文件、或平台 tag 不唯一的 payload；
- 非可执行文件（Windows 除外）、缺失的 `-rg`/`-spawn-helper` sidecar；
- 平台 tag 与 `platforms.json` 不匹配。

`platforms.json` 精确列出五个 runtime 平台：`manylinux_2_28_x86_64`、`manylinux_2_28_aarch64`、`macosx_14_0_arm64`、`macosx_14_0_x86_64`、`win_amd64`；没有 Windows arm64（`deepseek-harness/python/sdk-runtime/platforms.json:1-22@687f282e`、`deepseek-harness/python/sdk-runtime/hatch_build.py:48-108@687f282e`）。`build-python-release.py` 还会解包检查：WHEEL `Tag` 必须恰好是 `py3-none-any` 或 `py3-none-<platform tag>`；`Name`/`Version` 必须匹配；`License-Expression` 必须是 `MIT`；`License-File` 集合必须是 SDK `[LICENSE]` / runtime `[LICENSE, THIRD_PARTY_NOTICES.md]`；SDK wheel 不得含 runtime payload；SDK 的 `Requires-Dist` 必须含精确 runtime pin；单文件不得超过 100,000,000 字节（`deepseek-harness/scripts/build-python-release.py:47-92@687f282e`、`deepseek-harness/scripts/build-python-release.py:217-295@687f282e`）。

**运行时资源不是构建时全部塞入 wheel。** `runtime-bootstrap.mjs` 只在显式 `DSH_RUNTIME_DOWNLOAD=office|primary` 时下载；普通 import/CLI 启动不下载。它要求 `DSH_RESOURCE_CACHE` 是绝对路径；`downloads.json.identity` 必须是 64 位 hex；下载先写临时目录，再 rename 到 `<cache>/<identity>/<kind>`，失败清理临时目录，已存在 `complete` 标记时复用。`_resources.py` 对最终目录再校验 `downloads.json` 的 `target`、64-hex `identity`、非空 `office`、`pnpm` 为对象，以及自动发现 Office cache 时 `complete` 内容与 `identity` 一致（`deepseek-harness/python/sdk-runtime/runtime-bootstrap.mjs:1-105@687f282e`、`deepseek-harness/python/sdk-runtime/src/deepseek_harness_runtime/_resources.py:1-121@687f282e`）。`scripts/python-runtime-download.spec.ts` 还验证：启动不创建缓存、primary/office 独立下载、失败清理、并发只发布一个完整缓存、非法 selector 被拒绝（`deepseek-harness/scripts/python-runtime-download.spec.ts:1-135@687f282e`）。

**资源内容由 lock 固定，不由下载时解析。** `scripts/primary-runtime/lock.json` 固定 Node/Python 版本、每个平台的 Node/Python archive SHA-256、每个目标平台的 Python wheels URL/SHA-256，以及共享 wheel 列表和 Python distribution 版本。Office sidecar 的每个 npm package 也由 `pnpm-lock.yaml` 的 `sha512-...` integrity 锁定，`officeSidecarArchives` 按包名/版本构造 registry tarball URL，并在解包时核对 package identity（`deepseek-harness/scripts/build-exe-for-python-sdk-office.ts:1-63@687f282e`）。示例源值：Node `24.21.0`、Python `3.12.14`、release `20260901`；迁移时应参数化，不要把这三个值当通用默认。`prepare.ts`：

- 按 SHA-256 校验 archive；npm tarball 先校验 `sha512-...` integrity，再解包并核对 `package.json.name/version`；
- 支持 `DSH_RESOURCE_DOWNLOAD_TIMEOUT_MS` 的 1..2147483647 整数边界；
- 拒绝 wheel 的 `.data` 安装 scheme（`scripts` 除外）；
- `primaryRuntimePayloadDigest` 把 `format: 7`、target、Python/Node 版本、wheels、Python packages、pnpm 版本一起哈希；提取/组装格式变化必须提升 format；
- 只删除 numpy/pandas 的 `tests` 目录并同步其 `RECORD`，不删测试 helper 或原生扩展（`deepseek-harness/scripts/primary-runtime/prepare.ts:1-287@687f282e`、`deepseek-harness/scripts/primary-runtime/prune-python-tests.ts:1-41@687f282e`、`deepseek-harness/scripts/primary-runtime/lock.json:1-180@687f282e`）。

`build-exe-for-python-sdk.ts` 在编译前先运行 `verify-runtime-closure`；以 `dsh-python-runtime-closure` 为 deploy root，使用 `--prod --config.allow-unused-patches=true --config.node-linker=hoisted --config.auto-install-peers=false --config.link-workspace-packages=true --config.hoist-workspace-packages=false`，把 staging 变成 symlink-free 目录；随后把 workspace symlink 物化为文件、按 pnpm identity 去重相同 workspace 包，并删除 README/CHANGELOG/HISTORY/map/d.ts 等非运行时文件。`allowUnusedPatches:true` 只允许“运行闭包外”的未使用 patch；闭包内 patch 必须仍能应用——这是[第 11 节](supply-chain-vendor-and-licenses.md#sc-vendor-patches) patch 规则在 Python runtime 上的例外（`deepseek-harness/scripts/build-exe-for-python-sdk.ts:264-338@687f282e`、`deepseek-harness/scripts/build-exe-for-python-sdk.ts:340-384@687f282e`、`deepseek-harness/scripts/build-exe-for-python-sdk-staging.ts:1-103@687f282e`）。staging 生成 `downloads.json` 时用 `{version,target,office,pnpm,primaryLock}` 再哈希出 64-hex identity；`runtime-bootstrap.mjs` 是该 closure 的唯一入口；deploy root 的依赖清单来自 `python/sdk-runtime/package.json`（`deepseek-harness/scripts/build-exe-for-python-sdk.ts:417-423@687f282e`、`deepseek-harness/python/sdk-runtime/README.md:1-69@687f282e`、`deepseek-harness/python/sdk-runtime/package.json:7-160@687f282e`）。

**发布是两阶段，不是一次 `twine upload dist/*`。** `python-release.yml`：

1. `build` 生成六个 wheel（五个 runtime 平台 + 一个 SDK）；
2. `python-compat` 在 Python 3.10/3.14 安装本地 runtime wheel，跑 `smoke-python-runtime.py --scenario sdk-default` 和 `sdk-mcp`；
3. `validate` 严格要求六个文件名、每个文件 `<100000000` 字节，`twine check`，生成 `SHA256SUMS` 并上传 artifact；
4. `publish-runtime` 先发布五个 runtime wheel（`environment: pypi-runtime`、`id-token: write`、`sha256sum -c SHA256SUMS`、`attestations: false`）；
5. `publish-sdk` 再发布 SDK wheel（`environment: pypi`、同样校验 hash）；如果 SDK 上传失败，重跑失败 job 从 `publish-sdk` 继续，不会覆盖已 immutable 的 runtime 文件。

发布仅在手动 `workflow_dispatch`、tag `python-v<repository-version>`、`PYPI_PUBLISHER_REPOSITORY` 等于当前仓库且 `PUBLIC_PYPI_RELEASE_ENABLED=true` 时允许；`attestations:false` 的注释说明公开 attestation 会暴露私有发布仓库身份（`deepseek-harness/.github/workflows/python-release.yml:1-248@687f282e`）。Python SDK 自身用 `pyproject.toml` 固定 `requires-python >=3.10`、`pydantic>=2.12,<3` 和精确 runtime pin；`uv.lock` 提交版本/hash，runtime 包的 test group 用 Pillow/pytest；runtime wheel 的构建/发布与 SDK wheel 分离（`deepseek-harness/python/sdk/pyproject.toml:1-39@687f282e`、`deepseek-harness/python/sdk/uv.lock:1-45@687f282e`、`deepseek-harness/python/sdk-runtime/pyproject.toml:1-41@687f282e`）。

### 25.2 操作程序

1. **先改源 lock，不要手改 wheel**：需要升级 Node/Python/库时，更新 `scripts/primary-runtime/lock.json` 和/或 `python/sdk/uv.lock`；如需新平台，先加 `platforms.json`，确认目标 tag 与 `lock.targets` 一一对应。
2. **构建 runtime payload**：在目标架构主机（或 workflow 的 build job）运行 `python/sdk-runtime` 的构建，设置 `DSH_RUNTIME_PLATFORM_TAG`；`hatch_build.py` 会拒绝 sdist、缺文件、多文件、错误 sidecar、错误平台 tag。不要用 `--skip-build` 跳过构建；`verify-runtime-closure` 仍应先运行。
3. **构建 wheel**：`python scripts/build-python-release.py --package runtime --platform <target> --runtime-exe <exe> --output-dir dist` 和 `--package sdk ...`。每个命令都会检查 wheel tag、名称、版本、license 文件、MIT、runtime payload、SDK 的精确 runtime pin 和 100MB 上限。
4. **发布前验证**：用 `validate` 的六个文件名清单核对 `dist`；对每个 wheel 跑 `twine check`；生成 `SHA256SUMS`；在干净 venv 安装“SDK wheel + 对应平台 runtime wheel”跑 SDK 冒烟。只验证一个平台不够。
5. **发布**：手动触发 `python-release.yml`，先 runtime 后 SDK；发布只从 `python-v<version>` tag，且 repository 必须是配置的 publisher repository。不要把 runtime 与 SDK 合并成一个 job；immutable 文件不能靠重跑覆盖。
6. **运行期资源**：只通过 `download_primary_runtime()`/`download_office()` 显式下载；测试 `DSH_RESOURCE_DOWNLOAD` 只接受 `office`/`primary`，非法值必须失败并保持缓存为空；设置 `DSH_RESOURCE_CACHE` 时必须绝对路径。普通 `import`/`dsh` 启动不得触发下载。

**完成信号**：

- 五个平台 runtime wheel 的文件名/tag/payload 与 `platforms.json` 完全匹配，且每个 wheel 的 `LICENSE`/`THIRD_PARTY_NOTICES.md` 存在；
- SDK wheel 是 `py3-none-any`，无 runtime payload，且 `Requires-Dist` 精确 pin 同版本 runtime；
- `SHA256SUMS` 在 publish 前被 `sha256sum -c` 复核；runtime 先于 SDK 发布；
- 干净 venv 的 SDK 默认/MCP 场景可启动；显式下载失败不留下半成品缓存；并发下载只产生一个完整目录。

**失败处理**：

- wheel 超过 100MB：先拆 payload/裁掉测试资源；不要改上限绕过；
- WHEEL tag 或 runtime payload 不匹配：检查 `platforms.json`、`DSH_RUNTIME_PLATFORM_TAG`、源可执行文件 basename；不要手工重命名 wheel；
- `Requires-Dist`/license/版本检查失败：修 `stage_sdk`/`stage_runtime` 或 pyproject；不要 `--no-deps` 发布绕过；
- hash 不匹配：删除损坏缓存并重新下载；不要跳过 hash；
- runtime 已发布而 SDK 失败：只重跑 `publish-sdk`，不要重新上传 runtime；
- 普通启动尝试下载：说明 `downloads.json` 或 selector 泄漏，修 bootstrap；不要在 import 路径加隐式下载。

**例外**：

- `runtime/node/` 是 dev-only carrier，可从源码运行，但被排除在 wheel/sdist 之外；生产 wheel 不依赖它。
- 生产 deploy 允许闭包外的未使用 patch；仓库安装仍拒绝未使用 patch；不要把这个例外推广到整个 workspace。
- 仅发布已声明平台；其他平台应报 `unsupported ... platform`，不是静默生成错误 wheel。
- `DSH_RESOURCE_CACHE`、`DSH_OFFICE_SIDECAR`、`DSH_PRIMARY_RUNTIME` 是可配置覆盖；前两者必须是绝对路径，`DSH_PRIMARY_RUNTIME` 由 profile 解析（建议绝对路径，空值禁用），资源内容仍按 manifest/identity 校验。

**证据边界**：本节为静态源码分析；没有运行 `uv build`、wheel 安装、`twine check`、Python workflow 或真实 PyPI 发布。PyPI environment/reviewer、`PYPI_PUBLISHER_REPOSITORY`、`PUBLIC_PYPI_RELEASE_ENABLED` 的真实配置未验证。`uv.lock` 既有声明已由1-45扩展到另有46-419补读，本批只复读1-18及UV项目调用来源；它是保存解析版本/来源/hash的生成数据，不是手写政策，完整语义/锁一致性与实际冻结安装仍未证明。`build-exe-for-python-sdk.ts` 本域只声明关键段（27-43、167-172、197-235、256-338、340-384、417-423、480-519、600-622），Release另有1-622声明，不能把peer读取算成本批新读。`lock.json` 具体版本/hash是源快照，目标必须按实际依赖重新生成并验证。

来源：deepseek-harness/python/sdk/pyproject.toml:1-39@687f282e 来源：deepseek-harness/python/sdk/uv.lock:1-45@687f282e 来源：deepseek-harness/python/sdk-runtime/pyproject.toml:1-41@687f282e 来源：deepseek-harness/python/sdk-runtime/package.json:1-164@687f282e 来源：deepseek-harness/python/sdk-runtime/platforms.json:1-22@687f282e 来源：deepseek-harness/python/sdk-runtime/hatch_build.py:1-108@687f282e 来源：deepseek-harness/python/sdk-runtime/runtime-bootstrap.mjs:1-105@687f282e 来源：deepseek-harness/python/sdk-runtime/src/deepseek_harness_runtime/_resources.py:1-121@687f282e 来源：deepseek-harness/python/sdk-runtime/README.md:1-69@687f282e 来源：deepseek-harness/scripts/primary-runtime/lock.json:1-180@687f282e 来源：deepseek-harness/scripts/primary-runtime/prepare.ts:1-287@687f282e 来源：deepseek-harness/scripts/primary-runtime/prepare.spec.ts:1-169@687f282e 来源：deepseek-harness/scripts/primary-runtime/prune-python-tests.ts:1-41@687f282e 来源：deepseek-harness/scripts/build-python-release.py:1-295@687f282e 来源：deepseek-harness/scripts/build-exe-for-python-sdk.ts:27-43@687f282e 来源：deepseek-harness/scripts/build-exe-for-python-sdk.ts:167-172@687f282e 来源：deepseek-harness/scripts/build-exe-for-python-sdk.ts:197-235@687f282e 来源：deepseek-harness/scripts/build-exe-for-python-sdk.ts:256-338@687f282e 来源：deepseek-harness/scripts/build-exe-for-python-sdk.ts:340-384@687f282e 来源：deepseek-harness/scripts/build-exe-for-python-sdk.ts:417-423@687f282e 来源：deepseek-harness/scripts/build-exe-for-python-sdk.ts:480-519@687f282e 来源：deepseek-harness/scripts/build-exe-for-python-sdk.ts:600-622@687f282e 来源：deepseek-harness/scripts/build-exe-for-python-sdk-staging.ts:1-103@687f282e 来源：deepseek-harness/scripts/build-exe-for-python-sdk-office.ts:1-63@687f282e 来源：deepseek-harness/scripts/build-exe-for-python-sdk-resources.ts:1-17@687f282e 来源：deepseek-harness/.github/workflows/python-release.yml:1-248@687f282e 来源：deepseek-harness/scripts/python-runtime-download.spec.ts:1-135@687f282e 来源：deepseek-harness/python/development.md:7-17@687f282e 来源：deepseek-harness/python/development.md:92-98@687f282e

**来源坐标补充**：以下坐标对应本页机制（固定提交 `687f282e`）；只用于追溯，不新增正文断言，正文解释以上文小节为准。

- `supply-chain-python-runtime`：`deepseek-harness/python/sdk-runtime/package.json:1-164@687f282e`、`deepseek-harness/python/sdk-runtime/hatch_build.py:1-108@687f282e`、`deepseek-harness/scripts/primary-runtime/prepare.spec.ts:1-169@687f282e`、`deepseek-harness/scripts/build-python-release.py:1-295@687f282e`、`deepseek-harness/scripts/build-exe-for-python-sdk.ts:27-43@687f282e`、`deepseek-harness/scripts/build-exe-for-python-sdk.ts:167-172@687f282e`、`deepseek-harness/scripts/build-exe-for-python-sdk.ts:197-235@687f282e`、`deepseek-harness/scripts/build-exe-for-python-sdk.ts:256-338@687f282e`、`deepseek-harness/scripts/build-exe-for-python-sdk.ts:480-519@687f282e`、`deepseek-harness/scripts/build-exe-for-python-sdk.ts:600-622@687f282e`、`deepseek-harness/scripts/build-exe-for-python-sdk-resources.ts:1-17@687f282e`
