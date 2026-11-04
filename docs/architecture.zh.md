# 架构

[English](architecture.md) | 中文

## 归属与结构

应用组合能力，包拥有稳定合同及其测试。根目录拥有workspace编排、唯一分发白名单和显式自检配置。规则与可执行谓词有意分属不同owner。

| 路径 | 拥有 |
|---|---|
| apps/cli/ | 命令解析与用户输出。 |
| packages/README.md | 能力族地图。 |
| packages/governance/README.md | 直属包地图。 |
| packages/governance/checks/ | 策略校验与shell执行。 |
| packages/governance/documentation/ | 声明语料的文档谓词。 |
| packages/governance/distribution/ | 选定文件安装。 |
| references/ | 按责任组织的规范。 |
| references/methods/ | 方法导航与来源覆盖。 |
| docs/ | 架构、开发、测试与溯源。 |
| scripts/ | 仓内检查（含静态包结构门）与打包smoke编排。 |
| templates/node-typescript/ | 独立pnpm／TypeScript参考工程树、取得方式及自身源码／产物平面。 |

每个产品包拥有manifest、README双语对、src/及tests/。产品CLI以bin/作为可执行应用入口，并拥有tests/。跨包import只用声明的包名与exports，不读其他包的私有路径；能力包不反向依赖CLI。`scripts/verify-structure.mjs`检查该声明图：公开入口目标存在于自身包内，静态import、再导出及字面量动态import／require只用声明名称及已发布子路径，禁止作者源码链接，workspace声明覆盖实际包，依赖无环，且只有拥有包自己的tests/可用其devDependencies。根工具按公开包名import workspace包，并自行声明依赖，不借workspace提升。TypeScript只是该门的parser依赖；产品不由此产出代码，npm运行方式不变。产品Node ESM直接执行，npm workspaces链接包名，没有bundler或生成库输出。独立模板workspace则拥有实际TypeScript的src到lib构建；[模板设计](template-design.zh.md)固定该合同，根分发白名单选择其作者文件，但不合并workspace。

根workspace模式按实际manifest求值，不能把独立模板并入。读取声明前先校验manifest的真实路径包含关系。公开JavaScript入口留在生产源码区，相对模块import留在被检查的生产／测试语料中，防止未扫描helper或仅测试依赖成为生产绕过。合法仓库根别名会被规范化，不会使CLI检查失效。

## 运行边界

CLI拥有参数错误。checks包把已有仓库和策略解析为真实路径，校验整个命令表后在仓内执行可信命令。shell命令是使用调用者权限的代码，不是被沙箱隔离的输入。策略成功或符号链接包含校验，都不赋予执行不可信仓库的权限。

distribution以package.json的files作为唯一选择合同。在已有目标内安装时创建独占的.agents/skills/project-governance座位，拒绝重定向父目录或已有座位，失败仅回滚自身未完成输出。不准备依赖、不改业务配置，也不迁移旧安装。

文档门禁加载显式声明的语料和各自谓词配置。编译型门使用目标的TypeScript编译器及工程。精确限制归[文档包](../packages/governance/documentation/README.zh.md)。

## 文档与状态归属

[Skill](../SKILL.md)引导模板取得、建立与已有工程接入；[接入流程](../references/adoption.md)拥有受保护的迁移与交棒。取得模板后，新工程按导出工程内的[新项目教程](../templates/node-typescript/docs/cookbook/starting-a-project.md)执行。接入完成后，日常开发、修复、评审与接续使用目标工程的AGENTS.md、项目内Skills及各自文档owner，而不是安装后的采用座。

本产品维护从[AGENTS.md](../AGENTS.md)进入。[项目结构](../references/project-structure.md)拥有建立与演进要求，而不是要求照抄本项目目录示例。[开发](development.zh.md)拥有命令，[测试](testing.zh.md)拥有证据边界，[溯源](provenance.zh.md)拥有署名。持久执行状态按[状态规则](../references/state-owner.md)复用目标已有owner；维护者会话进度与原始迁移回执不是产品依赖。

## 变更边界

拆包必须有真实独立合同、生命周期或消费者，不能为填目录把每个脚本拆成包。新语言或布局改变实际绑定与测试，不改变项目标准义务。导出和依赖变化必须在同一变更迁移生产者与消费者。
