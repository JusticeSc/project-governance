# 构建、分发与发布责任

修改manifest、导出、安装、构建或发布路径时读取。本页规定产物与发布的责任，不提供registry、原生、Python或Desktop发布实现，也不因缺工具取消触发的义务。来源实例的包名、矩阵、审批环境与阈值属于其产品绑定；目标必须明确实际绑定，不能把别人的发布成功当自身证据。

<a id="npm-sequences"></a>
## 版本、成员与顺序

发布族各自明确成员、权威版本、tag、channel及依赖关系；不同发布族不因同仓就共享版本或审批。版本先写进manifest和锁并提交，tag指向该版本提交；CI验证与上传，不暗中改仓库版本。private成员不打包发布；实验命名不自动意味着private或获得支持承诺。

成员发现依据manifest与真实产品入口，不靠手工重复包清单。发布图区分runtime、optional、peer与dev依赖；循环和未解释的丢边在打包前失败。顺序必须保证中断只留下可安装前缀，不能随机挑包恢复。发布权限由publishConfig与真实registry政策拥有，不能用统一命令flag覆盖不同包的公开级别。tag存在只证明提交标识，不证明发布完成。

<a id="publish-order"></a>
## 消费者载荷

根据实际exports、bin、资源与运行依赖确定payload；不能机械排除src或强求lib。唯一白名单拥有安装／打包范围，许可证与来源通知随内容分发；依赖、缓存、会话状态及旧实验材料不进入运行包。验证真正生成的archive，不用workspace源码替代。验证安装后导出、类型与关键进程启动；包能安装不代表交互、升级、所有平台或真实外部服务已验收。

<a id="npm-rehearsal"></a>
## 无凭据预演与授权发布

PR／push预演保持只读、无发布凭据：锁定安装，核对版本和依赖图，按实际产物依赖构建、打包，在checkout之外的干净消费者安装真实tarball并启动。自有workspace依赖从本次产物解析，不能偷偷使用registry旧版本、全局模块或兄弟源码。清除NODE_OPTIONS／NODE_PATH等解析注入，隔离消费者状态并结束清理。

本产品是可执行workspace，根npm-shrinkwrap.json是唯一锁：npm pack不携带package-lock.json，而shrinkwrap能够随载荷发布。安装本产品tarball后仍需在其workspace根npm ci --ignore-scripts准备本地包；不能声称根tarball的npm install自动完成子workspace依赖。实际操作见[开发](../docs/development.md)，消费者证明见[测试](../docs/testing.md)。

正式发布需要另行明确授权，从已核对tag人工触发，验证tag／版本／成员与审批环境。发布dispatch生成的字节与预演字节不能混称同一artifact；发布job下载并上传已验证的本批产物，不重新隐式构建。不同发布族写registry须协调同一写锁，不能取消进行中的事务。required reviewers、禁止自审、允许tag和secret是平台配置，YAML引用environment不证明这些已启用。

<a id="rehearsal-runner-trust"></a>
## 持久runner与不可信代码

默认hosted。持久共享runner只接受writer控制的路由与可信事件；fork／不可信actor不能因预演无registry凭据就获得持久信任域。缓存、临时路径与工具安装按run／attempt／job隔离，旧checkout输出清理后再验证；暖缓存不代替workspace链接或当前构建。真实发布保持独立可信host。选择器测试不证明真实build／安装执行，更不证明共享host安全配置。

<a id="npm-registry"></a>
## 发布三态与恢复

逐包比较registry版本及实际artifact integrity：缺版本才上传；版本已存在且字节一致则跳过；同版本字节不同立即停止并bump，不删除、覆盖或移动已发布tag。版本与channel／dist-tag是不同事实，重跑旧artifact可能倒退可变latest，必须先核对绑定。预检查不是原子预留，最终状态仍由发布负责人回读。

仅对已确认的暂时错误做有界重试，永久权限／格式错误立即失败。每次重试前回读registry，处理“报告失败但实际已写入”；不得盲重传。源npm发布器的绑定为每次真实publish间隔至少2秒，最多4次、2／4／8秒退避，仅E409、E429、E500、E502、E503、E504、ETIMEDOUT、ECONNRESET、EAI_AGAIN；目标更换registry时需重核该绑定，不能把所有错误纳入重试。恢复保持原顺序与同一已验证artifact；字节可复现性必须测量，不能当作来源已证明。

