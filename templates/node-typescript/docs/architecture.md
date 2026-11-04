# Architecture

English | [中文](architecture.zh.md)

This workspace begins without business applications or libraries. The repository owns engineering tooling, checks, instructions, and documentation; no business data flow or public API is implied. Read this page before changing workspace boundaries and update it when real owners and their relationships exist.

## Workspace boundaries

Applications belong under `apps/<app>/`, libraries under `packages/<group>/<package>/`; each owns its source, tests, manifest, and consumer documentation. A group is a container with navigation, not a package. Introduce members for actual responsibilities, not to satisfy an empty layout. Libraries must not depend on applications. [Start a project](cookbook/starting-a-project.md) describes registration and [adding a package](cookbook/adding-a-package.md) describes library details.

The root workspace configuration discovers members; `tsconfig.host.json` references each actual member. The source plane resolves declared workspace imports to `src` via the TypeScript paths map. Built and packed consumers use the declared artifact exports; they do not consume a source subpath. See [development](development.md#typescript-project-layout) for the compiler graph.

## Ownership and evolution

Give each real contract, data format, and shared type one owner, and document producers, consumers, boundaries, failure behavior, and observable side effects where they arise. Place decisions with durable rationale in [Agent Notes](../.agents/notes/README.md), not in invented placeholder business modules. The [start guide](cookbook/starting-a-project.md) explains how to declare a real persisted type and its baseline. Preserve license attribution in [SOURCE-LICENSE.txt](../SOURCE-LICENSE.txt).
