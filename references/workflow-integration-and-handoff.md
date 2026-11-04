# 推送、历史、PR栈与交接

[代理流程索引](agent-workflows.md)只作任务导航，本页拥有具名操作条件。来源标记说明固定提交687f282e的义务、事实及适配，不代表已运行。来源的pnpm／change-scope／gh stack等命令与目录是其绑定；目标须用真实现有工具实现同等作用，不得把未分发的来源命令冒充本产品能力。未有commit的空项目按空树与实际新文件核对范围，不伪造base／head；已有提交或PR则必须验证真实ref及各脏层。

<a id="aw-08"></a>
## 8. 推送前证据选择（`dsh-pre-push-checks`）

### 8.1 核心原则

`【源义务】` 在 `deepseek-harness` 分支上推送、强推、标记 ready、声称检查通过之前，运行**一次**相关本地证据。唯一的顺序例外是 `gh stack sync`：它可能在校验重写层之前级联 rebase 并发布；之后必须立即验证，且证据通过前不得合并。Git hook 故意很窄：pre-commit 修 staged lint、查 staged 空白、守 vendor 元数据；pre-push 只跑增量仓库 typecheck；CI 拥有穷尽覆盖与平台矩阵。来源：`dsh-pre-push-checks/SKILL.md:6-8`。

`【源义务】` “没有通用本地基线，只有 hooks”。每个行为变更需要能对其回归失败的最窄测试或专用检查；只有 diff 真正触达的面才加更广检查。**不要**因为提交/推送在即就重复已通过的检查；尤其不要为了重复 pre-push hook 而在推送前跑 typecheck。来源：`dsh-pre-push-checks/SKILL.md:27-29`、`docs/development.md:133-152`。

### 8.2 证据映射

`【源义务】` 按变更面选命令（`dsh-pre-push-checks/SKILL.md:30-52`）：

| 变更面 | 证据 |
|---|---|
| 包/脚本行为 | 所属 Vitest 文件或聚焦测试名；共享契约变化加相邻包测试；仓库级覆盖留给 CI，除非真正跨切面或用户要求 |
| Remote mock 类型 | 未构建的 `any` 是本地回退，不是严格证据；先重建缺失/陈旧/部分生成声明并跑 `pnpm run typecheck`；例外仅限测试代理的空声明 map，不外溢生产Remote类型、ambient flag或复制签名 |
| 文档、Agent Notes、目录、文档链接注释 | `pnpm run doc-sync`；文档工作流要求时跑全量 lint |
| 模型/编辑器/CLI/终端可见输出 | 拥有该输出的聚焦无密钥快照或真实可运行示例场景 |
| expected-output 放置 | Session replay输入与持久输出放顶层 `snapshots/`并声明shipped profile/header pin；无Session往返的输出留 `tests/expected/`；规范父子文件名、代际和owning lane由[测试 M16–M18](testing-snapshot-workflow.md)拥有，不因统一称为snapshot就混放 |
| profile 与配置放置 | 跨包 shipped `dsh` profile 行为放 `apps/cli/tests/profiles/`；包特定 Loader 组合放该包 `tests/fixtures/`；用户可选 overlay 放 `apps/cli/config/examples/` 并配 `docs/user/` 指南 |
| 包清单、公开导出、构建配置、worker/bin 入口、构建后运行时路径 | `pnpm run build`、相关 hygiene、所属 built-artifact smoke |
| 仓库测试与脚本类型 | `build:artifacts` 只检查包项目；TypeScript 变更完成前在最新 `build:artifacts` 后跑 `build:check`，或跑 `build`；`build:check` 只读现有输出，不重建 |
| 真实 provider 或代理行为 | 有凭据时跑相关 `pnpm run test:e2e`；绝不打印 secret |

