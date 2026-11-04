# 测试策略

[English](testing.md) | 中文

本仓库如何逐层测试，以及哪些规则让绿色的测试套件仍然有意义。命令见根 [AGENTS.md](../AGENTS.md)；[开发指南](development.zh.md)拥有检查选择与 TypeScript 布局。

## 层级

- **单元**（`pnpm run test`）：Vitest 运行包与应用 `tests/**` 下的 spec，以及 `scripts/**/*.spec.ts` 下的仓库脚本 spec。测试与所测代码领域放在一起。优先覆盖边界情况、错误路径、顺序、并发竞争，以及针对合同缺陷的永久回归。
- **覆盖率门禁**（`pnpm run test:coverage`）：面向包运行时代码的门禁运行。V8 覆盖率作用于 `packages/*/*/src/**/*.ts`，逐文件要求语句、分支、函数与行覆盖率均为 100%，且不设豁免。仅类型声明文件不承载运行时语义，不构成行为义务。应用由行为 spec、真实 CLI 接受/拒绝与构建入口 smoke 证明，不适用应用级逐文件 V8 阈值。未覆盖的运行时行往往是门禁提示删除的死代码，而不是需要硬补的测试。行覆盖必要但不充分：它证明行被执行过，不证明行为正确。
- **分区覆盖率**（`pnpm run test:coverage:partitioned`）：同一门禁拆分为并发分区。单次运行较慢时使用；它执行相同阈值。
- **构建产物测试**（`pnpm run test:built`）：业务所属的 `tests/**/*.built.spec.ts` 消费构建后应用或库导出；脚本所属套件拒绝缺失发布产物并接受精确恢复。这些套件仅在产物分面运行，不进入源码测试或覆盖率。它们验证产物入口，不验证源码启动器或独立 tarball 安装；打包消费者另行验证。
- **审批策略**（`pnpm run test:approval-policy`）：`.github/review-ownership` 审批与作者权重规则的 Node 测试 spec。这是继承的配置；绿色运行证明脚本，不证明远端强制。
- **审批归属**（`pnpm run test:approval-ownership`）：Python 3.10 unittest spec，用真实 Git 历史验证生产代码行归属、重命名识别、浅历史拒绝与发布器的抓取路径。夹具需要 POSIX 文件系统与可执行脚本，因此两个用例带有写明所缺能力的 Windows 显式跳过；工作流只声明 Linux runner。

复制工程树的夹具通过 `scripts/workspace-fixture.ts` 选择：当前工作树的已跟踪与非忽略未跟踪作者；已选作者消失或不可读时按路径失败；链接项跳过且不跟随；匹配忽略规则的已跟踪文件被拒绝。产物夹具按其自身选择另加各已声明 workspace 成员的 `lib/`，lint 探针只写入各自 checkout。私有数据应放在忽略范围内且位于 `lib/` 之外；未被忽略的文件及构建输出目录内的文件仍会被复制。初始化 Git 之前，导出的 `gitignore` 提供忽略规则。

## spec 如何执行

Vitest 在 fork 的 worker 中同时运行多个 spec 文件，覆盖率门禁会与其他门禁进程一起拆分为分区。只有进程被隔离：端口、可预测路径、临时文件、Git 仓库与继承的子进程都没有，所以获取的资源都要在 teardown 中释放。只有单独运行才通过的 spec 是 spec 的缺陷，而不是 runner 不稳定。[dsh-ci-test-reliability](../.agents/skills/dsh-ci-test-reliability/SKILL.md) 拥有分配、恢复、同步、超时预算、平台与 teardown 规则，其[抖动诊断流程](../.agents/skills/dsh-ci-test-reliability/references/ci-flake-diagnosis.md)对既有失败进行分类。

## 优先使用真实实现而非 mock

只 mock 昂贵或不确定的边界——网络、时钟或远端 Git 主机——并让下游一切保持真实。通过仅测试使用的 `file` 传输访问的本地仓库带有真实 ref 与对象；手写的抓取器只证明桥接能搬字节，不证明发布的读取器如断言般工作。

校验器是纯库：用真实 JSON 值与真实解析器测试它，并让应用针对真实校验器运行而非 mock `parseMarketIndex`，这样格式规则与生成器规则才不会漂移。

## 验证世界，而非自述

端到端断言从被测代码之外重新读取输出文件、图标目录或缓存。只检查返回对象或日志行的测试会让生产者声称成功却没有写出任何东西。断言未触及文件字节不变；断言第二次运行不重写任何内容；断言被拒绝的来源保留其上一次成功条目。

