# 开发入口

维护本产品时按[工程变更与reconciliation](references/change-workflow.md)执行。先核对当前请求与工作树，再沿[架构](docs/architecture.md)定位拥有模块；开发、检查和副作用见[开发](docs/development.md)与[测试](docs/testing.md)。[采用Skill](SKILL.md)只负责其他工程的模板取得、接入与交棒，不是本产品日常维护入口。

产品代码归 `apps/*`、`packages/*/*`，测试归拥有包的 `tests/`；包名与公开入口由 manifest 定义。`templates/node-typescript/`是独立workspace，修改时沿其自身开发入口与[模板合同](docs/template-design.md)运行检查，不把它并入产品npm workspace。规范归 [references](references/index.md)，唯一事实原位维护。当前请求决定权限，交付依据真实执行。私有会话状态不进入产品或安装包。
