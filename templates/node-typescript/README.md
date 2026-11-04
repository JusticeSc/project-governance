# Node.js/TypeScript governance template

English | [中文](README.zh.md)

This project provides a Node.js/TypeScript workspace, development checks, documentation standards, and agent workflows. It starts without business applications or libraries: introduce only the owners needed for the requested work. See [Start a project](docs/cookbook/starting-a-project.md) for the path from setup to real behavior.

## Requirements and setup

Use Node.js `>=24 <25` and pnpm `11.28.5` via Corepack. Git is required for hooks and baseline-dependent checks; the full CI-shaped checks also require Python. Follow [development setup](docs/development.md#setup-tutorial), including its Git baseline guidance, before installing hooks. A configured workflow is not evidence of a remote CI pass.

## Development

Place applications under `apps/<app>/` and libraries under `packages/<group>/<package>/` when the task needs them. Register real members with the compiler, product-use and applicable launcher policies; [the package cookbook](docs/cookbook/adding-a-package.md) details library registration. Define persistence only for real persisted data; [Start a project](docs/cookbook/starting-a-project.md) describes its declaration and history.

Run `corepack pnpm install`, then select checks for the changed behavior using [development](docs/development.md#verify-a-change) and [testing](docs/testing.md). Package runtime code has a per-file 100% coverage requirement; application behavior needs real entry-point evidence. An empty workspace is not a reason to skip checks once relevant objects exist.

## Documentation

- [Agent instructions](AGENTS.md) and [documentation standard](docs/AGENTS.md)
- [Architecture](docs/architecture.md), [development](docs/development.md), and [testing](docs/testing.md)
- [Defensive patterns](docs/defensive-patterns/README.md) and [Agent Notes](.agents/notes/README.md)

## License

See [LICENSE](LICENSE) and [SOURCE-LICENSE.txt](SOURCE-LICENSE.txt) for license and attribution.