测试拥有自己的资源：临时目录在 teardown 中删除，即使发生失败或重试。共享 fixture 放在普通 `tests/support.ts` 中，而不是另一个 `*.spec.ts`，因为导入它会重复注册其 `describe` 与副作用。

## 测试真实入口路径

- 通过真实解析器测试 CLI 参数解析：缺少必需选项、无效列表行、过大的内联图标阈值与无效输出路径必须以 `2` 退出而不是抛出。
- 已发布入口是构建产物：`apps/plugin-market-generator/lib/types/bin.js` 以纯 Node 运行，暴露 `tsx` 会掩盖的失败，例如包导出解析或过期声明。构建后保持构建产物的 smoke 为绿色。
- 只有回归会让断言失败，守卫才成立。引入回归，观察测试变红，再回退。前后都通过的测试不守卫该行为。
- 缺失配置应响亮失败：没有可读输入文件或缺少必需标题的生成运行会以非零状态退出并给出可操作信息。

## 测试解析：仅源码面

源码面的 Vitest 配置把 vite-tsconfig-paths 指向 `tsconfig.base.json`；workspace 裸导入解析到 `src`，从不经过包的 `exports` 进入构建后的 `lib/`。那里的过期产物会加载模块单例的第二份副本。构建产物配置刻意不加载源码别名插件。构建产物只被显式消费：`start:built`、`test:built` 与构建包 smoke 测试。

## 子进程启动方式

- 测试与源码启动器通过 `tsx` 运行 TypeScript，使根 `paths` 映射生效。
- 构建后的应用以纯 Node 运行 `lib/types/bin.js`，不加载 TypeScript loader。
- Git fixture 针对临时仓库运行真实 `git` 二进制；不要求 SSH，仅测试使用的 `file` 传输是显式的。源码路径测试可以选择 `src`，并在测试中说明该合同。

<a id="documentation-compilation"></a>
## 文档编译

`pnpm run doc-typecheck` 按 workspace API 编译 `ts` 围栏；它不执行示例，也不替代行为测试。语料是根 README、文档、包内 Markdown 与非归档 Agent Note。配对 `.zh.md` 中逐字节相同的围栏代码块复用同伴的检查；有变化的译文代码块独立编译。`ts ignore-check` 表示不检查的示意代码，具备编译资格的代码块至少有四个时，退出比例超过 50% 会失败。归档 Agent Note 保持排除，而不是待修复。[开发指南](development.zh.md#verify-a-change)拥有准备与调度；`test:docs` 无需构建且不包含此编译器。

## 仓库引用检查

`verify-doc-refs` 检查 `packages/**/*.ts` 中引用的仓库根相对文档路径，`verify-package-paths` 检查其中的包路径。两者都不覆盖所有 app 或 script 源码，因此引用门禁全绿不代表所有源码字符串都已检查；应用说明文字仍是语义审查义务，并以真实入口检查为据。Markdown 链接在根目录、`docs/`、`apps/`、`packages/`、`scripts/`、`.agents/` 与 `.github/` 语料范围内检查。

## Workspace export键

`pnpm run verify-package-export-keys`是模板新增的辅助检查，覆盖已声明的`packages/*/*`和`apps/*` workspace成员。库必须提供export map，app可以省略；检查拒绝标准集合及登记新增项以外的键，也拒绝键或成员已不存在的新增登记。[政策manifest](../scripts/package-export-keys.manifest.json)拥有受检键集合和新增记录；[包规则](../packages/AGENTS.md)拥有键的仓库级含义及新增键流程。

manifest中的登记不能证明domain owner已经确认；评审仍须核对必要性、共享语义与确认。来源归属记录在[SOURCE-LICENSE.txt](../SOURCE-LICENSE.txt)。

## 覆盖率与排除项

覆盖率门禁不设产品文件豁免：受环境限制的行是让代码可测试或删除它的理由，而不是豁免该文件的理由；没有应用文件仅为抬高数字而加入 V8 阈值。分区改变调度，不改变阈值。完整本地门禁集合是 `pnpm run check:all`；CI 通过 `check:ci` 运行已注册的组。

<a id="conditional-evidence"></a>
## 条件性证据

涉及 harness double、浏览器 UI、生成客户端、迁移 oracle、授权环境、真实 API 录制、平台或性能声称时，读取[条件性测试证据](testing-conditional.zh.md)。只选择已触发证据，说明各工具限制，保留失败与缺失权限，不宣称更广通过。
