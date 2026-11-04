# 持久化类型变更

[English](README.md) | 中文

插件市场索引是本模板当前的持久 JSON 契约。唯一类型 owner 为 `packages/util/plugin-market-index/src/types.ts`：`MarketIndex.format` 是 writer 判别字段，当前为 1。实际 reader 是同包的 `parseMarketIndex`。 [当前清单](current/schema.json)覆盖 `MarketIndex` 和所有可达声明类型。 schema 引擎把这个拥有版本字段的顶层记录分类为 `header`，它不是 Session header。 初始绑定没有 Session、历史发布清单、数据库 schema 或已经人审接受的检查点。 未来数据库拥有自己的 schema 与单调版本政策，不继承 Session generation。

## 归属与证据

`scripts/persistence-schema.ts` 把来源编译器类型图引擎绑定到真实类型 owner。 `gen-persistence-catalog.ts` 拥有当前清单及双语目录。普通注释、别名、源码位置、 readonly 标记和无语义变化的声明排序不改变结构摘要；目录需要刷新不一定需要 新确认记录。

每个带日期的变更拥有四个文件：中英文 Markdown、完整且自包含的 `.schema.json` after 快照，以及 `.i18n.yaml` 配对记录。两种 Markdown 包含完全相同的 `yaml persistence-change` 声明。每个受影响根记录前驱、after 摘要（删除时为 null 墓碑），以及 `same-version` 或 `version-bump` 决策。不同根可独立演进； 历史顺序由前驱关系决定，不由文件名日期决定。初始基线只捕获当前声明结构， 不是发布、接受决定，也不证明运行时检查已经执行。

## 评审与记录

1. 保留 base 与 head 清单以及它们的实际 commit 身份，运行 `pnpm exec tsx scripts/persistence-review.ts --before BASE --after HEAD --json`。 评审所有受影响根、类型图路径和分类器观察。分类器不能决定语义安全。
2. 检查实际 reader 的两个方向：新 reader 读取旧输入，以及旧 reader 读取新输入。 验证器丢弃未知成员并拒绝不支持的格式号；只有必要含义得到保留，丢弃字段才安全。 新 source 分支不等于可忽略的 Session attribution-only source；不要在本格式上 激活 Session source 注解承诺。
3. 执行相关 reader、writer 和迁移行为检查。编写 JSON 文件，包含 `en` 和 `zh`， 各有非空的 `summary`、`compatibility`、`verification` 字符串。描述实际转换、 两个读取方向及真实执行的检查，披露未验证行为。生成器不能证明或发明这些声明。
4. 用 `pnpm exec tsx scripts/persistence-changes.ts --record ID --decision same-version --prose FILE --json` 记录。ID 使用 `YYYY-MM-DD-slug`。 升版要求本条记录自己的 `MarketIndex.format` 递增转换，不能复用旧记录的升版。 缺少安全判别信息而产生不安全解释时，需要新格式和真实 reader 支持，不能只改类型。
5. 未接受的尾部记录可用 `--update ID --decision same-version --prose FILE` 更新。 基线、有后继的记录和已接受记录不能更新。重新评估完整转换，不为不同变更复用 解释；竞争尾部在集成时必须协调成一条有序的根历史。
6. 运行 `pnpm exec tsx scripts/gen-persistence-catalog.ts --check` 和 `pnpm exec tsx scripts/persistence-changes.ts --check --json`，以及所属行为测试 和文档门禁。check 只证明当前树一致性，不能代替 base/head 评审或证明人审。

初始绑定只在历史尚不存在时执行一次 `--baseline ID --prose FILE --json`。 该操作从真实源码提取，不得伪造历史格式。所有修改命令都要求说明，不会静默提供 验证事实。显式生成命令为 `pnpm exec tsx scripts/gen-persistence-catalog.ts`。

## 已接受检查点

明确接受后，`pnpm exec tsx scripts/persistence-finalize.ts --version N` 从完整确认的当前源码捕获新的 `finalized/vN.json`，拒绝覆盖。同一获授权变更内， 在两个 README 语言添加完全相同的 `yaml market-format-finalization` 块，内容为 `latestFinalizedVersion: N`；更新后运行普通验证。不得用该声明冒充尚未发生的评审。

检查点锁定机器声明和 after schema，不锁定说明、别名或源码位置。保留所有早期 检查点。后续兼容的同格式变更仍然允许，但不能重写已接受记录或基线。定稿与发布 分开，本设施不声称任何发布。当前树哈希一致性不能证明权威检查点与其锁定数据 没有被同时修改；还须评审可信 base/head 历史。