`【源义务】` 聚焦覆盖率时“选择测试”和“选择覆盖范围”是两件事：文件过滤只决定跑哪些测试，仓库配置默认测量所有 `packages/*/*/src/**/*.ts`。需要时同时指定 owning tests 与 `--coverage.include`；配置的 per-file 100% 阈值仍在所选范围内生效。`vitest related` 不能发现仅通过配置、动态加载、子进程、worker、构建产物或外部 provider 到达的行为，这些必须显式选测试。**不要**用 `--passWithNoTests`、降低阈值或缩窄 `--coverage.include` 来掩盖未覆盖文件。来源：`dsh-pre-push-checks/SKILL.md:53-75`。

`【源义务】` 参数转发：Vitest 文件与名称过滤直接跟在脚本名后，**不要**插入独立 `--`；那会传给 Vitest 并可能禁用 `-t`。例如：`pnpm run test:snapshot snapshots/session/headless.snapshot.ts -t 'cordis-inspect-jsdoc'`。把过滤后的运行当证据前先看报告选中的测试数。来源：`dsh-pre-push-checks/SKILL.md:44-51`。

### 8.3 失败处理

`【源义务】` 普通推送前相关检查失败：停止并修复或说明阻塞；不要推上去赌 CI 不同。post-sync 例外：阻止合并并执行修复流程。环境特定失败要证明：记录精确命令、失败测试、平台差异；确认相关非平台证据；优先修跨平台不确定性；只有用户明确要求/同意才绕过本地 hook，并报告失败内容与为何预期 CI 不同。来源：`dsh-pre-push-checks/SKILL.md:97-107`。

### 8.4 推送程序

`【源义务】` 普通与独立 rebase 推送（`dsh-pre-push-checks/SKILL.md:108-137`）：

1. 运行选定的相关检查一次。
2. 正常提交；检查 pre-commit fixer 改过的文件后再继续。
3. 正常推送；授权重写分支用精确 lease；让增量 typecheck hook 运行。
4. 验证远端 ref 与本地 `HEAD` 一致：`git rev-parse HEAD origin/$(git branch --show-current)`。
5. GitHub PR 推送后检查远端 CI：`gh pr checks`；pending 就报告 pending。

`【源义务】` 若 `gh pr checks` 报“no checks reported”且 `/actions/runs?head_sha=<sha>` 返回 `total_count: 0`，先读 mergeability：`gh pr view <number> --json mergeable,mergeStateStatus`。PR 处于 `CONFLICTING`/`DIRTY` 时 GitHub 不创建 `pull_request` workflow，所以缺失信号是冲突而不是基础设施。唯一修复是解决冲突；空提交、`--allow-empty`、draft/ready 切换、revert-and-restore 都不会让计数变成非零，只会增加垃圾历史。需要时用 `git merge-tree --write-tree HEAD origin/<base>` 确认冲突路径。

### 8.5 执行卡片

- **前置条件**：已提交或明确工作区状态；已选 base；知道 diff 触及的面。
- **步骤**：`change-scope` → 选最小证据 → 跑一次 → 提交 → 推送 → 验证远端 SHA → 看 CI。
- **责任者**：作者。
- **完成信号**：所选检查通过；远端 SHA 等于本地 HEAD；CI 状态被如实报告（passing/pending/skipped/failing）。
- **失败处理**：先修复；环境问题要证明；post-sync 失败阻止合并。
- **例外**：用户显式要求全量排练、诊断 CI 失败、或变更跨切面到没有更窄集合可信时，才跑完整本地近似；不要重建已删除的 `check:pre-push` 聚合。
- **证据限制**：本地通过不证明 CI runner 稳定；CI 通过不证明语义正确。

---

来源：deepseek-harness/.agents/skills/dsh-pre-push-checks/SKILL.md:1-137@687f282e 来源：deepseek-harness/AGENTS.md:113-122@687f282e 来源：deepseek-harness/docs/development.md:133-162@687f282e 来源：deepseek-harness/docs/testing.md:7-25@687f282e 来源：deepseek-harness/scripts/change-scope.ts:1-50@687f282e


