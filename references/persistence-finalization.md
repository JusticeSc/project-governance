# 已接受兼容基线与不可变检查点

按[当前记录](persistence-current-records.md)或[历史与冻结](persistence-historical-finalized.md)定位本次责任。本页保留固定来源的具体格式、条件、例外和负保证；Session／TypeScript名词与pnpm／scripts命令是来源绑定，不是本产品已提供的持久化执行器。目标需绑定真实根、版本、生成器与检查；缺执行器须报告缺项，不能手填生成哈希或声称验证完成。来源观察与示例验收用例不等于本产品或消费者运行通过。

已接受的机器声明与after-schema不可变；散文可以修订，但须同改动维护双语与配对。当前记录的定稿责任也由本页唯一拥有，不再另写一份接受协议。

<a id="persistence-historical-finalized.finalized-checkpoint-immutability"></a>

## 4. finalized/vN.json 的接受基线与不可变记录

### 触发

- 某格式被接受为兼容基线；
- 已经 finalized 之后又出现 schema 变更；
- 需要决定"same-version 还是 version bump"；
- 有人想"更新一下已接受的旧记录/旧快照"。

### 前置条件

- 存在完整、已验证的 history（baseline + 后续 acknowledgement）；
- 当前 schema 与已确认的 history 匹配；
- 状态记录里有配对的 `latestFinalizedVersion`；
- 目标文件名 `finalized/vN.json` 尚不存在（新版本用新文件，不覆盖旧文件）。

### 源义务

1. **检查点结构固定**：顶层键恰为 `schemaVersion`、`sessionFormatVersion`、`roots`、`acceptedRecords`；`roots` 是 `key -> {kind, digest, event?, surface?}`；`acceptedRecords` 是 `record id -> 64 位小写十六进制语义哈希`（`deepseek-harness/docs/persistence-changes/finalized/v4.json:1-13@687f282e`、`deepseek-harness/docs/persistence-changes/finalized/v4.json:371-379@687f282e`；`deepseek-harness/docs/persistence-changes/README.md:40-40@687f282e`）。
2. **检查点记录的是接受基线的完整 root 分类/digest 与已接受记录的语义哈希**；不含 prose、alias、source location；`finalized/vN.json` 不复制完整 schema，完整 after schema 由记录自身保留（`deepseek-harness/docs/persistence-changes/README.md:40-40@687f282e`）。
3. **已接受的机器记录与 after schema 不可变**；后续兼容的 V4 变更可以继续，但不得重写已接受的机器声明，也不得复用已接受的 3→4 过渡（`deepseek-harness/docs/session-format-status.md:35-37@687f282e`、`deepseek-harness/docs/persistence-changes/README.md:61-61@687f282e`）。
4. **新版本用新的版本命名检查点**，不替换旧检查点；同时推进配对的 `latestFinalizedVersion`；helper 要求当前 schema 与完整已确认 history 匹配，提交前跑普通验证器（`deepseek-harness/docs/persistence-changes/README.md:42-42@687f282e`）。
5. **finalization 与 publication 分离**：finalized 不表示已发布；release record 独立保留已发布版本与 `evidenceTag`（`deepseek-harness/docs/session-format-status.md:35-39@687f282e`）。
6. **finalization 不冻结 V4 之后的所有新增**：普通注释、alias、源码位置、保留已接受含义的实现修复不改变基线（`deepseek-harness/docs/session-format-status.md:37-37@687f282e`）。
7. **验证器检查保留的检查点哈希**，拒绝缺失/被改动的 accepted record；但它不能证明检查点与其权威记录"从未被一起编辑"（`deepseek-harness/docs/persistence-changes/README.md:76-78@687f282e`）。

### 本域解析到的 v4 检查点事实

- `roots` 共 62 个：3 个非 event root（`SessionHeader`、`JsonlHeaderLine`、`SessionEventEnvelope`）+ 59 个 `event:*`；其中 5 个 `surface: true`：`assistant/message`、`developer/message`、`system/message`、`tool/result`、`user/message`。
- `acceptedRecords` 共 5 条：
  - `2026-09-11-initial` → `1257b73faa71fda3504b42af8ef7fa6a8c608a1aafe4fc77f21b8cd1c30e0ec1`
  - `2026-09-12-auto-review-error-metadata` → `a98f6eb5d28618a355a358bddf7b278a25ab8aa08288c85e32c2031d7994b865`
  - `2026-09-14-image-offload` → `ec2ac7c3e20842e33870307384200b893a3ec0b0028882858abb0ac9dfc002c6`
  - `2026-09-14-workspace-changes-event` → `b5455973864a92f227f4af0c8eae2182dc33a20d22d2121083652aa0e61af83d`
  - `2026-09-16-session-format-v4` → `0d854cc665bea188f82b6b8d2298a7e484fd138dfdf1d1e974b8be2c9f15c6ac`
