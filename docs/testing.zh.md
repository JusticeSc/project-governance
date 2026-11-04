# 测试与证据

[English](testing.md) | 中文

## 包级回归

npm test先运行各workspace自己的测试脚本，再运行根测试。checks测试覆盖真实命令校验、执行失败和真实路径包含；distribution测试操作真实文件、拒绝覆盖与重定向安装路径。文档测试保留真实parser及compiler行为、双语记录、归档限制、边界和畸形输入。缺声明的parser/compiler前提会失败而非skip。

根tests/structure.test.mjs检验临时npm/ESM图：包发现、公开export可见性、声明归属、生产／测试隔离、依赖方向与环、公开入口落点、重定向manifest与源码路径，以及通过合法根别名调用CLI。包含边界的负向夹具使用真实存在的目标；未声明依赖另由Node证明可解析。每个夹具在测试后清理。实际产品图的接受证据归下述共同结构检查与安装座smoke，不归该夹具套件。

测试断言消费者可见的接受、拒绝、状态转换及副作用，不因规则文本或命令字符串存在就认证规则正确。临时消费者文件隔离在系统临时目录，运行后清理。

## 真实产品smoke

npm run smoke使用npm pack，在独立消费者中安装tarball，再于其workspace根执行npm ci --offline --ignore-scripts。它调用真实CLI，把Skill安装进带空格／Unicode路径的已有项目，准备安装座并执行消费者声明的检查；随后在安装座运行npm run check:structure并期望接受，在apps/cli/bin/governance.mjs的shebang之后注入对packages/governance/checks/src/index.mjs的真实相对私有import，期望门拒绝，再按字节恢复并期望重新接受。真实无效配置失败，恢复后成功；重复安装被拒绝，消费者原有状态字节不变。安装文档检查不依赖兄弟来源检出。

smoke使用首次npm ci已经取得的依赖。离线缓存失败是前提失败，不证明产品回归或成功。载荷结构与一次安装调用本身，不证明全部交互任务、操作系统、远端服务或消费者专属策略。

## 自检语料

根npm run check使用唯一governance-checks.json定义。语法检查作者模块。结构门检查声明的apps/packages图及各包声明的import；它校验字面量静态import与export及字面量动态import与require，禁止作者源码链接，并对计算式import()／require()调用、别名loader、require.resolve、import.meta.resolve及其他动态拼装不作证明。它不判断语义质量；TypeScript parser不可用属于前提失败，不是接受。独立的templates/node-typescript workspace保留自身结构谓词，不由此产品的门覆盖。文档检查显式覆盖根入口、references、docs、应用和包，验证链接、单行散文、入口预算、声明的双语配对、包摘要及限制。归档排除只影响来源枚举，不豁免指向归档的链接解析。

编译和类型等价门单独由目标配置：目标TypeScript工程／声明与绑定是前提。子系统页、升级指南、仓库引用策略也各需真实目标合同。包测试证明其行为，不把空／默认扫描汇报为消费者激活。现有Markdown示例与来源坐标，不自动当作已编译产品API。

## 模板验证

npm run check:template把模板作者树导出到隔离目录，在其中执行corepack pnpm install --frozen-lockfile --ignore-scripts，构建产物平面，并驱动构建后CLI处理空源清单与非法参数。模板完整门禁图——结构、源码类型检查与回归、文档谓词、Agent Note格式与归档检查、lint、逐文件覆盖率、构建及构建产物smoke——是模板自身合同，由其自身CI工作流执行。它执行的正是消费者取得的路径——新输出目录、不借外层node_modules、不安装嵌套依赖。该入口需要Corepack，并能取得固定pnpm与模板锁定依赖；包管理器、registry或锁条目不可用属于前提失败，不是模板拒绝。根检查清单调用该入口，因此本地运行与产品CI共享同一定义，产品无需第二条工作流。每个模板谓词证明什么、拒绝哪些目标违规以及如何恢复，归模板页`templates/node-typescript/docs/testing.md`，本页不重复其合同。

模板结果只建立其谓词。它不证明B阶段对后续开发的治理效果、C阶段Agent复现或独立采用。模板的Linux覆盖通过模板自身CI工作流声明，不由本地Windows Node 24运行观察得到；远端执行、必需检查与分支保护需各自证据。

## CI与未验证层

.github/workflows/check.yml声明在hosted Windows／Linux、Node 22.19和24上执行锁定安装、根检查与真实smoke；根检查清单包含模板导出、锁定安装、源码构建与构建后CLI运行，因此该任务无需第二条产品工作流即可覆盖取得路径；模板自带工作流运行其完整门禁图，属于独立声明。工作流或本地运行不证明远端执行、分支保护、人工审批、发布或稳定独立Agent采用。本产品自身运行时不提供已工作的Note归档执行、加权审批执行或旧宿主预检；模板的归档执行器属于导出的副本。触发的规则仍是义务，不是豁免检查。

交代实际命令、退出状态、变化输入、相关消费者状态及剩余限制。保留首次失败并修原因，不覆盖失败证据，也不从测试数量推定更宽保证。
