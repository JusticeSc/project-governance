# 插件市场索引生成器

[English](README.md) | 中文

[插件市场索引](../../.agents/notes/implemented/feature/2026-10-02-plugin-market-index-format.zh.md) 文件的参考生成器。它读取一份由 npm 包名与 Git 仓库 URL 组成的纯文本列表，写出一个 `index.json`，市场页面无需额外请求即可渲染。它是独立的 Node 程序，不是插件宿主，也从不安装或运行它所描述包的代码。

## 使用

编写一份来源列表，每行一个条目。空行与以 `#` 开头的行会被忽略。

```text
# npm packages: every non-deprecated bundle version is listed
@scope/example-plugin
example-plugin
# Git repositories: release tags and the default branch are listed
https://github.com/author/example-plugins
https://gitlab.example.com/group/example-plugins
```

在仓库中运行生成器：

```sh
pnpm start --input plugins.txt --output site/index.json --title "Example Market"
```

`--input` 与 `--output` 相对于运行 pnpm 的目录解析。通过 HTTPS 发布输出目录，并让市场指向 `index.json`。

| 选项 | 默认值 | 含义 |
|---|---|---|
| `--input <file>` | 必需 | 来源列表。 |
| `--output <file>` | 必需 | 索引文件。大到无法内联的图标写入其旁边的 `icons/`；索引不再使用的生成图标文件会从那里删除。 |
| `--title <text>` | 必需 | 市场标题。 |
| `--description <text>` | 无 | 市场描述。 |
| `--cache <dir>` | 输入列表旁的 `.plugin-market-cache` | 结果缓存。它保持在发布用的输出目录之外。 |
| `--registry <url>` | `https://registry.npmjs.org/` | npm registry。其他 registry 会记录在每个 npm 版本中。 |
| `--inline-icon-bytes <n>` | `16384` | 作为 `data:` URL 内联的最大图标，最多 32768，即格式的内联图标上限。 |
| `--concurrency <n>` | `4` | 同时读取的来源数。 |
| `--timeout-ms <n>` | `60000` | 单个请求或 Git 命令的截止时间。 |
| `-h`, `--help` | | 打印这些选项与退出状态。 |

当所有来源都读取成功时退出状态为 0；某个来源无法读取时为 1；参数或列表无效时为 2。索引格式会拒绝的列表行——例如 `http:` URL、带凭据、查询或片段的 URL、少于两个路径段的 URL，或 tarball URL——属于无效列表。来源无法读取时，若存在当前缓存格式的有效上次成功记录，则复用该结果；否则该来源不提供插件。两种情况都会报告失败。

## 会列出什么

每个包变成一个带一个或多个版本的插件。只有当某个版本的 `package.json` 声明 `dsh.bundle`，且 `patch` 为文件路径或文件路径列表时，该版本才会被列出。

- **npm 包**：registry 文档中每个未被弃用、声明 bundle 且有发布时间（publish time）的版本。版本仅来自 registry 文档；只下载最高已列出版本的 tarball，以获取其展示字段。其 `package.json` 必须写明所请求的包名与版本。
- **Git 仓库**：在默认分支上按以下顺序发现 bundle 包：
  1. 根 `package.json` 声明 `dsh.bundle`：仅根包；
  2. `package.json` 的 `workspaces` 或 `pnpm-workspace.yaml` 的 `packages` 匹配到声明 `dsh.bundle` 的包：这些包。每个 glob 段是字面名称、带 `*` 的名称或 `**`；否定 glob 被忽略，匹配不到任何内容的 glob 会被报告；
  3. 否则，三层目录以内、`node_modules`、`test`、`tests`、`fixtures`、`example` 与 `examples` 之外，所有声明 `dsh.bundle` 的包。

  每个包的版本来自发布 tag 与默认分支。`vX.Y.Z` 或 `X.Y.Z` tag 应用于每个包，`<name>@X.Y.Z` tag（例如 `@scope/example@1.2.0`）应用于该名称的包；tag 版本必须是确切的 SemVer 版本，构建元数据会原样保留。当包在被打 tag 的提交中所在目录持有同名、同版本且声明 bundle 的清单时，该 tag 才列出该包。默认分支提交会列出每个包的当前版本，除非某个 tag 已经列出它。多个 tag 列出同一版本时，`<name>@` tag 优先于统一 tag，然后较早的提交优先。发布时间是该提交的提交者时间。

