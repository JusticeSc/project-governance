---
kind: upgrade-guide
description: 从插件市场示例切换到空治理模板时保留既有项目。
---

# 从插件市场示例迁移

[English](guide.md) | 中文

## 变更

v0.1.1 模板包含 `apps/plugin-market-generator` 和 `packages/util/plugin-market-index`，并创建 `.claude/skills` 链接。下一版模板不再默认提供示例应用和库，也不创建该链接；新安装不再提供示例的命令或 API。已有项目文件不会被自动删除。

## 迁移

1. 保留已有项目、数据和本地改动，确认是否使用上述两个示例路径和 `.claude/skills`；不要仅因新模板不再包含它们就删除应用、库或数据。
2. 将新的 `project-governance/` Skill 取得到单独位置，不覆盖已有 Skill 目录。若 Agent 依赖 `.claude/skills`，改用该 Agent 支持的 Skill 发现位置。
3. 对已有项目，先比较新模板和现有文件，批准必要的合并。以下命令只添加缺失路径；退出码 3 表示仍有冲突需要协调，不表示接入完成。被重定向的目录会在写入前拒绝。安装失败时检查其报告的路径，在恢复完成前保留备份。

   ```sh
   node <new-skill-dir>/scripts/install-template.mjs --add-missing <existing-project>
   ```

4. 项目实际使用的示例代码应作为项目自有代码保留或替换。协调报告的配置和文档冲突，不覆盖未经批准的内容。合并后的项目具备已审阅的 pnpm 锁文件后，在项目根目录使用 Node 24 和 pnpm 11.28.5 运行 `pnpm install --frozen-lockfile`、`pnpm run build` 和 `pnpm run constraints`；还应运行项目已有测试，并在适用时启动原有应用。解决失败后才能宣布迁移完成。
