# 指南：开始项目

[English](starting-a-project.md) | 中文

本指南帮助在已安装的 Node.js/TypeScript 治理项目中开始用户请求的工作。项目含工程设施，但没有业务应用或库。保留 [LICENSE](../../LICENSE) 与 [SOURCE-LICENSE.txt](../../SOURCE-LICENSE.txt)，日常工作使用项目自身的指令。

## 1. 建立检出环境

审阅已安装文件并保全已有项目内容。需要新的 Git 基线时，遵循[开发环境准备](../development.zh.md#bootstrap-a-new-export)，然后按指导安装依赖与钩子。基线只记录已审阅的输入，不代表检查通过。未经另行授权不修改远端设置或发布。

## 2. 实现请求的行为

确定真实用户或消费方、输入、输出、失败行为，以及必须保持不变的文件或数据。选择满足职责的最小真实 owner：进程与 I/O 责任放在 `apps/<app>/` 应用，可复用行为放在 `packages/<group>/<package>/` 库。只有任务需要时才同时创建；库不依赖应用。各成员拥有源码、测试、manifest 与文档。库参见[新增包](adding-a-package.zh.md)。

在 `tsconfig.host.json` 登记每个真实成员，并配置其真实 workspace 依赖、源码别名、产品用途分类及适用的启动器和 bin 策略。workspace 模式已覆盖 `apps/*` 与 `packages/*/*`；不需要虚构包。设置真实项目身份与仓库元数据，但不改变许可证或版本义务。新分组拥有双语 README 和导航项；其子系统页面或有理由的无页面分类应反映真实职责。行为变化时同步更新[架构](../architecture.zh.md)、根 README 与相关 owner 文档。

多成员项目必须配置 `typedImportProbe`，指向真实跨包消费方测试与非 thenable 运行时导出；符号缺失或无法解析不能证明类型感知 lint。只有不存在多个成员时才可不配置。每个真实源码和测试均遵循[编译器与 lint 接线](../development.zh.md#typescript-project-layout)。不能为通过检查虚构依赖或豁免真实源码。工具协议标识与钩子归属标记保持稳定。

<a id="3-declare-actual-persistence"></a>
## 3. 声明真实持久化

项目拥有持久化数据时，确定其真实导出类型以及读取、写入和兼容性义务。在根 `persistence.config.json` 的 `roots` 数组中声明。每项包含稳定 `id`（首字符为小写字母，其后仅小写字母、数字或连字符）、位于 `apps/<app>/src/**/*.ts` 或 `packages/<group>/<package>/src/**/*.ts` 的 `owner` 路径、直接导出的 interface 或 type alias 名称 `type`，以及可选 `versionField`。owner 的真实路径必须留在项目内，可达类型必须描述 JSON 兼容数据，ID 与 canonical owner/type 组合必须唯一。声明的版本字段是根对象必需的非负 safe-integer 数值字面量属性；根仍存活时不能改换或移除该声明。声明缺失或无效均失败。每个受影响根分别做兼容性决策；`version-bump` 要求已声明版本字段实际递增。

没有配置且没有历史表示没有声明根；已有历史却没有配置时失败。首次登记实际非空库存时，编写 JSON 说明文件，由 `en` 和 `zh` 分别提供 summary、compatibility 和 verification，然后运行 `pnpm exec tsx scripts/persistence-changes.ts --baseline <YYYY-MM-DD-slug> --prose <file>`。审阅生成的双语基线和 schema；不预先创建空历史或空基线。最后一个根退出后，保留 `roots: []` 及其历史：删除仍须确认并检查冻结历史，不是跳过。后续变更查阅命令当前选项。

使用[持久化变更模板](../../.agents/skills/pg-doc/templates/persistence-change.md)和工具当前的命令选项；不能虚构历史或迁移成功。结构记录不能证明运行时读取、迁移或历史数据兼容：须另行验证真实行为。保护已有数据和已接受历史。

## 4. 验证与交接

manifest 变化后安装依赖；适用时通过 frozen lockfile 检查全新安装。依据[开发指南](../development.zh.md#verify-a-change)和[测试策略](../testing.zh.md)获取适用的行为、覆盖率、类型、产物、发布和文档证据。运行真实成功与拒绝路径，保护已有用户文件，并在产物存在时验证构建或打包消费方。包运行时覆盖率仍为逐文件 100%；当前真正为空不豁免以后加入的源码。

同步更新双语及配对记录。报告实际运行的命令及环境或权限限制；已配置 CI 不等于远端通过。后续工作沿当前架构与 owner 文档进行，一次迁移全部受影响消费方，并在适用的公共破坏性变更中遵循升级指南流程。
