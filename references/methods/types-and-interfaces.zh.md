<a id="baseline-types"></a>
# 类型、接口与可导入模块


本节是综合方法的一页：解释类型、接口与可导入模块这一变更面；逐项来源与覆盖见[来源与覆盖](sources-and-coverage.zh.md)。

接口变更的第一个风险不是“函数改错了”，而是“只改了一个局部，其他程序仍按旧形状调用”。TypeScript 的严格检查之所以有价值，是因为它把仓库内可静态到达的消费者一起放进编译图；只让包源码通过、却不编译测试和仓库脚本，仍会漏掉读取声明文件的第二类程序。这里的“全部消费者”首先是同一仓库里能被编译器找到的调用方；动态拼装、跨进程或外部消费者要靠检索、契约测试或发布说明补齐，编译器不能替它们作证。

第二组规则处理绕过编译器检查的捷径。把不匹配的值先断言为 `unknown` 再转目标类型，会跳过兼容性检查、把错误推迟到运行时；源禁止新增 `as unknown` 或 `<unknown>`，已有断言基线只能保持或减少，保留的 `any` 必须说明为什么无法收窄。判别联合则相反：新增一个分支时，编译器应当指出所有尚未处理它的位置，因此闭合联合用 `assertNever`，而可通过声明合并扩展的联合必须有写明理由的默认处理。不同用途的 opaque ID 不能因为底层都是字符串就互换；跨边界使用 branded type，函数参数保留具体 ID 类型。

第三组规则约束可导入性和公共符号的说明质量。包源码的模块顶层 `await` 会阻塞导入并使初始化失败表现为加载失败；异步初始化放进显式函数或按规则排除的可执行入口，并处理失败。公共符号写非显然的使用要求，函数类导出按适用规则说明参数、返回值、失败、时序和资源责任；继承成员、插件协议槽和构造器的说明留在声明它们的归属处。lint 在本地暂存检查与 CI 完整检查之间共用规则，自动修复后仍要确认提交语义。跨文件重复不得超过源配置门槛；是否属于同一职责、怎样抽取仍须人工判断，不能为了减少重复制造错误抽象。文件卫生减少无意义 diff，期望输出命名则帮助防止漏跑。

下表把每条的触发、义务、失败机制、责任与验证放在一起。门禁名称是源仓已有的自动证据；没有运行它们时，只能把它们当作待建立或待观察的检查，不能写成目标已通过。

