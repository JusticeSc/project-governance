# 真实 API 证据、凭据与秘密边界

本页触发：要运行真实 provider/真实 API 证据、决定 key 与凭据如何进入 CI、限制网络出口与副作用，或审查日志/夹具中的秘密暴露时读本页。本页完整拥有 §10–11（M10 e2e key 策略与信任边界、M11 凭据/网络/副作用隔离）和 §39（M39 秘密与凭据卫生）。mock 边界与真实入口、快照身份与 header pins、CI 编排的机制分别见同目录 `testing-evidence-and-reliability.md`、`testing-snapshot-workflow.md`、`testing-platform-and-performance.md`。

读法：每节是一份完整机制记录——机制 ID、问题、触发、前提、步骤、角色与完成信号、失败处理、例外、证据限制；出现哪一小节就承担哪一项义务，缺省不等于免除。标记约定（**[源规则]**／**[迁移设计]**／**[建议]**）与固定源提交 `687f282e` 见根 `testing.md` 首段；触发选择与命令总表见根 `testing.md` §0。本页引用其他页的机制时写成可点击链接。

<a id="m10-e2e-key"></a>

## 10. M10 真实 API e2e：key 策略与信任边界

**机制 ID.** `testing-e2e-real-api-key-policy`。

**问题.** 无 key 的 e2e 只能证明管线可跑；有 key 才能证明 agent 对真实模型工作。另一方面，把 key 暴露给 fork PR 会泄露，把“全部跳过”当成绿色会假绿。

**触发.** 修改 provider/agent/工具/文件写入/多轮/取消行为；发布前；真实 API 回归。

**前提.** 已有真实 key（本地 `.env` 或 CI secret）；已确认运行环境允许外网；已确认不会产生生产副作用。

**步骤.**
1. 本地/无 key CI 运行 `pnpm run test:e2e`，套件按 key 自跳过；这把 secretless CI 和 keyless contributor 解锁，但**不是成本信号，也不是产品证明**。`deepseek-harness/docs/testing.md:23-25@687f282e`。
2. 有 key 时覆盖高价值 smoke：启动 shipped `dsh` profile、发一个 prompt、检查世界（文件、多轮、工具、取消）；这能抓住“绿单测、坏产品”。`deepseek-harness/docs/testing.md:23-25@687f282e、deepseek-harness/docs/testing.md:37-41@687f282e`。
3. CI 的 e2e workflow 只在可信事件运行；fork PR 和 Dependabot PR 被 job-level `if` 跳过，GitHub 不向它们提供 secret。`deepseek-harness/.github/workflows/e2e.yml:1-25@687f282e`、`:52-60@687f282e`。
4. **preflight 必须硬失败**：job 运行时 secret 为空则报错退出，否则自跳过会产生假绿。`deepseek-harness/.github/workflows/e2e.yml:82-99@687f282e`。
5. secret 只映射到 preflight 和 e2e step；`DEEPSEEK_BASE_URL` 显式固定，避免 repo-root `.env` 重定向；telemetry 关闭。`deepseek-harness/.github/workflows/e2e.yml:23-27@687f282e`、`:100-122@687f282e`。
6. 真实 provider 的瞬时失败可以有界重试（源仓 e2e 配置 retry 2），但这是外部边界例外；本地确定性测试不适用。`deepseek-harness/.github/workflows/e2e.yml:52-60@687f282e`。
7. 失败时报告命令、目标、实际 provider 响应/退出；不要打印 key。

