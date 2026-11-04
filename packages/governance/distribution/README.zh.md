# @project-governance/distribution

[English](README.md) | 中文

## 摘要

选择 Skill 分发的文件并把它们安装到仓库安装座。公开接口是 `packageFiles(sourceRoot)`、`installSkill(sourceRoot, targetRoot)` 以及常量 `SEAT_PATH`。根 `package.json` 的 files 白名单是唯一选择来源，代码中没有第二份路径清单。安装内容保留真实 workspace 结构，因为运行时按包名导入 workspace 包，安装座需要用 `npm ci --ignore-scripts` 准备。

## 合同

```js
import { installSkill, packageFiles, SEAT_PATH } from '@project-governance/distribution'

const files = packageFiles('/path/to/product-root')          // sorted, POSIX-style, root-relative
const { seat, fileCount } = installSkill('/path/to/product-root', '/path/to/existing-repository')
```

`packageFiles(sourceRoot)`：

- 读取 `sourceRoot/package.json`，要求非空的 `files` 数组。每项是字面文件、字面目录（递归复制）或必须至少匹配一个路径的 glob 模式。
- 拒绝绝对路径、含 `..` 的段、解析到产品根之外的路径、选择范围内的符号链接与 junction，以及无匹配的模式。字面路径缺失即报错，不会被静默跳过。
- 在选择到的目录内任意层级跳过 `node_modules`、`.git`、`.hg`、`.svn`、`__pycache__`、`.cache`、`.turbo`、`.nyc_output` 与 `.venv`。
- 要求白名单包含 `package.json` 自身，使安装座保留 workspace 清单；并要求根部的每份许可或来源通知（`LICENSE`、`LICENCE`、`SOURCE-LICENSE`、`NOTICE`、`ATTRIBUTION`，可带扩展名）都被列入，使署名随内容一起分发。
- 只返回文件清单，不写任何文件。

`installSkill(sourceRoot, targetRoot)`：

- 在第一次写入之前校验源选择、已存在的目标仓库，以及 `.agents` 与 `.agents/skills` 两个父目录。父目录本身是符号链接、junction 或文件时拒绝，安装座无法被重定向到目标之外。
- 独占创建 `SEAT_PATH`。已存在的安装座从不合并、覆盖或修复。
- 复制每个被选文件，包括白名单列出的锁文件。复制失败只删除本次调用创建的安装座。
- 返回 `{ seat, fileCount }`。不安装依赖、不添加钩子、不修改项目策略或远端设置。

## 已知限制与后续工作

- 安装座在按 `npm ci --ignore-scripts` 于座内准备好 workspace 依赖前不可运行。分发不执行这一步；若根白名单未列出锁文件，分发也不提供锁文件。
- 安装是一次性的：没有更新、升级、差异、卸载或修复路径。重复安装到同一仓库按设计失败，调用方必须自己决定何时移除安装座。
- 缺失时会创建 `.agents` 与 `.agents/skills` 父目录，后续步骤失败时不会删除它们；只清理安装座本身。
- 选择以产品根为全局范围。没有按目标过滤、没有忽略文件，也无法排除白名单已选中的文件。
- 复制保持源树的文件内容与权限；不做转换、模板化或路径重写。
- 包为 `0.0.0` 的私有包，未发布，也不主张任何远端或发布通道。
