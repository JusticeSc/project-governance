# 持久化记录格式与机器声明

按[当前记录](persistence-current-records.md)或[历史与冻结](persistence-historical-finalized.md)定位本次责任。本页保留固定来源的具体格式、条件、例外和负保证；Session／TypeScript名词与pnpm／scripts命令是来源绑定，不是本产品已提供的持久化执行器。目标需绑定真实根、版本、生成器与检查；缺执行器须报告缺项，不能手填生成哈希或声称验证完成。来源观察与示例验收用例不等于本产品或消费者运行通过。

<a id="persistence-current-records.record-quadruple"></a>
## 1. 记录四件套与所有权

### 触发
新增、修改或删除任何被 Session 持久化的声明类型；补一条历史遗漏；准备把一个格式标记为已接受。

### 源仓义务
每条带日期的记录恰好有四个同目录文件（`deepseek-harness/docs/persistence-changes/README.md:31-44@687f282e`）：

| 文件 | 所有者与内容 |
|---|---|
| `YYYY-MM-DD-slug.md` | 英文确认文档：`kind: persistence-change`、**一份**机器声明、兼容性推理、验证证据 |
| `YYYY-MM-DD-slug.zh.md` | 中文对侧：机器声明必须与英文相同 |
| `YYYY-MM-DD-slug.i18n.yaml` | **生成**的双语一致性记录（按标题分段的哈希） |
| `YYYY-MM-DD-slug.schema.json` | **生成**的完整 after schema，只含仍存在的受影响根 |

英文记录的固定骨架：前置元数据 `description` + `kind: persistence-change`；H1 为记录 id；`English | [中文](<id>.zh.md)` 链接；`## Summary`；`## Table of Contents`；`<a id="declaration"></a>## Declaration`；`<a id="compatibility"></a>## Compatibility`；`<a id="verification"></a>## Verification`；`<a id="dev-note"></a>## Dev Note`。中文侧使用相同锚点 id（`declaration`/`compatibility`/`verification`/`dev-note`），标题文字可为中文（`deepseek-harness/docs/persistence-changes/2026-09-13-working-directory.md:1-48@687f282e`、`deepseek-harness/docs/persistence-changes/2026-09-13-working-directory.zh.md:1-48@687f282e`）。

记录模板由 `.agents/skills/dsh-doc/templates/persistence-change.md` 定义；记录创建命令接受**双语散文输入**并生成机器声明、快照、目录对和一致性记录（`deepseek-harness/docs/persistence-changes/README.md:44-44@687f282e`）。本域文件没有给出该创建命令的确切命令名，不要臆造。