**角色与完成信号.** 作者/发布负责人运行；完成信号是**有 key 的真实运行**通过，且断言检查了世界（[M12](testing-evidence-and-reliability.md#m12-world-verification)），不是只看模型自述。

**失败处理.** 无 key：只能声明“管线通过/跳过”，不能声明产品通过。preflight 空：修 secret，不要放宽 preflight。provider 失败：区分外部瞬态和产品回归。

**例外.** fork/Dependabot PR 的 job-level skip 会报告为成功检查；这表示“未验证”，不是“已验证”。采用项目若把它设为 required check，必须知道这一点。

**证据限制.** 源仓能证明 workflow 和 preflight；不能证明远端 secret、分支保护或 required check 已配置。真实 key 的运行结果必须由采用项目自己保存。

<a id="m11-e2e-isolation"></a>

## 11. M11 e2e 凭据、网络与副作用隔离

**机制 ID.** `testing-e2e-credential-and-egress-isolation`。

**问题.** 真实 API 测试同时带来 key 泄露、外部网络依赖、生产遥测、代理干扰和不可控副作用。

**触发.** 新增/修改真实 API 测试、provider 配置、CI secret、网络夹具。

**前提.** 已列出测试会触达的外部端点、会写入的本地/远端状态、会继承的环境变量。

**步骤.**
1. **最小权限**：e2e workflow `permissions: contents: read`；不要给写权限。`deepseek-harness/.github/workflows/e2e.yml:29-32@687f282e`。
2. **禁止 `pull_request_target`**：它会在 base 上下文带 secret 运行不可信 fork 代码，是典型 key 泄露向量。源仓在 workflow 注释中明确禁止。`deepseek-harness/.github/workflows/e2e.yml:17-22@687f282e`。
3. **secret 作用域最小化**：只放在 preflight 和 e2e step；checkout/setup/install 步骤看不到。`deepseek-harness/.github/workflows/e2e.yml:82-99@687f282e`、`:100-122@687f282e`。
4. **固定端点**：显式设 `DEEPSEEK_BASE_URL`，避免 root `.env` 或环境把请求重定向到非预期服务。`deepseek-harness/.github/workflows/e2e.yml:23-27@687f282e`。
5. **关闭生产遥测**：CI 运行不应向生产 telemetry 端点上报。`deepseek-harness/.github/workflows/e2e.yml:23-27@687f282e`。
6. **清除 ambient proxy**：测试 setup 删除代理变量，让本地 fixture 请求不会被开发者代理截获；需要代理的测试显式设置。`deepseek-harness/scripts/test-proxy-environment.ts:1-60@687f282e`。
7. **子进程自己清环境**：spawn 真实 `dsh` 的套件不能依赖父 Vitest setup 已清代理；子进程也要清。`deepseek-harness/scripts/test-proxy-environment.ts:28-34@687f282e`。
8. **限制并发**：e2e 的 `DSH_E2E_MAX_WORKERS: 4`，避免多个完整 dsh 子进程树/PTY 争用。`deepseek-harness/.github/workflows/e2e.yml:100-122@687f282e`。

**角色与完成信号.** workflow 维护者、测试作者；完成信号是 key 不出现在日志/夹具/模型输出，测试只触达声明的端点，运行后无生产副作用。

**失败处理.** 发现 key 进入日志：立即轮换，删除日志/缓存，修 redaction；不要只删文本。代理干扰：在 setup 和子进程两侧清。外部端点不可达：区分网络/凭据/产品。

**例外.** 本地可以读 root `.env`；该文件必须 gitignore 且永不提交。`deepseek-harness/AGENTS.md:123-127@687f282e`。

**证据限制.** 源仓能证明 workflow 隔离和代理清理；不能证明 GitHub secret 的实际权限、fork 策略或历史提交中没有旧 key。采用项目需要自己的 secret 审计和历史扫描。

**补充源码引用（尾部区间复读分派实际读取）**：`deepseek-harness/apps/cli/tests/profiles/headless/tests/headless.expected.e2e.ts:457-620@687f282e`、`deepseek-harness/apps/web/tests/scaffold.ts:380-475@687f282e`、`deepseek-harness/apps/web/tests/scaffold.ts:849-949@687f282e`

<a id="m39-secrets"></a>

## 39. M39 秘密与凭据卫生

**机制 ID.** `testing-secret-and-credential-hygiene`。

**问题.** 测试需要真实 key/凭据，但 key 进入日志、fixture、模型输出或历史提交就会泄露；mock key 与真实 key 混用会让隔离失效。

**触发.** 新增 e2e/凭据测试；录制 fixture；CI secret 配置；日志/错误输出。

**前提.** 已列出会接触秘密的进程/文件/日志；已确认哪些是假 key。

**步骤.**
1. **永不提交真实凭据**：root `.env` 只用于本地且必须 gitignore；CI 用 secret；不要把 key 写进 fixture/expected/注释。`deepseek-harness/AGENTS.md:123-127@687f282e`。
2. **最小暴露**：secret 只映射到需要的 step（[M11](#m11-e2e-isolation)）；checkout/setup/install 不拿 key；不要 `env` 全局导出。
3. **不打印**：日志/错误/模型输出都可能带 key；错误信息只报 env 名称/缺失，不报值。`deepseek-harness/.agents/skills/dsh-pre-push-checks/SKILL.md:47@687f282e`。
4. **fixture token 化**：身份/请求头/工具 schema 用 typed token；真实 key 不进入 JSONL/expected。`deepseek-harness/packages/test-support/session-snapshot/README.md:30-70@687f282e`。
5. **mock key 明确**：`llm-mock-server` 用 `mock-key` 这类明显假值，只指向 loopback。`deepseek-harness/packages/test-support/llm-mock-server/README.md:40-50@687f282e`。
6. **CI 关闭生产副作用**：telemetry 禁用、端点固定、只读权限；e2e 不写生产数据。`deepseek-harness/.github/workflows/e2e.yml:23-32@687f282e`。
7. **泄露处置**：立即轮换、清理日志/缓存、检查历史；不要只删当前文件。

**角色与完成信号.** 作者/CI 维护者；完成信号是 secret 只在需要的 step、日志/fixture 无真实值、假 key 可识别、泄露有轮换记录。

**失败处理.** 发现泄露：按事故处理，先轮换再修；不要静默删除。误报：确认是假 key 后记录。

**例外.** 本地 `.env`、CI secret、mock key；都必须与生产隔离。

**证据限制.** 源仓能证明策略/隔离代码；不能证明历史提交、第三方日志或远端 secret 没有被泄露。采用项目需要独立扫描/审计。

---

## 附：本页机制的来源坐标索引

本页机制的来源坐标如下（固定提交 `687f282e`）。坐标只用于追溯，不新增正文断言；正文解释仍以本页对应小节为准。

- `testing-e2e-real-api-key-policy`：`deepseek-harness/.github/workflows/e2e.yml:52-99@687f282e`、`deepseek-harness/.github/workflows/e2e.yml:100-127@687f282e`
- `testing-e2e-credential-and-egress-isolation`：`deepseek-harness/.github/workflows/e2e.yml:1-32@687f282e`、`deepseek-harness/.github/workflows/e2e.yml:82-127@687f282e`
- `testing-secret-and-credential-hygiene`：`deepseek-harness/.github/workflows/e2e.yml:1-127@687f282e`
