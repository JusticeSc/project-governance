# 安装与检查命令

本页拥有命令合同。项目模板安装由[Skill](../skills/project-governance/SKILL.md)引导；需要另外开展较完整的项目改造时，可参考[接入流程](adoption.md)。交棒后的日常任务从目标工程AGENTS与项目内Skills进入。Node要求及实际命令定义见根[package.json](../package.json)。

<a id="commands"></a>
## 命令

从本包根执行：

先按锁准备workspace依赖，然后查看或运行实际入口：


命令为 `node apps/cli/bin/governance.mjs check <repo> --policy <仓内JSON>`、`node apps/cli/bin/governance.mjs install <已存在仓库>`以及`--help`。

## 安装项目模板

运行 `node <skill-dir>/scripts/install-template.mjs <项目目录>`，或从产品根执行 `npm run install-template -- <项目目录>`。目录可不存在或已存在；安装器完整扫描冲突后才写入。已有目录可以共存；同名文件、链接或不可合并的目录列为冲突，任何冲突都会在写入项目前退出。执行中途失败时仅尝试移除本次创建且未改变的内容，无法安全移除的路径会报告供检查；不覆盖或删除已有项目文件。命令不安装依赖、钩子或远端配置。

模板需要可创建目录符号链接的环境，Windows可能需要开发者模式或相应权限。遇冲突时按[Skill](../skills/project-governance/SKILL.md)审阅并获准合并；仅导出参考树不是完成安装。

## 安装

CLI 的 `install <已存在仓库>` 安装的是轻量 Skill 目录，而非项目模板；用户也可按 [README](../README.zh.md)直接复制 `skills/project-governance/` 到目标的 `.agents/skills/project-governance/`。安装后的 Skill 具备离线固定模板资产，其安装器无需 npm workspace 依赖。实际模板安装和交棒按 Skill 执行；安装 Skill 座不等于项目模板已安装。每个目标维护自己的真实检查配置与日常入口，安装座不是第二日常规则或状态 owner。

## 执行检查

策略是仓内JSON对象，checks为非空“名称→非空shell命令”映射；省略策略路径时读目标根governance-checks.json。策略路径按真实仓根与realpath判断，直接越界、符号链接／Windows junction越界均拒绝，合法仓根别名允许。先验证所有命令，再在目标cwd按顺序执行；不会因为前一个检查成功便跳过后面的声明。

命令继承调用者权限和环境，因此只能执行经过审查可信的项目脚本。安装或读取策略不授予执行其中任意命令的权限，聚合入口不能登记自己。子命令非零、启动失败或信号终止都计失败；配置／参数／读取问题退出2，执行失败退出1，所有已声明检查通过退出0。不创建状态、不推导应跑检查、不证明语义完整或远端强制。

<a id="domain-routing"></a>
## 规则定位

接入核对或维护本产品时，按[专题索引](index.md)和实际影响面读完整小节；已接入工程的普通任务按其自身AGENTS、文档与项目内Skills定位规则。不存在knowledge查询数据库，不依赖list/cite/show取回第二份义务；需要源定位时读[来源说明](../docs/provenance.md)，不能把坐标当原文或理解证明。

<a id="package-domains"></a>
## 包合同

涉及包时同时检查[公开面与源码产物](engineering-module-surfaces.md)、[依赖](supply-chain-dependencies-and-optional-loading.md)、[安装payload](supply-chain-package-and-installation.md)、[包README](documentation-package-and-api.md#package-readme)和真实消费者。不同面之间的约束不能被一个完整性检查代替。
