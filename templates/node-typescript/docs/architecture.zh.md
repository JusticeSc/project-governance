# 架构

[English](architecture.md) | 中文

此 workspace 初始没有业务应用或库。仓库拥有工程工具、检查、指令与文档；不存在隐含的业务数据流或公共 API。修改 workspace 边界前阅读本页，并在真实 owner 及其关系出现时更新本页。

## Workspace 边界

应用属于 `apps/<app>/`，库属于 `packages/<group>/<package>/`；各自拥有源码、测试、manifest 和消费方文档。分组是带导航的容器，不是包。为实际职责引入成员，不为填满目录创建成员。库不得依赖应用。[开始项目](cookbook/starting-a-project.zh.md)说明登记方式，[新增包](cookbook/adding-a-package.zh.md)说明库的细节。

根 workspace 配置发现成员；`pnpm run gen-host-references` 按实际成员及其已有源码配置派生 `tsconfig.host.json` 引用。源码面通过 TypeScript paths 映射将已声明 workspace 导入解析到 `src`。构建及打包消费方使用声明的产物导出，不消费源码子路径。编译图与生成引用归属见[开发指南](development.zh.md#typescript-project-layout)。

## 归属与演进

每个真实合同、数据格式与共享类型有唯一 owner；在其出现时记录生产方、消费方、边界、失败行为和可观察副作用。有持久价值的决策理由归 [Agent Note](../.agents/notes/README.zh.md)，不创建虚构的占位业务模块。[开始项目](cookbook/starting-a-project.zh.md)说明如何声明真实持久化类型与基线。来源许可归属保留在 [SOURCE-LICENSE.txt](../SOURCE-LICENSE.txt)。