每个列出的版本都必须在 `engines.dsh` 中显式声明非空且有效的 npm SemVer 范围；生成器原样复制该值。`*` 显式表示支持任意 DSH 版本。缺失、空白或无效声明会带警告跳过该版本；不从 peer 依赖回退推断。npm 来源的 `dist-tags` 只保留指向已列出版本的 registry 渠道映射。Git 发布 tag 用于标识版本，本身不提供渠道映射。

展示字段来自最高已列出版本。`./locale/en.json` 与 `./locale/<language>.json` 通过包 `exports` 映射以 `import`、`node` 与 `default` 条件解析，没有映射时按字面路径解析；每个 locale 文件必须与英文文件位于同一目录；其 `meta.title` 与 `meta.description` 回退到清单的 `name` 与 `description`。图标是清单的 `icon`（相对路径），或导出的 `./icon`：SVG、PNG、JPEG 或 WebP，最多 256 KiB，且位于包内。`author` 是清单 `author` 字符串中不含 `<email>` 与 `(url)` 的名称部分，或 author 对象的 `name`。当 `homepage` 是绝对的 `https:` 或 `http:` URL 时，按清单原样复制。当 `repository` 指明可网页访问的仓库时，复制它及其 `directory`。

`metadata.keywords` 是用于发现的字符串数组，可选。npm `package.json` 的 `keywords` 是惯例；索引生成器可以补充或调整。本生成器原样复制最高已列出版本的清单 `keywords`，包括空字符串、重复项与空数组。缺失字段会被省略；非数组值或包含任何非字符串的数组会产生警告并省略整个字段，但不丢弃该包。

多个来源产生同一个包名时，列表中靠前者优先。

## 缓存与重复运行

每次运行读取每个 npm 来源的 registry 文档与每个 Git 仓库的 ref。结果按输入缓存：npm 插件按 registry、图标阈值、包、已列出版本集合和保留的渠道映射缓存；Git 仓库按默认分支提交与发布 tag 缓存；每个 Git 包按提交与目录缓存。因此 Git 运行只抓取尚未缓存的包所在提交。缓存文件原子写入；损坏或被索引格式拒绝的缓存文件会重建。输出是确定性的：条目遵循列表顺序，索引与图标文件只在内容变化时改写，因此没有上游变化时再次运行不会改动输出。

缓存格式变化可能使旧记录不可用，包括上次成功结果的回退记录。升级生成器后应先成功运行，再依赖该回退应对故障。

本次格式验证修正将缓存身份升级到版本 9。不再复用版本 8 的结果，包括已缓存的遗漏和上次成功记录；下一次成功运行会按修正后的规则重建它们。已有文件不会被删除。

<a id="security"></a>
## 安全

生成器只下载并读取文件。npm tarball 在内存中读取：tarball 与其解包文件各不得超过 64 MiB，字节必须匹配 registry 完整性 hash，只保留 `node_modules` 之外的普通文件，且路径不得离开包。Git 对象以深度 1 抓取到私有的临时裸仓库并以 blob 读取，因此不存在工作树，任何 checkout filter、LFS 下载或符号链接都不生效；符号链接与子模块视为不存在。Git 运行时禁用钩子与文件系统监视、不启用子模块、只使用 https 与 ssh 传输，并丢弃除 `GIT_SSH` 与 `GIT_SSH_COMMAND` 之外的继承 `GIT_*` 变量。你的 ssh 程序与 `GIT_SSH_COMMAND` 保持优先。

索引内容就是包对自己的声明。发布前请审查列表：被列出的仓库可以使用任意包名。不会应用 `.npmrc` 中的 registry token，Git 也不会提示输入凭据。

## 限制

- Git 服务器必须允许按 SHA 抓取提交，GitHub、GitLab 与 Gitea 均支持。服务器拒绝时，生成器按名称抓取 tag 与默认分支；如果 ref 在被列出后移动，则会失败。
- 不会应用 `.npmrc` 中的 registry token；只有公开或无需认证的 registry 可用。
- Git 从不提示输入凭据。需要凭据的仓库必须通过凭据助手或 ssh agent 可读。

## 开发

使用 `pnpm run build` 构建，并用 `pnpm start:built --input ...` 运行产物；检查项见[开发指南](../../docs/development.zh.md)，所需证据见[测试策略](../../docs/testing.zh.md)。
