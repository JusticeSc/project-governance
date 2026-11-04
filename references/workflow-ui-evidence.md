# UI响应式与浏览器证据

[代理流程索引](agent-workflows.md)只作任务导航，本页拥有具名操作条件。来源标记说明固定提交687f282e的义务、事实及适配，不代表已运行。来源的pnpm／change-scope／gh stack等命令与目录是其绑定；目标须用真实现有工具实现同等作用，不得把未分发的来源命令冒充本产品能力。未有commit的空项目按空树与实际新文件核对范围，不伪造base／head；已有提交或PR则必须验证真实ref及各脏层。

<a id="aw-12"></a>
## 12. UI/UX 与响应式工作流

### 12.1 `dsh-client-ui-ux`

`【源义务】` 触发：新增/修改 `packages/client` 的产品用户可见 GUI 行为，或评审此类 PR。技能是指导，不是完整清单；它处理 lint/typecheck/i18n 门禁无法做的判断（`dsh-client-ui-ux/SKILL.md:6-14`）。

关键规则组（`dsh-client-ui-ux/SKILL.md:10-73`）：

- **架构前置**：Slot/props、响应式读取、导出、ctx、分层规则见 `packages/client/AGENTS.md` 与 `docs/defensive-patterns/client-components.md`。
- **视觉基础**：颜色/圆角/间距用现有 token；引入字面值前先搜索目标页与最近兄弟页；**每个颜色在明暗两主题都验证可读**；新增/修改特性 CSS 的字重上限 500（markdown 排版 token 例外）；字号从主题排版变量或页面既有比例选；图标/文本/相邻元素成比例对齐。
- **先复用**：扩展现有组件/容器/交互优先；图标来自现有图标库，新字形需设计者批准；右侧栏内容注册到现有 sidebar 的 slot；纯图标且含义不明显的动作加 Tooltip，需要悬停/选择才能读的信息用 HoverCard。
- **反馈面**：瞬时操作结果用应用级 Toast，且 toast 状态与渲染在比报告面更长寿的 host（如 `shell.overlay` 条目）中；失败操作保持数据可见；就地 notice 用于与面绑定的状态（查询失败 + Retry、表单字段校验）；错误文案用平实语言、最多两句；中文 notice 不超过两句时省略句号；notice 不得挤动布局。
- **加载态**：列表用 skeleton；其他页面级加载居中裸 spinner；不要角落 spinner；每页/组件一种加载处理；无必要时不加加载文字。
- **遮罩与菜单**：每个菜单/popover/tooltip 合并前验证可关闭（外部点击、可聚焦时 Escape）、适配视口（滑动/翻转、边缘留白、不来回振荡）、不被裁剪（逃逸 overflow 祖先与 containing block，必要时 portal 到 body，不被相邻元素覆盖）。滚动条留在容器内，用共享样式，验证不溢出、不被圆角/边缘裁剪，保留小 inset。
- **平台窗口**：macOS titlebar clearance 是 `--dsh-frame-top-clearance`，由 Menu/Modal/overlay 原语作为顶部安全边距消费；**永远不要**为修一个页面改全局变量；在页面自身 inset 上加 scoped `[data-platform='darwin']` 覆盖，并在页面样式 spec 中断言。评审时说明预期总偏移（clearance + page inset）。
- **间距**：审查每个改动区域的间隙；相邻元素不留无意贴边；平行元素优先对称；无法解释的一次性间隙通常意味着漏了共享值。
- **设计评审升级**：大幅 UI 变更或任何明显可感知的 UI/交互变更必须获得设计者或产品评审；没有该角色时建议从设计/产品评审者请求。源文列出 2026-09 roster，并要求成员变化时在此更新（`dsh-client-ui-ux/SKILL.md:71-73`）。

### 12.2 `dsh-responsive-ui`

`【源义务】` 规则（`dsh-responsive-ui/SKILL.md:8-54`）：

