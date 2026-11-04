# Markdown 链接、仓库引用与网站投影

本页拥有 Markdown 面与仓库引用面：链接、锚点、换行及已交付的目标执行器（§15，含 §15.1、§15.2），仓库引用政策与网站投影（§16）。§15 与 §16 是不同义务族、不同执行器，同页只表示导航合并：源码注释或字符串中的 `docs/...` 路径归 §15，Git 提交号、组织／旧仓库 URL 与禁用术语政策归 §16，不能用一项替代另一项。共同约定：触发定位以[根参考的读者触发索引](documentation.md#reader-triggers)为准；各节保留原节号（页内编号因此可能不连续），`源义务`、`迁移设计`与源证据坐标的含义同根参考开头；本页机制的来源坐标收在文末附录。

## 15. Markdown 链接、锚点与换行

来源：deepseek-harness/scripts/translation-pairing.ts:18-80@687f282e 来源：deepseek-harness/scripts/gen-config-catalog.ts:930-1074@687f282e 来源：deepseek-harness/scripts/verify-translation-pairing.ts:99-140@687f282e 来源：deepseek-harness/docs/i18n/README.md:49-56@687f282e 来源：deepseek-harness/scripts/translation-pairing.ts:80-139@687f282e 来源：deepseek-harness/scripts/gen-cordis-catalog.ts:1-83@687f282e 来源：deepseek-harness/scripts/gen-cordis-catalog-partition.spec.ts:1-211@687f282e 来源：deepseek-harness/scripts/gen-cordis-catalog.ts:84-1118@687f282e 来源：deepseek-harness/scripts/gen-cordis-catalog.ts:1171-1187@687f282e 来源：deepseek-harness/scripts/gen-cordis-catalog.ts:1260-1279@687f282e 来源：deepseek-harness/scripts/gen-cordis-catalog.ts:1292-1307@687f282e

<a id="markdown-gates"></a>
<!-- mechanism-ids: documentation-markdown-links, documentation-source-doc-refs, documentation-mermaid-syntax, documentation-markdown-corpus-model -->

**源义务（受检语料）。** 所有 Markdown 门禁共享 GFM 解析与行模型：散文行排除围栏/缩进代码块和 HTML 注释，保留 1-based 行号与原文本；围栏保留 info string 与 `closed`，mdast 在 EOF 静默闭合的围栏不得当成已闭合；标题支持 ATX/Setext，slug 用渲染文本（原始 HTML 注释不进入）。链接目标用作者源偏移定位，兼容 `<...>`、转义、嵌套括号和引用定义，定位失败抛错。仓库发现只模型化 `*`、`?`、`**`；字符类、brace/extglob、反斜杠、`..`、空段、尾随 `**` 显式抛错，不能静默返回空集；`**` 只展开真实目录，最终段可匹配文件/符号链接，最终段的断链/环链在 realpath 处失败，非最终 literal 断链匹配为空（与 node glob 一致）；多个 pattern 共享目录列表，按 canonical realpath 去重符号链接。归档 Agent Note 不作为源扫描，但指向它们的链接仍作为目标检查。`deepseek-harness/scripts/markdown.ts:1-277@687f282e`、`deepseek-harness/scripts/repo-files.ts:1-295@687f282e`

**源义务（相对链接）。** 当前文件用相对 Markdown 链接；历史引用用 tag 或 PR 号。`verify-md-links` 只检查本地目标：查询串/片段剥掉后目标必须存在；外部 URL、协议相对 `//host` 和根绝对 `/path` 被排除。目标是非 Markdown 文件时（如 `file.ts#L10`），片段交给渲染器，不判锚点。`deepseek-harness/docs/AGENTS.md:75-77@687f282e`、`deepseek-harness/scripts/verify-md-links.ts:34-73@687f282e`、`deepseek-harness/scripts/verify-md-links.ts:204-233@687f282e`

**源义务（锚点）。** 锚点按 GitHub slug 规则解析：转小写、删去字母/数字/下划线/空格/连字符以外的字符、空格变连字符；显式 `<a id="...">` 也算目标，但 fenced/inline code 和 HTML 注释里的锚点不算。重复标题按 GitHub 占用集加 `-1`、`-2`；匹配大小写敏感。标题改名会破坏入站锚点，必须同改引用；没有自动别名放行表。`deepseek-harness/scripts/verify-md-links.ts:99-160@687f282e`

**源义务（禁止网站路由，评审）。** Markdown 中不要写 `/docs/...` 之类的站内绝对路由；这些链接在 GitHub 上不可解析，且检查器会跳过根绝对路径，因此该禁令只能由写作评审执行，不是 `verify-md-links` 的自动拒绝。写源相对链接，网站投影负责转换。`deepseek-harness/.agents/skills/dsh-doc/references/metadata-links-i18n.md:60-64@687f282e`、`deepseek-harness/scripts/verify-md-links.ts:45-73@687f282e`

**源义务（源注释引用）。** 源码注释/字符串中的文档路径必须是从仓库根开始的完整 `docs/...` 路径，带扩展名，不能 `./`/`../`；`verify-doc-refs` 扫描非 vendor、非 `lib`、非 `.d.ts` 的源码，去重符号链接后验证目标存在。`deepseek-harness/scripts/verify-doc-refs.ts:1-45@687f282e`

**源义务（换行）。** [第6节](documentation-structure-and-prose.md#6-写作预算与审查)的一行写作要求保留；脚本只检查 GFM AST 的跨行 `paragraph` 节点，包含列表/引用内段落，非段落的标题/围栏/表格/HTML 等不由该谓词检查。LF frontmatter 与 `:::` 容器分隔行先遮盖；冻结归档源不扫描；生成区域内 prose 没有一概豁免。`deepseek-harness/scripts/verify-md-wrap.ts:40-86@687f282e`

**源义务（Mermaid）。** 每个 Mermaid 围栏都被解析和校验，单图边数上限 64；只验证语法/结构，不渲染。不要在 Mermaid 中依赖未定义节点或超限复杂度。`deepseek-harness/scripts/verify-mermaid.ts:1-106@687f282e`

**迁移设计。** 采用方必须把本地目标、锚点、换行、仓库引用与 Mermaid 语法作为同一链接/文档完整性合同落地；如果站点使用非 GitHub 锚点算法，替换 slug 实现而不是跳过锚点。可以分批修复存量，但门禁覆盖范围和失败条件不得缩小。解析器/依赖缺失、配置未声明、语料未纳入或 CI 未接入是**阻塞或未落实**，须记录缺什么与解除条件，不能记成“非激活”；只有该事实类别在目标确实不存在（如确无 Markdown 或确无归档树）才记**不适用**与重新激活条件。两类状态与[§23](documentation-adoption-and-checks.md#migration)的判据一致。

**补充源码引用（尾部区间复读分派实际读取）**：`deepseek-harness/scripts/verify-md-links.spec.ts:1-29@687f282e`、`deepseek-harness/scripts/verify-md-links.spec.ts:64-140@687f282e`、`deepseek-harness/scripts/verify-md-links.ts:204-254@687f282e`

### 15.1 已交付的目标链接执行器

安装后的 `packages/governance/documentation/src/verify-md-links.mjs` 使用同一组固定版本 GFM 解析器。依赖按安装座根的工作区锁准备，不单独给某个包目录安装；消费者不需要源仓。以下命令从目标项目根目录执行：

```bash
npm ci --prefix .agents/skills/project-governance --ignore-scripts
node .agents/skills/project-governance/packages/governance/documentation/src/verify-md-links.mjs
```

先在目标的 `.doc-gates/markdown-links.json` 声明真实受管 Markdown 语料。例如确实同时存在文档和 Note 树的项目：

```json
{
  "roots": ["docs", ".agents/notes"],
  "files": ["README.md", "README.zh.md", "AGENTS.md"],
  "archiveRoots": [".agents/notes/archived"]
}
```

这是把源产品的硬编码发现路径参数化，不是减少覆盖：执行者与评审者须纳入所有适用的文档、包说明、指令和技能文档。`roots` 递归扫描真实目录中的 Markdown，`files` 声明单文件；缺失路径、空语料、错误配置或不可用解析器退出2，不伪装成通过。声明根可显式包含隐藏目录，递归发现不进入隐藏或符号链接目录；匹配的文件按真实路径去重，断链报错。归档根只跳过源扫描，活跃页面指向归档的目标/锚点继续验证。没有 `archiveRoots` 时默认使用上述源归档路径；项目更换归档位置时必须同步此字段。

成功输出受检文件数并退出0；缺目标或 `.md` 锚点时逐项输出 `file:line`、URL 与原因并退出1，不重写文件。保留源的 rendered-heading slug、重复标题占用集、真实 HTML anchor、query/percent-decoding 和外部/根绝对/非 Markdown 片段边界。`/docs/...` 仍属于禁止使用的源写作规则，但不是本程序能拒绝的错误；由文档评审负责。源码注释引用、换行、Mermaid、预算与站点发布仍由其各自的适用门禁拥有，不能用此命令替代。

本模块曾在默认 Skill 安装位置的离线 npm 消费者中与 Note 分类、格式、配对、冻结程序组合运行，观察到正常、拒绝与恢复；首次缓存缺失和错误归档配置造成的失败也保留。该组合观察不表示当前安装座本身提供 Note 执行器；目标项目须核对实际执行器与职责。该局部观察不证明真实目标 CI、required protection、语义翻译或独立来源等价通过。

### 15.2 已交付的目标换行执行器

在目标 `.doc-gates/markdown-wrap.json` 按§15.1同一结构声明 `roots`、`files`、`archiveRoots`；独立配置是因为源换行/链接程序的发现语料并不完全相同。纳入所有适用文档、指令与 expected Markdown 输出，不以示例路径代替完整目标语料。准备同一固定解析器后，从目标 cwd 运行 `node .agents/skills/project-governance/packages/governance/documentation/src/verify-md-wrap.mjs`；异地调用支持 `--root`、`--config`。成功退出0，跨行段落逐项输出 `file:line` 并退出1；前提、配置或语料不可用退出2。程序只检查，不重写内容。

**行为边界。** 换行/链接执行器在目标语料上的正常、拒绝与保留内容的合行恢复，必须在目标实际配置下逐项观察；多行 Setext 标题通过是源谓词的实际边界，不是标题写作规则的豁免。通过只证明所配置语料的范围，不证明真实目标全仓覆盖、可信 CI 必跑、平台阻断或独立来源等价。

## 16. 仓库引用与网站投影

来源：deepseek-harness/scripts/verify-md-links.ts:1-254@687f282e 来源：deepseek-harness/docs/AGENTS.md:75-77@687f282e 来源：deepseek-harness/.agents/skills/dsh-doc/references/metadata-links-i18n.md:60-64@687f282e 来源：deepseek-harness/scripts/verify-md-links.spec.ts:1-29@687f282e 来源：deepseek-harness/scripts/verify-md-links.spec.ts:64-140@687f282e 来源：deepseek-harness/scripts/verify-md-links.ts:204-254@687f282e 来源：deepseek-harness/scripts/verify-doc-refs.ts:1-45@687f282e 来源：deepseek-harness/scripts/verify-mermaid.ts:1-106@687f282e 来源：deepseek-harness/scripts/markdown.ts:1-277@687f282e 来源：deepseek-harness/scripts/repo-files.ts:1-295@687f282e

<a id="reference-policy"></a>
<!-- mechanism-ids: documentation-repository-reference-policy, documentation-website-publication-manifest, documentation-website-link-projection, documentation-website-raw-llms -->

**源义务（仓库引用策略）。** `verify-repository-references` 拒绝维护文件中指向实际 Git 对象的提交号（7 到 40 位十六进制、且对象存在于本地对象库）和 `github.com/deepseek-harness` 组织 URL；只排除 `vendor/` 与 `.agents/notes/archived/`，并对 kit 仓库 URL 有一个精确例外。历史引用用 tag 或 PR 号。检测按“唯一前缀”解析对象，浅克隆中不存在的对象无法匹配，因此不能把绿门禁当成“没有提交号”。`deepseek-harness/scripts/verify-repository-references.ts:1-155@687f282e`

**执行边界。** 组织URL检查先使用`canonicalReferenceText`标准化，但提交候选仍直接在原始行上匹配`commitCandidate`再对照本地提交集合。不能把URL解码的抗绕过能力误记为提交号检查也先解码。`deepseek-harness/scripts/verify-repository-references.ts:46-54@687f282e`

**源义务（公开仓库链接）。** 维护文件不得出现旧仓库 `deepseek-ai/deepseek-harness-sdk`；检测会先解码 `%2F`、`%23`、`%3A`、HTML 实体等转义再判断，防止用编码绕过。它只排除归档来源，不禁止 `deepseek-harness/...` 简写。`deepseek-harness/scripts/verify-public-repository-links.ts:1-99@687f282e`

**源义务（具体术语）。** `verify-concrete-terms` 禁止在维护文件中使用 `provenance` 这个笼统词（按 `prove`+`nance` 构造匹配）；排除 `vendor/`、归档、发布快照 `docs/persistence-changes/releases/dsh-v*.schema.json`、历史格式 `docs/persistence-changes/historical-formats/v*.schema.json`/`.i18n.yaml` 及其生成区域；提示改用更具体术语。`deepseek-harness/scripts/verify-concrete-terms.ts:1-105@687f282e`

**目标执行入口。** 采用方在目标根目录声明 `.doc-gates/repository-references.json`，运行安装座的 `node .agents/skills/project-governance/packages/governance/documentation/src/verify-repository-references.mjs`（在产品仓内可直接用 `node packages/governance/documentation/src/verify-repository-references.mjs --root <目标根>`）。维护者负责审核语料与三类规则，真实 CI 接入者必须使用普通检查而非诊断 `--list`。

```json
{
  "gitRoot": ".",
  "roots": ["."],
  "files": [],
  "excludePrefixes": [".agents/notes/archived", ".doc-gates/repository-references.json"],
  "commitIdentifiers": true,
  "forbiddenUrls": ["github.com/deepseek-harness", "deepseek-ai/deepseek-harness-sdk"],
  "allowedUrlLiterals": ["github.com/deepseek-harness/libreoffice-kit"],
  "bannedTerms": ["provenance"],
  "gitDiscovery": {
    "commitIdentifiers": "tracked-and-untracked",
    "forbiddenUrls": {
      "github.com/deepseek-harness": {"files": "tracked-and-untracked", "skipNul": false},
      "deepseek-ai/deepseek-harness-sdk": {"files": "tracked", "skipNul": true}
    },
    "bannedTerms": "tracked",
    "requiredAreas": ["AGENTS.md", "packages/", "docs/", "vendor/", ".agents/notes/archived/"]
  },
  "ruleExclusions": [
    {"rule": "commit", "pathPrefixes": ["vendor"]},
    {"rule": "url", "urlLiteral": "github.com/deepseek-harness", "pathPrefixes": ["vendor"]},
    {"rule": "term", "pathPrefixes": ["vendor"], "pathPatterns": [
      "^docs/persistence-changes/releases/dsh-v\\d+\\.\\d+\\.\\d+-(?:alpha|rc)\\.\\d+\\.schema\\.json$",
      "^docs/persistence-changes/historical-formats/v(?:0|[1-9]\\d*)\\.(?:schema\\.json|i18n\\.yaml)$"
    ]}
  ],
  "generatedRegions": [{
    "rule": "term",
    "pathPattern": "^docs/persistence-changes/historical-formats/v(?:0|[1-9]\\d*)(?:\\.zh)?\\.md$",
    "startMarker": "<!-- persistence-format-schema:start -->",
    "endMarker": "<!-- persistence-format-schema:end -->"
  }]
}
```

`gitRoot` 相对 `--root`，必须指向实际 Git 工作树根；`roots/files` 是相对目标根的字面路径，不接受 glob 或父目录。规则数组必须显式给出；空数组或 `commitIdentifiers:false` 是关闭对应规则，不得声称仍有该保证。例外按完整路径前缀排除语料；URL 允许项匹配完整仓库名称，可带 `.git` 或后续路径，不放行 `libreoffice-kit-other`。新项目应替换组织、旧仓库和禁用词为其自身政策，不盲抄来源组织。

**Git 发现模式。** `gitDiscovery` 一旦启用，必须逐条声明提交、术语及每个禁用 URL 的 `tracked` / `tracked-and-untracked` 范围，并逐 URL 声明 `skipNul`；缺项、未知 URL、错误值退出2。执行器使用 NUL 分隔的 `git ls-files --cached` 和 `--cached --others --exclude-standard`，再与 `roots/files` 字面范围求交：已跟踪文件不会因后来被 ignore 而漏扫，未跟踪且被 ignore 的新文件不会被纳入。已跟踪但已删除/变为非文件的发现路径跳过；显式声明的缺文件或缺根仍是配置错误。Git 模式的目标根与 `gitRoot` 必须是同一真实仓库根。省略该对象则保留递归显式语料模式，并默认仅 URL 规则跳过 NUL；不能把这个默认误称为源三个脚本的共同边界。

**必需仓库区域守卫。** 来源术语脚本要求跟踪清单含精确 `AGENTS.md` 及 `packages/`、`docs/`、`vendor/`、`.agents/notes/archived/` 的成员。目标以 `gitDiscovery.requiredAreas` 声明同等条件：不以 `/` 结尾的条目要求精确跟踪路径，以 `/` 结尾的条目要求该目录下至少一个跟踪成员。`AGENTS.md/child.md` 不能替代 `AGENTS.md`，单个名为 `packages` 的文件也不能替代 `packages/`。缺项退出2，报 `tracked-file discovery omitted a required repository area: <区域>`；补回并跟踪后恢复。路径先归一化，再拒绝重复、glob、`..`、空串和根目录 `.`。如来源一样，它检查完整Git跟踪清单（已删除但仍在索引中的路径仍满足存在条件），不替代语料范围或实际文件可读性。目标布局可用自己的确切区域，须评审核对完整性；省略此字段不启用守卫，不得据此宣称取得同等发现保证。

**按规则区分的例外与生成区。** 来源三个脚本各自排除不同范围：提交及组织链接排除 vendor 与归档；旧仓库链接只排除归档；术语还排除上例精确发布/历史 schema 和 pairing 文件及其生成区。`ruleExclusions` 支持三条规则之一、字面前缀/文件及 Unicode 正则 `pathPatterns`；URL 项可用 `urlLiteral` 只豁免某一个已声明禁用 URL，不影响其他 URL、提交或术语。没有 `urlLiteral` 则该项豁免全部 URL。历史版本必须用 `(?:0|[1-9]\\d*)`，不能用宽泛 `v[0-9]+` 放行 `v01`；中文 Markdown 可以有 `.zh`，schema/pairing 路径不因此有中文变体。`generatedRegions` 也可指定三条规则之一，但来源 schema 区只豁免术语。生成区仅在路径匹配、两标记各出现一次、分别独占整行且起在止前时豁免内部行。对 `<!-- name:start -->` / `<!-- name:end -->` 配对，还要求全文该 marker family 只出现两次；额外未知、大小写变体、分行或不完整标记均撤销豁免。配置规则、路径、正则或标记不可用退出2；内容标记缺失、重复或倒序不授予豁免，仍检查所有行。全局 `excludePrefixes` 同时放弃三条规则，不能用来替代按规则例外。上例表达固定来源路径政策；实际采用方必须核对自己的完整语料与适用政策，不从一个例子推断完整等效。

**拒绝与恢复。** 普通检查无违规退出0；检测到提交引用、禁用链接或词项退出1并定位文件/行；配置缺失、空语料、不可读文件或 Git 前提缺失退出2。改为可维护的 tag/PR、允许的完整 URL 或具体措辞后，重跑同一普通命令直到0。`--list` 即使列出违规也退出0，只供诊断，不能作为 CI 阻断。仅本地对象库存在且前缀唯一的 commit 才拒绝；blob、歧义前缀及浅历史中缺失的对象不算已识别提交，仍须完整历史前提。

**历史实测与证据边界。** 执行器读取文本或符号链接的存储目标，不跟随链接读外部文件。源组织链接与提交/术语扫描 NUL 载荷，旧仓库链接的读取路径跳过 NUL；上例逐 URL 声明保留此区别。必须覆盖的分支包括：新文件提交/组织拒绝，同文件跟踪后旧链接/术语拒绝，被忽略新文件排除但被强制跟踪后拒绝，NUL 分界、中文历史生成区、畸形标记、前导零路径、精确 schema 仅术语豁免，以及修复后的恢复。只复制模块与包清单不是完整 Skill 安装；局部通过也不等于全来源等效或真实 CI。这些边界不因历史上的探针次数或复核结论改变，也不证明当前目标覆盖、源脚本自身必需仓库区域守卫、平台必需检查、远端链接存活或语义用词质量。

守卫首版曾错误接受目录替代精确文件，最终实现区分两种匹配；采用方必须保留该失败形态作负例，并用本仓真实语料重现拒绝与恢复。省略或空数组不启用守卫，不能据此声称取得同等发现保证；局部通过也不是全来源等效或真实 CI 证明。来源：`deepseek-harness/scripts/verify-concrete-terms.ts:52-62@687f282e`

**策略文件自身。** 示例与实际策略文件都包含禁用URL字面量；若语料覆盖策略文件（如 `roots: ["."]` 且未排除 `.doc-gates`），普通检查会拒绝策略文件自身并退出1。实际采用方把策略路径加入 `excludePrefixes` 或收窄 `roots`，使声明与被检正文分开；整树示例必须配正确排除才能直接使用。

**源义务（发布清单）。** 发布面由`website/docs.ts`的显式清单控制，不从文件系统自动推断。清单选择人工页及部分生成参考；生成器拥有生成内容，清单拥有发布选择。移动源、路由、语言、对侧及别名要同步维护，不能靠手改生成站补洞。`deepseek-harness/website/AGENTS.md:1-23@687f282e`、`deepseek-harness/website/docs.ts:403-428@687f282e`

**源义务（链接投影）。** 已存在的仓库相对目标若已发布则映射站点路由，否则回退配置的公开仓库ref；`DOCS_REPOSITORY_REF`缺省为`master`，不是不可变版本绑定。实际发布也故意选`master`：公开仓库历史不同、只保留最近的tag，追随旧tag会使旧部署链接失效；代价是旧页面的源链接可随分支前移。图片可由资源放置回调处理；无法解析的相对目标失败，站点片段另查。`rewriteMarkdown`跳过外部/绝对URL及空路径，不是自动拒绝所有绝对链接。`deepseek-harness/scripts/project-doc-site.ts:30-38@687f282e`、`deepseek-harness/scripts/project-doc-site.ts:134-190@687f282e`、`deepseek-harness/.github/workflows/docs-pages.yml:23-31@687f282e`、`deepseek-harness/scripts/verify-doc-site-fragments.ts:1-181@687f282e`

**源义务（raw 与 llms）。** `rawDocsPages` 允许的页面生成 `.md` 原始孪生文件，根路由也提供 canonical raw；`llms.txt` 从同一清单生成；开发中间件在重写前提供 raw；预构建不得覆盖手写页面；合成片段也过链接门禁。`deepseek-harness/website/docs.ts:123-591@687f282e`、`deepseek-harness/website/build.ts:1-86@687f282e`

**操作步骤（网站改动）。** 显式选择发布页，原子维护源与清单；运行`pnpm run docs:check`并核对生成物。引用未发布目标时确认仓库路径存在、所配置的公开ref可访问且符合该项目发布策略；不必为每个被引用目标新建站点路由。不可变引用是额外要求，需显式提供可用的公开不可变ref并验证，不能从默认`master`推断。**失败处理。** 根据缺目标、片段或路由诊断修源/清单，不手补生成站。**例外。** 内部页可不发布而被公开页通过配置ref的源链接引用；这不授权自动发布私有或草稿内容。

**迁移设计。** 采用方若不用 VitePress，仍应保留“发布清单是唯一入口”和“链接投影单向转换”两点。不要用文件系统 glob 自动发布，否则草稿、归档和内部页会泄露。

## 机制→来源引用索引（本页机制）

本节只列本页机制的来源区间，固定提交 `687f282e`；其它机制的坐标在其所属页。它只补齐可回溯的引用坐标，不新增正文断言；正文解释仍以本页对应小节为准。

- `documentation-markdown-links`：`deepseek-harness/scripts/verify-md-links.ts:1-254@687f282e`、`deepseek-harness/scripts/verify-md-links.ts:204-254@687f282e`、`deepseek-harness/docs/AGENTS.md:75-77@687f282e`、`deepseek-harness/.agents/skills/dsh-doc/references/metadata-links-i18n.md:60-64@687f282e`、`deepseek-harness/scripts/verify-md-links.spec.ts:1-29@687f282e`、`deepseek-harness/scripts/verify-md-links.spec.ts:64-140@687f282e`