<a id="aw-09"></a>
## 9. 历史改写保护与 `gh stack sync` 后验证

`【源义务】` standalone 与 stacked PR 分支允许 rebase（含评审后）。独立历史重写前：抓取当前远端分支并记录精确 OID；用 `--force-with-lease=<branch>:<observed-oid>` 发布，使并发更新中止推送。`gh stack push` 与 `gh stack sync` 为其管理分支提供 lease 保护。**原始 `--force` 永不允许。** 来源：`dsh-pre-push-checks/SKILL.md:80-85`、`AGENTS.md:161-162`、`responding-to-pr-review-on-a-stack.md:7-14`。

`【源义务】` 任何重写推送后，重新抓取实时 heads，并重新审计未解决 review threads、approvals、mergeability、checks。重写前的 commit hash 与 inline-comment anchor 不是当前证据。来源：`dsh-pre-push-checks/SKILL.md:84-85`。

`【源义务】` `gh stack sync` 把 fetch、级联 rebase、push 作为一个操作，无法在校验与发布之间插入本地步骤。运行前要求干净 worktree，记录官方 stack 顺序与精确远端 heads。返回后（`dsh-pre-push-checks/SKILL.md:86-96`）：

1. 重新查询每个分支 head 与官方 GitHub stack 顺序。
2. 对每个重写层，对照其 live PR base 检查变更范围。
3. 对每个受影响层运行本技能选定的相关证据。
4. 所有选定检查通过前，保持每个 PR 未合并，并把验证报告为 pending。

若 post-sync 证据失败：保留 lease 保护的已发布 heads，修复失败，验证修复，再发布修正。**不要**因为命令成功就声称栈已 ready。

### 执行卡片

- **前置条件**：干净 worktree；已知官方栈顺序；已知远端 heads。
- **步骤**：记录 OID → 用 lease 重写 → 重取 heads → 重审 threads/approvals/mergeability/checks → 按层验证。
- **责任者**：作者；评审者复核重写后状态。
- **完成信号**：远端 heads 被记录且与预期一致；每层证据通过；未解决线程与批准状态是重写后的。
- **失败处理**：并发更新导致 lease 中止时，重新抓取并重新评估，不要覆盖；post-sync 失败时阻止合并。
- **例外**：`gh stack sync` 是唯一允许“先发布后验证”的顺序例外。
- **证据限制**：GitHub 的 stack/queue 状态可能异步；命令成功不等于分层落地完成。

---

来源：deepseek-harness/.agents/skills/dsh-pre-push-checks/SKILL.md:80-96@687f282e 来源：deepseek-harness/AGENTS.md:161-162@687f282e 来源：deepseek-harness/docs/cookbook/responding-to-pr-review-on-a-stack.md:7-26@687f282e


<a id="aw-10"></a>
## 10. PR 栈：评审修复传播与落地

### 10.1 评审修复传播（`responding-to-pr-review-on-a-stack`）

`【源义务】` 基本规则（`responding-to-pr-review-on-a-stack.md:7-14`）：

1. **每个 PR 分支一个 worktree。** 并行修复不共享检出。
2. **GitHub 的 stack 对象是权威。** base 分支只建立期望依赖顺序；`PullRequest.stack` 与 `stackEntry.position` 证明 GitHub 认可它。没有检查这些字段就不要把“分支链匹配”当官方栈。
3. **修复落在引入问题的 PR，再向上流动。** 评论在 `B` 指向 `B` 引入的代码，就在 `B` 修，再把 `B` 传播到 `C`——即使 `C` 也含该文件。把修复起源在下游会让 `B` 继续发布未修复代码，并向 `B` 的评审者隐藏修复。
4. **每个评审修复保持独立提交。** 后续 rebase 可能改 OID，但不要把已评审修复 amend 出历史。只 amend 自己尚未推送、尚未评审的工作。
5. **有意选择 merge-forward 或 rebase。** 评审后两种历史都允许；重写推送必须 lease 保护并在远端前进时中止；原始 `--force` 禁止。

