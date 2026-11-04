# 双语文档

[English](README.md) | 中文

本仓库以英文与简体中文维护文档，使任一语言的读者获得相同事实。本页定义配对约定、门禁、范围与排除规则；[translation-rules.md](translation-rules.zh.md) 定义如何翻译；[terminology.md](terminology.md) 是术语真源。

## 配对约定

- **两种语言同权。** 文档可以先用任一语言撰写与审查，对侧从其翻译而来。两个文件没有高下之分；它们必须说同一件事。
- **一个配对是三个同级文件。** 英文 `foo.md`、中文 `foo.zh.md` 与一致性记录 `foo.i18n.yaml`，位于同一目录。不使用 locale 目录、独立翻译仓库或中英交错的单文件。变更绝不在缺少另外两个文件时只落一种语言。
- **一致性记录。** `foo.i18n.yaml` 为每个包含语言特定内容的标题段保存一条记录。键是该段的英文标题 slug 路径（首个标题之前的文本为 `/`；重复路径追加 `~2`、`~3`……），条目保存该段英文块与中文块的 hash。一侧的第 `i` 段对应另一侧的第 `i` 段。每一侧的 hash 覆盖该段除围栏代码块与生成区域之外的每个顶层块——门禁要求这两类内容在两侧相同；恰好相同的内容仍会被 hash。没有剩余块的段没有条目。在两侧同时编辑代码块不会改变记录，不同段的编辑改变不同的记录行，因此 Git 默认文本合并可以组合它们。仅当两个分支修改了同一段的被 hash 内容时记录才冲突；解决 Markdown 后重新记录该配对。

  ```yaml
  /foo:
    en: 41d772192075e133
    zh: dda91c6c670cfd9d
  /foo/usage:
    en: 86940bea4a3c7ed6
    zh: de78429597783c7f
  ```

- **语言切换。** 中文文件始终在 H1 之后立即用 `[English](foo.md) | 中文` 链回英文。撰写型英文文件以 `English | [中文](foo.zh.md)` 回应。
- **结构与对侧镜像。** 标题深度与顺序、列表种类、有序列表起始值、列表项数量、表格行列数、带确切 query/fragment 后缀的语义链接目标，以及逐字代码块在两侧一一对应。相对文档链接使用源侧语言的路径：英文侧指向 `.md`，中文侧指向 `.zh.md`。双语语料内缺失对侧是配对完整性错误，不是回退；语料外的目标保留原路径。现有 Markdown 门禁原样作用于 `.zh.md`（`verify-md-wrap`、`verify-md-links`）。

## 门禁：verify-translation-pairing

`pnpm run verify-translation-pairing`（属于 `doc-sync`）机械执行该约定：

1. 范围内的每篇文档都有完整配对。README 发现按 basename 忽略大小写。
2. 任何已存在的配对工件都完整且一致：三个文件齐全，记录规范且等于按当前内容计算的条目，中文反向链接与撰写型英文切换行存在，每个相对文档链接使用源侧语言的目标，结构签名按顺序匹配——标题深度、逐字代码块、表格行列数、列表种类、有序列表起始值、列表项数量，以及除切换行外带确切 query/fragment 后缀的语义链接目标。
3. 列为 `excluded` 的文件既没有 `.zh.md` 也没有 `.i18n.yaml`。`.agents/notes/archived/` 下的冻结 Agent Note 不在此演进门禁范围内；其专用校验器要求并封存完整的既有三文件配对。

`pnpm run verify-translation-pairing --list` 打印范围内每篇文档的当前配对状态——missing、out-of-sync 或 ok——且从不失败。`pnpm run verify-translation-pairing <pair...>` 只检查指定配对，可以用三文件中的任一文件或裸 stem 命名，因此更新循环几秒内即可验证自己的配对；无参数的全语料形式才是 `doc-sync` 运行的检查，审查时局部绿色不能替代它。

`pnpm run verify-translation-pairing --cached <pair...>` 使用暂存区字节检查指定配对。已安装的提交和自动合并提交钩子使用 `--cached --staged` 选择受暂存 Markdown 或记录变更影响的配对，包括删除和重命名。钩子不改变暂存区或未暂存的工作树；仍需执行全语料检查。

实用规则：**当变更编辑配对文档的任一侧时，同一变更在术语指导下一次性更新对侧，并用 `--write <pair>` 重新记录配对。**

门禁的局限必须直说：**绿色门禁意味着该配对在这些确切内容上被确认一致，不意味着确认本身可靠。** 它检查 hash 与 Markdown 结构；它无法判断两侧是否说了同一件事，或措辞是否准确、术语得当、行文自然——那是审查者负责的另一半合同，见 [translation-rules.md](translation-rules.zh.md)。

## 范围与排除

**范围**：根 `README.md`、`CONTRIBUTING.md` 与 `SAFETY.md`，每个非 vendor 的 README，以及 `docs/**` 与 `.agents/notes/**` 下的每篇活动文档。README 匹配按 basename 忽略大小写，并覆盖未来目录而无需再改清单。依赖与忽略的构建输出树，以及冻结的 `.agents/notes/archived/`，是发现排除项，不是演进中的翻译来源。

**排除**（从不配对，且门禁拒绝为其添加 `.zh.md` 或 `.i18n.yaml`）：

- 根 `AGENTS.md`、`docs/AGENTS.md`、`.agents/notes/**/AGENTS.md`、`packages/AGENTS.md` 以及指向它们的 `CLAUDE.md` 指令入口：agent 指令，只以英文维护。
- `.agents/skills/**`：agent 工作流定义，只以英文维护。
- `docs/i18n/terminology.md`：本身即为中英对照文档。
- [review-ownership/README.md](../../.github/review-ownership/README.md) 与 `.github/AGENTS.md`：仓库内部策略，只以英文维护。
- `.agents/notes/archived/`：冻结的历史三文件配对。[`verify-archived-agent-notes`](../../scripts/verify-archived-agent-notes.ts) 校验其完整性和内容封存记录；翻译维护绝不能重写这些文件。

`scripts/translation-pairing.manifest.json` 只包含显式排除项；不存在逐文件推出清单、日期分界或 README 专属政策类。新的范围内文档以完整配对合入。

## 分工

日常更新对侧文件时，负责处理的 agent 在术语指导下一次性直接更新；此路径不要求显式调用翻译 Skill、简报或委派。只修补已编辑侧变动的单元，保留未触及的已审措辞；不能仅为应用一次更新而整篇重译已有配对。重新定位首次出现注释，逐命题审查对侧 diff，再仅重录与检查具名已确认配对。质量、术语与签名未编码的结构要求仍归审查。本地绿色只提供实际执行范围的证据，不是远端 CI 证据。

显式调用的翻译流程区分既有配对更新与新配对。`pnpm run gen-translation-brief <pair>` 给出最后确认、当前已编辑侧与当前对侧的单元上下文；无法对齐或双侧同时变动的输入须人工 reconciliation。`pnpm run gen-translation-brief --apply <pair>` 仅当所有编辑都位于两侧原本逐字节相同的围栏内，且拼接结果通过结构验证时，写入对侧。它不是只读，也不翻译散文。审查其写入 diff 后，再运行 `pnpm run verify-translation-pairing --write <pair>` 与 `pnpm run verify-translation-pairing <pair>`。新配对才整篇翻译；删除或改名同时携带对侧与记录。只有显式 `--write --all` 才全量记录语料；不能用它掩盖未审改动。