- 根键按字典序排序；`event` 字段与 key 的 `event:` 后缀一致；digest 均为 64 位小写十六进制。
- 与当前 catalog 的差异（结构化比较）：当前多 3 个根，8 个根 digest 与检查点不同。这证明 finalized 是"接受时基线"，不是"当前值缓存"；后续变更应由新的记录链承接。

### 步骤

1. 确认 history 完整：baseline + 每个受影响 root 的前驱链，无环、无重复后继、无 digest 不匹配。
2. 跑普通验证器（catalog、schema、history）。
3. 用 helper（源项目为 `createPersistenceFinalizationCheckpoint`）生成 `finalized/vN.json`；不要手写 root 映射，除非逐项核对。
4. 新增文件，不覆盖任何已有 `finalized/vM.json`。
5. 更新 `latestFinalizedVersion`（yaml block），保持发布记录不变。
6. 跑验证器；提交。
7. 后续变更：新增 change record（same-version 或 version-bump），刷新当前 catalog；不得编辑被 acceptedRecords 锁定的记录。

### 角色

- 维护者：确认基线、生成检查点；
- helper/验证器：断言 schema 与 history 匹配、accepted record 哈希未变；
- 评审者：对"same-version 是否安全"和"检查点与状态记录是否被协同篡改"做人工判断。

### 完成信号

- `finalized/vN.json` 结构/字段/排序/哈希长度全部通过；
- 所有 accepted record id 在 history 中存在且语义哈希匹配；
- `latestFinalizedVersion == N`；
- 后续记录能指向前驱，当前 roots 与最新记录一致。

### 失败处理

- **修改已接受记录**：停止；改为新增 successor record。删除/改写 accepted record 会使后续验证失败（缺失或哈希不匹配；具体错误由 release 域实现确认）。
- **版本 bump 想复用 3→4**：拒绝；version bump 需要自己的更高 writer 与 header transition。
- **检查点与状态记录不一致**：以完整 history + schema 重新生成；不要手改其中一边。
- **检查点缺失**：finalization record 要求检查点；补生成，不要用"当前 catalog"替代。
- **检查点哈希通过但 reflog 显示被协同编辑**：验证器无法发现；评审必须基于独立证据（提交历史、评审记录）判断。

### 例外

- 普通注释、alias、源码位置、保留语义的实现修复不需要新检查点（`deepseek-harness/docs/session-format-status.md:37-37@687f282e`）。
- 新版本可以新增根/事件；只要兼容性规则满足，仍可留在同一 writer（如当前 V4 的 65 根 vs 检查点 62 根）。
- 旧检查点可以继续存在并被加载；`finalized/v4.json` 保留，不因 writer 前进而删除。

### 证据边界

- 检查点只记录声明 root 分类/digest 与 accepted record 哈希，不包含运行时校验、恢复或 unknown-event 处理逻辑，也不能发现"声明不变但行为变了"。
- 检查点哈希只证明"与记录内容一致"；不能证明 accepted history 从未被重写，也不能证明解释在语义上正确。
- 本域对 `finalized/v4.json` 做的是完整结构解析 + 关键区段阅读，没有执行 `loadPersistenceFinalization`；执行证据属于 release 域。

### 迁移设计

【迁移设计】把"接受"做成独立于发布的不可变账本：
- `finalized/vN.json` 只存 root identity + accepted record 哈希；
- loader 在启动/CI 中验证：文件名版本 = `sessionFormatVersion`、metadata 键集合精确、accepted record 存在且哈希匹配、至少包含 baseline、前驱闭包完整；
- 新版本写新文件，旧文件只读；
- 单独的 release record 记录 `latestReleasedVersion`/`evidenceTag`，禁止用 finalized 代替。

【额外建议】在 CI 里把 `finalized/` 设为 CODEOWNERS 保护路径；对"检查点与状态记录同一提交修改"加人工审批规则，因为自动检查发现不了协同篡改。

### 验证（计划）

- 正向：加载 `finalized/v4.json`，5 条 accepted record 均可解析，roots 62 个，退出 0。
- 拒绝：删除 `2026-09-14-image-offload` 或修改其哈希 → loader 非零（拒绝缺失/哈希不匹配）。
- 拒绝：把 `sessionFormatVersion` 改成 3 或删掉 baseline → 非零（拒绝无效/缺失元数据）。
- 恢复：从 history 重新生成检查点（新文件）或恢复记录；不得手改旧 JSON。

