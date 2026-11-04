# 记录生命周期：Note、归档、升级与状态

本页拥有记录的创建、冻结与状态：Agent Note 生命周期（§17）、归档与冻结（§18）、升级指南（§19）、Skill 调用元数据（§20）、Session 格式状态记录（§21）。新建、迁移或归档这些记录，以及修改 Skill 元数据与格式状态记录时读本页；各节的触发条件与 owner 互不替代。共同约定：触发定位以[根参考的读者触发索引](documentation.md#reader-triggers)为准；各节保留原节号（页内编号因此可能不连续），`源义务`、`迁移设计`与源证据坐标的含义同根参考开头；本页机制的来源坐标收在文末附录。

## 17. Agent Note 生命周期

来源：deepseek-harness/scripts/verify-repository-references.ts:1-155@687f282e 来源：deepseek-harness/scripts/verify-public-repository-links.ts:1-99@687f282e 来源：deepseek-harness/scripts/verify-concrete-terms.ts:1-105@687f282e 来源：deepseek-harness/website/AGENTS.md:1-23@687f282e 来源：deepseek-harness/website/docs.ts:1-123@687f282e 来源：deepseek-harness/scripts/project-doc-site.ts:1-263@687f282e 来源：deepseek-harness/scripts/project-doc-site.ts:263-577@687f282e 来源：deepseek-harness/scripts/verify-doc-site-fragments.ts:1-181@687f282e 来源：deepseek-harness/website/docs.ts:123-591@687f282e 来源：deepseek-harness/website/build.ts:1-86@687f282e 来源：deepseek-harness/scripts/project-doc-site.ts:473-577@687f282e

<a id="agent-notes"></a>
<!-- mechanism-ids: documentation-agent-note-lifecycle, documentation-agent-note-format-gates -->

**源义务（何时写）。** 只有代码、测试和现有文档无法解释的持久决策理由才写 Agent Note；机械/局部改动豁免，包括局部 UI 表现和交互。已有所有者笔记时更新它，不建重复笔记。提议重大未来工作放 `proposed/`；已决策放 `implemented/`；被拒绝的提案放 `rejected/`。`deepseek-harness/.agents/notes/README.md:65-75@687f282e`

**源义务（路径与分类）。** 路径 `{lifecycle}/{class}/yyyy-mm-dd-topic-title.md`；生命周期为 `proposed`、`implemented`、`rejected`；类为 `feature`、`bug-fix`、`simplification`、`architecture`、`process`、`testing`。`architecture` 关于交付源码结构，`process` 关于工具/政策/流程；`refactor` 不设类，归入 `simplification`。不要新增 `INDEX.md`。`deepseek-harness/.agents/notes/README.md:5-63@687f282e`、`deepseek-harness/scripts/agent-note-tree.ts:1-83@687f282e`

**源义务（格式）。** 第 1 行 `# Agent Note: <title>`，第 2 行空，第 3 行状态（`Status: proposed` / `Status: implemented` / `Status: rejected — <one line>`），第 4 行空。正文首节必须是 `## Problem`。`proposed` 还须 `## Proposal`、`## Alternatives considered`、`## Acceptance criteria`、`## Risks`；`implemented` 须 `## Decision`、`## Alternatives considered`、`## Consequences`，禁止 `## Proposal`、`## Plan`、`## Migration plan`、`## Acceptance criteria`；`rejected` 须 `## Proposal`，保留提案时结构。每个笔记必须有 `## Alternatives considered`；2026-07-05 前无法重建替代方案的旧笔记可用精确祖父注释替代。`deepseek-harness/scripts/verify-agent-note-format.ts:1-86@687f282e`、`deepseek-harness/.agents/notes/README.md:77-125@687f282e`

**源义务（移动与更新）。** 生命周期移动必须同改状态行并满足目标骨架；`proposed`→`implemented` 要把 Proposal 改写成现在时 Decision，把验收/风险折入 Consequences 或 Testing；`implemented` 笔记必须随代码改名、路径、默认值更新事实，但不得改成另一个决策。被完全取代的笔记可合并后删除，删除前保留所有独有理由、替代方案、后果、验证和覆盖缺口，并修复入站链接；删除时英文/中文/记录三文件一起删。`deepseek-harness/.agents/notes/README.md:75-105@687f282e`、`deepseek-harness/.agents/notes/implemented/AGENTS.md:1-13@687f282e`

**迁移设计。** 采用方必须建立触发判定，而不是按“有没有决策记录传统”决定是否记录：这个决定会被重新争论吗？替代方案会再次出现吗？代码能表达取舍吗？三者有“是”才建笔记。没有传统不是省略理由；不要用笔记代替 ADR 模板堆砌，笔记的价值在“为什么没选另一个”。

## 18. 归档与冻结

来源：deepseek-harness/.agents/notes/README.md:5-75@687f282e 来源：deepseek-harness/scripts/agent-note-tree.ts:1-83@687f282e 来源：deepseek-harness/.agents/notes/README.md:77-125@687f282e 来源：deepseek-harness/scripts/verify-agent-note-format.ts:1-86@687f282e 来源：deepseek-harness/scripts/verify-agent-note-classification.ts:1-27@687f282e

<a id="archive"></a>
<!-- mechanism-ids: documentation-agent-note-archive -->

**源义务（何时归档）。** 只归档已实现、决策已完成、理由不太可能指导未来工作、但仍有历史价值的笔记。若替代方案、所有权边界、负向保证、持久/线格式语义、安全规则或重新引入条件仍有用，保持活跃。`proposed` 永不归档；过时提案应拒绝。拒绝笔记只在能阻止可信错误时保留。`deepseek-harness/.agents/notes/README.md:47-63@687f282e`

**源义务（归档变更）。** 移动完整英文/中文/记录三件套到 `archived/{class}/...`；保留 `Status: implemented`；在两侧状态行正下方插入相同 `Archived: YYYY-MM-DD`（不早于源文件名日期）；sidecar 每个归档文件一行 `<filename>.md: <40-hex Git blob>`，英文/中文两侧都必须是当前 blob 哈希，不能沿用活动记录的节哈希；重录记录；修复或删除入站链接。这是唯一允许的归档内容变更。归档后永久冻结：不编辑、不翻译、不重排、不修复、不移动、不删除，也不作为当前行为权威。`deepseek-harness/.agents/notes/archived/AGENTS.md:1-9@687f282e`、`deepseek-harness/scripts/archived-agent-notes.ts:1-204@687f282e`

**源义务（封印）。** `archived/manifest.json` 记录每个冻结文件的 sha256 内容哈希；普通校验拒绝未封印新增、变更或缺失、不完整三件套、缺失/未知类目录和无效归档元数据。写入用 `pnpm run verify-archived-agent-notes --write`；CI 用受信任的变更前提交作基线（`DSH_ARCHIVE_BASE_REF`），本地默认 `HEAD`；校验读取基线 manifest 并只允许清单列出的精确新增/变更。`deepseek-harness/scripts/verify-archived-agent-notes.ts:1-115@687f282e`、`deepseek-harness/scripts/archived-agent-notes.ts:1-204@687f282e`

**迁移设计。** 采用方的归档清单必须保存“路径→哈希”并纳入代码评审；不要把归档目录当作可随意修补的旧文档。只读权限和“归档目录禁止修改”的 CI 路径过滤只能作为补充，不能替代哈希封印；若目标平台无法提供哈希清单，记录该机制非激活及重新激活条件，不能声称冻结等价。

## 19. 升级指南

来源：deepseek-harness/scripts/archived-agent-notes.ts:1-204@687f282e 来源：deepseek-harness/scripts/verify-archived-agent-notes.ts:1-115@687f282e

<a id="upgrade-guide"></a>
<!-- mechanism-ids: documentation-upgrade-guide -->

**源义务（触发）。** 只有当现有用户必须修改配置、代码或数据才能继续时，才写升级指南；普通发布说明、内部重构和无需动作的变更不写。`deepseek-harness/.agents/skills/dsh-create-upgrade-guide/SKILL.md:10-27@687f282e`

位置、格式、维护、验证与已知盲点由[升级指南](upgrade-guides.md)拥有，本节不复述。记录生命周期侧只有两条边界：指南是随版本冻结的记录族，已发布目录不重写历史，修正走新版本或新条目；一个条目必须给出可执行迁移步骤与其验证方式，只有变更叙述的条目不算升级指南。

## 20. Skill 调用元数据

来源：deepseek-harness/.agents/skills/dsh-create-upgrade-guide/SKILL.md:1-54@687f282e 来源：deepseek-harness/.agents/skills/dsh-doc/templates/upgrade-guide.md:1-29@687f282e 来源：deepseek-harness/scripts/verify-upgrade-guides.ts:1-85@687f282e

<a id="skills"></a>
<!-- mechanism-ids: documentation-skill-invocation-metadata -->

**源义务。** 每个 Skill 的 frontmatter `disable-model-invocation` 与其 `agents/openai.yaml` 的 `policy.allow_implicit_invocation` 必须表达同一策略；手动专用 Skill 还必须 `user-invocable: true`，否则用户也无法调用。检查器同时验证 frontmatter 形态、目录名与名称一致、描述非空和策略配对。`deepseek-harness/scripts/verify-skill-invocation-metadata.ts:1-122@687f282e`

**迁移设计。** 采用方若没有 `openai.yaml`，至少在一个机器可读清单中声明“可隐式/仅手动”，并让生成器或检查器校验 frontmatter 与清单一致。**证据边界。** 该检查只验证元数据一致，不验证 Skill 内容质量或运行时发现顺序。

## 21. Session 格式状态记录

来源：deepseek-harness/scripts/verify-skill-invocation-metadata.ts:1-122@687f282e

<a id="session-status"></a>
<!-- mechanism-ids: documentation-session-format-status -->

**源义务。** `docs/session-format-status.md` 同时记录检查点写入版本、已完成兼容基线、最新发布版本与证据 tag。写入版本由代码常量拥有；发布记录只声明已发布事实。`latestReleasedVersion` 必须是非负安全整数且不得超过当前写入版本；`evidenceTag` 必须匹配 `dsh-v<semver>` 形式且不含 URL 定界符；正文必须同时出现该 tag 和 `packages/core/session/src/types.ts` 路径作为证据。`deepseek-harness/scripts/doc-standard.spec.ts:162-299@687f282e`、`deepseek-harness/docs/session-format-status.md:1-50@687f282e`

**源义务（双语与唯一性）。** 英文/中文各恰好一个 ` ```yaml session-format-release ` 记录，字段恰为 `latestReleasedVersion` 与 `evidenceTag`；两侧记录相等。重复、未闭合、多文档、额外字段、错误类型都失败。`deepseek-harness/scripts/doc-standard.spec.ts:214-299@687f282e`

**操作步骤。** 格式升级先改代码常量和相邻目录，不提前推进发布记录；产品发布后确认 tag 与 tagged writer，再同改两侧记录和证据行；后续发布携带同一格式时不改记录；开发主干永不降低版本。**证据边界。** 这是无网络检查，只证明记录结构、双语一致和不超前于写入版本；它不查询 GitHub，也不证明记录是最新发布。

**迁移设计。** 只有项目事实类别中确实没有持久化格式时，才能非激活；一旦有，必须实现完整记录：写入版本常量、发布基线/最新 tag、证据路径、双语一致和“不超前于写入版本”检查。不要用一个布尔 `released` 代替可核验证据。

## 机制→来源引用索引（本页机制）

本节只列本页机制的来源区间，固定提交 `687f282e`；其它机制的坐标在其所属页。它只补齐可回溯的引用坐标，不新增正文断言；正文解释仍以本页对应小节为准。

- `documentation-agent-note-lifecycle`：`deepseek-harness/.agents/notes/README.md:5-75@687f282e`
- `documentation-agent-note-format-gates`：`deepseek-harness/scripts/verify-agent-note-classification.ts:1-27@687f282e`
- `documentation-upgrade-guide`：`deepseek-harness/.agents/skills/dsh-create-upgrade-guide/SKILL.md:1-54@687f282e`
- `documentation-session-format-status`：`deepseek-harness/docs/session-format-status.md:1-56@687f282e`
