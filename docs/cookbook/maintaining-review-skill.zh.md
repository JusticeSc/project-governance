# 维护 review Skill

[English](maintaining-review-skill.md) | 中文

本操作教程执行一次维护、检查证据，并可选择提升受审候选。[包合同](../../packages/governance/review-maintenance/README.zh.md)拥有结果与限制。操作者提供私有适配器与凭据；仓库不分发它们，也不声称已完成真实适配器运行。

## 1. 准备隔离 checkout

使用被维护仓库的专用干净 Git checkout。私有 JSON 配置与 `stateDirectory` 保持在所有被维护 checkout 之外，并限制为操作者可访问，包括显式 Windows ACL。安装声明的 Node runtime、Git、已认证 `gh`、必需门禁工具与两个私有适配器。不把 token 写入配置、命令参数、仓库或保存证据。通过操作者受保护的凭据通道提供凭据；按每个适配器自身策略核验所需访问。

运行前确定目标版本。启用 `fetch` 时，运行会抓取配置的 remote；选择与预期受审基线一致的 `targetRef`。调度归操作者：从已批准的调度器调用这个单次命令，不假定包会安装 daemon。不让两个任务共用 checkout；出现意外用户变动时保留，不清理掉。

## 2. 编写私有配置

配置是 JSON。通过 `loadConfig(path)` 或 CLI 显式 `--config` 加载。command object 使用绝对 `file` 与可选字符串数组 `args`，不使用 shell 命令字符串。即使省略 `gates` 会解析成空数组，也应设置有意义的门禁：空列表不提供验证证据。

| 字段 | 合同 |
|---|---|
| `repository` | 用于评审证据与 PR 创建的 GitHub `owner/name`。 |
| `checkout` | 专用 checkout 绝对路径；起始状态干净。 |
| `targetSkill` | 唯一被维护 Skill 的仓库相对路径。 |
| `stateDirectory` | checkout 外的操作者私有绝对目录；保存日志、候选包与私有工作目录。 |
| `targetRef` | 被维护版本；默认 `refs/remotes/origin/main`。其他默认分支须显式设置。 |
| `fetch` | `null`、`false` 或省略表示不抓取；`{ "remote": "origin" }` 启用抓取。remote 与 `targetRef` 对齐。 |
| `windowDays` | 整数 1–90，默认 2；是证据窗口，不是调度间隔。 |
| `maxRevisions` | 整数 0–5，默认 2；初稿后的修订次数，不是无限重试。 |
| `adapters` | `primary` 与 `secondary` command object，各带 `identity: { "provider": "...", "model": "..." }`。声明真实身份。Node/Python 适配器可用绝对 `program` 指明 `args` 中第一个绝对脚本参数；不能隐藏 eval/preload 命令。 |
| `gates` | 唯一命名的 `{ "name": "...", "file": "...", "args": [] }` 命令数组，在私有隔离 checkout 执行；应在该处准备被忽略的依赖，不应暂存或修改其他路径。 |
| `notification` | 可选 command object，否则 `null`；真正无候选运行不通知。通知凭据保持在公开树外。 |
| `promote` | 可选 `{ "remote": "origin", "baseBranch": "main" }`；开 draft PR 必需，本地应用不需要。 |

适配器交换有字节边界的 JSON：`adoption` 使用 version 2，提供单项反馈及其反馈前／落地后的补丁与提交锚点；`classification`、`draft` 与 `review` 使用 version 1。使用前须升级 version-1 采纳适配器。必须把正文与补丁当作不可信数据，返回符合 schema 的 JSON，不在 stdout 加额外散文。请求声明 `access: "read-only"` 和 `tools: "none"`；这些声明不是 sandbox，须在私有适配器环境实际执行限制。声明的 provider/model 身份不同与程序字节不同只是最低机械条件，不证明模型独立。

## 3. 运行并解释结果

从本产品根目录直接调用包 CLI，或使用已安装的 `review-maintenance` executable：

```sh
node packages/governance/review-maintenance/src/cli.mjs run --config <private-config.json> --json
```

调用或配置非法时退出 2。运行对 `no-candidate` 或 `candidate` 退出 0，对 `failed` 退出 1；区分受审候选与无工作需要查看 outcome，不能只看退出 0。检查报告的 `artifacts` 路径、当日日志、`excluded` 与 `unresolved` 记录。无候选不意味着所有反馈都可用。适配器完全失效必须是 `failed`，不能报无候选。

对 `candidate`，检查 `runs/<runId>` 下保存的 `candidate.SKILL.md`、`candidate.diff`、`manifest.json` 与 `run.json`。核对反馈 ID/URL、目标提交、来源 Skill 身份、门禁结果与两个适配器评审。确认 diff 只改目标，评审覆盖完整候选而非仅最近修订。这些是评审输入，不证明人类已接受指导。草稿不使用操作者工作树；运行不提交、不推送、不开 PR。

## 4. 从失败恢复

重试前读取失败与运行工件。候选和门禁使用私有隔离 checkout，不继承操作者 checkout 中被忽略的依赖。门禁是可信外部命令而非 sandbox：检查其实际副作用，保留用户工作，重试前修复缺失前提或门禁行为。不使用全量 reset 或 clean。提高修订上限不能替代解决 blocking finding。

候选包保留在私有状态中；提升前无需反向应用补丁。使用受审提交上的干净专用 checkout，保持其他写入者静止，并在应用前检查候选包。不用 `candidate.SKILL.md` 覆盖较新的 Skill 内容。

## 5. 提升并可选打开 draft PR

提升要求 checkout 干净、HEAD 为 manifest 的确切 `targetCommit`，来源 Skill 身份未变。它应用保存的 patch，并验证目标结果哈希。因漂移拒绝时，应在预期新基线上重跑维护，或人工 rebase 后取得新评审；不能修改 manifest 绕过。

```sh
node packages/governance/review-maintenance/src/cli.mjs promote --config <private-config.json> --bundle <private-run-directory>
```

默认只本地应用。取得明确 push/PR 授权、设置 `promote` 并检查 Git 身份与访问后，追加 `--open-pr`，才会在按运行命名的分支创建提交、推送并开 draft PR。检查真实远端 head、PR 状态与检查；本地成功不证明 CI 或人类批准。包从不合并或改变仓库设置。提升在 apply、commit 或 push 后失败时，重试前检查实际副作用；不重复创建分支，也不丢弃证据。
