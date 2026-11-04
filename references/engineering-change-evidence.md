# 变更证据：性能测量与迁移行为

本页拥有两类“改动的证据”要求：§19 性能改动的测量证据、§20 迁移保持可观察行为。触发：改动可能移动热路径成本、声称性能中性或优化、新增 benchmark、出现内存/延迟回归；或迁移、包拆分、移动代码、重写、导出路径变化，以及迁移中发现缺陷。读本页前先读 [§0 使用约定与证据边界](engineering.md#0-使用约定与证据边界)，其中“只有自动门禁 + 失败样例才可声称自动保证”直接约束本页的测量结论与行为等价判断。

<a id="engineering-performance-evidence"></a>
## 19. 性能改动的测量证据（engineering-performance-evidence）

**触发**：改动可能移动热路径成本；声称性能中性/优化；新增 benchmark；内存/延迟回归。

**角色与前置**：改动者测量改动路径 before/after；benchmarks owner 拥有场景；domain owner 批准架构性性能代价。

**【源仓义务】**
- 可能移动热路径成本的改动，要在同一环境、同一输入下测量所改代码 before/after，并报告数字与条件。三个指标：运行时、峰值内存、稳态内存；粒度是改动路径，不是整机分数。“总体没变慢”不是证据；别处优化不能抵消此处回归。`deepseek-harness/docs/defensive-patterns/general.md:149-159@687f282e`
- 基线是**不带测量 hook 的同一路径**（通常是 native implementation），不是“旧实现 + 同样 hook”；两边都带 hook 会稀释差异直到消失。`deepseek-harness/docs/defensive-patterns/general.md:149-159@687f282e`
- 测量由 `benchmarks/` 拥有，一个用户路径一个目录；场景是入口；包内诊断用 `.perf.ts` 后缀，不加入 `test:bench`。CI 门禁 `check:ci:bench`（job `node 24 / benchmarks`）发布缩放报告；该门禁是**警报，不是通过**：回归要本地重跑 owning scenario 并 profile。保留内存声明用 `test:bench:memory 4g|8g`，在无 swap cgroup 中按不变预算重跑。`deepseek-harness/docs/defensive-patterns/general.md:149-172@687f282e`
- 边界：不触运行路径的改动（注释、文档、纯测试）不需要测量；生产性能代码不是可随意删除的 benchmark instrumentation（`performance.now()`/`scheduler.yield()` 是生产 decode/encode 调度的一部分）。架构改动确实有性能代价时，说明测得代价和理由，由 domain owner 批准。`deepseek-harness/docs/defensive-patterns/general.md:149-172@687f282e`
- benchmarks 规则：按测量用户路径组织；Host 用 `*.bench.ts`，Client 用 `*.bench.client.ts`；合成的固定输入，不用录制 Session/用户材料/网络；进程级 wall-clock/retained-memory 在 fresh children + private `mkdtemp`；每个预算端点先 `recordTimings`，声明测量什么/影响哪个用户场景；预算由评审常量决定，环境变量不得覆盖。`deepseek-harness/benchmarks/AGENTS.md:1-18@687f282e`

**步骤**
1. 识别被改动的热路径与用户场景。
2. 用不带 hook 的基线测 before；用同一环境/输入测 after。
3. 报告 runtime、peak RSS、steady RSS，附命令、环境、输入大小。
4. 若回归显著，profile 分段定位；架构性代价交 domain owner 批准。
5. 保留/更新 owning scenario；不要把包内诊断塞进 `test:bench`。

**完成信号**：PR 含可重建的数字和条件；基线无测量 hook；回归被定位或批准；预算不被环境变量覆盖。

**失败处理**：CI benchmark 绿不等于性能中性；若报告绿但怀疑回归，重跑 owning scenario。若无法测，明确“未测量”而不是宣称中性。

**例外**：不触运行路径的改动免测；故意性能代码不删。

**迁移裁剪**：目标没有 benchmark 设施时，保留“before/after + 同环境/输入 + 三指标 + 基线无 hook”的方法；可以用临时脚本，但不要把它伪装成持续门禁。缺少测量设施是前置条件或阻塞，不是自动豁免；临时脚本必须记录环境、输入、指标和未覆盖路径，发布前仍需可复现的测量证据。

**证据与限制**：测量是经验证据，不是证明；CI 警报不是通过。源仓明确说 benchmark 不建模所有路径。

来源：deepseek-harness/docs/defensive-patterns/general.md:149-172@687f282e 来源：deepseek-harness/benchmarks/AGENTS.md:1-18@687f282e

<a id="engineering-migration-behavior"></a>
## 20. 迁移保持可观察行为（engineering-migration-behavior）

**触发**：迁移、包拆分、移动代码、重写、导出路径变化、迁移中发现缺陷。

**角色与前置**：迁移 owner 逐项比较可观察行为；domain owner 批准不可避免的差异；评审者分离移动与语义变化。

**【源仓义务】**
- 迁移/包拆分保持外部可观察行为相等：错误码、诊断、数据流顺序、UI 时序逐项比较。优先移动代码而不是删除重写；重写适合语义本来就要变的代码，并列出差异。包/导出路径变化是载体变化，不是行为变化；行为变化是独立改动。`deepseek-harness/docs/defensive-patterns/general.md:174-180@687f282e`
- 无法完全相等时，改动要说明不同项及各自如何验证，并由 domain owner 批准。迁移中发现的缺陷作为独立改动修复，不折进移动。`deepseek-harness/docs/defensive-patterns/general.md:174-180@687f282e`
- 跨域边界：涉及 public API 或已提交 Session 持久格式时，迁移规则不等于版本策略。公开 API 仍是 pre-stable，必须同一改动更新所有 consumer；外部可感知 breaking change 立即记入 upgrade guide；已提交的 Session generation 不得移动、覆盖或删除，前代不意味着 fallback/downgrade；SQLite 使用单调 `SCHEMA_VERSION`。这些由 Release 域展开，本域只保留触发条件。`deepseek-harness/AGENTS.md:7-11@687f282e`

**步骤**
1. 列出可观察面：错误码、诊断文本、数据流顺序、UI 时序、公共导出。
2. 优先 `git mv`/移动；保持路径和错误码。
3. 若必须重写，逐项列出差异与验证。
4. 迁移中发现的缺陷单独 PR/改动。
5. 用 before/after 测试或快照证明相等。

**完成信号**：diff 主要是移动；错误码/顺序/时序逐项有证据；差异有 owner 批准；缺陷不混入。

**失败处理**：若行为变化不可避免，拆成独立改动并写迁移说明；不要用“迁移需要”自我批准。

**例外**：语义本来就要变的重写可列差异；包/导出路径变化本身不算行为变化。`deepseek-harness/docs/defensive-patterns/general.md:174-190@687f282e`

**迁移裁剪**：任何语言/仓库都适用；把“可观察行为”映射到目标公共 API/错误/时序。没有快照设施时用契约/集成测试替代，但替代必须覆盖公共 API、错误与时序；若做不到，把它列为前置条件或阻塞，并记录缺口与再激活触发（引入快照或回放设施）。

**证据与限制**：评审为主；测试/快照补充。移动 diff 小不证明行为相等。

来源：deepseek-harness/docs/defensive-patterns/general.md:174-190@687f282e 来源：deepseek-harness/AGENTS.md:7-11@687f282e
