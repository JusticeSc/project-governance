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

`npm run check:template`是根验证入口：把作者文件导出到隔离目录，在其中执行`corepack pnpm install --frozen-lockfile --ignore-scripts`，构建产物平面，并驱动构建后CLI处理空源清单与非法参数。它证明取得与构建产物；模板完整门禁图是模板自身合同，由其自身CI工作流执行。根检查清单调用该入口，因此本地运行与产品CI共享同一定义，产品无需另一条重复工作流。`npm run export-template -- <new-output-directory>`即向其他项目交付副本所用的同一导出；它拒绝已存在目录，不复制依赖、构建产物或缓存，在安装后的Skill座中也可运行。模板固定pnpm 11.28.5及自身锁文件中的工具链版本，manifest声明Node `>=24 <25`，其CI工作流重复该声明；其他平台及Node组合在观察到之前仍只是CI声明。

## 安装与分发

运行npm run install-skill -- <existing-repository>。安装座调用workspace命令前需要npm ci --ignore-scripts。根files白名单与锁文件由安装和打包载荷验证共用；包是本地workspace成员，不是各自已发布的依赖。白名单逐项列出模板作者文件，而不是整个`templates/`目录，因此作者源码、manifest、锁文件、配置、脚本与文档会随包分发，但不含已安装依赖、构建产物或缓存；安装器按文件复制，从不安装模板workspace。没有原位安装升级、注册表发布或自动CI激活。任何另行授权的发布先读[发布责任](../references/release.md)。
