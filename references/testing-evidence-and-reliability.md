# 测试证据与可靠性（evidence and reliability）

本页触发：需要为一次改动选择证据层级、判断“自述通过”是否属实、划定 mock 与真实实现的边界、证明真实入口或已构建产物、诊断 flake，或在推送/重写历史前决定最小证据集时读本页。本页完整拥有 §1（M01 证据层级与命令选择）、§12–15（M12 世界验证、M13 mock 边界、M14 真入口组合、M15 源平面与构建平面）和 §35–36（M35 测试可靠性 Skill、M36 推送前检查）。覆盖率、快照、真实 API 与 CI 的机制分别在同目录的 `testing-coverage.md`、`testing-snapshot-workflow.md`、`testing-real-api-and-secrets.md`、`testing-platform-and-performance.md`。

读法：每节是一份完整机制记录——机制 ID、问题、触发、前提、步骤、角色与完成信号、失败处理、例外、证据限制；出现哪一小节就承担哪一项义务，缺省不等于免除。标记约定（**[源规则]**／**[迁移设计]**／**[建议]**）、固定源提交 `687f282e`、引用格式与“只标实际检查过的范围”见根 `testing.md` 首段；触发选择与命令总表见根 `testing.md` §0。本页引用其他页的机制时写成可点击链接，不使用依赖位置的相对指代。

<a id="m01-tiered-evidence"></a>

## 1. M01 证据层级与命令选择

**机制 ID.** `testing-tiered-evidence-selection`。

**问题.** 全量套件慢且噪声大；只跑单测又会把“绿单测、坏产品”放过去。层级必须由**风险面**决定，而不是由“方便”决定。

**触发.** 任何行为改动、PR、CI 失败诊断、发布前检查。

**前提.**
- 已确认改动是否触及模型/用户可见输出、真实入口、构建产物、provider、平台语义或公共契约。
- 已确认要证明的失败模式；没有失败模式的“多跑一点”不是证据选择。

**步骤.**
1. **先选最低但足够的层级**：聚焦单测 → 聚焦覆盖率 → owner-local expected → recorded-session snapshot → Web 浏览器 → 真实 API e2e。层级越高，环境依赖和成本越大。
2. **按表面匹配证据**：模型/用户输出用 keyless snapshot；文档用 `doc-sync`；已发布/构建路径用 built smoke；provider 用真实 e2e；包/脚本行为用 owning Vitest 文件。`deepseek-harness/AGENTS.md:117-121@687f282e`。
3. **把测试放在所有者旁边**：包测试跟包走；profile 组合放 `apps/cli/tests/profiles/`；非会话驱动的期望输出放 `tests/expected/`；会话驱动放顶层 `snapshots/`。`deepseek-harness/.agents/skills/dsh-pre-push-checks/SKILL.md:35-43@687f282e`。
4. **验证“守卫真的能变红”**：新增静态/语料守卫时，临时引入被拒绝的回归并观察目标失败；没有负对照的守卫只是文档。`deepseek-harness/.agents/skills/dsh-ci-test-reliability/SKILL.md:101-115@687f282e`。
5. **报告实际运行的命令和结果**：跳过、待定、重试都不能写成通过。`deepseek-harness/.agents/skills/dsh-pre-push-checks/SKILL.md:25-31@687f282e`、`deepseek-harness/.agents/skills/dsh-ci-test-reliability/SKILL.md:127-131@687f282e`。

**角色与完成信号.**
- 作者：选择层级、运行聚焦证据、保留失败/修复/重跑记录。
- 评审者：检查“这层证据能否覆盖这个失败模式”，而不是只看绿色。
- 完成信号：证据的**被测对象**与改动的**风险面**一致；报告里能指出具体命令、具体用例、实际观察。

