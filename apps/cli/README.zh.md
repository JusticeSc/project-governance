# @project-governance/cli

[English](README.md) | 中文

## 摘要

project-governance Skill 的命令入口。`check` 只运行仓库在自己策略文件中配置的命令，并在执行前校验整份策略；`install` 把 Skill 的分发文件复制到已有仓库的 `.agents/skills/project-governance`。二进制名为 `project-governance`。本包只拥有参数解析、命令分流和退出码；检查与分发决策分别位于按包名导入的 `@project-governance/checks` 与 `@project-governance/distribution`。

## 命令

```text
project-governance check [repository] [--policy path]
project-governance install <existing-repository>
project-governance --help
```

`check` 默认使用当前目录，并读取该仓库内的 `governance-checks.json`。`--policy` 接受仓库内相对路径；绝对路径只有在仍解析到仓库内时才被接受。整份策略会在第一条命令运行前完成校验，随后按策略顺序以仓库根为工作目录执行。退出码 `0` 表示全部配置检查通过，`1` 表示某检查返回非零状态或被信号终止，`2` 表示策略、路径或参数无法校验——此时不执行任何命令。

`install` 将独立的 Skill 目录复制到已有仓库的安装座。它拒绝已存在的安装座、本身就是符号链接／junction／文件的 `.agents` 或 `.agents/skills` 父目录，以及不存在的目标。失败时只移除本次创建且未改变的文件和空目录，并报告无法安全移除的路径。

`install` 放置的是 Skill，而不是项目模板。安装模板请按复制后的 Skill 指引操作；其安装器可离线运行，无需 npm workspace 依赖。

## 从不执行的操作

- 从不创建 `.governance/`，从不从项目文件推导检查，也从不推断策略。
- 从不覆盖、合并或修复已存在的安装座，也不在目标仓库之外写任何文件。
- 从不添加钩子、不修改项目策略，也不触碰远端设置、工作流或全局配置。
- 从不安装依赖：本命令不从网络获取任何文件。

## 已知限制与后续工作

- 模板安装与安装 Skill 座是不同步骤；模板安装需要 Node.js >=22.19.0，以及允许创建目录符号链接的文件系统和账户。
- 命令没有 `init`、`status` 或知识查询子命令；这些行为不属于本产品。
- `check` 通过操作系统 shell、以当前用户权限执行策略中的命令字符串。策略作者被信任；沙箱与命令解析不在范围内。
- 不支持自动发现目标仓库之外的策略，也没有检查登记表。
- 包为 `0.0.0` 的私有包，未发布，也不主张任何注册表、远端地址或发布流程。
