# 日志写入、投影与实验记录

新增持久事件、修改投影、实现恢复／fork或插件自有记录时读取。本页拥有运行时接纳与拒绝合同；声明变化另走[兼容性记录](persistence-current-records.md)，物理迁移另走[相邻转换](persistence-adjacent-migrations.md)。没有Session／模型表面的项目按其实际持久日志与派生状态绑定，不凭缺来源API免除对应作用。

<a id="persistence-append"></a>
## 追加先快照，拒绝不改变状态

日志append-only，已接纳事件不重排、改写或删除。追加边界先构造与调用方对象脱离的不可变快照、校验可无损JSON，再接纳并通知观察者；不能先改变日志／投影再发现序列化失败。共享迭代snapshotJsonValue一次读取、校验并复制嵌套值，避免有状态getter在校验与存储时给出不同值。BigInt、循环、稀疏数组、负零及非普通原型等不可无损JSON值在追加时拒绝，而不是等backend flush。

任何被拒绝的append都不得改变日志、派生状态或event feed。单调sequence与范围语义由日志拥有；重复／缺口可检测。surface事件携带并验证明确的追加／替换标记及引用范围；log-only事件不因名字相似变成模型消息。不能用归一化悄悄接受来源已禁止的元数据。

验收至少观察：追加含嵌套对象后修改原对象，已记录数据与派生消息不变；有状态getter不造成校验值／存储值分叉；不可序列化或元数据不合法的追加被拒绝，三种可观察状态均不变。不能只断言抛错或序列化字符串非空。

<a id="persistence-projections"></a>
## 恢复与派生状态

resume／fork从已接纳日志恢复，不依赖进程内镜像。投影读取日志、不回写日志，缓存可丢弃并重建；实时与恢复应用同一纯定义。改变模型可见内容的插件注册具名纯消息投影，接纳事件前执行并缓存不可变结果；缺定义时拒绝append与restore，卸载已使用定义也不能继续读旧缓存。detached reader显式装配相同定义，不从当前registry猜历史输入。

历史request header和来源坐标按日志保留，重启、fork、surface替换后仍能定位当时定义；最新header或当前插件不能替代旧消息引用的schema。损坏／不可读日志明确失败，不创建空会话冒充恢复。新语义使用新事件或有判别的版本，不能重解释旧字段。

<a id="persistence-experimental-records"></a>
## 实验记录仍有读侧契约

正式功能声明正式事件，关键恢复状态不能只依赖尽力保留的实验记录。来源appendPluginRecord的生产调用只限packages/experimental/的拥有包，仓外插件也不得调用；静态仓内检查不能证明外部调用方遵守。

每个记录在拥有实验包src中声明描述与显式payload类型，名称`plugin:<owner>/<record>`，动态名称放入已声明记录的payload，不动态扩大事件命名空间。记录与正式SessionEventMap、发布类型历史和KNOWN_SESSION_EVENT_TYPES分开；写入仍做不可变无损JSON快照。

记录必须带ignorable:true，不认识它的构建保留并跳过，永不进入模型可见surface，也不改变核心恢复状态。resume与fork携带原记录，格式迁移仅有来源明确的best-effort保留保证，不把它升级为正式数据承诺。删除／重命名当前声明不能丢弃已经保存的记录。

pluginRecordOf读出的data始终unknown，即使当前map声明了该名称，也由owner先校验后使用：旧构建可能写过不同payload，旧格式转换也可能把未知ignorable事件放进相同plugin:命名空间。非ignorable未知事件必须拒绝解释，不能猜形状、删记录或默默忽略。验收覆盖未知记录保留／跳过、恢复与fork重建、旧载荷拒绝或合法转换，以及不进入模型surface。

来源：[追加、投影与拒绝](https://github.com/deepseek-ai/deepseek-harness/blob/687f282e8625c6b8d11ff58211a90524be2e4317/packages/core/session/README.md#L40-L56)、[实验记录与读侧unknown](https://github.com/deepseek-ai/deepseek-harness/blob/687f282e8625c6b8d11ff58211a90524be2e4317/packages/core/session/README.md#L66-L76)、[无损快照校验](https://github.com/deepseek-ai/deepseek-harness/blob/687f282e8625c6b8d11ff58211a90524be2e4317/packages/core/session/README.md#L117-L119)。这些是需要目标落实的运行合同，不宣称本产品提供Session运行时或已验证目标行为。