| 原条 | 触发与义务 | 失败机制与责任 | 验证、例外与迁移边界 |
|---|---|---|---|
| 1.01 改了接口，所有调用方一起改 | 公共 API 或返回类型变化时，同一变更内更新仓内每个消费者；类型检查无错误。 | 只改函数本身，其他包仍用旧参数或旧返回值。接口 owner 负责迁移；编译器找不到的动态/外部消费者由作者补充检索或契约测试。 | pre-push `typecheck`；单包编译不能证明全部消费者已更新。编译器也不能证明运行期字符串调用、跨版本外部调用，需要额外证据。 |
| 1.02 包能编译，还要检查测试和脚本 | 最新 `build:artifacts` 之后执行 `build:check`，或执行完整 `build`；测试和仓库脚本要对最新声明编译。 | 包产物生成成功，但测试 helper 仍按旧声明构造参数；这类程序不在包源码编译范围内。测试/脚本 owner 负责修正。 | `build:artifacts -> build:check` 或 `build`。只跑包源码 `tsc` 不算完成。没有“产物/消费者”两阶段的仓库，应映射为对全部消费程序的完整类型检查，而不是跳过。 |
| 1.03 不用新增 `as unknown` 掩盖不匹配 | 修改 TypeScript 时不新增 `as unknown`/`<unknown>`；已有基线只减不增；保留 `any` 说明无法收窄的理由。 | 双重断言跳过结构匹配，错误推迟到运行时。作者写理由，评审判断理由是否成立。 | `verify-no-unknown-casts` 加评审；不能只比较净增数量而容许新增断言。迁移先判断目标是否存在相应类型逃逸能力；有能力但缺检查是缺口，不强制无此能力的语言仿造该语法。 |
| 1.04 新增联合分支不能漏处理 | 增加或修改带判别字段的类型及其处理逻辑；闭合联合 switch 用 `assertNever`，可声明合并扩展的联合用有说明的默认处理。 | 新状态被静默当成 `succeeded`，或某个消费者漏更新。类型 owner 与各处理方共同负责。 | 类型检查加评审。必须区分闭合联合与开放联合：给闭合联合加静默默认会掩盖漏分支；开放联合的默认分支要写明为什么可接受。 |
| 1.05 不同用途 ID 不能混用 | 跨边界的 opaque ID 使用 branded type；函数参数保留具体 ID 类型。 | 会话、任务、用户 ID 都是 `string`，传错后通常到查询或写入时才暴露。领域/接口 owner 定义 brand。 | 编译检查加评审。只要求边界 brand，不要求把所有局部字符串都包装；否则会增加无意义转换。 |
| 1.06 同一份代码遵守同一套 lint | 暂存代码与 CI 代码遵守同一仓库配置；自动修复后确认实际提交内容。 | 两侧规则分叉，或自动修复改变语义却直接提交。lint owner 维护共享配置。 | pre-commit 检查暂存文件，CI 检查完整适用语料；源的 staged 专用入口是范围优化，不是第二套规则。 |
| 1.07 重复实现不能无限复制 | 增加或复制 TypeScript 实现时，跨文件重复不超过配置门槛；确属同一逻辑时考虑由一处维护。 | 修一份漏另一份，行为逐渐分叉。作者与评审判断真实职责。 | CI 的 `duplication`/jscpd 执行门槛，不只是提示；阈值是源参数，低于阈值不证明无重复，重复也不自动证明应该抽象。 |
| 1.08 模块顶层不能有 `await` | 可导入包源码不在模块顶层 `await`；异步初始化放进显式函数或入口，并处理失败；已声明的可执行入口按专门排除规则处理。 | 导入即挂起或抛出，调用方无法选择初始化时机；浏览器 worker 的构建形式也会受影响。包 owner 负责生命周期边界。 | `verify-no-top-level-await`；检查发布源码，测试 fixture 与可执行入口的排除差异要核对。没有该语法时映射为“导入无不可控副作用”。 |
| 1.09 公开函数写类型表达不了的要求 | 模块与导出写非显然使用要求，函数类导出按规则写参数、返回值、失败、时序、资源责任；继承成员、协议槽和构造器复用声明归属的说明。 | 消费者不知道失败和清理责任。API owner 写，评审核对语义。 | `verify-export-jsdoc`/`doc-sync` 检查存在与结构，不判断内容准确性；不是要求每个非函数符号机械添加 `@param`/`@returns`。 |
| 1.10 末尾换行与期望输出命名 | 文件以一个换行结束，暂存 diff 通过空白检查；预期输出文件遵守命名约定。 | 无意义差异干扰审阅，不合命名可能导致漏跑。作者与 CI owner 负责。 | `git diff --cached --check`、Expected filenames 工作流。命名是源约定；目标若保留相同测试发现机制，应核对其命名，不强加相同文件名。 |

第一方定位：[AGENTS.md:92–97](https://github.com/deepseek-ai/deepseek-harness/blob/687f282e8625c6b8d11ff58211a90524be2e4317/AGENTS.md#L92-L97)、[AGENTS.md:120](https://github.com/deepseek-ai/deepseek-harness/blob/687f282e8625c6b8d11ff58211a90524be2e4317/AGENTS.md#L120)、[AGENTS.md:129–176](https://github.com/deepseek-ai/deepseek-harness/blob/687f282e8625c6b8d11ff58211a90524be2e4317/AGENTS.md#L129-L176)、[lefthook.yml:17–25](https://github.com/deepseek-ai/deepseek-harness/blob/687f282e8625c6b8d11ff58211a90524be2e4317/lefthook.yml#L17-L25)、[lefthook.yml:46–49](https://github.com/deepseek-ai/deepseek-harness/blob/687f282e8625c6b8d11ff58211a90524be2e4317/lefthook.yml#L46-L49)、[docs/development.md:57–99](https://github.com/deepseek-ai/deepseek-harness/blob/687f282e8625c6b8d11ff58211a90524be2e4317/docs/development.md#L57-L99)。现有参考：[严格类型与消费方](../engineering-types-and-interfaces.md#engineering-typescript-strictness)、[检查选择](../engineering-workflow.md#engineering-check-selection)、[禁止 unknown 断言](../engineering-types-and-interfaces.md#engineering-no-unknown-assertions)、[判别联合与 brand](../engineering-types-and-interfaces.md#engineering-discriminant-brands)、[去重](../engineering-workflow.md#engineering-duplication)、[顶层 await](../engineering-module-surfaces.md#engineering-no-top-level-await)、[JSDoc](../engineering-workflow.md#engineering-jsdoc-prose)、[提交前证据与钩子](../collaboration.md#pre-push-evidence)、[文件卫生](../engineering-workflow.md#engineering-instruction-tiers)、[期望输出放置](../testing-replay-and-oracles.md#m28-expected)。
