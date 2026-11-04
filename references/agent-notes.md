# Agent Note 决策记录、格式与冻结归档

本页命令中的 `<product-root>` 指单独取得的产品仓库根目录，不是复制后的轻量 Skill 座。需解析器或其他 workspace 依赖的产品命令须在该产品根按锁准备依赖；目标工程仍使用自己的配置和入口。

当项目确有代码、测试和现有文档无法解释、后续仍需遵守的长期决策理由时，本节拥有其记录、生命周期与冻结历史；这是触发条件而非自由选配，但也不是每个非平凡修改都必须新写 Note。机械或局部修改，包括局部 UI 展示/交互，没有新长期决策时不写 Note。先按[标准](project-standard.md#governance-owners)复核既有决策 owner 是否满足唯一性、事实/理由分离及提出、实施、拒绝、取代、冻结和检查责任；满足才复用，否则原位补齐或迁移，不建立第二套竞争记录。

**实现状态。** 本产品**不提供** Note 分类器、格式器与归档校验器的实现，也不提供任何封装它们的命令。以下义务是必须保留的规则：触发时必须按目标工具链实现等价检查，并实际证明正常、拒绝与恢复；**人工审阅不能替代原本必需的机械保证**。源仓的对应程序只作为行为规格与来源坐标保留（见文末），不构成本产品的可执行承诺。源实现采用 MIT 许可，见 Skill 根目录 `SOURCE-LICENSE.txt`。

## 1. 激活与目录

语料固定在**目标项目根目录**的 `.agents/notes/`，不是 Skill 安装目录。安装 Skill 只放置 seat，不创建或激活 Note 语料；所有检查都按目标 cwd 解析 `./.agents/...`，不要改指向安装目录。

活跃路径是 `{proposed|implemented|rejected}/{feature|bug-fix|simplification|architecture|process|testing}/yyyy-mm-dd-topic.md`；中文对侧和配对记录由配对机制拥有。归档路径是 `archived/{class}/yyyy-mm-dd-topic.{md,zh.md,i18n.yaml}`，不再包含 implemented 段。归档根需要 `AGENTS.md` 和六个分类目录；已密封后还需要 `manifest.json`。

首次建立 Note 语料时，由执行者创建当前决策语料树，并在 `archived/AGENTS.md` 写入以下完整约束，不覆盖项目已有指令：

> 归档三元组是永久冻结的历史，不是当前权威。密封后不编辑、翻译、格式化、修复、移动或删除。首次归档只可移动完整中英/侧车，保留 implemented 状态，在其后插入相同有效归档日期，重录侧车并修复入站链接。当前事实、勘误与新决定写在活跃语料，不追改历史。普通文档检查跳过归档源和出站链接，但继续验证指向归档的链接。

Git 不保存空目录。目录准备必须在首次建立和每次干净 CI checkout 后执行，只创建必要的生命周期/分类目录，**不创建假 Note、不修改已有正文或密封清单**；实现方式按目标工具链选择（脚本、CI 步骤或生成器），并把它接入目标既有入口。

已有 `.governance/decisions/`、`docs/decisions/` 或其他长期决定 owner 时，先按[标准](project-standard.md#governance-owners)核对唯一性、事实/理由分离及提出、实施、拒绝、取代、冻结与检查责任；符合才复用，否则原位补齐或迁移。迁移 Note 树须说明迁移范围、既有记录及入站链接的处置，按正常评审接受，不保留两套同权威副本，也不为安装模块无依据搬迁既有决定。需求与任务状态继续由目标已有合规 owner 拥有（建立与接续条件见[状态所有者](state-owner.md)），不要在本节另立状态记录。

## 2. 活跃语料的必需检查

本产品不提供这些检查；触发时必须实现并实际运行等价入口。

**分类检查的判定。** 拒绝未知生命周期/分类、错误路径深度、非日期主题文件名、中央 INDEX，以及旧式 `docs/rfc`/`docs/rfcs` 路径。

**格式检查的判定。** 检查标题与唯一 Status、生命周期一致、Problem 开头、各状态必需章节、Alternatives，以及 implemented 禁用的提案章节；代码围栏内的示例不得被当作正文结构。只有文件日期早于 2026-07-05 时才接受源规则的精确 grandfather 注释，不能让新 Note 绕过备选方案要求。

这些程序保留源职责边界：活跃 `.zh.md` 的结构/翻译对应和 Markdown 链接由独立的[文档执行模块](documentation-links-and-repository-policy.md#markdown-gates)拥有。先完成下面的语料配置，再把自己的分类/格式检查与配对、链接命令一起运行；只实现分类器不等于整条 Note 治理链已建立。作者/评审者仍须检查实际 rationale、当前事实和完整/部分取代关系，机械检查不会判断“这个改动是否值得写 Note”。

在 `.doc-gates/translation-pairing.json` 中列出**活跃生命周期根**，不要把包含冻结三元组的 `archived/` 放进 `roots`，也不要用 `excluded` 表示“归档由别的门禁负责”：配对程序的 `excluded` 表示该页面不得有译文或侧车，并非忽略历史三元组。

```json
{
  "roots": [
    ".agents/notes/proposed",
    ".agents/notes/implemented",
    ".agents/notes/rejected"
  ]
}
```

若目标项目还有其他受管双语文档，把其真实根/文件纳入同一配置，不另建重复 owner。`.doc-gates/markdown-links.json` 则可声明 `{"roots":[".agents/notes"]}`；链接程序默认跳过归档出站检查但保留活跃→归档入站检查。活跃 Note 保留第3行唯一 Status、第4行空行，语言切换链接放在其后、首个 `## Problem` 之前。两侧修改后只对已确认的活跃配对重录，再做只读检查（路径换成正在修改的真实 Note，不创建示例占位记录）：

```bash
node <product-root>/packages/governance/documentation/src/verify-translation-pairing.mjs --write <活跃 Note 路径>
node <product-root>/packages/governance/documentation/src/verify-translation-pairing.mjs
node <product-root>/packages/governance/documentation/src/verify-md-links.mjs
```

配对通过只证明结构和记录新鲜度；译文含义仍须评审。归档的整文件 Git blob 配对和 SHA-256 seal 由归档检查负责，不能拿活跃配对的逐节记录覆盖冻结侧车。

## 3. 冻结归档与可信历史

只有完整实现、低未来指导价值且仍有历史价值的记录可以归档。仍有用的安全、持久化、兼容、所有权、替代方案或重引入条件保持活跃；proposed 永不归档。纯机械/小 UI 旧记录的删除、rejected 保留价值和完全合并删除按[决定记录参考](decisions.md#lifecycle-classification)评审。

归档检查必须实现两个模式，且写入模式不能充当批准修改的开关：

- **写入模式**：先核对所有既有 seal 与真实文件，再只追加新三元组哈希；不覆盖、不修复旧历史。
- **只读模式**：核对既有 seal 与文件一致，不写入。

判定要求：完整中英正文须有 implemented 状态、紧邻且一致的有效 Archived 日期，不能早于文件名日期；归档侧车格式为两个文件名各自对应当前 **Git blob SHA-1**，清单则是独立的 **SHA-256**，两者不能混用。错误元数据、不完整三元组、侧车漂移、旧 seal 改动/删除和不可读基线均非零退出且不写清单。恢复须还原历史字节或提供真实可读的受信基线，不能删清单再密封。

**首次封印的目标补强。** 搬移前，完整 implemented 三元组必须已存在于可信基线；新归档的三份活跃文件必须移走。检查以基线 Git blob 比对两个语言文件，除了紧随 Status 的 Archived 行不允许任何字节变化，侧车只允许机械重录。若既有历史语料已提交但尚无 seal，基线中每份历史 artifact 都必须仍存在且字节相同；整组三元组消失也会拒绝。伪造空清单或新 seal 不会跳过库存与原文比对。缺原文、仍留活跃副本、历史缺失或正文变化均拒绝且不写清单。恢复须还原可信原字节，不得先提交被改写或删减的历史来制造“可信”基线。

可信基线的对象比对直接从已有 `git ls-tree -rz` 输出的完整对象 ID 推导格式：40 位为 SHA-1，64 位为 SHA-256，不额外调用 `rev-parse --show-object-format`。归档侧车仍按独立的旧式 SHA-1 blob 协议记录，清单仍为 SHA-256，不能用仓库对象 ID 直接替代侧车值。

以上首次封印与未封印历史库存比对是目标要求，不是已交付能力：模板现有 `scripts/verify-archived-agent-notes.ts` 比较可信基线中的 manifest 与当前封印，但不执行这些原文和库存比对。采用时须补齐并验证，不能把现有检查通过当作上述要求已满足。

**Git 版本边界。** 源实现实际验证版本是 Git 2.48.1.windows.1；完整最低版本尚未通过旧二进制矩阵认证。SHA-1 路径不新增对象格式探测选项的版本要求，SHA-256 仓库则要求 Git 构建本身支持该格式（[Git 2.28 官方文档](https://github.com/git/git/blob/v2.28.0/Documentation/git-init.txt) 已记录条件支持）。[Git 2.29 文档](https://git-scm.com/docs/git-rev-parse/2.29.0) 也已记录 `--show-object-format`，但源实现不依赖该选项；能力故障注入不等于实际旧版本验证。

本域继承源门禁的 LF 文本前提；目标项目须在搬移前确认实际 Note/侧车与 Git 原文都为 LF，不能在归档时顺便规范化字节。源仓通过 `.gitattributes:1-7` 在 checkout 层保证这一点；其他 CRLF checkout 的兼容性尚未证明。未封印历史导入的库存保存以**所选可信基线已包含的文件**为界；它能拒绝当前整组遗漏，不能发现基线建立之前已经丢失的历史，也不证明 Git 基线、检查器或 CI 自身可信。

本地默认比较 committed `HEAD`；PR CI 必须由受信事件提供变更前基线，checkout 完整历史后运行只读模式，不在 CI 自动写入。以下变量名仅适用于模板现有归档检查；其他项目自有检查器须按实际接口配置，并另行补齐上述缺失的首次封印保护：

```yaml
- name: Verify frozen Agent Notes
  env:
    DSH_ARCHIVE_BASE_REF: ${{ github.event.pull_request.base.sha }}
  run: <project-owned archived-note check>
```

该片段不是完整工作流：还要在同一真实 CI 路径准备 Node、准备安装座依赖、checkout `fetch-depth: 0`、重建必要空目录，并执行自己的分类/格式检查及独立配对/链接检查。环境里的基线不能由 PR 自行选择；若规则程序、清单或 CI 自身可未经受信评审修改，单个脚本仍不能证明历史保护。

源仓有三条针对一次特定 Figma 链接移除的精确 old→new seal 授权。该批准只属于源仓，**不会随包授予其他项目**：目标检查默认对所有旧 seal 严格追加。目标若需要历史更正，须有独立明确授权及受信、精确、可审计的变更流程。

## 4. 验证与维护边界

本地退出1只说明检查拒绝；只有真实 required CI 和平台保护拒绝了合并，才算远端阻断。首次建立或改造 Note 语料至少保存：合法语料通过、非法生命周期/状态拒绝、篡改已密封内容拒绝、还原恢复，以及可信基线不可用、缺少可信 implemented 原文、任一活跃三元组成员未移走、未封印历史整组三元组遗漏和伪造当前清单时拒绝的真实输出；确认拒绝时未写清单。还需在获授权隔离环境证明 CI/平台层，不能从文件存在推断。

采用方实现或升级检查时，必须保留本节的判定、目录契约、基线变量语义与源专用授权隔离，并实现上述首次搬移、既有未封印历史的完整库存/原字节比对。归档不可修正文时，在活跃 owner 写勘误并链接历史。

来源：固定提交 `687f282e8625c6b8d11ff58211a90524be2e4317` 的 `AGENTS.md:155`、`.agents/notes/README.md:7-125`、`.agents/notes/implemented/process/2026-07-26-frozen-agent-note-archive.md:1-45`、`scripts/{agent-note-tree,verify-agent-note-classification,verify-agent-note-format,archived-agent-notes,verify-archived-agent-notes}.ts`；源 CI 关系见 `package.json:122-124`、`scripts/run-gates.ts:852-854`、`.github/workflows/ci.yml:104-107`。这些是源实现的坐标与行为规格，不是本产品已交付程序的声明，也不是来源测试段落的通过声明。