**失败处理.**
- 聚焦测试失败：先修行为或测试假设；不要用放宽断言、加 sleep、重试、全量串行来掩盖。
- 证据层级不够：升级一层，并说明为什么低层不能证明。
- CI 与本地不一致：记录命令、平台、失败用例和具体差异；按 [M35](#m35-reliability-skill) 的 flake 诊断流程处理。

**例外.**
- 仓库级、不可分割的改动，或用户明确要求完整本地演练时，才运行完整近似（`pnpm run check:all` 或当前 workflow 的完整 lane）。`deepseek-harness/AGENTS.md:119-121@687f282e`。
- 真实 provider 的重试只允许在外部边界，且必须记录为瞬态外部依赖处理，不得扩散到本地确定性测试。`deepseek-harness/.agents/skills/dsh-ci-test-reliability/SKILL.md:117-125@687f282e`。

**证据限制.** 源仓能证明测试分层、命令和审查文字存在；不能证明每个 PR 实际都按此执行。采用项目必须用自己的 CI 日志、审查记录和失败样本证明执行力。

<a id="m12-world-verification"></a>

## 12. M12 世界验证：不要相信自述

**机制 ID.** `testing-world-verification`。

**问题.** 对 agent 自己输出的关键词探针，可能被“会作弊的 agent”满足；mock 只证明桥接层移动了字节，不证明发布工具行为。

**触发.** e2e、真实入口、工具调用、文件写入、多轮、取消、持久化。

**前提.** 已明确测试要证明的**外部可观察事实**；已列出未触碰文件/目录。

**步骤.**
1. e2e 断言要**重跑命令或外部重读文件**；不要只检查 agent 的文本。未触碰文件必须字节相同。`deepseek-harness/docs/testing.md:33-35@687f282e`。
2. e2e 自己拥有资源：测试内创建，`afterEach` 处置（失败/重试/超时也执行）；共享夹具放普通 `tests/harness.ts`，不要 import 另一个 `*.e2e.ts`（会重复注册 describe、重复真实 API 调用）。`deepseek-harness/docs/testing.md:33-35@687f282e`。
3. Bridge 工具调用测试保留真实 tool registry 和 pipeline，只把模型 adapter 换成 `MockAdapter`；loop、session store、JSONL persistence 保持真实。`deepseek-harness/docs/testing.md:27-31@687f282e`。
4. Recovery 测试按 step 区分 pre/post-chunk 失败，证明失败 chunk 不产生 message/tool 副作用；覆盖耗尽、取消、策略组合、持久化、状态、wire 计数、transport idle timeout、shipping Loader composition。`deepseek-harness/docs/testing.md:33-35@687f282e`。
5. 对“missing config 应退出非零”这类失败面，断言退出码，不要断言模糊错误文本。

**角色与完成信号.** 作者写世界断言；评审者检查“如果产品什么都不做，这个断言会不会仍然通过”；完成信号是外部事实改变，而不是自述改变。

**失败处理.** 断言只读自述：改成外部读取/重跑。共享夹具被多个 e2e import：抽到 harness。未触碰文件被改：先判断产品副作用，再修。

**例外.** 纯协议解析测试可以只验证字节/帧，不需要世界断言；必须标明边界。

**证据限制.** 世界断言能证明被观察的事实；不能证明未观察的副作用。采用项目要按风险列观察面。

**补充源码引用（尾部区间复读分派实际读取）**：`deepseek-harness/snapshots/session/headless.snapshot.ts:644-672@687f282e`、`deepseek-harness/snapshots/session/headless.snapshot.ts:817-898@687f282e`

<a id="m13-mock-boundary"></a>

## 13. M13 mock 边界：只 mock 昂贵/不确定的边界

**机制 ID.** `testing-real-implementation-mock-boundary`。

**问题.** 过度 mock 会让测试证明“mock 和 mock 一致”，而不是产品行为；mock 不足又会让测试依赖外部网络/模型/时钟。

**触发.** 新增 mock、替换 adapter、引入 test harness、修改真实入口测试。

**前提.** 已列出下游真实组件；已确认 mock 只包住外部/非确定边界。

**步骤.**
1. **只 mock 昂贵或非确定边界**：LLM adapter、网络、时钟；下游 loop、session、tool registry、persistence 尽量真实。`deepseek-harness/docs/testing.md:27-31@687f282e`。
2. 手写 stand-in 只能证明桥接层移动字节；如果断言的是 shipping tool 行为，必须保留真实工具/管线。`deepseek-harness/docs/testing.md:27-31@687f282e`。
3. 选择 harness 时写清“它替换了什么、保留了什么、不能证明什么”。见 [M33](testing-platform-and-performance.md#m33-support-roster) 的包选择表。
4. Remote mock 只用于 HTTP Remote 表面；测试专用 `any` 是显式本地 fallback，不是严格证据；交付前跑 `pnpm run typecheck`，不要把例外带进生产 Remote 类型/ambient flag/复制签名。`deepseek-harness/.agents/skills/dsh-pre-push-checks/SKILL.md:33-35@687f282e`。
5. `llm-mock-server` 只作为无凭据的远端协议替身；它不证明真实 provider 的 wire/限流/认证。`deepseek-harness/packages/test-support/llm-mock-server/README.md:10-80@687f282e`。

**角色与完成信号.** 作者选择边界并记录；评审者问“如果真实实现坏了，这个 mock 测试会不会仍然绿”；完成信号是断言点落在真实下游行为上。

**失败处理.** mock 测试绿但真实入口坏：升级到 [M14](#m14-real-entry)/[M10](testing-real-api-and-secrets.md#m10-e2e-key)。mock 类型不严格：跑 typecheck，修类型而不是加 `any`。

**例外.** 纯单元测试可以用 fake 替代整个协作者；但必须明确它不证明集成。

**证据限制.** 任何 mock 都不能证明被替换边界之外的现实；采用项目要记录 mock 清单和未覆盖风险。

<a id="m14-real-entry"></a>

## 14. M14 真入口组合：Loader + app/process

**机制 ID.** `testing-real-entry-composition`。

**问题.** 手工 `ctx.plugin(...)` 组合能证明服务能拼起来，但不能证明 shipped profile、Loader 配置、默认导出、进程启动和持久化在真实入口下工作。

**触发.** 产品可见插件、Loader 组合、profile、CLI/headless/SDK/ACP 入口、默认导出/命名导出变更。

**前提.** 有可启动的 test-only `cordis.yml` 或 shipped profile；已确认哪些外部服务要 mock；已确认进程退出码/输出/持久化位置。

**步骤.**
1. 产品可见插件需要**非单元的真实组合测试**：通过 Loader 和 app/process 启动 test-only `cordis.yml`，只 mock 外部服务/非确定输入，断言模型可见请求/日志、持久状态或用户可见输出；opt-in 不要放进 shipped defaults。`deepseek-harness/docs/testing.md:37-41@687f282e`。
2. Loader smoke 要能抓住“默认导出替换命名导出”这类回归：加 `expect('default' in mod).toBe(false)` 和 `unwrapExports` 往返断言，并实际引入回归观察变红。`deepseek-harness/docs/testing.md:40-41@687f282e`。
3. “真实入口”指**发布产物**：包 `bin` 在 plain `node` 下运行 built `lib/bin.js`，暴露 tsx 掩盖的 settle race、模块解析、被吞掉的加载失败；非 index runtime entry（如 `lib/process.js`）和跨 bundle 单例同样要 built smoke。`deepseek-harness/docs/testing.md:41@687f282e`。
4. 子进程启动模式：有 build 的 lane 通过 shared dual-mode launcher 从 built `lib/` 启动 profile/Cordis 子进程，不要手写 `--import tsx`；不加载 Cordis 的协议/OS 夹具直接用 Node 跑 erasable `.ts`；只有测试主题是 source-path resolution 时才选 `src`，并在测试里声明该契约。`deepseek-harness/docs/testing.md:47-51@687f282e`。
5. 断言真正缺失的配置退出非零，而不是只断言“有错误输出”。

**角色与完成信号.** 作者/评审者；完成信号是真实入口进程启动、外部事实被断言、构建产物被使用，而不是只调用服务方法。

**失败处理.** 手工组合绿、Loader 红：修默认导出/配置，不要退回手工组合。built smoke 红、source 绿：检查构建/导出/模块解析。

**例外.** 纯逻辑单元测试不需要真入口；协议/OS 夹具不需要 Cordis。

**证据限制.** 真入口测试仍可能 mock 外部 provider；不能替代 [M10](testing-real-api-and-secrets.md#m10-e2e-key) 的真实 API 证据。

**补充源码引用（尾部区间复读分派实际读取）**：`deepseek-harness/apps/cli/tests/profiles/headless/tests/headless.expected.e2e.ts:300-1211@687f282e`

<a id="m15-source-built"></a>

## 15. M15 源平面与构建平面：两套入口，不混用

**机制 ID.** `testing-source-built-entry-modes`。

**问题.** 源码测试通过不等于发布产物可用；构建产物过期会让测试加载第二份单例；而所有测试都走构建又会慢且掩盖源码问题。

**触发.** 修改 package exports、bin/worker 入口、构建配置、公共类型、发布路径；编写 built smoke；CI artifact lane。

**前提.** 已确认测试要证明的是源码行为还是发布产物行为；已确认构建产物是否存在/是否最新。

**步骤.**
1. **源平面是默认**：每个 Vitest config 都把 `vite-tsconfig-paths` 指向 `tsconfig.base.json`；bare workspace import 解析到 `src`，绝不通过 package `exports` 到 built `lib/`——过期的 lib 会加载第二份 module singleton。`deepseek-harness/docs/testing.md:43-45@687f282e`。
2. **构建平面显式选择**：lib-mode子进程、built smokes、`DSH_EXAMPLE_MODE=lib`。`built-bin-smoke`注册于`ci-primary`、`ci-artifacts`、`ci-consumers`及Windows observational等路径，分别等待`build`或该lane声明的builtTree前提，并非只属于consumers。`deepseek-harness/scripts/run-gates.ts:420-425@687f282e`、`deepseek-harness/scripts/run-gates.ts:510-555@687f282e`、`deepseek-harness/scripts/run-gates.ts:637-645@687f282e`
3. **构建检查不是构建**：`build:check` 只对现有 artifacts 跑 `tsc -p` 两个 aggregate，检查 tests/scripts/benchmarks/website；它不编译 reference，也不会重建缺失/过期的 `build:artifacts`；缺失会以编译器错误出现。`deepseek-harness/docs/development.md:94-120@687f282e`。
4. 正确顺序：改包源码 → `pnpm run build:artifacts`（或 `pnpm run build`）→ `pnpm run build:check`；只改测试/脚本类型时，在最新 artifacts 上跑 `build:check`。`deepseek-harness/AGENTS.md:117-121@687f282e`。
5. **构建记录绑定公共值**：`build`/`build:artifacts` 写入版本、7 位 commit、dirty 标记（`build:official` 省略 dirty）；release packing 和 built Web tests 拒绝缺失或被后续 partial build 改动的记录。`deepseek-harness/docs/development.md:112-120@687f282e`。
6. **built Web snapshot** 用 `DSH_SNAPSHOT=replay pnpm run test:web:built`，由 `ci-consumers` 在 build 后运行；`test:web` 会先 build，再跑 built。`deepseek-harness/scripts/run-gates.ts:574-578@687f282e`、`deepseek-harness/package.json:76-80@687f282e`。
7. built smoke 在未构建的 e2e lane 自跳过；**跳过不是证明**。`deepseek-harness/scripts/run-gates.ts:903-906@687f282e`。

**角色与完成信号.** 作者选择平面；CI 维护者保证 build→consumer 依赖；完成信号是 built smoke 实际运行（不是 skip），且 source tests 在干净树上通过。

**失败处理.** source 绿/build 红：查 exports、bin、模块解析、单例。build:check 报缺失：先 build，不要改测试绕过。built smoke skip：确认 lane 是否真的构建。

**例外.** benchmark 准备可用 `--noCheck` 生成一次性 lib，依赖 required build 提供诊断；其他 artifact builder 保留包检查。`deepseek-harness/docs/development.md:110-116@687f282e`。

**证据限制.** 源平面测试不能证明发布 tarball；built smoke 能证明选中的入口，不能证明所有发布组合。采用项目需要自己的打包/安装测试。

<a id="m35-reliability-skill"></a>

## 35. M35 测试可靠性 Skill：设计与诊断

**机制 ID.** `testing-reliability-skill`。

**问题.** 异步/并发/全局状态/子进程/平台问题反复以“flake”出现；没有统一的设计和诊断流程，修复会退化成加超时/重试/串行。

**触发.** 新增或修改有上述风险的测试；调查 flaky CI；评审测试隔离。

**前提.** 已读当前测试策略、defensive patterns、当前 Vitest 配置和 workflow。

**步骤.**
1. 用 Skill 的顺序：读 owning rules → 建模四层拓扑 → 原子分配 →  Contain 全局状态 → 平台语义 → 预算 → 同步 → 静止处置 → 证明回归 → 拒绝掩盖 → 诊断 → 验证报告。`deepseek-harness/.agents/skills/dsh-ci-test-reliability/SKILL.md:5-131@687f282e`。
2. 预测失败：先写“在哪个并发/失败路径会坏”，再写测试；不要只写 happy path。
3. 拒绝 flake 掩盖清单：加超时但不命名等待状态、加重试、全文件串行、吞错误、弱化断言、归一化掉不稳定行为、清理/断言前加 sleep。`deepseek-harness/.agents/skills/dsh-ci-test-reliability/SKILL.md:117-125@687f282e`。
4. 诊断只读请求保持只读：报告原因和证据，除非用户也要求修复。`deepseek-harness/.agents/skills/dsh-ci-test-reliability/SKILL.md:127-129@687f282e`。
5. 证据按风险补：全局恢复、静止 teardown、并发独立进程、负对照；stress 只补充确定性回归。`deepseek-harness/.agents/skills/dsh-ci-test-reliability/SKILL.md:109-115@687f282e`。

**角色与完成信号.** 作者/评审者；完成信号是测试在并发/失败/平台路径下有可解释行为，且没有用掩盖手段。

**失败处理.** 无法解释的 flake：按 `references/ci-flake-diagnosis.md` 分类，保留失败样本；不要反复重跑碰运气。`deepseek-harness/.agents/skills/dsh-ci-test-reliability/references/ci-flake-diagnosis.md:1-60@687f282e`。

**例外.** 文档化的外部 provider 瞬态重试；lane 预算恢复（不是凭空加余量）。`deepseek-harness/.agents/skills/dsh-ci-test-reliability/SKILL.md:117-125@687f282e`。

**证据限制.** Skill 是指导和审查框架，不是自动检查器；采用项目需要自己的 lint/review/CI 证据。

<a id="m36-pre-push"></a>

## 36. M36 推送前检查 Skill

**机制 ID.** `testing-pre-push-evidence-selection`。

**问题.** 每次推送都跑全量既慢又浪费；只跑一个不相关的测试又会把回归放过去。历史重写还会让旧哈希/旧审查锚点失效。

**触发.** push、force-push、mark ready、`gh stack sync` 后、声称 checks 通过。

**前提.** 已确认 base/stack parent；已 fetch 最新 ref；已知道工作区/暂存/未跟踪状态。

**步骤.**
1. 检查 checkout/branch；用 `pnpm run change-scope --base <verified-base-ref>` 得到完整出站范围；不要猜 base。`deepseek-harness/.agents/skills/dsh-pre-push-checks/SKILL.md:11-27@687f282e`。
2. 按表面选最小证据：包/脚本跑 owning Vitest；文档跑 `doc-sync`；模型/CLI/终端输出跑 keyless snapshot/真实可运行场景；manifest/exports/build/bin 跑 `build` + hygiene + built smoke；测试/脚本类型跑 `build:check`；provider 跑 e2e。`deepseek-harness/.agents/skills/dsh-pre-push-checks/SKILL.md:29-49@687f282e`。
3. **不要重复已通过的检查**，尤其不要在 push 前重复 pre-push hook 的 typecheck。`deepseek-harness/.agents/skills/dsh-pre-push-checks/SKILL.md:51-55@687f282e`。
4. 聚焦覆盖率同时指定 tests + source include；不要用 `--passWithNoTests`/降阈值/缩窄 include 隐藏未覆盖。`deepseek-harness/.agents/skills/dsh-pre-push-checks/SKILL.md:61-83@687f282e`。
5. 完整本地演练只在用户明确要求、诊断 CI 失败、或改动不可分割地跨仓库时做。`deepseek-harness/.agents/skills/dsh-pre-push-checks/SKILL.md:85-89@687f282e`。
6. 历史重写用 `--force-with-lease=<branch>:<observed-oid>`，禁止 raw `--force`；`gh stack push/sync` 自带 lease。重写后重新审计 heads/threads/approvals/checks。`deepseek-harness/.agents/skills/dsh-pre-push-checks/SKILL.md:91-112@687f282e`。
7. 失败：普通 push 前停止并修复；post-sync 失败则阻止 merge，修复后重新验证；不要“push 了看 CI 会不会不同”。`deepseek-harness/.agents/skills/dsh-pre-push-checks/SKILL.md:114-123@687f282e`。
8. 报告 pending 为 pending；不要把待定/跳过写成通过。`deepseek-harness/.agents/skills/dsh-pre-push-checks/SKILL.md:125-137@687f282e`。
9. **分别记录本地 hook 的实际矩阵**：`pre-commit` 跑 staged 双语配对、归档笔记校验、staged oxlint（`--fix` + `stage_fixed`）、`git diff --cached --check`、pi-ai provider 数据检查与 vendor manifest 守卫（`lefthook.yml:5-32`）；`pre-merge-commit` **只有** staged 双语配对与归档笔记校验（34-44）；`pre-push` **只跑** `pnpm run typecheck`（46-49）。安装走 `scripts/install-lefthook.mjs`（postinstall 自动执行）。因此第 3 条“不要重复 pre-push 的 typecheck”有直接文件依据，但不能把 pre-commit 的额外检查算到 merge checkpoint 上。`deepseek-harness/lefthook.yml:1-49@687f282e`。

**角色与完成信号.** 作者运行并报告；评审者检查证据覆盖；完成信号是出站 diff 的每个风险面都有最小证据，history rewrite 有 lease 和 post-sync 审计。

**失败处理.** 环境相关失败：记录命令/用例/平台差异，先证明再归因；本地 hook 绕过只在用户明确同意时，并报告失败原因。

**例外.** `gh stack sync` 可能先发布后验证；必须立即补验证并保持 PR 未 merge。`deepseek-harness/.agents/skills/dsh-pre-push-checks/SKILL.md:91-106@687f282e`。

**证据限制.** `change-scope` 依赖正确 base；本地环境不等于 CI；Skill 不能替代 CI 的平台矩阵。

---

## 附：本页机制的来源坐标索引

本页机制的来源坐标如下（固定提交 `687f282e`）。坐标只用于追溯，不新增正文断言；正文解释仍以本页对应小节为准。

- `testing-tiered-evidence-selection`：`deepseek-harness/.agents/skills/dsh-pre-push-checks/SKILL.md:25-61@687f282e`
- `testing-real-implementation-mock-boundary`：`deepseek-harness/packages/test-support/remote-mock/README.md:1-80@687f282e`
- `testing-real-entry-composition`：`deepseek-harness/packages/test-support/loader-smoke/README.md:1-130@687f282e`、`deepseek-harness/apps/cli/tests/profiles/headless/tests/workspace-context-resume.expected.e2e.ts:1-80@687f282e`
- `testing-source-built-entry-modes`：`deepseek-harness/docs/testing.md:37-45@687f282e`、`deepseek-harness/docs/development.md:65-120@687f282e`、`deepseek-harness/tsdown.config.ts:1-30@687f282e`
- `testing-reliability-skill`：`deepseek-harness/.agents/skills/dsh-ci-test-reliability/SKILL.md:1-131@687f282e`
- `testing-pre-push-evidence-selection`：`deepseek-harness/.agents/skills/dsh-pre-push-checks/SKILL.md:1-137@687f282e`、`deepseek-harness/docs/development.md:133-148@687f282e`、`deepseek-harness/AGENTS.md:113-121@687f282e`、`deepseek-harness/lefthook.yml:1-49@687f282e`

本页机制：[`testing-tiered-evidence-selection`](#m01-tiered-evidence)、[`testing-world-verification`](#m12-world-verification)、[`testing-real-implementation-mock-boundary`](#m13-mock-boundary)、[`testing-real-entry-composition`](#m14-real-entry)、[`testing-source-built-entry-modes`](#m15-source-built)、[`testing-reliability-skill`](#m35-reliability-skill)、[`testing-pre-push-evidence-selection`](#m36-pre-push)。
