# Node/TypeScript 治理模板合同

[English](template-design.md) | 中文

本页拥有 Node/TypeScript 模板绑定及验收合同，不记录执行进度。模板根为 `templates/node-typescript/`，独立于产品根 npm workspace。它是来源派生的工程树，内置完整且可替换的插件市场示例，而非空骨架。复制来源与改动记录随 `SOURCE-LICENSE.txt` 一起分发。

## Workspace与运行合同

| Owner | 职责与公开入口 | 允许依赖 |
|---|---|---|
| `apps/plugin-market-generator`，`@deepseek-ai/dsh-plugin-market-generator` | 源清单生成经校验的格式1索引与图标；`src/bin.ts` → `src/cli.ts`，退出`0`已写出、`1`来源不可读、`2`参数或清单非法 | 验证器包 |
| `packages/util/plugin-market-index`，`@deepseek-ai/dsh-plugin-market-index` | `parseMarketIndex`、`marketInstallTarget`、`MarketIndexError`及记录类型；仅根导出，不做I/O | 声明的npm解析库 |
| 模板`scripts/` | 门禁图、覆盖率分区、构建编排、文档与Note执行器 | 显式开发依赖 |

应用依赖包，反向永不成立。生成是确定的：条目按归一化后的源顺序排列，相同输入产生相同字节，缓存只在输入身份相同时复用；来源不可读时，若存在当前缓存格式的有效记录则复用其上一次成功条目。应用读取远端数据但从不执行包代码。

数据规则归格式合同而不归本页：[格式Agent Note](../templates/node-typescript/.agents/notes/implemented/feature/2026-10-02-plugin-market-index-format.md)定义格式1，`packages/util/plugin-market-index/src/types.ts`拥有经校验的记录类型。生成器在写盘前用该包校验每份成品文档；未知`source.type`、未声明的metadata引用、重复插件名或版本、缺失或无效的`engines.dsh`，或无效的发布标签目标会拒绝整份文档。

## 直接作为新项目起点

导出工程的新项目教程（[English](../templates/node-typescript/docs/cookbook/starting-a-project.md) | [中文](../templates/node-typescript/docs/cookbook/starting-a-project.zh.md)）拥有环境准备、完整示例替换闭包与项目参数。日常治理随工程树交付；外部采用 Skill 不是第二规则源，也不用于修补缺失接线。

包发现归 pnpm 声明成员。源码别名使用实际包名与目录，而不是示例前缀；根 manifest 拥有共享版本与许可证。经审查的启动器、子系统、typed-import、翻译及仓库引用分类归 `scripts/project-policy.ts`；运行时导出分类仍归 `scripts/package-dependency-policy.ts`。业务产物 spec 归所属应用与库，仅在构建产物分面发现。稳定钩子协议与来源声明不是业务参数。

不同业务起步的验收还须从实际 tarball 取得工程，完整替换示例，完成首次与后续功能、真实跨模块变化、打包消费，并由另一执行者仅凭公开项目材料接续。保留首次失败与作者干预；默认示例 smoke 或此前有限开发案例不能建立这一结论。


## 工具链与源码／产物平面

模板通过Corepack固定pnpm 11.28.5，按其manifest声明要求Node `>=24 <25`，并在自身`pnpm-lock.yaml`中锁定TypeScript、tsdown、vitest、oxlint、jscpd与publint。当前脚本与门禁清单归模板manifest；本页不重复。其CI工作流只声明Linux runner；未被观察前不算通过。

源码为ESM并使用显式`.ts`相对导入。源码测试与`pnpm start`通过根`paths`映射把workspace名称解析到`src`，经Vitest或tsx运行。`pnpm run build`为每个包产出`lib/`与声明；`pnpm start:built`及所有打包消费者读取指向`lib/`的根`exports`。源码平面模块可以使用普通Node无法执行的TypeScript语法，但打包合同永不包含源码子路径。忽略规则把`node_modules/`、`lib/`与`coverage/`排除在作者树之外。因npm会省略任意层级的`.gitignore`，每份忽略文件均以`gitignore`作为作者文件名；导出在原目录逐字节恢复`.gitignore`，包括Skill元数据与审查归属缓存规则，并重建相对的Claude Skills目录链接。

