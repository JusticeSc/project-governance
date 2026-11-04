# 开工范围与代码评审

[代理流程索引](agent-workflows.md)只作任务导航，本页拥有具名操作条件。来源标记说明固定提交687f282e的义务、事实及适配，不代表已运行。来源的pnpm／change-scope／gh stack等命令与目录是其绑定；目标须用真实现有工具实现同等作用，不得把未分发的来源命令冒充本产品能力。未有commit的空项目按空树与实际新文件核对范围，不伪造base／head；已有提交或PR则必须验证真实ref及各脏层。

<a id="aw-06"></a>
## 6. 任务开工：范围、证据与权限

### 6.1 范围

`【源义务】` `dsh-prose-standard` 把“显式 scope”作为硬输入：缺少 scope 时报告所需输入并停止，**不得推断全仓范围**，也不得开始访谈（`dsh-prose-standard/SKILL.md:14-27`）。这条规则可推广到所有审计/评审类任务：先要范围，再动手。

`【源义务】` `dsh-find-simplifications` 区分“调查”与“实施授权”：调查不等于允许实施其提案；实现必须留在用户授权内（`dsh-find-simplifications/SKILL.md:8,55-64`）。`record-browser-gif` 把“录制”和“发布到 PR”分成两步，只有任务包含发布时才执行第二步（`record-browser-gif/SKILL.md:18-24`）。

### 6.2 变更范围工具

`【源义务】` 评审和推送前使用 `pnpm --silent run change-scope --base <verified-base-ref> [--head <ref>]`。它**从不猜测或抓取 base**；调用者必须提供从当前远端或栈状态验证过的 ref。报告是带版本号的 JSON，包含 `repositoryRoot`、`input`、`resolved`（base/head/merge-base SHA）以及 `committed`/`staged`/`unstaged`/`untracked` 路径。合并 base 变化后要重跑并重新评估受影响行为。

来源：`dsh-pre-push-checks/SKILL.md:10-26`、`dsh-code-review/SKILL.md:8`、`scripts/change-scope.ts:1-40@687f282e`。 来源：deepseek-harness/.agents/skills/dsh-prose-standard/SKILL.md:14-27@687f282e 来源：deepseek-harness/.agents/skills/dsh-find-simplifications/SKILL.md:8-16@687f282e 来源：deepseek-harness/.agents/skills/record-browser-gif/SKILL.md:18-24@687f282e 来源：deepseek-harness/.agents/skills/dsh-pre-push-checks/SKILL.md:10-26@687f282e 来源：deepseek-harness/.agents/skills/dsh-code-review/SKILL.md:8-10@687f282e 来源：deepseek-harness/scripts/change-scope.ts:1-50@687f282e 来源：deepseek-harness/AGENTS.md:109-112@687f282e

### 6.3 主机沙箱失败

`【源义务】` 只有当必需命令因沙箱阻止凭据、网络、IPC、watch 或嵌套 `sandbox-exec` 而失败时，才用**最窄的主机提权**原样重试；必须有沙箱证据；**绝不**用提权绕过测试失败或产品沙箱。来源：`AGENTS.md:109-112`。

### 6.4 执行卡片

- **前置条件**：有可验证的 base/head；有明确的用户范围。
- **步骤**：确认 scope → 验证 base/head → 跑 `change-scope` → 读报告 → 只读必要上下文 → 再改。
- **责任者**：执行代理；评审者复核 base/head。
- **完成信号**：报告中的路径集合与用户描述的范围一致；没有未解释的 dirty layer。
- **失败处理**：`change-scope` 失败时先验证 ref 是否存在/可解析；不要改用 `git diff` 猜 base。
- **例外**：纯调查任务可只读；不要为了“完整”扩大到无关分支。
- **证据限制**：`change-scope` 只列路径，不做语义判断；脏层仍需人工解释。

---


<a id="aw-07"></a>
## 7. 代码评审工作流（`dsh-code-review`）

### 7.1 前置条件

`【源义务】` 在评审前：验证并抓取 PR 的**实时 base 与精确 head**；运行 `change-scope`；读 diff 与足够上下文理解设计。retarget 或 merge 后重新建立 base 并重跑。来源：`dsh-code-review/SKILL.md:8`。

### 7.2 必读来源

`【源义务】` 先读要求，再判断 diff。按变更路径映射并打开每一份权威页面（`dsh-code-review/SKILL.md:10-28`）：

- 根 `AGENTS.md` 与 `packages/AGENTS.md`：常驻与包规则。
- `docs/defensive-patterns/`：按 artifact 分页；diff 触及哪页就读哪页。
- `docs/AGENTS.md`：文档放置与散文纪律。
- `dsh-prose-standard`、`dsh-ci-test-reliability`、`dsh-client-ui-ux`、`dsh-error-handling`：各自专项。
- `docs/testing.md`：测试层级与门禁。
- Agent Notes：设计理据；与笔记不一致是设计讨论，不是自动否决。
- 双语变更：`docs/i18n/translation-rules.md` 与 `terminology.md`；扩展翻译技能不在自动评审内，只由用户显式调用。

### 7.3 阻断项（blocking requirements）

`【源义务】` 六条硬阻断（`dsh-code-review/SKILL.md:30-38`）：