1. 主验收最小视口 390 CSS px；无意外重叠、裁剪、页面级横向滚动、主操作不可达；390px 以下可放宽。
2. 决策顺序：先调空间分配/换行 → 再考虑文本截断、纯图标、把图标移入 More 菜单；主操作与主状态不得省略；不得用全局裁剪、缩小所有字号、缩小点击目标隐藏冲突；只有产品设计明确要求才缩字号。
3. 截断内容必须能在次级页或菜单完整获得；截断不得丢失错误或关键信息；tab 导航、可见选择器、按钮、标签优先单行截断；无法在别处获得的重要信息必须完整显示。
4. 标题优先完整显示；必要时把动作区换行；卡片标题优先自然换行；限制行数时必须仍能查看完整标题。
5. 纯图标控件需同时满足：图标清楚传达含义或操作对用户熟悉；悬停有 tooltip。“More account information”不得降为图标（它导航到独立页）；输入框模型选择器可降为图标（高频且可开菜单切换）；自动化任务中的关联会话是另一例。
6. 移动 hover：只在支持 hover 的设备启用鼠标悬停效果，用 `@media (hover: hover)` 而不是视口宽度；手机上点击不得留下只为 hover 设计的背景/高亮/按钮可见性；保留正常 selected/enabled/pressed 与键盘焦点指示；宽度变化时尽量保留焦点，除非焦点元素因此从页面消失。
7. 移动 tooltip：只提供辅助信息（动作名、键盘快捷键）的 tooltip 在移动端不显示；提供补充说明的 tooltip 必须支持点击显示。
8. 移动端除非明确意图，不自动升起输入键盘。

### 12.3 执行卡片

- **前置条件**：能运行 Web/Desktop；能截图或录屏；有明暗主题；有 390px 视口。
- **步骤**：读架构与 token 规则 → 复用优先 → 反馈面选择 → 遮罩三验 → 390px 与明暗主题验证 → 设计评审。
- **责任者**：UI 实现者；设计/产品评审者（批准）。
- **完成信号**：明暗主题可读；390px 无重叠/裁剪/横滚；遮罩可关闭/适配/不裁剪；错误与加载态符合面选择；GUI PR 有真实 GIF。
- **失败处理**：token 缺失时先找最近兄弟页；平台 clearance 冲突时用 scoped override 而不是改全局；无法获得设计批准时停止落地新字形。
- **例外**：markdown 排版 token 的字重例外；390px 以下布局要求可放宽；原生 picker 行为测试可省略 browser overlay。
- **证据限制**：这些是判断规则，自动门禁只覆盖 i18n、类型、lint；视觉与交互仍需人/截图验证。

---

来源：deepseek-harness/.agents/skills/dsh-client-ui-ux/SKILL.md:1-73@687f282e 来源：deepseek-harness/.agents/skills/dsh-responsive-ui/SKILL.md:1-54@687f282e 来源：deepseek-harness/packages/client/AGENTS.md:1-40@687f282e 来源：deepseek-harness/docs/defensive-patterns/README.md:1-25@687f282e



<a id="aw-14"></a>
## 14. 浏览器证据与 GIF 工作流

### 14.1 何时必须

`【源义务】` 改变产品用户可见 GUI 行为的 PR **必须**包含一个用本技能录制的演示 GIF，并通过 attach 工作流嵌入 PR body。录制本身是证据：用该 PR 分支树启动的真实服务器、真实 API key、真实模型轮次。**绝不**用 fixture 查询、mock transport、合成事件注入或测试专用 hook 替代，除非用户明确要求 fixture 录制。GIF 旁要写：演示的精确 commit SHA、服务它的 tree 与 origin、任何模式标志或浏览器状态例外、是否跑了真实模型轮次。来源：`record-browser-gif/SKILL.md:12-16`。

### 14.2 录制与发布分离

`【源义务】` 录制只产生本地视频/截图与一个 `.gif`，从不改远端状态。发布（`gh --attach`，或 push 到 assets 分支并嵌入 URL）是独立最后一步，只在任务包含附加到 PR 时执行；它永不触碰 PR 自己的分支。保留请求的录制条件；凭据或服务器不可用时报告限制，不要用 fixture 替代。永不读取或暴露凭据值；用应用正常配置路径与良性演示 prompt。来源：`record-browser-gif/SKILL.md:18-24`。

