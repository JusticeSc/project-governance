# 测试与证据

[English](testing.md) | 中文

## 包级回归

npm test先运行各workspace自己的测试脚本，再运行根测试。checks测试覆盖真实命令校验、执行失败和真实路径包含；distribution测试操作真实文件、拒绝覆盖与重定向安装路径。文档测试保留真实parser及compiler行为、双语记录、归档限制、边界和畸形输入。缺声明的parser/compiler前提会失败而非skip。

根tests/structure.test.mjs检验临时npm/ESM图：包发现、公开export可见性、声明归属、生产／测试隔离、依赖方向与环、公开入口落点、重定向manifest与源码路径，以及通过合法根别名调用CLI。包含边界的负向夹具使用真实存在的目标；未声明依赖另由Node证明可解析。每个夹具在测试后清理。实际产品图的接受证据归下述共同结构检查与安装座smoke，不归该夹具套件。

测试断言消费者可见的接受、拒绝、状态转换及副作用，不因规则文本或命令字符串存在就认证规则正确。临时消费者文件隔离在系统临时目录，运行后清理。

## 真实产品smoke

`npm run smoke`打包产品并将tarball安装到隔离消费者，再离线准备其workspace。打包后的CLI向已有项目安装独立Skill并检查冲突保护；复制的Skill无需workspace依赖即可将模板安装到自身所在项目，并拒绝重复安装。打包产品的结构检查先接受、再拒绝跨包私有导入、精确恢复后重新接受；消费者检查也覆盖正常、无效配置拒绝及恢复。既有消费者状态保持不变。

smoke使用首次npm ci已经取得的依赖准备消费者；其模板夹具可能访问配置的 registry 取得 workspace 元数据。缺少缓存或 registry 不可用是前提失败，不证明产品回归或成功。载荷结构与一次安装调用本身，不证明全部交互任务、操作系统、远端服务或消费者专属策略。

## 自检语料

根npm run check使用唯一governance-checks.json定义。语法检查作者模块。结构门检查声明的apps/packages图及各包声明的import；它校验字面量静态import与export及字面量动态import与require，禁止作者源码链接，并对计算式import()／require()调用、别名loader、require.resolve、import.meta.resolve及其他动态拼装不作证明。它不判断语义质量；TypeScript parser不可用属于前提失败，不是接受。独立的templates/node-typescript workspace保留自身结构谓词，不由此产品的门覆盖。文档检查显式覆盖根入口、references、docs、应用和包，验证链接、单行散文、入口预算、声明的双语配对、包摘要及限制。归档排除只影响来源枚举，不豁免指向归档的链接解析。

编译和类型等价门单独由目标配置：目标TypeScript工程／声明与绑定是前提。子系统页、升级指南、仓库引用策略也各需真实目标合同。包测试证明其行为，不把空／默认扫描汇报为消费者激活。现有Markdown示例与来源坐标，不自动当作已编译产品API。

## 模板验证

模板检查只导出白名单文件、按锁文件安装、构建空 workspace 并运行其测试套件；只在临时副本新增库和消费该库的应用，证明缺少 host 引用会被拒绝，运行两者产物并验证库对非法输入的拒绝，最后清理再构建。Node 24、包管理器和初始离线缓存是前提；workspace 夹具更新临时锁文件时可能需要访问 registry。模板的完整门禁图与 CI 工作流独立；其[测试指南](../templates/node-typescript/docs/testing.md)拥有对应谓词与证据边界。

模板结果只建立其谓词。它不证明B阶段对后续开发的治理效果、C阶段Agent复现或独立采用。模板的Linux覆盖通过模板自身CI工作流声明，不由本地Windows Node 24运行观察得到；远端执行、必需检查与分支保护需各自证据。

## CI与未验证层

`.github/workflows/check.yml`声明在 hosted Windows／Linux、Node 22.19 和 24 上执行锁定安装、根检查与真实 smoke。根检查包含模板导出与隔离 workspace 验证；模板自带工作流运行其完整门禁图。工作流文件或本地运行不证明远端执行、分支保护、人工审批、发布或独立 Agent 采用。Note 归档和加权审批执行器属于导出模板，而非产品运行时；触发时责任仍然适用。

交代实际命令、退出状态、变化输入、相关消费者状态及剩余限制。保留首次失败并修原因，不覆盖失败证据，也不从测试数量推定更宽保证。
