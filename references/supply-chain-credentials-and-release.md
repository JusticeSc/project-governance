# 配置来源、凭据与发布消费边界（supply-chain §20、§21、§24）

本页触发：在 shipped Cordis 配置中加入凭据或端点、为某条发布通道选择凭据注入方式，或设计 verify→pack→publish 工作流时，先读本页。共同使用约定：证据基线、证据标记（源义务／源事实／迁移设计／建议／未验证）与源仓库只读边界见入口页 [supply-chain.md](supply-chain.md)；本页 `deepseek-harness/<path>:<start>-<end>@687f282e` 引用指向固定提交 `687f282e`，文中命令是源仓库已有做法，不表示在迁移目标已运行。本页的三个发布通道（dsh／vendor npm、native npm、Python／PyPI）凭据前提不同，不能互相套用，也不能笼统说都用 OIDC。

本页机制：[`supply-chain-config-source-ownership`](#sc-config-source)、[`supply-chain-secrets`](#sc-secrets)、[`supply-chain-release-consumer`](#sc-release-consumer)。领域入口：[supply-chain.md](supply-chain.md)。

<a id="sc-config-source"></a>
## 20. 配置来源所有权：只禁止内联凭据/端点

### 20.1 源义务

`verify-config-source-ownership` 是一个**窄检查**，不是"所有配置键只有一个真源"的通用 gate：

- 扫描 shipped Cordis 配置：
  - `apps/*/config/**/*.yml`
  - `packages/*/*/cordis.patch.yml`
  - `packages/*/*/presets/*.patch.yml`
  - `python/*/src/**/cordis.yml`
- 拒绝单行形式：`apiKey`、`baseURL`、`apiKeyEnv`、`authToken`、`headers` 后跟 `: !!js` 的配置。
- 原因：adapter 通过 `ctx.credentials` 解析 `apiKeyEnv`，通过环境快照解析 endpoint；在这里内联会绕过两条 ladder。
- 证据：`deepseek-harness/scripts/verify-config-source-ownership.ts:1-56@687f282e`；测试示例 `deepseek-harness/scripts/verify-config-source-ownership.spec.ts:17-30@687f282e`。

它**不**：

- 检查任意配置键的重复定义；
- 检查 schema 默认值/文档一致性；
- 检查业务代码里的 `process.env`；
- 解析完整 YAML（明确说 "not full YAML analysis"）。

### 20.2 操作程序

1. 在 shipped Cordis 配置中，凭据用 `apiKeyEnv` 指向环境变量名，端点通过环境快照/adapter 解析；不要写 `apiKey: !!js process.env.X`、`baseURL: !!js ...`。
2. 需要新配置项时，在 schema/默认配置中声明，再在文档/示例引用；不要把值直接写进 bundle patch。
3. 运行 `pnpm run verify-config-source-ownership`；它在 doc-sync lane，PR 不一定自动跑，迁移时建议加入 PR lane。
4. 如果要检查"配置键单一来源"，需要另写 gate；不要把这个脚本当成通用配置所有权检查。
5. 更新配置文档/示例；若双语，运行 translation pairing。

**完成信号**：gate 输出 "no credential or endpoint uses the ordinary inline environment form"；配置中无 `: !!js` 内联凭据/端点。

**失败处理**：
- 命中 `baseURL: !!js ...`：改成通过环境快照读取；如果必须支持动态值，放到 adapter 的解析逻辑，不要在 YAML 内联。
- 命中 `headers: !!js ...`：同上；headers 可能含 token，风险更高。
- 目标仓库没有该 gate：用 `rg` 检查 shipped config 的 `: !!js` 形式，并补一个窄脚本；不要扩大成"所有配置键唯一"的过度设计。

**例外**：该 gate 只覆盖单行形式；多行 YAML/锚点/合并键可能绕过。它是 source check，不证明运行时凭据 ladder 一定安全；还需要凭据注入/日志检查。

**证据边界**：56 行已读；未运行。源仓库没有通用配置来源 gate；本文不把[第 19 节](supply-chain-product-and-experiments.md#sc-experimental-policy)的窄检查外推为完整配置治理。

---

来源：deepseek-harness/scripts/verify-config-source-ownership.ts:1-56@687f282e 来源：deepseek-harness/scripts/verify-config-source-ownership.spec.ts:17-30@687f282e 来源：deepseek-harness/scripts/verify-config-source-ownership.spec.ts:1-16@687f282e

<a id="sc-secrets"></a>
## 21. 凭据、密钥与发布注入

### 21.1 源事实（按发布通道区分，不能一概说 OIDC）

- **dsh/vendor npm publish**：`workflow_dispatch` 手动触发；publish job 使用 `environment: npm-publish`，`permissions: contents: read`（没有 `id-token: write`）；`NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}`；checkout `persist-credentials: false`；安装 `--frozen-lockfile --ignore-scripts`；publish job 不重新 build（pack job 会从当前 tree 构建并上传 artifact）；`release/publish.ts` 调 `npm publish <tarball> [--tag]`，**没有 `--access`**（access 来自 manifest `publishConfig`），也**没有 `--provenance`**。证据：`deepseek-harness/.github/workflows/release-publish.yml:80-131@687f282e`、`deepseek-harness/.github/workflows/release-vendor-publish.yml:80-126@687f282e`、`deepseek-harness/scripts/release/publish.ts:124-200@687f282e`。
- **native npm publish**：`node-addon-system-release.yml` 的 publish job 使用 `environment: npm-publish`、`permissions: contents: read` + `id-token: write`；`NPM_TOKEN` 仅在非空时作为 `NODE_AUTH_TOKEN` fallback；发布走 `scripts/publish-release.mjs`。这是与 dsh/vendor 不同的凭据路径；OIDC 是否实际被 npm 采用未在本文验证。证据：`deepseek-harness/.github/workflows/node-addon-system-release.yml:140-188@687f282e`。
- **Python/PyPI publish**：`python-release.yml` 使用 `environment: pypi-runtime`/`pypi`、`permissions: id-token: write`、`pypa/gh-action-pypi-publish@release/v1`；发布前 `sha256sum -c SHA256SUMS`；显式 `attestations: false`，源注释说明公开 attestation 会暴露私有发布仓库。证据：`deepseek-harness/.github/workflows/python-release.yml:185-248@687f282e`。
- `release/publish.ts` 逐包检查 registry integrity：不存在才发布；已存在且 integrity 相同则跳过；不同则失败（提示 bump/调查可重复构建）。发布重试前重新读 registry，避免 E409 实际已落盘。证据：`deepseek-harness/scripts/release/publish.ts:146-200@687f282e`。
- 仓库中不提交 token；`vendor/` 不走 registry 自动更新（Dependabot 排除）。配置中的凭据 ladder 见第 20 节：shipped config 不允许内联 `apiKey`/`baseURL`/`authToken`/`headers: !!js`。

### 21.2 操作程序

1. 本地：凭据放未跟踪的 `.env`/OS keychain；`.gitignore` 覆盖 `.env*`、本地 `.npmrc`。
2. 先选发布通道，不要套用同一套凭据假设：
   - dsh/vendor npm：`environment: npm-publish` + `NPM_TOKEN` secret；publish job 只有 `contents: read`，没有 OIDC。
   - native npm：`environment: npm-publish` + `id-token: write`；`NPM_TOKEN` 仅作为非空 fallback。
   - Python/PyPI：`environment: pypi-runtime`/`pypi` + `id-token: write`，使用 `pypa/gh-action-pypi-publish`，`attestations: false`。
3. CI：token 只在 publish job 注入；checkout `persist-credentials: false`；安装 `--frozen-lockfile --ignore-scripts`；publish job 不重新 build（pack job 会重建）。dsh/vendor 的 `setup-node` 用 `registry-url` + `NODE_AUTH_TOKEN`；源工作流没有显式“发布后删除 .npmrc”步骤，不要伪造该保证。
4. npm 发布：不要加 `--access`（manifest `publishConfig.access` 决定）；源 `release/publish.ts` **没有** `--provenance`。如果目标仓库要求 provenance，必须显式加 `id-token: write`、`--provenance` 并验证 registry/仓库可见性；不要声称源仓库已有。
5. 轮换：记录 token 所有者/过期时间；泄漏先 revoke 再重发；已发布版本只能 deprecate，不能覆盖。
6. 配置：凭据用 `apiKeyEnv`/`ctx.credentials`；端点用环境快照；不要在 YAML/代码中硬编码。发布前检查日志/命令输出，确认没有 secret 回显。

**完成信号**（按通道）：
- dsh/vendor：`NPM_TOKEN` 只在 environment/publish job；无 token 回显；`persist-credentials:false`；`release/publish.ts` 的 integrity 检查生效。**不是**“已使用 OIDC provenance”。
- native：`id-token: write` 存在；fallback token 只在非空时注入；publish 脚本可重入。
- PyPI：OIDC 发布成功；`SHA256SUMS` 校验通过；`attestations:false` 是有意选择。

**失败处理**：
- 误提交 token：立即 revoke/rotate，清理历史（如果已推送）；不要只删文件。
- dsh/vendor 发布鉴权失败：检查 environment `npm-publish` 的 `NPM_TOKEN`/reviewer 设置；不要绕过 environment 或把 token 写进仓库。
- native/PyPI 权限失败：检查 `id-token: write` 与 environment；不要换长期 PAT 绕过 OIDC。
- npm 已存在同版本：用 integrity 比较；相同跳过，不同则 bump/调查，不能覆盖。

**例外**：`NODE_AUTH_TOKEN` 在 publish job 的环境变量中是允许的；`setup-node` 会写 npm 认证配置，源工作流没有显式清理步骤。`NPM_TOKEN` 的具体权限/环境设置不在仓库内，本文不能证明 reviewer 一定启用。PyPI `attestations:false` 是已知的可见性取舍，不是“已生成公开 attestation”。

**证据边界**：未扫描 git 历史；未验证 GitHub Environment 实际设置；未运行发布；native 的 OIDC 是否真正被 npm 采用未验证；dsh/vendor 没有 provenance。本文只描述源工作流可见步骤。

---

来源：deepseek-harness/.github/workflows/release-publish.yml:80-131@687f282e 来源：deepseek-harness/.github/workflows/release-vendor-publish.yml:80-126@687f282e 来源：deepseek-harness/.github/workflows/node-addon-system-release.yml:150-188@687f282e 来源：deepseek-harness/.github/workflows/python-release.yml:185-248@687f282e 来源：deepseek-harness/scripts/release/publish.ts:124-200@687f282e

<a id="sc-release-consumer"></a>
## 24. 发布消费边界：verify → pack → publish

### 24.1 源事实

- `release.yml`（dsh 预演）：PR/push 上跑依赖策略、安装布局；pack job 跑 `release:verify --family dsh`（非发布模式）、构建、`release:pack --family dsh`，**另外** pack vendor 与 Landlock entry 仅供 packed install 验证；随后 `release:verify-packed-install --from dist/npm --from dist/npm-vendor --from dist/npm-landlock`；只上传 `dist/npm/*`，不发布。vendor/landlock tarball 不进入 artifact。
- `release-publish.yml`（dsh 发布，手动）：**pack job 从当前 tree 重新构建/打包**（不是复用 PR artifact）：frozen install、`RELEASE_PUBLISH=true release:verify --family dsh`、`build:official`、pack dsh、pack vendor/landlock 供验证、packed install、上传 dsh artifact。**publish job** 下载该 artifact，`pnpm install --frozen-lockfile --ignore-scripts`，运行 `release:publish --family dsh --from dist/npm`；publish job 没有 build 步骤。环境 `npm-publish` 是唯一可写 registry 的 job。
- `release-vendor-publish.yml`（vendor 发布，手动）：同样两段式；pack job 跑 `release:verify --family vendor`、`build:lib:host`、pack vendor、vendor packed install、上传；publish job 下载并 `release:publish --family vendor --from dist/npm-vendor`。vendor 有独立 tag/版本线；dsh 的发布不发布 vendor tarball。
- `release/pack.ts`：pack 是发布边界；无凭据；从同一 commit 产出所有 tarball；调用 `pnpm pack`；写 `publish-order.txt`；校验 payload 与 packed identity。
- `release/verify.ts`：解析 publish order；发布模式下检查非 private、tag/family/version。
- `release/verify-packed-install.ts`：临时消费者真实安装；允许 `--from` 多个目录；驱动 entry；检查安装图隔离。
- `release/publish.ts`：逐包检查 registry：不存在则发布；已存在且 integrity 相同则跳过；已存在但不同则失败。对 `E409/E429/E500/E502/E503/E504/ETIMEDOUT/ECONNRESET/EAI_AGAIN` 做最多 4 次重试，每次重试先重读 registry；显式 `--dist-tag` 在整批上传前校验占用。**源码没有 `--provenance` 参数**；不要把 provenance 当成已实现的发布保证。
- 证据：`deepseek-harness/scripts/release/pack.ts:1-108@687f282e`、`deepseek-harness/scripts/release/verify.ts:40-100@687f282e`、`deepseek-harness/scripts/release/verify-packed-install.ts:1-126@687f282e`、`deepseek-harness/scripts/release/publish.ts:1-235@687f282e`、`deepseek-harness/.github/workflows/release.yml:1-180@687f282e`、`deepseek-harness/.github/workflows/release-publish.yml:1-131@687f282e`、`deepseek-harness/.github/workflows/release-vendor-publish.yml:1-126@687f282e`。

### 24.2 操作程序

1. PR 中完成依赖/包变更；确保 dependency + pack 通过。
2. 合并后手动触发对应 workflow：dsh 用 `release-publish.yml`（无 version 输入），vendor 用 `release-vendor-publish.yml`（可选 `dist-tag` 输入）。确认 ref 是 family tag（`dsh-v*`/`vendor-*`）；tag 必须已存在，workflow 不会替你创建。
3. pack job 从当前 tree 重新构建/打包并上传 artifact；publish job 下载 artifact，不重新 build。不要以为 publish 会复用 PR 预演产物。
4. packed install 在 pack job 中完成（dsh 还带 vendor/landlock `--from`）；publish job 不再重跑。若 pack job 的 packed install 失败，publish 不会开始。
5. 发布前核对 `release:publish` 的 registry integrity/`dist-tag` 行为；发布后核对 registry tarball integrity 与 artifact。**源码不生成 provenance/attestation**；“检查 provenance”是迁移增强建议，不是源机制。
6. 发布前确认 tag/release/changelog 与版本一致；不要在发布后补一个不匹配的 tag。
7. 发布后发现坏包：deprecate，不要删除/重用版本；发修复版本。

**完成信号**：registry 可安装；integrity 一致；tag/release 匹配；packed install 在 pack job 已通过。provenance 只有在你额外实现/启用后才是完成信号。

**失败处理**：
- tag 已存在/不匹配：停止，修版本/tag；不要 force push。
- packed install 失败：回到 pack 阶段修复，不要跳过验证。
- integrity 不同：调查可重复构建/缓存；不要覆盖已发布版本。
- registry 权限失败：检查 environment/token；不要换个人 PAT。

**例外**：dsh 的 `release-publish.yml` 只发布 `dist/npm`；vendor/landlock tarball 仅用于验证。vendor 由 `release-vendor-publish.yml` 单独发布 `dist/npm-vendor`；不要把它当成 dsh 发布的一部分。`apps/desktop` 不走 npm 发布，走桌面安装包流程（不在本域展开）。发布 tag 规则依赖 `GITHUB_REF`，本地不会触发。

**证据边界**：未运行发布；`release.yml` 1-180、`release-publish.yml` 1-131、`release-vendor-publish.yml` 1-126、`release/publish.ts` 1-235 全读。publish job 的 environment reviewer/allowed-tag 配置属于 GitHub 远端设置，仓库文件只留注释，未验证。`release:verify` 的 tag 读取/本地行为未运行。

---

来源：deepseek-harness/scripts/release/pack.ts:1-108@687f282e 来源：deepseek-harness/scripts/release/verify.ts:40-100@687f282e 来源：deepseek-harness/scripts/release/verify-packed-install.ts:1-126@687f282e 来源：deepseek-harness/scripts/release/publish.ts:1-235@687f282e 来源：deepseek-harness/.github/workflows/release.yml:1-180@687f282e 来源：deepseek-harness/.github/workflows/release-publish.yml:1-131@687f282e 来源：deepseek-harness/.github/workflows/release-vendor-publish.yml:1-126@687f282e