### 14.3 按 PR 暂存

`【源义务】` （`record-browser-gif/SKILL.md:25-33`）：

1. 要求干净 worktree；用 `git rev-parse HEAD` 记录精确 commit；构建该记录树（`pnpm run build && pnpm run build:web`）。用另一个 commit 的构建录 GIF 会错误归因证据。
2. 每个端口一个服务器，从该树启动，使用全新 scratch `DSH_HOME`、`DSH_AGENTS_HOME`、workspace、session state。浏览器也要全新隔离 context/profile；若浏览器工作流无法创建，导航前清该 origin 的 cookies 与 site storage。真实 API 凭据可能在 `~/.dsh/.credentials.yaml`，即使 `DEEPSEEK_API_KEY` 与根 `.env` 不存在；scratch `DSH_HOME` 下用 recording overlay 把 `dsh-credentials-local` provider 的 `path` 指向该文件绝对路径；让应用正常凭据 provider 解析，绝不回显 key。
3. **一个 storyboard 一次证据运行**：每个发布帧来自同一服务器与那些 state roots、workspace、session、模型场景运行。捕获自动化失败时丢弃其帧，从全新 roots 重跑；**绝不**拼接不同运行的帧。
4. 切换 PR 时按 PID 或精确命令行匹配停旧服务器；宽泛 `pkill -f` 可能匹配并杀掉启动它的 shell。

### 14.4 录制与编码

`【源义务】` 优先使用可用的浏览器控制工作流；它暴露 `recordVideo` 时在同一受控 context 启用视频以捕获更多中间帧；否则用截图捕获。只有浏览器控制不可用时，才用仓库声明的 Playwright 依赖在隔离 headless 浏览器中回退，并在 capture notes 说明。源仓库中它从 `apps/web/package.json` 解析；不要另装 driver 或打开用户浏览器。来源：`record-browser-gif/SKILL.md:34-43`。

`【源义务】` 录制前识别 origin、构建或 dev server、transport、任何模式覆盖。生产默认打开自动化无法驱动的原生面时，通过正常应用配置选一个官方浏览器可操作后端并披露覆盖。脚本、原始视频、时序笔记、QA 帧、GIF 存仓库 gitignored 的 `.playwright-mcp/`；先建 run 目录。来源：`record-browser-gif/SKILL.md:36-42`。

`【源义务】` 视频：显式匹配 `viewport` 与 `recordVideo.size`，否则 Playwright 会缩到 800×800，UI 文字可能不可读。保留 page 的 video handle 再关闭；`context.close()` 之后再 `video.saveAs()` 或编码；只关 browser 不保证视频 flush。每个 page 有自己的视频；显式选择演示页，不拼接无关页面或运行。失败运行只作诊断。来源：`record-browser-gif/SKILL.md:44-77`。

`【源义务】` 故事：3–6 个有意义状态；等唯一语义 locator 再动作；`exact: true` 用于 accessible-name 相等；完成谓词用 exact-text 且不能匹配 prompt 回显。固定等待可在状态验证后提供阅读停留，但绝不建立就绪。视频捕获时保留动画与滚动。演示工具调用/拒绝/恢复时打开其 detail/trajectory，让视频显示工具身份、状态或稳定错误码、下游结果。需要瞬态 running 状态时，提示一个慢前台操作并观察其 DOM 标记。给模型一个短最终 sentinel 锚定完成；演示状态可见后停止不必要的长真实 API 运行。不捕获 secret、个人数据、无关 tab、通知；视频含页面内容不含浏览器 chrome；避免渲染含凭据 URL。评审整个选中区间，包括中间状态；保持一个视口。来源：`record-browser-gif/SKILL.md:54-77`。

`【源义务】` 编码：需要 `python3`、`ffmpeg`、`ffprobe`；缺媒体二进制时报告依赖，不未经授权安装。`export GIF_SKILL_DIR` 单独一行；同一命令内联赋值不能影响参数展开。

