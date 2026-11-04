# 开发

[English](development.md) | 中文

## 准备

使用Node.js >=22.19.0与npm，在workspace根运行npm ci --ignore-scripts。锁文件拥有依赖版本。不能以兄弟来源树、全局parser、NODE_PATH或未声明的相对跨包import弥补缺依赖。

## 修改

改代码前读取[AGENTS.md](../AGENTS.md)、实际任务与拥有包的README。生产代码归自身src/（可执行应用用bin/），永久行为回归归自身tests/。scripts/中的根工具及其tests/回归自行声明依赖，不借workspace提升。导出合同与调用方同改；通用来源规则归[references](../references/index.md)，不复制进包README。

## 选择验证

当前层足够时先跑拥有包的聚焦测试，再执行真实变更入口。根npm run check执行governance-checks.json：语法、静态包结构门、workspace与根测试、已声明的自身文档谓词及模板导出／构建检查。npm run check:structure只跑结构门，npm test先运行各workspace自己的测试脚本，再运行根测试。该门只解析作者源码而不构建：检查声明的公开入口、包名import与已发布子路径、workspace声明与依赖环，对计算式说明符、别名loader与动态解析不作证明，并禁止作者源码链接；不产出代码。npm run smoke打包本产品，装入独立消费者、准备锁定依赖，验证安装后消费者的成功、拒绝与恢复。证据盲点见[测试](testing.zh.md)。

本地编排与CI共享检查定义，不等于每个聚焦修改都必须重跑完整CI矩阵。已有有效证据复用至输入或前提变化。消费者即使主动配置了hook，也不能代替行为验证或远端必需检查。

## 文档与配对

根README、docs及包地图／README具有英中对侧。同一变更编辑并评审双方，然后使用文档包的verify-translation-pairing --write显式重录具名配对；日常验证只读。不能重录侧车掩盖未翻译或结构不一致。规范参考正文保留既有工作语言，不是双语语料中被悄悄豁免的成员。

修改谓词时证明合理的无效消费者被拒绝，有效消费者仍被接受。不能为绿色缩小配置语料或删除有意义断言。未实际执行的外部服务、凭据、runner及审批仍未验证。

## 模板工程

`templates/node-typescript/`是独立的pnpm工程，不是根npm workspace成员。它拥有自己的`package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`、TypeScript与构建配置、门禁脚本、开发Skills与文档；根`npm ci`和根workspace命令既不安装也不执行它。通过其自身owner——`templates/node-typescript/docs/architecture.md`、`docs/development.md`与`docs/testing.md`——修改，并在模板目录内通过Corepack运行其命令。不得把它加入根workspace、借外层`node_modules`解析其包或绕过其锁文件。

`npm run check:template`将作者文件导出到隔离目录，安装锁定依赖、构建空项目并运行其测试套件。随后只在临时副本建立 workspace，验证遗漏编译引用会被拒绝，构建并运行真实产物，检查非法输入拒绝以及清理、重建。它不运行模板自身的完整门禁图。产品检查清单在本地及 CI 中调用同一入口。`npm run export-template -- <new-output-directory>`创建不含依赖、构建产物和缓存的参考副本，并拒绝已有目标目录。模板固定 pnpm 11.28.5 并拥有自身 CI 工作流；其他平台组合在实际观察前仍未验证。

模板检查要求 Node `>=24 <25`。产品使用其他受支持的 Node 版本时，将 `PROJECT_GOVERNANCE_TEMPLATE_NODE` 设置为 Node 24 可执行文件的绝对路径。Corepack 和初始冻结安装离线使用已准备的 pnpm store；临时 workspace 夹具更新锁文件需要元数据时，可能访问配置的 registry。CI 预先准备固定包管理器及锁定包；这不改变 Skill 的离线安装。

## 安装与分发

按[README](../README.zh.md)将整个`skills/project-governance/`目录复制到目标的`.agents/skills/project-governance/`。Skill包含固定模板资产，安装无需npm workspace依赖；独立的产品workspace命令仍需要自身依赖。安装不准备模板workspace，也不激活CI。任何另行授权的发布先读[发布责任](../references/release.md)。