`【源义务】` 处理评论的步骤（`responding-to-pr-review-on-a-stack.md:15-26`）：

1. 先按实质 triage 每条评论；对照代码验证——评审者指出正确症状也可能误诊原因。
2. 把接受的发现映射到起源 PR 并在那里修。
3. 按顺序把修复层传播到每个受影响子层：merge-forward（合并修复后的父分支到子、验证、继续向上，保留进行中的 checkpoint）或原生级联 rebase（`gh stack rebase` → 验证重写层 → `gh stack push`；或 `gh stack sync`，因其可能先发布，需按 `dsh-pre-push-checks` 立即 post-sync 验证）。
4. **委派修复 trust-but-verify**：子代理报告描述意图，不必然等于落地内容。自己在真实树上重跑门禁；对回归 guard，证明它在未修复代码上**失败**（引入回归、看红、还原）——两边都通过的 guard 什么也没守。子代理把问题重述为“已处理”是要亲自深挖的信号。
5. 在 review thread 回复（`gh api repos/{owner}/{repo}/pulls/{pr}/comments/{id}/replies`），不是顶层评论；说明修复与承载它的当前 commit/head。
6. 任何重写推送后，重读未解决线程、approvals、mergeability、checks。
7. 只通过官方栈程序落地。

### 10.2 栈落地（`dsh-merging-stacked-prs`）

`【源义务】` 通过 GitHub 原生 stack 对象与 `gh stack merge` 落地依赖 PR；**不要**用 `gh pr merge` + `gh pr edit` 逐个合并与重定向复制栈语义。根 `AGENTS.md` 拥有允许的 merge-forward/rebase 历史；stack review 指南拥有评审修复传播。来源：`dsh-merging-stacked-prs/SKILL.md:6-8`。

`【源义务】` 硬停条件（`dsh-merging-stacked-prs/SKILL.md:10-48`）：

- 运行 `gh stack --version`；官方扩展或服务端 stack 功能不可用 → 硬停；不得退化为手动合并。
- GitHub stacks 要求每个 head 分支在同一仓库；跨 fork 链 → 硬停。
- 用干净专用 worktree；抓取实时 PR 元数据与精确 head OID，不信分支名或早先报告。
- 对每个看似链中的至少一个 PR 查询 `PullRequest.stack` 与 `stackEntry.position`；官方对象而不是 base 推断才是栈成员权威。`size` 超过返回页时对 `entries` 分页。
- 从 live PR base 建立期望的 bottom-to-top 顺序：底部指向 trunk，每个更高 PR 指向紧邻其下的 head。

`【源义务】` 链接缺失成员（`dsh-merging-stacked-prs/SKILL.md:50-67`）：

1. 先比较已有 stack entries 与期望链。一个已有 stack 可能包含请求链的保序子集；多个 stack number、意外 entry 或冲突顺序需要用户指示后才能改动。
2. 若某依赖 PR 不在官方栈：精确比较每个 `author.login`。
3. 全部作者匹配 → 按 bottom-to-top 自动链接：`gh stack link --base <trunk> <bottom-pr> <next-pr> ... <top-pr>`。
4. 作者不同或任一作者不可得 → 改 GitHub 状态前询问用户。
5. 重新查询 GraphQL，要求一个 stack number、期望 trunk、完整 PR 集、期望 positions 与 base 链。
6. **永远不要**自动解散、重排或重建已有 stack；`gh stack link` 是追加式，已合并/已排队 entry 不能 unstack。

`【源义务】` 只在需要时刷新（`dsh-merging-stacked-prs/SKILL.md:68-76`）：不要因为有刷新机制就重写分支。当 live merge state 或仓库规则要求更新 trunk 时，二选一：

