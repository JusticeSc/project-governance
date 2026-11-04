# `@project-governance/review-maintenance`

[English](README.md) | 中文

## 摘要

依据已合并评审证据和两个私有 reviewer adapter，对一个 review Skill 执行有界维护。包拥有证据采集、协议验证、门禁接线与编排；操作者拥有适配器命令、身份、凭据与私有配置。成功运行保存受审候选包，不写操作者工作树或索引，不产生提交、推送或拉取请求；配置的 fetch 可能更新 Git refs。

## 公开操作

`runMaintenance({ config, request?, clock?, log? })` 采集证据，让两个适配器判定人类作者身份与采纳情况，对照当前 Skill 对达成一致的指导二次分类，在私有隔离 checkout 起草、检查和评审候选。`request` 提供 GitHub GET transport，替换默认 `gh api`；`clock` 提供运行时钟；`log` 接收进度行。传入配置前使用 `validateConfig(raw)` 或 `loadConfig(path)`。

结果为 `no-candidate`、`candidate` 或 `failed`。真正的无候选结果记录当日日志，不通知。适配器故障和采集失败不是没有指导的证据，会使运行失败。不属于目标分支或无法重建落地历史的 PR 记录在 `skippedPulls` 中，不丢弃其他合格反馈；应同时检查其原因、`excluded` 和 `unresolved`。门禁失败、暂存或跨目标改动、评审不可用或仍有 blocking finding 也会使运行失败。

候选保存到私有状态目录的 `runs/<runId>/candidate.SKILL.md`、`candidate.diff`、`manifest.json` 与 `run.json`。manifest 记录目标提交、来源 Skill 身份、候选及 diff 哈希、已采纳反馈与评审证据。受审候选由 `promote` 单独应用。运行不提交、不推送、不开 PR、不合并，也不改变仓库设置。

`promote({ config, bundle, openPr?, log? })` 读取候选包，要求 checkout 干净且 `HEAD === manifest.targetCommit`，并检查原 Skill blob 身份或 fallback SHA-256，再执行 `git apply --check -p1` 与 `git apply -p1`。随后检查只有目标变动且内容符合受审候选哈希。默认只应用 diff。传入 `openPr: true` 且已配置提升设置时，才创建分支与提交、推送并打开 **draft** PR；从不合并。在 apply、commit 或 push 后发生提升失败时，已完成的副作用可能保留；重试前先检查。

根导出还提供 `collectReviewEvidence`、`assertIndependentCommands`、`runCommand`、`runReviewer` 与 `untrusted` 供显式集成。[操作手册](../../../docs/cookbook/maintaining-review-skill.zh.md)拥有配置、调用与恢复；这些 helper 不提供调度器或 OS sandbox。

## 适配器边界

私有适配器通过 stdin/stdout 交换有字节边界的 JSON：`adoption` 使用 version 2，包含每项反馈前与落地后的 PR 补丁和提交锚点；`classification`、`draft` 与 `review` 使用 version 1。原 version-1 采纳适配器须更新。响应须匹配请求版本、操作及请求 ID。请求携带 `access: "read-only"` 和 `tools: "none"`；它们是协议声明，不是操作系统强制隔离。评审文本和补丁是不可信数据，用每运行 nonce 包裹。

每个 version-2 `adoption` 条目包含 `id`、`body`、`pullNumber`、`commitId`、`baselineCommit`、`targetParent`、`landingCommit`、`feedbackPatch` 与 `finalPatch`。响应包含 `version: 2`、`operation: "adoption"`，并在 `results` 中为每个请求 ID 提供 `authorship`、`adoption` 与 `reason`。提交 ID 与补丁是证据，不保证适配器判断正确。

## 前提与验证

使用 [package.json](package.json) 声明的 Node 版本、Git，以及供默认 GitHub transport 使用的已认证 `gh`。目标是干净的专用 Git checkout；私有状态与配置保持在其外。门禁命令与两个适配器 executable 须以预期身份和权限可用。`openPr` 还需要 push 与 PR 创建权限、已配置的提升设置和 Git 作者身份。

`npm test --workspace @project-governance/review-maintenance` 运行本包测试。真实独立适配器运行、调度集成、通知送达、draft PR 创建与人类采纳分别需要证据；本 README 不声称这些已经运行。

## 已知限制与延后工作

- 证据包括已合并 PR 中非作者的人类 reviewer 的评审证据，不含 conversation comments。bot 或不明作者身份不静默视作合格人类反馈。
- Windows 上根进程退出后仍存活的后代不保证清理。
- Windows 上配置、状态、适配器程序与运行工件的 ACL 隐私归操作者；POSIX mode 请求不构成 Windows 隔离。
- 两个适配器只检查声明的 provider/model 区别与实际程序字节不同，不证明模型、账号、基础设施或推理独立。
- read-only/no-tools 标记、清理过的子进程环境与私有 cwd 不是 OS sandbox。门禁与适配器命令仍是操作者信任的 executable。
- 门禁在隔离 checkout 运行，不含操作者 checkout 中被忽略的依赖或生成物。须配置可信门禁在该处准备所需前提；缺前提属于失败，不构成门禁通过。
- 目标 Skill 路径不得经过符号链接或 junction；`runs`、`private` 和 `log` 状态子目录必须留在状态目录内。这些检查不提供防止并发替换路径的锁。
- 候选包哈希可发现意外改动，不能抵御同时改写候选包和 manifest 的攻击者。提升不是防止无关写入者的操作系统锁；应保持专用 checkout 静止。
- 保存的候选绑定受审提交与 Skill 身份。目标更新后需要新的受审运行，不能用过期整文件覆盖当前内容。