```sh
export GIF_SKILL_DIR=/absolute/path/to/this/skill
python3 "$GIF_SKILL_DIR/scripts/encode_gif.py" \
  /absolute/path/to/demo.webm /absolute/path/to/demo.gif \
  --start 2 --end 32 --speed 2 --final-hold 3 \
  --fps 10 --max-width 1200 --colors 128
```

`--start`/`--end` 选择一个连续源区间；默认保留全视频 1× 并加两秒 final hold。`--speed` 改播放速度，必须在 GIF 旁披露所选区间与速度，避免暗示实测延迟。用观察到的视频时间，不猜 wall-clock 偏移；保留完整因果。final hold 重复最后选中帧。`--fps` 不能恢复源录制没捕获的运动。保留原始 WebM 供 QA；不拼接运行或合成缺失状态。来源：`record-browser-gif/SKILL.md:78-94`。

`【源事实】` 编码器（`scripts/encode_gif.py`）默认 `--max-bytes 5 MiB`，超过时 `fail("output is ... above --max-bytes ...")`；它探测 WebM 容器时长，在调色板转换前应用 trim 与 speed，并检查编码时长、动画、宽度、字节数；拒绝空/越界区间、少于两个输出帧的选择、模式不匹配的标志、意外覆盖（`encode_gif.py:16,184-186,315-316@687f282e`；`SKILL.md:88-94`）。

`【源义务】` 截图路径：3–6 个验证状态，一次隔离运行，浏览器截图 API；返回的图片字节直接保存在一个 run 目录，命名 `00-initial.png`、`01-typed.png`……；相同尺寸与裁剪；瞬态状态轮询 DOM 标记并在同一浏览器脚本调用内捕获。目录输入拒绝少于两帧、尺寸或时长数量不匹配；时长只适用于截图目录，视频时序标志只适用于视频。来源：`record-browser-gif/SKILL.md:95-106`。

### 14.5 验证与发布

`【源义务】` 验证（`record-browser-gif/SKILL.md:107-115`）：

1. 读编码器 JSON summary，确认输出路径、源区间与速度（或截图数）、编码帧数、尺寸、时长、字节数。
2. **视觉读编码后的 GIF 本身**，不只源帧；确认过渡可读、最后状态停留足够、无敏感内容。查看器只渲染第一帧时，用 `ffmpeg` 解码编码 GIF 的代表帧检查。
3. `git status --short` 确认原始视频、QA 帧、产物只落在 ignored 路径。
4. 返回绝对 GIF 路径，客户端支持时渲染，并说明录制用的是真实 API、fixture 还是其他 transport。任务不包含附加到 PR 时到此停止。

`【源义务】` 发布（仅当任务包含）：**绝不**把 GIF 提交到 PR 自己的分支或任何合并进长期分支的分支；优先 `gh --attach`。要求 `gh` v2.99.0+、github.com（不支持 GHES）、写权限、GIF ≤10 MB。body 中用普通本地路径引用，`gh` 会原地重写为上传 URL 并保留位置与 alt 文本。附加前重读被演示 PR 的 live head 并与 GIF 旁记录的 commit 比较；移动则停止重录。附加后重读 live head 要求仍在记录 commit；重读 body 确认引用指向上传 URL；经 GitHub Markdown API 渲染确认 `<img>`；抓取上传 URL 一次确认 `200` 与 `image/gif`。来源：`record-browser-gif/SKILL.md:116-142`。

`【源义务】` assets 分支回退（仅在 `gh --attach` 不适用时：GIF >10MB、`gh` 太旧、非 github.com）：用 orphan assets 分支，只放媒体；一个 series 一个分支（`<series>-assets`）。push 前验证分支只含媒体、staged GIF 校验和匹配已验证本地产物。已有分支在 shallow single-branch scratch clone 中操作；新 series 用 fresh shallow clone + `git switch --orphan`。push 后用认证 API 或 raw 请求确认远端路径、字节数、校验和、`200`、`image/gif`；匿名 `404` 不证明私有仓库资产不存在。嵌 body 用 raw blob URL，`?raw=true` 必需。**永不**删除或重写 assets 分支，**永不** force-push：已合并 PR body 永远引用其 URL；只追加提交。来源：`record-browser-gif/SKILL.md:143-172`。

