# 失败与信任边界：错误所有权、入站校验与不受信外部输入

本页拥有失败如何被类型化、上报，以及边界输入何时可信：§8 错误处理（类型化失败、所有权与可见报告）、§18 类型信任与验证边界、§21 不受信边界（子进程环境、临时路径与凭据重定向）。触发：设计/评审失败、恢复、重试、后台任务或用户可见错误，或发现空 `catch`；决定是否加运行时校验与敌意输入测试，处理 JSON/YAML/模型输出/文件/worker/进程/网络输入；spawn 命令、写临时/溢出文件、清理 link-shaped path，或配置凭据承载的 provider HTTP 客户端与 redirect 策略。读本页前先读 [§0 使用约定与证据边界](engineering.md#0-使用约定与证据边界)。

<a id="engineering-error-handling"></a>
## 8. 错误处理：类型化失败、所有权与可见报告（engineering-error-handling）

**触发**：设计/评审失败、恢复、重试、后台任务、用户可见错误报告、空 `catch`。

**角色与前置**：API owner 在文档中定义失败类型、处理/报告 owner、containment 与保证；实现者不得只记日志就声称恢复。

**【源仓义务】**
- 预期失败需要声明类型、稳定判别值、与处理相关的细节；复用包内错误约定，保留 cause，机器身份与展示文本分离；绝不通过解析 message 路由。意外缺陷（如 `assertNever`）可以是普通 `Error`，但 containment 不能把它变成成功。`deepseek-harness/.agents/skills/dsh-error-handling/SKILL.md:10-12@687f282e`
- 对每个失败定义处理/报告 owner、containment 和保证：有效不变量、缺失/部分/已提交/未知副作用、清理责任。后台工作同样适用。`deepseek-harness/.agents/skills/dsh-error-handling/SKILL.md:14-18@687f282e`
- 捕获只限制异常传播，不修复已发生的 mutation。只有受影响状态的 owner 能建立安全继续；否则停止依赖工作、丢弃无效状态/实例或升级。日志不是恢复；重试需要安全重复、取消和显式 owner；有限操作需要预算，持续监督需要生命周期 owner 和可观察降级。`deepseek-harness/.agents/skills/dsh-error-handling/SKILL.md:16-18@687f282e`
- 最终报告需要可读摘要、受影响操作、安全下一步；有应用 locale 时通过其 locale 机制本地化；用户可见文本不含敏感内部细节。未知/不可信状态必须通过 UI 或默认开启的可访问日志可见，报告影响、不确定性、系统处置和安全下一步；持久无效状态需要持久可见。没有保证时不得声称成功、回滚或安全重试。报告失败需要独立 fallback。`deepseek-harness/.agents/skills/dsh-error-handling/SKILL.md:20-26@687f282e`
- 空 `catch` 必须命名错误和原因，`try` 只含一条语句。`deepseek-harness/AGENTS.md:149-150@687f282e`
- dispatcher 必须隔离 listener 异常；listener owner 仍要处理被修改状态。`deepseek-harness/docs/defensive-patterns/general.md:198-211@687f282e`

**步骤**
1. 定义错误类型/判别值和细节字段；写清可重试性、取消、幂等性。
2. 标出处理 owner 与报告 owner；说明失败后哪些状态已提交/部分/未知。
3. 选择 catch/recover/stop；若不能建立安全继续，停止依赖工作并丢弃无效状态。
4. 写用户/日志报告，含摘要、操作、安全下一步和未知性。
5. 用“验证结果状态与可见结果”的测试，不只断言异常被捕获。

**完成信号**：没有 message 解析路由；失败后状态可命名；用户看到可行动报告；日志不是唯一恢复；空 catch 有理由。

**失败处理**：若无法保证回滚/重试，明确报告“未知/不可安全重试”；不要用 fallback 把失败变成成功。

**例外**：`assertNever` 等意外缺陷可保持普通 Error；非 Error throw 只在测试中允许。`deepseek-harness/.oxlintrc.json:220-225@687f282e`

**迁移裁剪**：映射到目标语言的 Result/Exception 分类和日志/UI 通道；保留“owner + 状态保证 + 可见性”三要素。没有 UI 的库至少提供结构化错误和调用者可见的失败语义。

**证据与限制**：评审是主要保证；测试可验证状态与报告。仅“有错误类型”不等于处理正确。

来源：deepseek-harness/.agents/skills/dsh-error-handling/SKILL.md:10-26@687f282e 来源：deepseek-harness/AGENTS.md:149-150@687f282e 来源：deepseek-harness/docs/defensive-patterns/general.md:198-211@687f282e 来源：deepseek-harness/.oxlintrc.json:220-225@687f282e

**补充来源坐标：**
- `engineering-error-handling`：`deepseek-harness/.agents/skills/dsh-error-handling/SKILL.md:10-26@687f282e`

<a id="engineering-typed-boundaries"></a>
## 18. 类型信任与验证边界（engineering-typed-boundaries）

**触发**：决定是否加运行时校验、fallback、敌意输入测试；处理 JSON/YAML/模型输出/文件/worker/进程/网络。

**角色与前置**：边界 owner 在进入系统处校验；内部同进程调用信任静态类型；评审者拒绝为满足静态接口而加的无用防御。

**【源仓义务】**
- 在**有类型的同进程边界**信任 TypeScript：不要仅为静态接口要求的值添加运行时校验、fallback 行为或敌意输入测试。`deepseek-harness/AGENTS.md:145-145@687f282e`
- 在这些边界校验：parser/config、排队输入、模型/工具 JSON、durable/file、worker、进程、wire。`deepseek-harness/AGENTS.md:145-145@687f282e`
- 公共契约两侧归一化（内部 throw/terminal chunk → 公共只暴露归一化形式），让消费者仅凭公共 API 命名失败来源。`deepseek-harness/docs/defensive-patterns/general.md:13-18@687f282e`
- 决策要在执行它的操作里强制：schema omission、prompt filtering、facade、wrapper、listener order 在直接/替代调用者可绕过时都不是强制；通过 executor 测试 denial。`deepseek-harness/packages/AGENTS.md:16-16@687f282e`
- 对完整结果应用边界：byte/token/item/time 限制要在完整 emitted/retained value（含 wrapper/metadata）已知处执行；测试极小/精确限制、超大单 chunk、多字节 byte 限制。`deepseek-harness/packages/AGENTS.md:18-18@687f282e`

**步骤**
1. 标记每个数据入口是否跨信任边界。
2. 边界输入声明为 `unknown`/raw，交给 parser/validator；输出 typed value。
3. 内部接口不重复校验；若需要校验，说明它防的是哪个边界失败。
4. 把限制放在能看到完整结果的位置，测试边界值。
5. 拒绝“只在 facade 里判断”的强制；把判断放进真正执行操作的地方。

**完成信号**：每个校验都能对应一个边界；内部调用无防御性 fallback；denial 通过 executor 测试；限制覆盖完整结果。

**失败处理**：若不确定输入是否跨边界，先画数据流；不要用 `??` 把未知变默认。若安全策略在 wrapper，移到执行器。

**例外**：可信的进程内、无外部输入代码不受“必须校验”约束；但仍受类型与契约约束。

**迁移裁剪**：映射到目标语言的 decoder/schema 边界；保留“边界列表”和“内部信任”。没有动态输入的库可以只保留边界分类，但要记录“为什么当前没有 parser/IO/wire”以及分类清单；一旦引入动态输入，恢复完整边界验证与拒绝样例，不能把“当前无输入”当成永久豁免。

**证据与限制**：评审为主；边界测试可补充。类型系统不覆盖运行时输入，运行时校验也不证明业务正确。

来源：deepseek-harness/AGENTS.md:145-145@687f282e 来源：deepseek-harness/docs/defensive-patterns/general.md:13-18@687f282e 来源：deepseek-harness/packages/AGENTS.md:16-16@687f282e 来源：deepseek-harness/packages/AGENTS.md:18-18@687f282e

<a id="engineering-untrusted-subprocess"></a>
## 21. 不受信边界：子进程环境、临时路径与凭据重定向（engineering-untrusted-subprocess）

**触发**：spawn 命令、写临时/溢出文件、清理 link-shaped path；配置凭据承载的 provider HTTP 客户端或 redirect 策略。

**角色与前置**：执行器 owner 清洗 env、使用私有目录和独占打开；清理代码区分 link 与真实目录；provider owner 在 HTTP 客户端层关闭自动 redirect，安全评审确认覆盖所有 credentialed provider。

**【源仓义务】**
- spawned command 得到清洗过的 env（丢弃 `*KEY*`/`*SECRET*`/`*TOKEN*`/`*PASSWORD*`），防止 harness 凭据泄漏到 output、`env`、spill 文件。`deepseek-harness/docs/defensive-patterns/general.md:212-217@687f282e`
- 临时/溢出文件用私有（0700）目录、随机名、独占 owner-only 打开（`'wx'`、`0o600`）；可预测、world-readable 路径会招来 symlink race 和泄露。`deepseek-harness/docs/defensive-patterns/general.md:212-217@687f282e`
- 可能是 symlink 或 Windows junction 的路径，用 `lstatSync().isSymbolicLink()` 然后 `unlinkSync`：unlink 只删链接、拒绝真实目录，不会跟随到目标。Windows `rmSync(link)` 对 junction 抛 `ERR_FS_EISDIR`；递归删除可能穿过链接到目标。递归 `rmSync` 只用于已知真实目录。`deepseek-harness/docs/defensive-patterns/general.md:218-222@687f282e`
- 凭据承载的 provider 请求必须在 HTTP 客户端层配置为“跟随任何 redirect 之前失败”。回归必须证明 redirect 目标未被联系，并证明每个 credentialed provider 都 opt-in 该策略。配置的 endpoint 必然收到初始请求；本条防的是凭据/请求数据被自动转发到另一 origin，不是配置 endpoint 自身被攻陷。`deepseek-harness/packages/web/AGENTS.md:1-5@687f282e`
- 测试/进程资源 owner：spec 并发运行，每个 port/path/child process 通过 teardown 拥有；只在单独运行时通过的 spec 是缺陷。`deepseek-harness/packages/AGENTS.md:20-20@687f282e`

**步骤**
1. 列环境变量白名单/黑名单；spawn 前构造清洗 env。
2. 临时目录用 0700 + 随机名；文件用独占创建 + 0600。
3. 删除前 `lstat`；link 用 unlink，真实目录才递归。
4. 为泄漏/符号链接/并发写测试。
5. 为 credentialed provider 关闭自动 redirect，并测试目标 origin 未被联系、所有 provider 都采用该策略。

**完成信号**：子进程无凭据；临时路径不可预测；删除不跟随链接；测试可并发；credentialed 请求不自动跨 origin。

**失败处理**：若必须传凭据，通过受限 fd/环境白名单并说明；不要 `...process.env` 全量继承。

**例外**：可信、进程内、无外部输入的代码不受该规则约束；但它仍受最小权限建议。

**迁移裁剪**：映射到目标平台的安全临时文件 API；Windows 需单独处理 junction。保留判定“路径是否可预测/可替换”和“删除是否跟随链接”。任何带凭据的 HTTP provider 都要在客户端层关闭自动 redirect；若目标 HTTP 栈不能关闭，必须换成能关闭的栈或在请求前显式拒绝，不能只靠“不配置 redirect”的默认值。

**证据与限制**：评审为主；安全测试可补充。未发现泄漏不等于没有竞争；redirect 目标未被联系需要真实 HTTP 回归，不能由配置代码推断。

来源：deepseek-harness/docs/defensive-patterns/general.md:212-222@687f282e 来源：deepseek-harness/packages/AGENTS.md:20-20@687f282e 来源：deepseek-harness/packages/web/AGENTS.md:1-5@687f282e

**补充来源坐标：**
- `engineering-untrusted-subprocess`：`deepseek-harness/docs/defensive-patterns/general.md:212-222@687f282e`

<a id="engineering-proxy-transport"></a>
## 代理transport归属与位置限定的直连例外

HTTP代理、证书和dispatcher配置由单一transport owner拥有。来源绑定为packages/util/http-proxy/：只有该包可构造undici Agent／ProxyAgent／EnvHttpProxyAgent，或提供dispatcher属性；其他包及应用走其proxyRouteFor门面，不能通过重命名导入、命名空间访问、动态import解构或shorthand绕过。

确需绕过代理时，在违规表达式本行或上一行写proxy-exempt: <理由>；只豁免该位置，不扩成整个语句、文件或包。评审者逐条判断理由是否真实且必要，机械门只证明标记存在。目标可绑定自己的等效owner和位置标记，但不得丢失单一归属、窄例外及独立语义评审。

源扫描只覆盖packages/*/*/src/**/*.ts和apps/*/src/**/*.ts，空语料抛错；识别任意对象字面量的dispatcher属性（含shorthand／引号键），不只fetch参数，因此存在非请求对象误报。不覆盖tsx／mjs／cjs、生成JS、测试、第三方内部、自定义fetch或环境变量绕行；目标按真实源码集合接入，不能用旧glob漏扫当不适用。

验收包括owner合法构造、别名／动态import及三种属性写法的违规拒绝、位置例外只对单处生效、改用统一门面后恢复。违规给file:line、行为与修正建议；检查成功不证明豁免理由正确或运行时代理必达，须有实际代理路径验证。

来源：`deepseek-harness/scripts/verify-no-bare-dispatcher.ts:1-226@687f282e`、`deepseek-harness/scripts/verify-no-bare-dispatcher.spec.ts:1-143@687f282e`。本产品未提供该静态执行器；触发责任由目标真实检查和评审落实，不因缺工具豁免。