- **原生级联 rebase**：本地未跟踪时 `gh stack checkout <pr-or-stack>`，然后 `gh stack sync`；它可能在校验前 rebase + lease 保护强推每个活跃层，因此立即检查重写范围、对每层跑相关检查、通过前不合并。冲突时 `gh stack rebase` → 解决验证 → `gh stack push`。若 checkout 或 sync 报告本地/远端栈组成分歧，取消并询问，不要自动删除/重建远端栈。
- **增量 merge-forward**：把 trunk 合并进受影响最底分支，再 bottom-to-top 把每个更新后的父传入子并正常推送。进行中合并期间 base 前进时，先保留该 checkpoint 再合并更新 tip。

`【源义务】` 合并前预检（`dsh-merging-stacked-prs/SKILL.md:77-82`）：重新查询官方栈；要求每个选中 PR 为 open、非 draft、顺序正确、满足仓库评审与检查要求。独立对待每个 PR 状态；顶层 ready 不证明依赖 ready。“Land the stack”选择整个栈；部分落地必须显式指定边界 PR，并包含从底部到该边界的每一层。

`【源义务】` 通过栈 API 合并（`dsh-merging-stacked-prs/SKILL.md:83-100`）：

```sh
gh stack merge <stack-number> --yes --merge
# 或显式部分落地
gh stack merge <boundary-pr> --yes --merge
```

不要传 `--delete-branch`、手动 retarget 依赖、或逐 PR merge。GitHub bottom-up 合并选中范围，并重定向/rebase 剩余上层。直接 stack merge 是 all-or-nothing；trunk 使用 merge queue 时，GitHub 把选中范围一起排队但可能分成多个组落地。不要绕过合并要求；原生合并报阻塞时，在拥有该阻塞的 PR 内解决或停止报告，绝不退回 `gh pr merge`。

`【源义务】` 验证落地（`dsh-merging-stacked-prs/SKILL.md:101-118`）：等待每个选中 PR 报 `MERGED`；排队不等于完成。部分落地后重新查询官方栈，验证剩余 PR 仍按期望顺序链接并指向 trunk 或其下一层；重查 heads、review state、CI，因为 GitHub 可能已 rebase 剩余层。分支删除只在对应 PR 报 `MERGED` 后的独立最终阶段进行；删除前要求 GitHub 报告没有以该分支为 base 的开放 PR（`gh pr list --state open --base <branch> --json number --jq length` 必须为 `0`）。

### 10.3 执行卡片

- **前置条件**：原生 `gh stack` 可用；同仓库分支；干净 worktree；可读 GraphQL。
- **步骤**：查栈 → 链接（必要时）→ 只在需要时刷新 → 预检 → `gh stack merge` → 等 MERGED → 验证剩余栈 → 最后删分支。
- **责任者**：落地作者；评审者确认每层证据。
- **完成信号**：每个选中 PR `state == MERGED`；剩余上层仍是期望官方栈；删除分支前依赖数为 0。
- **失败处理**：扩展缺失/跨 fork → 硬停；作者不匹配 → 询问；冲突 → `gh stack rebase`；阻塞 → 在 owning PR 解决或停止。
- **例外**：部分落地需要显式边界。
- **证据限制**：GitHub stack 对象与 merge queue 状态是外部事实；本地无法完全模拟。跨 fork、Enterprise Server 等场景可能不支持原生栈。

---

来源：deepseek-harness/docs/cookbook/responding-to-pr-review-on-a-stack.md:1-32@687f282e 来源：deepseek-harness/.agents/skills/dsh-merging-stacked-prs/SKILL.md:6-8@687f282e 来源：deepseek-harness/.agents/skills/dsh-merging-stacked-prs/SKILL.md:1-127@687f282e 来源：deepseek-harness/AGENTS.md:161-162@687f282e 来源：deepseek-harness/docs/cookbook/responding-to-pr-review-on-a-stack.md:27-32@687f282e


