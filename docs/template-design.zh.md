# Node/TypeScript 治理模板合同

[English](template-design.md) | 中文

本页说明 `templates/node-typescript/` 这个独立项目。它是 Skill 固定离线资产的来源，不属于产品 npm workspace；`SOURCE-LICENSE.txt` 记录复制材料的来源与许可。

## Workspace与运行合同

模板不自带应用、库或业务数据。pnpm 在 `apps/*` 下发现实际应用，在 `packages/*/*` 下发现实际库；根 workspace 保留治理工具链。只有不存在适用业务 workspace 时，空成员集才有效。项目新增成员后，manifest、TypeScript 引用、workspace 策略及适用检查须描述真实成员，而非示例。

## 直接作为新项目起点

安装后项目的[起步指南](../templates/node-typescript/docs/cookbook/starting-a-project.md)负责环境准备与项目参数。已有项目需要在批准后协调冲突文件和命令；安装器保护已有内容，仅复制无冲突文件并不等于整合完成。

## 工具链与源码／产物平面

模板要求 Node `>=24 <25`，固定 pnpm 11.28.5，并在自身锁文件中记录工具链。脚本清单归模板 manifest。构建与检查作用于已发现、已声明的 workspace；生成产物与依赖不作为模板作者文件分发。导出时作者态 `gitignore` 文件恢复为 `.gitignore`。

## 门禁、文档与评审

模板 `scripts/run-gates.ts` 负责检查聚合，模板 CI 工作流调用项目检查。开发与测试页面拥有前提和命令；安装后的 Skills 承载开发、评审和简化流程。真实项目数据、公开接口和运行行为发生变化时，应用相应规则；空项目不应导致后续出现检查对象时仍跳过检查。

## 产品验证什么、不验证什么

产品分发选择模板作者文件与 Skill 资产；`npm run check:template` 验证隔离导出，`npm run smoke` 验证实际打包产品和安装。模板有独立的检查图和 CI 工作流。安装器成功不能代替项目设置、冲突协调或执行适用检查。

## 本绑定的验收

- 新项目可安装 Skill 模板，不带无关业务代码，也不强制特定 Agent 的符号链接。
- 空模板可以安装依赖并运行适用检查；新增真实 workspace 后可被发现、构建和检查，非法 workspace 被拒绝。
- 已有项目文件不被静默替换；冲突得到报告，批准协调后验证整合后的项目。
- 实际打包的 Skill 和模板包含必要作者文件，不包含生成依赖、构建产物和 Agent 本地设置。
- 宣称候选可发布前，产品 CI 和模板自身 CI 均须通过。