### 14.6 浏览器自动化 overlay

`【源义务】` Web 浏览器自动化与 GIF 录制用 `pnpm dsh web --patch apps/web/tests/pin-browse-picker.overlay.yml` 使用页内目录选择器；只有显式测试原生 picker 行为时才省略。overlay 通过 `disabled: true` + `insert` 把 shipped `directory-picker` 替换为 `@deepseek-ai/dsh-host-directory-picker-browse` 与对应 client UI；原因：shipped `-auto` 在 loopback + local display 下解析为原生 OS 选择器，Playwright 无法驱动（`AGENTS.md:121`、`apps/web/tests/pin-browse-picker.overlay.yml:1-13@687f282e`）。

### 14.7 执行卡片

- **前置条件**：干净 worktree；能构建；真实 key 或可用凭据 provider；ffmpeg/ffprobe/python3；浏览器控制工作流。
- **步骤**：记录 commit → 构建 → 起隔离服务器 → 录 3–6 状态 → 编码 → 视觉验证 → （仅任务要求）attach/assets 发布。
- **责任者**：GIF 录制者；评审者核对 commit 与真实性。
- **完成信号**：编码 summary 与视觉检查通过；GIF 旁写明 commit/源/凭据/模型轮次；body 引用可渲染；live head 未移动。
- **失败处理**：捕获失败 → 丢弃帧、全新 roots 重跑；媒体缺失 → 报告依赖；attach 失败 → assets 分支；head 移动 → 重录。
- **例外**：用户明确要求 fixture 录制；原生 picker 行为测试省略 overlay。
- **证据限制**：编码器测试需要本地 ffmpeg/ffprobe，且**不在仓库 CI 运行**（`SKILL.md:115`）；GIF 真实性最终靠人核对。

---

来源：deepseek-harness/.agents/skills/record-browser-gif/SKILL.md:1-172@687f282e 来源：deepseek-harness/.agents/skills/record-browser-gif/scripts/encode_gif.py:1-337@687f282e 来源：deepseek-harness/.agents/skills/record-browser-gif/scripts/test_encode_gif.py:1-103@687f282e 来源：deepseek-harness/AGENTS.md:121-121@687f282e 来源：deepseek-harness/apps/web/tests/pin-browse-picker.overlay.yml:1-13@687f282e 来源：deepseek-harness/apps/web/tests/README.md:1-39@687f282e


<a id="bounded-panel-reachability"></a>
## 宽高受限面板的条件性可达性

问题／确认／计划评审面板、读取卡或长输出具有宽高上限，且有选中项及输入／编辑器时，先列出必须可达的语义区域：详情、标签、描述、校验、控件、选中项与省略标记。先为输入预留，再按当前视口钳制面板高度，resize后输入仍保留在下方。

选项窗口同时遵守选项数量上限和剩余行预算；预算先扣内边距、头部、位置行和页脚，保持选中项可见。超限内容用换行、分页或展开并给↑N more／↓N more、lines A-B/N等位置标记，不静默丢失。Page Up／Down覆盖详情与选项所有语义区：向前先翻完header／detail，再进入超大选中项；向后反向。

固定chrome不足先压缩头部或转成分页器，不能隐藏控件／校验。整体“↑N lines hidden”只在低于配置最小视口、确实无法容纳语义布局时作为最后回退，仍保留输入／编辑器并明确hidden标记。不可分的单行前缀／编号可用省略号作为安全边界，不能据此省略整个决定内容。同类卡片共享高度与头尾展开算法，不复制后各自漂移。

实现者拥有预算、分页、选中项和输入预留；评审在真实窄／矮视口证明全部语义区可到达。源TUI已移除，这属于来源具名历史经验，不是所有UI的通用模板；目标终端几何、字体与真实交互必须重验，语义快照不证明每个实际视口可读。

来源：`deepseek-harness/.agents/notes/archived/feature/2026-07-24-tui-question-dialog-multiline.md:10-23,38-41@687f282e`、`deepseek-harness/.agents/notes/archived/feature/2026-07-30-web-read-card-frontend.md:14-26,44@687f282e`。
