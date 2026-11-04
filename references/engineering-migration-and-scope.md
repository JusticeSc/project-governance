# 迁移与范围：跨域依赖、落地顺序与证据限制

本页拥有工程域的范围边界与迁移程序：§38 跨域依赖、证据绑定与未决候选（导航）、§39 迁移落地顺序（建议）、§40 证据边界与禁止声称。触发：准备把本域机制应用到目标仓库、判断某项证据是否算数、引用其他 owner 而不复制其规则，或要确认哪些范围仍未独立审阅。读本页前先读 [§0 使用约定与证据边界](engineering.md#0-使用约定与证据边界)；§38 的 coverage 坐标只表示本域实际读过，不等于对 owner 全文的独立审计。

## 38. 跨域依赖、证据绑定与未决候选（导航）

本域不复制其他 owner 的规则；这里记录实际绑定到的证据、仍由 owner 负责的部分，以及未审阅候选。跨域“已读”表示对应专题页给出的坐标或本页实际给出的范围，不表示对 owner 全文的独立逐行审计。本节的 `path:range` 均属于同一固定提交；为紧凑省略 `@687f282e` 后缀，机制正文的源仓义务仍使用完整 citation 格式。

**已绑定且可追溯**
- **Documentation**：`docs/AGENTS.md:1-77`（Documentation 全读，本域也读全文）、`scripts/verify-doc-budgets.ts:1-58`、`scripts/doc-budgets.manifest.json:1-9`、`scripts/verify-export-jsdoc.ts:1-607`（Documentation 全读；本域复核 1-10、16-21、160-238、278-313、362-371）、`scripts/verify-concrete-terms.ts:1-105`、`scripts/verify-md-links.ts:1-203`、`.agents/skills/dsh-prose-standard/SKILL.md:1-81`。相关机制：`documentation-tier-placement`、`documentation-prose-budgets`、`documentation-comments-export-jsdoc`、`documentation-markdown-links`、`documentation-repository-reference-policy`、`documentation-slop-checklist`、`documentation-current-state`、`documentation-complete-proposition`。
- **Testing**：`docs/testing.md:1-55`（本域全读）、`packages/AGENTS.md:19-19`、`benchmarks/AGENTS.md:1-18`；测试 owner 另有 `snapshots/AGENTS.md:1-17`、CI 矩阵与 snapshot/e2e 规则。相关机制：`testing-tiered-evidence-selection`、`testing-execution-topology`、`testing-resource-isolation`、`testing-real-entry-composition`、`testing-source-built-entry-modes`、`testing-snapshot-required-and-placement`、`testing-benchmark-gate`、`testing-coverage-per-file-100`。
- **Release**：`AGENTS.md:7-11`（本域已读）只提供触发边界；session format/version、`SCHEMA_VERSION`、upgrade guide、packed install 与 release sequence 由 Release 展开。Release 相关参考已读 `scripts/release/verify-packed-install.ts:1-126`，但没有执行；不能把“已读源码”写成“安装已验证”。相关机制：`release-session-authority`、`release-session-migrations`、`release-upgrade-guides`、`release-npm-rehearsal`。
- **Automation**：`lefthook.yml:1-49`（本域全读）只用于 pre-commit/pre-merge 与 whitespace/translation/archived-note 证据；gate 调度、CI 平台矩阵、workflow 必需 job 不在本参考集内，按源仓路径定位。相关机制：`automation-lefthook-hook-matrix`、`automation-gate-aggregate-registry`、`automation-gate-dependency-graph`、`automation-gate-scheduler`、`automation-build-artifact-record`、`automation-local-check-boundary`。
- **Supply（已绑定）**：本域实际读 `scripts/verify-package-dependencies.ts:1-58、593-655、694-739、797-867、909-960`（非全文；59-592、656-693、740-796、868-908、961-1038 未读）、`scripts/package-dependency-policy.ts:1-105`、`scripts/check-workspace-constraints.ts:1-24、25-90、362-399、401-542、551-570、573-579、585-646、649-664`（非全文；其余区间未读）。Supply owner 的专题页已对这些文件给出近全文坐标：`verify-package-dependencies.ts` 近全文（1-58、59-592、596-700、704-823、824-923、924-1038）、`check-workspace-constraints.ts` 的 91-361/423-545/600-642、`verify-npm-install-layout.ts:1-275`、`scripts/release/pack.ts:1-108`、`scripts/release/verify-packed-install.ts:1-126`、`scripts/release/publish.ts:1-235`、`vendor/README.md:1-73` 做过读取；这些是 owner 证据，不是本域独立逐行审计。相关机制：`supply-chain-workspace-protocol`、`supply-chain-dependency-faces`、`supply-chain-manifest-publication`、`supply-chain-vendor-sync`、`supply-chain-vendor-patches`、`supply-chain-install-layout`、`supply-chain-packed-install`。
- **AgentFlows / Decisions / Collaboration**：只做导航，不复制。AgentFlows 负责 agent loop、session log/projection、turn/tool/LLM 事件语义；Decisions/Rationale 负责 Agent Note 生命周期、替代方案与 supersession；Collaboration 负责 PR 历史/标签/评审流程。本域只引用与本域机制直接相关的契约，不把它们的 coverage 当作本域证据。

**本域已读的子树指令（只取相交义务；完整矩阵见 [§1 的子树指令矩阵](engineering-workflow.md#engineering-instruction-tiers)）**
- `packages/AGENTS.md:1-29`、`scripts/AGENTS.md:1-5`、`packages/web/AGENTS.md:1-5`、`packages/schedule/AGENTS.md:1-11`、`vendor/AGENTS.md:1-7`、`.github/AGENTS.md:1-7`、`website/AGENTS.md:1-23`、`snapshots/AGENTS.md:1-17`、`native/system/AGENTS.md:1-28`、`apps/cli/tests/profiles/AGENTS.md:1-7`、`.agents/notes/AGENTS.md:1-7`、`.agents/notes/implemented/AGENTS.md:1-13`、`.agents/notes/archived/AGENTS.md:1-9`。这些文件的实际完整范围见 coverage；本域未把它们的产品/CI/站点/测试细节复制进工程机制。
- 中文 defensive-pattern 的六个 `.zh.md` 与六个 `.i18n.yaml` 已逐一读取；只做结构/语义 spot-check，没有重新计算 per-heading 哈希，也没有把 sidecar 存在当成配对验证通过。

**仍未独立审阅/未决（不得当作已覆盖）**
- `docs/subsystems/*` 除 `core.md:1-300、358-408`、`llm-streaming.md:169` 之外的逐子系统语义；`docs/api-gateway.md`、`docs/module-graph.md`、`docs/config-catalog.md`、`docs/cordis-tutorial/04-07`、`docs/web-styling.md`、`docs/subsystems/slots.md`。
- `packages/*/README.md` 的逐包契约（本域只读 `packages/README.md:1-101`、`packages/client/AGENTS.md:1-162`、`packages/experimental/*`、`packages/boot/hmr/README.md:1-129`）；`vendor/cordis/*`（`vendor/README.md:1-73` 已由 Supply owner 全读，本域未独立复核）。`scripts/gen-client-catalog.ts`、`scripts/gen-config-catalog.ts` 只从 package/grep 看到入口，未逐行读。
- `apps/*` 的真实启动/profile 实现与例外；`.github/workflows/*` 的完整 job 图（Automation/Release）。
- `scripts/run-gates.ts` 的完整模式/聚合图；本域只读 333-397、790-795、818-832 的片段。`packages/boot/hmr/README.md` 的替换失败回滚表述存在源内张力（77 说恢复旧模块/插件实现，113 说 import/start 失败不恢复旧版本），已列为 source-conflict；未执行失败替换实验，不能把“失败自动回滚”当保证。
- `snapshots/` 下 fixture 的 AGENTS（fixture 不是根治理指令）；`.agents/notes` 中未被本域引用的历史 Note。
- `verify-archived-agent-notes.ts` 的实现仍未逐行读；本域只从 `archived/AGENTS.md` 读到它拒绝被改/缺失的 sealed artifact、不完整 triplet、未知 kind、非法 archive metadata，并把完整实现归 Documentation。

**证据边界**：本节补充坐标为实际读过的部分（同一文件的不同区间已合并；部分文件仅读区间，精确范围即所列坐标）`docs/AGENTS`、`packages/client`、`verify-client-packages`、`verify-cordis-config`、`gen-cordis-catalog`（选区）、`check-workspace-constraints`、`verify-package-dependencies`、`verify-application-entrypoints`、`verify-product-use.spec`、`verify-client-domain-graph`、`verify-package-meta`、`packages/boot/hmr/README`、`vendor/loader/README` 与 lifecycle Note；未列出的路径不得视为已读。跨域证据不与本域证据合并计数。

## 39. 迁移落地顺序（建议）

1. **先冻结事实源**：建立根/子树指令层级，选定一个架构地图和 defensive-patterns 目录；把“单一事实归属”写进贡献指南。
2. **先做自动门禁的骨架**：应用启动、组合解析、源/产物平面、编译面、包形态/依赖、TLA、unknown cast、产品/实验隔离。每个门禁必须有正向、拒绝、恢复样例；没有负向样例的门禁不算自动保证。
3. **再补评审型规则**：seam、扩展点、生命周期、错误处理、客户端/会话渲染、性能证据、迁移行为。把它们写成可判定的 review checklist，而不是口号。
4. **按目标工具链参数化**：Cordis→目标 DI/插件；pnpm→目标包管理器；tsc/tsx→目标编译器；Vite/Typert→目标代码生成；React→目标 UI。保留判定句，不照搬命令。
5. **做一次干净消费者演练**：新项目 + 既有项目 + 第二种工具链；记录首次失败并修复，不要只演示成功路径。
6. **最后再声称自动保证**：只有门禁实际运行、负向样例变红、恢复后变绿，才在迁移记录中把证据从 `planned` 改为 `executed`。本参考作者没有执行这些验证。

## 40. 证据边界与禁止声称

- 本参考没有运行 `pnpm`、`tsc`、`vitest`、Oxlint、jscpd、Cordis Loader、浏览器或任何远程 CI。所有命令和预期输出都是源码阅读得到的“应执行义务”。
- 自动门禁存在不等于它在目标仓库已接线；评审规则存在不等于代理会遵守。迁移后必须逐条建立证据。
- “评审通过”“测试绿”“覆盖率 100%”都不证明机制有效；源仓事故 `docs/postmortem/0001-acp-default-export-drops-inject.md` 明确说明 178 个绿单测 + 100% 覆盖率仍漏掉真实 Loader 路径。
- 远程实验、生产发布、保护分支/审批变更不在本域授权范围内；需要用户显式授权和隔离环境。

## 附：补充来源坐标的读法

各机制小节的“补充来源坐标”列出补充区间，固定提交为 `687f282e`。坐标用于追溯，不新增正文断言；解释仍以对应小节为准。