1. **新散文必须语义评审。** 自动检查不能证明覆盖、准确、放置、编辑质量。
2. **文档与代码同 diff。** 配置、默认值、错误、wire 字段、事件、公开行为要同时更新包 README 与 JSDoc；注释只写非显然契约；删除实现叙述、测试走查、评审历史、重复理据。
3. **核心类型文档同步。** spine/seam 词汇变化更新对应 subsystems 页面与 `type-equiv` 条目；内部类型不需要目录条目。
4. **Cordis 所有权与清理。** 触及 Cordis 插件或入口可达 helper 时，应用 `cordis-styling-nitpicking` 的三条 P0：单例状态、未反转副作用、清理依赖先于消费者完成；并验证 registry 贡献的 disposal 测试。
5. **证据存在。** 核实作者运行了相关本地检查；CI 覆盖穷尽矩阵；评审者补语义缺口。
6. **客户端文案由 locale 拥有。** 拒绝 JSX/模板/helper 返回/可访问性属性/原始默认值中的产品文案；要求 typed dictionary key、标准 `t` 座位或显式 localized props、`verify-client-ui-i18n`、每个受影响 locale 的行为证据；用户/模型/wire 数据与代码 token 原样保留。

### 7.4 人工检查

`【源义务】` 至少覆盖（`dsh-code-review/SKILL.md:39-58`）：

- 意图与接口契约：追踪每个改动接口的两侧；错误、取消、所有权、disposal。
- 错误处理：应用到改动失败路径与最终用户可见报告；拒绝 catch-and-continue，除非状态所有者证明后续前置条件成立。
- 生命周期与并发：发布前竞态、await 期间取消、独立错误报告、回调包含、重入前所有权、完整 detach、静默 disposal。
- 能力与消费者契合：追踪每个当前消费者；拒绝消费者特定行为泄漏进接口；也拒绝“泛型服务上只服务一个内部消费者的新公开方法”——应传私有能力闭包。
- 范围、所有权、必要性：每个抽象、状态机、选项、防御性拷贝、兼容路径都要映射到当前契约、生产消费者、拥有插件/服务。
- 配置与公开选择：每个默认值、公开操作集、格式、导入概念都要有当前消费者证据或先例；否则要求显式选择或推迟。
- 模型视角：检查模型实际收到的 prompt、tool schema、result、diagnostics；跨模式；稳定文本逐字验证，动态行为用快照或 e2e。
- 强制执行：沿每条拒绝路径追到真正执行的操作；测试直接与替代调用者，防止绕过 schema/prompt/facade/wrapper/listener 顺序。
- 借用与派生状态：每个保留值是借用还是拥有；通知、缓存、prompt、UI 回显、replay、查询视图追到文档化成功点与权威源。
- 边界覆盖最终结果：找到完整发出/保留结果的所有者（含 wrapper 与 metadata）；测极小/精确边界、超大单块、多字节文本。
- 真实入口：测试要走 shipped Loader、bin、worker、ACP bridge 或子进程；手挂插件抓不到非法 Loader 导出；函数插件必须命名导出且无 default export。
- 测试强度：断言必须在目标回归上失败；验证外部状态、日志、事件或 disposal，而不是复述实现或相信代理报告。
- 测试可靠性：资源、异步、平台敏感或 flaky 测试应用 `dsh-ci-test-reliability`。
- 负向控制：每个改动的验收规则都要有一个故意无效的用例经真实 runner 失败。
- 已实现 Agent Note 与 shipped 现实一致：实现 proposed note 时，同 diff 内改为现在时的 shipped 状态，并核对路径、名称、机制。
- 转录变更：编辑器/模型可见变化更新快照或解释为何不适用；expected-output diff 当行为变更读，不当格式噪声。
- 双语变更：两侧意义与术语都要比较；绿色 pairing hash 不证明翻译质量。

### 7.5 报告发现

`【源义务】` 陈述缺陷、位置、影响、证据。局部缺陷放在最紧的相关 diff 范围；跨切面架构/范围/评审综合用 PR 级评论。阻断项与建议分开；已由绿色门禁执行的问题省略。回复使用现有 thread。**收到评审时**：逐条核实，基于技术理由修复或反驳，不做表演性同意。来源：`dsh-code-review/SKILL.md:59-61`。

### 7.6 执行卡片

- **前置条件**：可读 PR、实时 base/head、`change-scope` 可运行。
- **步骤**：验证 ref → `change-scope` → 读来源 → 阻断项 → 人工检查 → 报告。
- **责任者**：评审者（结论）；作者（证据与修复）。
- **完成信号**：每条阻断项有明确通过/不通过；发现带有可复现证据；阻断与建议分开。
- **失败处理**：base/head 无法验证时停止评审；不要以“看起来是同一个分支”代替。
- **例外**：纯样式/无行为变更可缩短人工检查，但不能跳过散文与范围判断。
- **证据限制**：评审技能是指导，不是完整清单；它不能替代编译器、测试或 CI。

---

来源：deepseek-harness/.agents/skills/dsh-code-review/SKILL.md:1-61@687f282e 来源：deepseek-harness/docs/defensive-patterns/README.md:1-25@687f282e 来源：deepseek-harness/docs/AGENTS.md:1-77@687f282e 来源：deepseek-harness/docs/testing.md:7-55@687f282e 来源：deepseek-harness/.github/pull_request_template.md:1-21@687f282e

