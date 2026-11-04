# 类型与接口：严格编译、unknown 断言与判别式

本页拥有类型系统层面的可迁移规则：§15 TypeScript 严格编译与类型感知 lint、§16 禁止新增 `as unknown` 断言与精确基线、§17 判别标签、穷尽 switch 与品牌化 id。触发：新增包/文件、修改类型、处理 `any`/非空断言/浮空 promise、调整 tsconfig 或 lint；写或搬迁 `as unknown`/`<unknown>` 断言、修类型错误、编辑 baseline；新增可辨识联合、扩展事件/内容/结果、switch 一个 tag、跨边界传 id 或导出 map。读本页前先读 [§0 使用约定与证据边界](engineering.md#0-使用约定与证据边界)。

<a id="engineering-typescript-strictness"></a>
## 15. TypeScript 严格编译与类型感知 lint（engineering-typescript-strictness）

**触发**：新增包/文件、修改类型、处理 `any`/非空断言/浮空 promise、调整 tsconfig/lint。

**角色与前置**：包作者继承共享 compilerOptions；评审者检查每个 `any` 是否有窄抑制理由；CI 负责全量。

**【源仓义务】**
- 全仓 `strict: true`、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`、`noImplicitOverride`、`noFallthroughCasesInSwitch`、`noUnusedLocals`、`noUnusedParameters`、`composite`/`incremental`。`deepseek-harness/tsconfig.base.json:5-26@687f282e`
- 每个剩余 `any` 解释为何无法收窄。`deepseek-harness/AGENTS.md:173-173@687f282e`
- Oxlint 类型感知规则为 error：`no-explicit-any`（有意 any 需窄抑制和理由）、`no-floating-promises`（agent loop 最高价值 bug 类）、`no-unsafe-*`、`no-non-null-assertion`、`no-unnecessary-condition`、`only-throw-error`、`require-await`、`switch-exhaustiveness-check` 等。`deepseek-harness/.oxlintrc.json:69-146@687f282e； deepseek-harness/.oxlintrc.json:160-182@687f282e`
- 测试文件的放宽是显式的：非空断言、unnecessary-condition、only-throw-error、require-await、restrict-template-expressions 在测试 glob 下关闭并带理由；不允许把测试放宽扩散到生产。`deepseek-harness/.oxlintrc.json:200-229@687f282e`
- 包级 tsconfig 继承共享 base，只做局部覆盖（`rootDir: src`、`outDir: lib/types`、workspace references）；`src/types.ts` 只含类型，无运行时代码。`deepseek-harness/packages/AGENTS.md:24-25@687f282e`

**步骤**
1. 从共享 base 继承；每包只设 `rootDir: src`、`outDir: lib/types`、references 和必要 face 覆盖。
2. 新增 `any` 时写窄抑制注释和理由；优先用 typed value/validation 替代。
3. 修复浮空 promise、非空断言、unsafe 调用，不要全局关规则。
4. 测试放宽只放在测试 glob，保持生产严格。
5. 运行 `typecheck` 和 `lint`；保留诊断输出。

**完成信号**：生产无未解释 `any`；类型感知规则无例外扩散；`src/types.ts` 无运行时；包 tsconfig 只做局部覆盖。

**失败处理**：若规则误报，收窄抑制到单行并写理由；不要关闭整类规则。若类型无法收窄，回到边界 validation。

**例外**：测试 glob 的放宽是源仓显式例外；合并扩展的 empty object type 被关闭（`no-empty-object-type` off）。`deepseek-harness/.oxlintrc.json:83-83@687f282e； deepseek-harness/.oxlintrc.json:200-229@687f282e`

**迁移裁剪**：目标不是 TS 时映射到等价静态检查（严格 null、未使用、穷尽 switch、浮空异步）；保留“严格默认 + 窄抑制 + 测试例外隔离”。

**证据与限制**：tsc/lint 是自动证据；它们不证明运行时行为。`any` 理由只能评审。

来源：deepseek-harness/tsconfig.base.json:5-26@687f282e 来源：deepseek-harness/.oxlintrc.json:69-146@687f282e 来源：deepseek-harness/.oxlintrc.json:160-182@687f282e 来源：deepseek-harness/.oxlintrc.json:200-229@687f282e 来源：deepseek-harness/AGENTS.md:173-173@687f282e 来源：deepseek-harness/packages/AGENTS.md:24-25@687f282e 来源：deepseek-harness/.oxlintrc.json:253-358@687f282e

<a id="engineering-no-unknown-assertions"></a>
## 16. 禁止新增 `as unknown` 断言与精确基线（engineering-no-unknown-assertions）

**触发**：写 `as unknown`/`<unknown>`、处理 parser 结果、修类型错误、搬迁/重命名断言、编辑 baseline。

**角色与前置**：改动者只能用 typed value 或 validation 替代；评审者拒绝新增文件/指纹/计数；baseline 只可删/减。

**【源仓义务】**
- 新的一手 JS/TS（含 tests、fixtures、benchmarks、scripts）禁止直接断言到 `unknown`，覆盖 `as unknown` 和 `<unknown>`、带括号目标、含直接 `unknown` 成员的 union。`unknown` 声明仍合法（如 `const value: unknown = JSON.parse(text)`），但必须进入声明的 parser 再使用。`deepseek-harness/.agents/notes/implemented/process/2026-09-19-no-unknown-casts.md:13-22@687f282e`
- 现有断言用精确 baseline：仓库相对路径 + 断言语法 token 的 SHA-256 + 出现次数。AST 命令相对于当前可信 baseline 拒绝未列/超额断言；baseline 编辑本身只可删/减，新增文件、指纹或次数由**评审者**拒绝。源实现不比较 base ref/历史 baseline，不能宣称手动扩张会被这条命令自动识别。文件级 allowance 或宽松总量预算不能授权替代债务。`deepseek-harness/.agents/notes/implemented/process/2026-09-19-no-unknown-casts.md:13-22@687f282e`、`deepseek-harness/scripts/verify-no-unknown-casts.ts:138-185@687f282e`
- `--prune` 只在没有新违规时机械删除/降低；没有任何命令可添加新例外。`deepseek-harness/.agents/notes/implemented/process/2026-09-19-no-unknown-casts.md:13-22@687f282e`
- 检查器用 TypeScript AST 扫描 tracked + 非忽略 untracked source；排除 vendor 和冻结 archived notes；忽略注释/字符串/`unknown` 声明。`deepseek-harness/scripts/verify-no-unknown-casts.ts:1-25@687f282e； deepseek-harness/scripts/verify-no-unknown-casts.ts:76-134@687f282e`
- 语法指纹对 token 变化敏感：标识符重命名、引号、尾逗号、括号变化都会使旧条目失效；仅空白/注释变化不影响。移除断言后必须 prune，否则红。`deepseek-harness/.agents/notes/implemented/process/2026-09-19-no-unknown-casts.md:31-35@687f282e`

**步骤**
1. 遇到类型不匹配，先判断是边界输入还是内部类型错误。
2. 边界输入用 `unknown` 声明 + parser/validator，输出 typed value。
3. 内部类型错误修类型或调用点，不用双重断言。
4. 若必须保留遗留断言，确保它在 baseline 精确条目内；不要新增。
5. 删除断言后运行 `--prune`，让 baseline 同步收缩。

**完成信号**：`verify-no-unknown-casts` 绿；baseline 无新增指纹/计数；没有用 `any`/helper 隐藏转换。

**失败处理**：新断言被拒时修类型或使用已有 parser。旧指纹因重命名/移动等失效时，必须先消除或重构该断言，再 prune 旧条目；不得把“更新基线”理解为新增替代指纹。基线被手动扩张时，即使命令对当前文件自洽，评审仍必须拒绝。`deepseek-harness/.agents/notes/implemented/process/2026-09-19-no-unknown-casts.md:13-35@687f282e`、`deepseek-harness/scripts/verify-no-unknown-casts.ts:138-185@687f282e`

**例外**：vendor、archived notes、`unknown` 声明、`unknown[]`/`Promise<unknown>` 等容器类型、JS JSDoc `@type` 不在语法规则内。`deepseek-harness/.agents/notes/implemented/process/2026-09-19-no-unknown-casts.md:13-35@687f282e`

**迁移边界**：有一手 JS/TS 时，自动 AST 检查、精确既有基线与只减不增的变更评审都必须保留。其他语言应先判断是否存在对应的强制断言语法及结构化分析器；不适用时保留知识，并以引入 JS/TS 或对应断言机制为再激活条件。需要该自动保证却尚无分析器时记为未实现/阻塞，不能用文本搜索或临时人工审计冒充等价门禁；人工审计只能是另列的补充证据。

**证据与限制**：源码有自动比较和只减不增的 `--prune` 实现，本次没有执行。命令通过只说明当前可信 baseline 下没有未列出的直接 `unknown` 断言；不认证 baseline 历史，不证明总体类型安全，也不解析 alias/intersection。`any`/隐藏转换 helper 的违规需要另行评审，不在这条 AST 检查的自动保证内。`deepseek-harness/scripts/verify-no-unknown-casts.ts:138-185@687f282e`

来源：deepseek-harness/.agents/notes/implemented/process/2026-09-19-no-unknown-casts.md:13-35@687f282e 来源：deepseek-harness/scripts/verify-no-unknown-casts.ts:1-25@687f282e 来源：deepseek-harness/scripts/verify-no-unknown-casts.ts:76-134@687f282e 来源：deepseek-harness/scripts/verify-no-unknown-casts.ts:138-185@687f282e 来源：deepseek-harness/AGENTS.md:146-146@687f282e

**补充来源坐标：**
- `engineering-no-unknown-assertions`：`deepseek-harness/AGENTS.md:146-146@687f282e`

<a id="engineering-discriminant-brands"></a>
## 17. 判别标签、穷尽 switch 与品牌化 id（engineering-discriminant-brands）

**触发**：新增可辨识联合、扩展事件/内容/结果、switch 一个 tag、跨边界传 id、导出 map。

**角色与前置**：类型 owner 定义 map 与 brand；插件通过 declaration merging 扩展；评审者检查 switch 是否穷尽、id 是否裸 `string`。

**【源仓义务】**
- switch 判别标签；封闭联合以 `assertNever` 结尾（新增变体在每个消费者处编译失败）；可合并扩展的联合走文档化 default。`deepseek-harness/AGENTS.md:135-135@687f282e`
- 大多数可扩展 sum type 用 `…Map → derived-union`：interface 以判别 tag 为 key，union 由 `keyof` 派生，插件用 declaration merging 加变体，不改拥有包。五个 canonical map：`ContentBlockMap`、`MessageSourceMap`、`FinishReasonMap`、`TurnEndReasonMap`、`SessionEventMap`。`deepseek-harness/docs/subsystems/core.md:358-395@687f282e`
- 跨包 id 品牌化：结构上是 string，但类型上不可互换（`SessionId` 不能传给 `ToolCallId`）；用 `brandString<T>()` 或 owner 定义的 validating factory；比较/日志/JSON 仍是普通 string。`deepseek-harness/docs/subsystems/core.md:397-408@687f282e`
- `Branded<B>` 原语与无状态构造在 `dsh-brand`，无 harness capability 依赖。`deepseek-harness/docs/subsystems/core.md:401-408@687f282e`
- 流式 `ContentBlock` 是封闭判别联合：`switch` over `type` 以 `assertNever` 结尾，新增变体破坏所有必须处理的消费者。`deepseek-harness/docs/subsystems/llm-streaming.md:169-169@687f282e`
- Oxlint `switch-exhaustiveness-check` 为 error，`considerDefaultExhaustiveForUnions: true`。`deepseek-harness/.oxlintrc.json:177-182@687f282e`

**步骤**
1. 新增变体先加到拥有 map，用 declaration merging，不改 union 文件。
2. 消费者 switch tag；封闭联合 default 用 `assertNever`；可扩展联合写文档化 default。
3. 跨边界 id 定义 `type XId = Branded<'XId'>`，构造集中在 brand 函数/factory。
4. 避免裸 string 参数；在签名、事件 payload、持久字段统一 brand。
5. 用编译器/测试验证新增变体使消费者失败。

**完成信号**：map→union 扩展无需改拥有包；封闭 switch 穷尽；跨包 id 不混用；无裸 string 表示不透明 id。

**失败处理**：若新增变体没让消费者编译失败，检查是否用了 default 吞掉；若是可扩展联合，确认 default 有文档和 owner。

**例外**：可合并扩展的联合有意走 default；`merge-extensible maps` 的 empty object type 允许。`deepseek-harness/AGENTS.md:135-135@687f282e`、`deepseek-harness/.oxlintrc.json:83-83@687f282e`

**迁移裁剪**：目标语言用 sealed union/enum + exhaustive match 映射；品牌化可用 nominal type/opaque type。保留“扩展不改中心类型 + 封闭联合穷尽 + 不透明 id 不裸传”。

**证据与限制**：编译器和 lint 是自动证据；运行时分派正确性还需测试。品牌只在编译期，运行时无保护。

来源：deepseek-harness/AGENTS.md:135-135@687f282e 来源：deepseek-harness/docs/subsystems/core.md:358-408@687f282e 来源：deepseek-harness/docs/subsystems/llm-streaming.md:169-169@687f282e 来源：deepseek-harness/.oxlintrc.json:177-182@687f282e

**补充来源坐标：**
- `engineering-discriminant-brands`：`deepseek-harness/docs/subsystems/core.md:358-408@687f282e`
