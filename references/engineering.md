# 工程域治理迁移参考（engineering）

本文件是 DeepSeek Harness 固定提交 `687f282e8625c6b8d11ff58211a90524be2e4317` 中“工程实现治理”的领域入口：它只保留使用约定、证据边界和按触发点查找专题页的索引。结构约束、类型安全、生命周期、包边界、配置组合、源/产物平面、产品/实验隔离与防御性模式的完整正文分别在下列专题页，每页拥有自己的原节，本文件不复制。

引用格式为 `deepseek-harness/<path>:<start>-<end>@<commit>`；本域实际提交为 `687f282e8625c6b8d11ff58211a90524be2e4317`。每个机制只在一个专题页拥有正文，并带稳定锚点，按锚点定位即可。原 §38–§40 的完整正文与迁移边界在 [engineering-migration-and-scope.md](engineering-migration-and-scope.md)。

## 0. 使用约定与证据边界

- **【源仓义务】**：源仓明确要求或由源码门禁执行的内容。迁移时默认保留；只有原文给出例外或审批路径时才可偏离。
- **【迁移设计】**：为了让机制在另一个仓库可运行而补充的步骤、命名或接线。它不声称源仓已有同样实现。
- **【建议】**：可选强化，不构成源仓义务。
- **证据状态**：本参考作者只做静态源码阅读，未运行源仓的任何构建、测试、lint、formatter 或远程 CI。凡涉及“验证”的文字都是迁移后必须执行并留证的动作，不是已经通过的结果；本页不持有任何已执行证据。
- **适用性参数**：源仓的技术选择（Cordis、pnpm、TypeScript、Vite、Electron、Python SDK）不是治理目标本身。迁移时按“机制效果”映射到目标工具链；无法映射时保留规则和再激活条件，不要用更弱的手工评审冒充自动保证。
- **迁移裁剪的边界**：各专题页每节的“迁移裁剪”只说明如何映射实现，不构成对源仓义务的豁免。目标缺少某项设施时，必须把它列为前置条件、实现等价物，或在迁移记录中明确阻塞；不得把“没有工具”写成“不适用”。每项裁剪都要记录保留的义务、替代证据、缺口、批准人和再激活触发。
- **最小可信单元**：每条机制都记录触发条件、义务、角色、步骤、执行方式、失败表现、例外、迁移策略和限制。只有“自动门禁 + 失败样例”才可声称自动保证；只有“评审清单”则明确标为人工保证。

## 触发索引：先读哪一页

| 你现在要做的事 | 先读（专题页与原节） |
|---|---|
| 改根/子树 `AGENTS.md`、`CLAUDE.md`、Agent Note、README 或 `docs/` 页面；同一规则多处复述；文档超预算；准备提交/推送/PR 或声称“完成”；写导出 JSDoc 与契约措辞；留 `TODO`/`FIXME`；提取共享 helper 或发现复制粘贴 | [engineering-workflow.md](engineering-workflow.md) §1、§2、§34、§36、§37 |
| 新增跨包行为或改 `packages/`、agent loop；设计能力缝或决定拆包；实现注册、unload/HMR/teardown；设计异步结果与公共 API 返回值；引入共享缓存/单例或实现顺序清理 | [engineering-architecture-lifecycle.md](engineering-architecture-lifecycle.md) §3–§7 |
| 新增配置字段；编辑 `cordis.yml`/profile/bundle/preset 或测试 Loader fixture；新增应用/CLI/`bin`/root script/SDK 入口；读取可选服务；新增事件或选择分派模式 | [engineering-runtime-composition.md](engineering-runtime-composition.md) §9–§11、§13、§14 |
| 设计失败、恢复、重试或用户可见错误；决定运行时校验边界与敌意输入测试；spawn 子进程、写临时文件、配置凭据承载的 HTTP/redirect | [engineering-failure-and-trust.md](engineering-failure-and-trust.md) §8、§18、§21 |
| 改公共类型、接口、默认值或错误行为；改 tsconfig/lint；写/搬迁 `as unknown`；新增可辨识联合、穷尽 switch 或品牌化 id | 先按[调用方与检查图](engineering-workflow.md#engineering-check-selection)追所有消费者，再读 [engineering-types-and-interfaces.md](engineering-types-and-interfaces.md) §15–§17；源码/声明/安装面另读[模块平面](engineering-module-surfaces.md#engineering-source-artifact-plane) |
| 改插件导出或 `/client` 子路径、package.json、构建输出；改 tsconfig/Project Reference；新增 Node loader `resolve` hook；包源码出现模块级 `await` | [engineering-module-surfaces.md](engineering-module-surfaces.md) §12、§22–§24、§26、§27 |
| 新增/修改/提升依赖、修 dependency scan；新增或移动 `packages/<group>/<pkg>`；experimental 包与默认产品隔离；手写协议/解析/重试或评审“Not Invented Here” | [engineering-dependencies-and-classification.md](engineering-dependencies-and-classification.md) §25、§28、§29、§35 |
| 声称性能中性/优化或新增 benchmark；迁移、包拆分、移动代码后判断可观察行为是否保持 | [engineering-change-evidence.md](engineering-change-evidence.md) §19、§20 |
| 写/评审客户端组件、slot、store、hook；新增 client domain 或改 shared layer；新增 `@Remote`；读 Session 或改会话渲染/流式 | [engineering-client-and-conversation.md](engineering-client-and-conversation.md) §30–§33 |
| 把本域机制应用到目标仓库；判断证据是否算数；引用跨域 owner 而不复制其规则；确认未审阅范围 | [engineering-migration-and-scope.md](engineering-migration-and-scope.md) §38–§40 |

原 §1–§40 的正文已全部迁出，本文件不保留旧锚点别名；引用请直接指向表中的专题页片段。