### 步骤
1. 确认改动影响哪些根（见 [根清单](persistence-record-history.md#persistence-current-records.root-inventory)）。
2. 选定记录 id：`YYYY-MM-DD-<slug>`，文件名与声明 `id` 一致。
3. 生成/编写四个文件；英文与中文的声明块必须逐字节相同。
4. 生成 after-schema 快照；若某根被删除，快照中不出现该根，并在声明用 `after: null` + 显式 tombstone 表达。
5. 运行常规验证器与 `doc-sync`，再提交（`deepseek-harness/docs/persistence-changes/README.md:42-44@687f282e`）。
6. 评审者核对 Compatibility 与 Verification 是否描述真实读取器行为、是否给出实际执行的命令（`deepseek-harness/docs/persistence-changes/README.md:69-69@687f282e`）。

### 完成信号
- 验证器只从英文文件读取一次声明，并检查中文声明相等（`deepseek-harness/docs/persistence-changes/README.md:44-44@687f282e`）。
- 生成侧车与声明中的 `after` 摘要逐根一致（本域 16 份快照全部核对通过，见 coverage 记录）。
- 双语配对哈希与标题分段一致（`*.i18n.yaml`）。

### 失败处理
- 中文声明与英文不一致：先修声明，不要手改 `.i18n.yaml` 掩盖。
- 快照根集合与声明根集合不一致：重新生成快照；不要手写节点。
- 记录被后续记录依赖后再改：见 [历史图](persistence-record-history.md#persistence-current-records.history-graph) 与 [定稿检查点](persistence-finalization.md#persistence-historical-finalized.finalized-checkpoint-immutability)。

### 例外
- 基线记录没有前驱，但仍遵守四件套。
- 删除根没有 after schema，只有显式 tombstone。
- `.i18n.yaml` 与 `.schema.json` 永远由工具生成，人工只改 `.md`/`.zh.md`。

来源：deepseek-harness/docs/persistence-changes/README.md:31-44@687f282e 来源：deepseek-harness/docs/persistence-changes/README.zh.md:31-44@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-12-auto-review-error-metadata.md:1-52@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-13-working-directory.md:1-48@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-11-initial.i18n.yaml:1-28@687f282e


<a id="persistence-current-records.machine-declaration"></a>
## 2. 机器声明

### 触发
任何记录的新建、修订、复制或评审。

### 源仓义务
声明是一个围栏代码块 ` ```yaml persistence-change `，字段固定（`deepseek-harness/docs/persistence-changes/README.md:40-44@687f282e`）：

```yaml persistence-change
schemaVersion: 1
id: 2026-09-12-auto-review-error-metadata
baseline: false
changes:
  - root: "event:tool/ptc-dispatch"
    previous: "2026-09-11-initial"     # 前驱记录 id；新根为 null
    after: "b5d66e…d06796"             # 64 位十六进制摘要；删除为 null
    decision: same-version             # same-version | version-bump
```

- `root` 取值：`SessionHeader`、`JsonlHeaderLine`、`SessionEventEnvelope`，或 `event:<事件类型>`（例如 `event:tool/result`）。
- `previous` 指向**记录 id**，不是根名；新根写 `null`。
- `after` 是该根在变更后的完整摘要；删除写 `null` 并保留显式 tombstone。
- `baseline: true` 只用于初始清单，所有根 `previous: null`；其余记录为 `false`。
- 声明列出每个受影响根；一次记录可以同时改多个根（初始记录 59 个根；`2026-09-16-session-format-v4` 14 个根；`2026-09-14-image-offload` 13 个根）。
- 验证器从英文读取一次，检查中文声明相等；它不判断记录是生成还是手工编辑（`deepseek-harness/docs/persistence-changes/README.md:44-44@687f282e`、`deepseek-harness/docs/persistence-changes/README.md:63-63@687f282e`）。

### 【源仓实现事实】
本域 16 条记录的 `schemaVersion` 全为 1；声明条目共 110 条（96 条 `same-version`、14 条 `version-bump`）；英文与中文声明块逐字节相等（16/16）。

### 步骤
1. 从模板复制骨架。
2. 为每个受影响根写一行；从该根的**最新**记录取 `previous`。
3. 从生成快照取 `after`，不要手算。
4. 同步中文声明（逐字节相同）。
5. 检查 `id` 与文件名去扩展名后一致。

### 完成信号
声明能被 YAML 解析；每个 `previous` 指向存在的记录；每个 `after` 与该记录快照中同名根的 `digest` 一致。

### 失败处理
- `previous` 缺失/成环/同一前驱有两条后继：验证器拒绝（见 [历史图](persistence-record-history.md#persistence-current-records.history-graph)）。
- `after` 与快照摘要不一致：重新生成快照；若当前源码已变化，先决定是否需要新记录。

### 例外
删除、基线、新根三种形状见上；`version-bump` 记录里也可以出现 `previous: null` 的新根（`event:developer/message` 在 v4 记录中即如此）。

来源：deepseek-harness/docs/persistence-changes/README.md:40-44@687f282e 来源：deepseek-harness/docs/persistence-changes/README.zh.md:40-44@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-11-initial.md:24-265@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-12-auto-review-error-metadata.md:24-37@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-09-16-session-format-v4.md:24-85@687f282e 来源：deepseek-harness/docs/persistence-changes/2026-10-13-user-rpc-principal.zh.md:1-60@687f282e


## 附：最小记录骨架（可直接复制）

````markdown
---
description: "Records a persistence type transition and its compatibility acknowledgement."
kind: persistence-change
---

# <YYYY-MM-DD-slug>

English | [中文](<YYYY-MM-DD-slug>.zh.md)

## Summary

<一句话说明变化与是否保持 Session 版本。>

## Table of Contents

- [Declaration](#declaration)
- [Compatibility](#compatibility)
- [Verification](#verification)
- [Dev Note](#dev-note)

<a id="declaration"></a>
## Declaration

```yaml persistence-change
schemaVersion: 1
id: <YYYY-MM-DD-slug>
baseline: false
changes:
  - root: "<RootName 或 event:type>"
    previous: "<前驱记录 id 或 null>"
    after: "<64 位摘要或 null>"
    decision: same-version
```

<a id="compatibility"></a>
## Compatibility

<旧记录在新读取器下如何；旧读取器遇到新记录如何；缺失/忽略/拒绝信号；同时变化。>

<a id="verification"></a>
## Verification

<实际运行的命令、文件/用例数量、观察结果。>

<a id="dev-note"></a>
## Dev Note

None.
````

中文侧使用相同锚点 id，并保持声明逐字节相同；随后重记 `.i18n.yaml` 并重新生成 `.schema.json`。

