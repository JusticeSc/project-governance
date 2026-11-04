# 安装与检查命令

本页拥有命令合同。项目模板安装由[Skill](../SKILL.md)引导；需要另外开展较完整的项目改造时，可参考[接入流程](adoption.md)。交棒后的日常任务从目标工程AGENTS与项目内Skills进入。Node要求及实际命令定义见根[package.json](../package.json)。

<a id="commands"></a>
## 命令

从本包根执行：

先按锁准备workspace依赖，然后查看或运行实际入口：


命令为 `node apps/cli/bin/governance.mjs check <repo> --policy <仓内JSON>`、`node apps/cli/bin/governance.mjs install <已存在仓库>`以及`--help`。

## 安装项目模板

从产品根执行 `npm run install-template -- <项目目录>`。目录可不存在或已存在；安装器复用导出器取得固定模板，完整扫描后才写入。已有目录可以共存；同名文件、链接或不可合并的目录列为冲突，任何冲突都会在写入项目前退出。执行中途失败时仅尝试移除本次创建且未改变的内容，无法安全移除的路径会报告供检查；不覆盖或删除已有项目文件。命令不安装依赖、钩子或远端配置。

模板需要可创建目录符号链接的环境，Windows可能需要开发者模式或相应权限。遇冲突时按[Skill](../SKILL.md)审阅并获准合并；仅导出参考树不是完成安装。

## 安装

安装目标必须是已存在的仓库目录。安装器在目标建立 .agents/skills/project-governance，独占创建；现有安装即使为空也拒绝，重定向的.agents或skills父目录拒绝。文件由根package.json.files统一选择，完整校验后复制，失败仅移除本次新建的座。它不修改业务、任务状态、策略、钩子、CI或远端，也不执行第三方安装脚本。

安装后在座根执行npm ci --ignore-scripts准备workspace依赖，再由Agent读SKILL.md实施接入与交棒；安装成功并不等于项目已完成迁移或首次验证。每个目标维护自己的真实检查配置与日常入口；本包源码的配置不能当作消费者事实，安装座不是第二日常规则或状态owner。安装位置改变后仍按各工具的目标root/cwd约定运行。

## 执行检查

策略是仓内JSON对象，checks为非空“名称→非空shell命令”映射；省略策略路径时读目标根governance-checks.json。策略路径按真实仓根与realpath判断，直接越界、符号链接／Windows junction越界均拒绝，合法仓根别名允许。先验证所有命令，再在目标cwd按顺序执行；不会因为前一个检查成功便跳过后面的声明。

命令继承调用者权限和环境，因此只能执行经过审查可信的项目脚本。安装或读取策略不授予执行其中任意命令的权限，聚合入口不能登记自己。子命令非零、启动失败或信号终止都计失败；配置／参数／读取问题退出2，执行失败退出1，所有已声明检查通过退出0。不创建状态、不推导应跑检查、不证明语义完整或远端强制。

<a id="domain-routing"></a>
## 规则定位

接入核对或维护本产品时，按[专题索引](index.md)和实际影响面读完整小节；已接入工程的普通任务按其自身AGENTS、文档与项目内Skills定位规则。不存在knowledge查询数据库，不依赖list/cite/show取回第二份义务；需要源定位时读[来源说明](../docs/provenance.md)，不能把坐标当原文或理解证明。

<a id="package-domains"></a>
## 包合同

涉及包时同时检查[公开面与源码产物](engineering-module-surfaces.md)、[依赖](supply-chain-dependencies-and-optional-loading.md)、[安装payload](supply-chain-package-and-installation.md)、[包README](documentation-package-and-api.md#package-readme)和真实消费者。不同面之间的约束不能被一个完整性检查代替。