发布白名单保留GitHub源码与配置格式，不纳入生成的Python缓存。模板workspace的元数据／配置、`src/`与`tests/`分别选择，不再纳入整个workspace目录；即使作者模板已在本地安装或构建，`node_modules/.bin`启动脚本和发射的`lib/`树也不进入原始npm tarball或安装后的Skill。

## 门禁、文档与评审

`scripts/run-gates.ts`拥有聚合。主聚合让lint先于插桩覆盖率通道；选定的源码树扫描门禁及重复代码检查等待覆盖率结束。lint契约探针在私有checkout中运行，不写入作者工作树。覆盖率门禁要求`packages/*/*/src/**/*.ts`逐文件语句、分支、函数与行均为100%，不设产品文件豁免；应用改由行为spec、构建后CLI与入口检查证明，不适用逐文件V8阈值。review-ownership历史套件需要Python 3.10与`.github/review-ownership/requirements.txt`；缺失时该门禁失败而非报告通过。

模板`docs/architecture.md`拥有放置位置、依赖方向、模块图与新行为落点。manifest拥有公开入口与分发；实现与JSDoc拥有接口；包README拥有使用合同；开发与测试页拥有命令、前提与验证边界；defensive-patterns页拥有语义审查。长期决定与事故走`.agents/notes/`下的Note生命周期；`.agents/skills/`下的开发Skills承载代码评审、散文、简化、可靠性与推送前流程。每个页面与Skill只声明本仓真实可执行义务；指名已删除对象的指令是缺陷，而不是历史。

外部可感知的CLI、数据格式或已发布API破坏遵循模板的[升级指南工作流](../templates/node-typescript/.agents/skills/dsh-create-upgrade-guide/SKILL.md)。指南随引入破坏的变更编写；其owner规定内部API豁免与发布维护，文档聚合检查其目录和内容结构。

## 产品验证什么、不验证什么

`npm run check:template`从产品自身白名单导出作者载荷到尚不存在的目录，检查普通文件字节和恢复的 Claude Skills 链接，并拒绝已占用目标且不改动其内容。随后在导出副本内按锁定文件安装、构建产物平面并驱动构建后CLI：空源清单写出`{ "format": 1, "title": …, "plugins": [] }`，`--concurrency 0`以退出`2`拒绝并保持既有索引字节不变。

该入口还在两个已构建workspace中写入陈旧探针声明，运行`clean`，证明完整`lib/`树被移除且作者入口源码字节保持。随后源码入口在不重建产物的条件下运行；重新构建并运行产物入口须保持同一报告字节。根TypeScript solution显式引用`tsconfig.host.json`，后者的项目引用拥有实际workspace产物图；仅`extends`不会继承这些引用。

该入口证明取得与交付文件的产物可用性。它不运行模板完整门禁图，那是模板自身合同，由`templates/node-typescript/.github/workflows/ci.yml`执行；本地运行不观察该工作流。模板依赖、包管理器缓存与`lib/`永不作为作者文件分发，安装也不会嵌套在产品内。

这些是A阶段实现条件，不证明B阶段对后续开发的治理效果、C阶段Agent复现或远端强制。门禁结果只建立其自身谓词；前提不可用属于失败，不是接受。

## 本绑定的验收

- 导出载荷包含manifest、锁文件、workspace定义、忽略规则、CI工作流、两个workspace的源码与测试、门禁脚本及开发Skills；不含`lib/`、`node_modules/`或缓存目录。
- 新导出仅凭锁定文件即可安装，并构建出为`start:built`声明的CLI入口。
- 构建后CLI对真实源清单写出经校验的格式1索引，对非法参数以退出`2`报告，并在此拒绝中保持既有索引字节。
- 验证器包自身测试与打包消费者拒绝源码平面子路径导入，只接受根导出。
- 已记录运行只适用于其实际输入与环境。谓词变化须证明非法消费者拒绝与合法恢复；本地 Windows 运行不观察模板的 Linux CI 工作流或远端强制。