<a id="native"></a>
## 原生与平台产物（有此表面时）

维护者拥有真实支持矩阵、ABI／架构／元数据及工具链绑定；每个平台构建一次，同一批字节跨支持的Node运行。需要无编译器／musl安装能力时在相应目标真实安装、启动并执行隔离／系统能力。必须具备的内核能力缺失时不能以skip冒充通过。预构建聚合检查完整平台集合、格式、架构和版本，runtime依赖闭包须真实安装验证，不能在消费现场编译作为未声明fallback。

<a id="python"></a>
## SDK与内嵌runtime（有此表面时）

SDK与runtime的版本、精确依赖pin、平台文件名、元数据、许可证、资源哈希与执行位由打包侧检查，拒绝多余／缺失payload或源码editable导入。实际消费者在干净venv、仓外cwd启动，先证明导入及可执行文件属于安装distribution，再执行行为；keyless与live API单独报告。发布runtime与SDK若分事务，先验证真实依赖顺序，部分失败仅恢复缺失阶段，不重复覆盖已发版本。构建目标与host约束必须来自实际工具，不能从一条成功host推断任意交叉构建。

<a id="desktop"></a>
## 安装器、签名与更新（有此表面时）

生产／测试channel与构建版本显式分开；版本输入贯穿产物、descriptor、feed和完成记录，不用临时改tracked manifest后回滚来制造产物。打包侧验证schema、shell/runtime版本、目标及协议；不能在启动层重新加入无具体故障依据的发布比较来替代安装字节身份。上传前核对完整文件集合、size／hash、签名／公证及feed目标，debug／unsigned不进入生产。


产物按run／attempt不可覆盖保留；签名和secret需真实平台前提。公开不可变二进制在前，可变feed在后，feed回读验证；不要因tag／记录补写失败重新上传或回滚已公开字节。锁失联不自动超时夺取，先确认无活跃发布。实际全新安装、从精确前代更新、失败恢复的journal与可操作界面证据独立于静态签名／hash。故障注入仅修改自己拥有的测试规则，不能删除他人的网络策略或复用旧receipt。

<a id="persistence-release-state"></a>
## 数据接受与发布记录

当前writer、已接受finalized、已发布格式与历史快照是四个独立权威，依[历史与冻结](persistence-historical-finalized.md)。提升writer前归档上一代；已提交代际只追加，不能移动／覆盖。发布成功后核对发布tag内真实writer，再推进已发布记录与evidenceTag；不因workflow绿色跳过。类型改变的确认与语义安全依[当前记录](persistence-current-records.md)，不是打包脚本拥有的判断。

<a id="upgrade-guides"></a>
## 外部破坏与交付证据

[升级指南](upgrade-guides.md)在引入破坏的同次变更写，不推迟至发布；未发布原位更新、回滚删除、bump后冻结、只描述一个release。格式门不能发现应写而漏写。

<a id="release-operator"></a>

发布负责人保存选定提交与tag、run／attempt、实际审批、构建／pack日志、顺序、artifact摘要、registry／feed回读及安装证据；保留失败与重试原始记录。预览URL不是生产发布，draft不是公开release，仓内workflow不证明GitHub／GitLab保护或部署成功。失败修复原因或报告确切缺前提，不放宽guard、删失败批次或以计数认证通过。

来源：[发布族与版本记录](https://github.com/deepseek-ai/deepseek-harness/blob/687f282e8625c6b8d11ff58211a90524be2e4317/.agents/notes/implemented/process/2026-08-10-npm-release-sequences.md)、[实际发布三态](https://github.com/deepseek-ai/deepseek-harness/blob/687f282e8625c6b8d11ff58211a90524be2e4317/scripts/release/publish.ts)、[安装产物隔离](https://github.com/deepseek-ai/deepseek-harness/blob/687f282e8625c6b8d11ff58211a90524be2e4317/scripts/release/verify-packed-install.ts)、[Desktop打包责任](https://github.com/deepseek-ai/deepseek-harness/blob/687f282e8625c6b8d11ff58211a90524be2e4317/.agents/notes/archived/architecture/2026-09-09-desktop-build-release-validation.md)、[npm可分发锁](https://docs.npmjs.com/cli/v11/configuring-npm/npm-shrinkwrap-json/)。