<a id="aw-11"></a>
## 11. 交接：Agent Notes、归档、维护者与委派

### 11.1 Note 与归档的归属

Note 的准入、分类、文件格式、生命周期迁移、取代审计、现状维护、删除／保留／归档判决与合并规则由[决策记录](decisions.md)拥有；目录契约、必需检查的判定、归档封印与可信基线的完整要求由[Agent Note 参考](agent-notes.md)拥有。本节只保留交接视角的三条边界：

- 一个持久决策只有一个 owning note；实现落点变动时同变更更新它，决定反转要用新 note 取代并交叉链接（[现状维护](decisions.md#implemented-maintenance)、[合并条件](decisions.md#consolidation)）。
- 归档不改历史正文，只在两侧插入一致的 `Archived` 日期并机械重录 sidecar；封印后不再编辑、移动、翻译或修复出链（[归档冻结](agent-notes.md#3-冻结归档与可信历史)）。
- 归档之后仍需的验证、分类结果与边界词数报告，不能由 seal 通过替代（[门禁与证据链](decisions.md#gate-wiring)）。归档检查本产品不提供，触发时须按上述判定实现并验证。

### 11.2 维护者交接

`【源义务】` 交接给另一位维护者时，开一个取代当前 owner 的后续 Agent Note：把机制移进仓库，或记录新操作者的私有设置。不要静默转移私有工具；“单维护者 bus factor”正是交接需要文档化决策的原因。来源：源仓 `docs/cookbook/maintaining-dsh-code-review.md:1-64@687f282e`。
### 11.3 委派工作的 trust-but-verify

`【源义务】` 子代理报告描述意图，不必然是落地内容：在真实树上自己重跑门禁；对回归 guard 证明它在未修复代码上失败；子代理把问题重述为已处理是要亲自深挖的信号（`docs/cookbook/responding-to-pr-review-on-a-stack.md:24`）。这与 `docs/testing.md:33-35` 的“验证世界，而不是自我报告”一致：e2e 断言要重跑命令或外部重读文件；关键词探测代理自己的输出会让作弊代理通过。

`【迁移设计】` 在无 e2e 的工作流中，至少要求代理返回：实际命令、观察到的输出、未运行项与原因；并把“完成”声明与文件系统/远端状态分开核验。

### 11.4 Scratch 与 Dev Note

`【源义务】` `docs/scratch/` 存放受版本控制、会过期的讨论，必须能跨交接存活。每页写明 owner、创建日期、过期时间、晋升目标。本地一次性笔记保持忽略且不提交。来源：`docs/AGENTS.md` 所链接的 `dsh-doc/references/structure-hierarchy.md:55-60@687f282e`。

`【源义务】` 每个 authored 页面以 `Dev Note` 结束，并显式非权威：活跃假设、兼容性担忧、粗略替代、进度指针、未决问题可以放那里；稳定行为、必需限制、已接受理据属于普通 owner。工作关闭时：晋升耐久结论、把可复用理据移入 Agent Note、把事件时间线留在 postmortem、删除已解决的闲聊。空 Dev Note 写 `None.`，不积累占位散文。来源：`dsh-doc/references/structure-hierarchy.md:75-87@687f282e`。

### 11.5 用户要求的连续会话补充（非源义务）

`【迁移设计，非源义务】` 源仓库没有“新会话继续未完成任务”的通用协议；它依赖 Agent Notes、Dev Note、scratch 和 git 历史。若目标用户要求“刷新会话后继续”，必须作为**新增能力**明确标注，不得冒充源机制。最低可用设计：

1. 先复用项目已有唯一状态owner（任务板、Issue台账、交接文件等），不为本协议复制一份同权威记录；没有既有owner且按[状态建立与接续](state-owner.md)确需启用时，才建立可持久定位的任务状态文件。字段：owner、目标、当前分支/commit、已完成、未完成、阻塞、下一命令、证据路径、过期/复核日期；存储位置沿用项目权限与交接方式，不强制给既有owner另建版本控制副本。
2. 启用信号是跨上下文边界：用户要求继续/暂停/交接，压缩前保存，或同一目标确需多个会话或另一位执行者。单会话内的小改动，即使有多步验收，也不仅为“以后可能有用”而新建状态文件；用户明确要求初始化治理元数据时，初始化本身是任务。
3. 写入时机：任务暂停、交接、上下文压缩前；不是每步都写。
4. 读取时机：新会话开始时先读状态文件与 owning Agent Note，再读代码；不要只读聊天摘要。
5. 完成信号：状态文件中的“下一命令”可被独立执行；“未完成”项有明确 owner；当前请求已撤销的动作不在队列。
6. 失败处理：状态与实际 git/文件或用户当前请求不一致时，以仓库状态和当前请求为准并更新状态文件；不要用状态文件覆盖代码事实或复活已撤销动作。
7. 证据限制：这是迁移设计，源仓库未验证；不能用它声称源工作流具备连续会话保证。

### 11.6 执行卡片（交接）

- **前置条件**：存在需要跨 PR/跨人/跨会话保留的决策或状态。
- **步骤**：判断是否值得写 note → 查 supersession → 写/改 note → 同 PR 归档符合条件的三件套 → 修复入链 → 运行 verifier → 交接时写后继 note 或 handoff 状态。
- **责任者**：决策提出者（note）；归档者（冻结操作）；交接双方（后继 note/handoff）。
- **完成信号**：活跃语料中每个决策有唯一 owner；归档三件套封印；入链可解析；交接记录可执行。
- **失败处理**：格式门禁失败按生命周期骨架修；seal 不匹配时停止并调查，不要 `--write` 覆盖；归档 note 出链损坏不修（有意）。
- **例外**：机械/局部编辑、局部 UI 变更不写 note；已完全合并的旧 note 可按合并规则删除。
- **证据限制**：源仓库的自动检查只覆盖路径/类/格式/三件套/seal；语义“是否值得保留”仍需人判断。

---

来源：deepseek-harness/.agents/notes/README.md:7-125@687f282e 来源：deepseek-harness/.agents/notes/AGENTS.md:1-7@687f282e 来源：deepseek-harness/.agents/notes/implemented/AGENTS.md:1-13@687f282e 来源：deepseek-harness/scripts/agent-note-tree.ts:1-40@687f282e 来源：deepseek-harness/scripts/verify-agent-note-format.ts:1-40@687f282e 来源：deepseek-harness/scripts/verify-agent-note-classification.ts:1-27@687f282e 来源：deepseek-harness/.agents/notes/archived/AGENTS.md:1-9@687f282e 来源：deepseek-harness/.agents/skills/dsh-archive-agent-notes/SKILL.md:1-68@687f282e 来源：deepseek-harness/.agents/notes/README.md:36-43@687f282e 来源：deepseek-harness/scripts/verify-archived-agent-notes.ts:1-115@687f282e 来源：deepseek-harness/scripts/archived-agent-notes.ts:1-60@687f282e 来源：deepseek-harness/scripts/archived-agent-notes.spec.ts:1-60@687f282e 来源：deepseek-harness/docs/cookbook/maintaining-dsh-code-review.md:54-64@687f282e 来源：deepseek-harness/docs/cookbook/responding-to-pr-review-on-a-stack.md:15-26@687f282e 来源：deepseek-harness/docs/testing.md:33-35@687f282e 来源：deepseek-harness/.agents/skills/dsh-doc/references/structure-hierarchy.md:55-60@687f282e 来源：deepseek-harness/.agents/skills/dsh-doc/references/structure-hierarchy.md:75-87@687f282e 来源：deepseek-harness/.agents/skills/dsh-prose-standard/SKILL.md:44-62@687f282e

