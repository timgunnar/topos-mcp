---
name: topos
description: 将 Topos 项目追踪工作习惯注入 CLAUDE.md。当用户希望在项目中启用自动进度追踪、功能状态更新和 Agent 计划管理时使用。
---

# Topos — 项目追踪 Skill

读取 Topos 仓库中的 `skill/topos-skill.md`。将以下内容追加到项目的 CLAUDE.md：

```markdown
## 项目追踪 (Topos)

每次会话开始时：
- 读取 `.devion/agent-context.md` 了解当前项目状态
- 不要对"最近作废"列表中的功能点继续开发

完成某个功能时：
- 调用 `topos_mark_done` 并传入功能 ID

取得部分进展时：
- 调用 `topos_mark_progress` 并传入功能 ID 和百分比 (0-100)

当人决定取消或替换某个功能时：
- 调用 `topos_mark_deprecated` 并传入功能 ID 和原因

当人提出新功能需求时：
- 调用 `topos_add_feature` 并传入标题、层名、模块名、描述、优先级和来源类型

工作中：
- 如果人问"下一步是什么"或"计划"，调用 `topos_get_plan`
- 如果人询问某个功能，调用 `topos_get_status`
- 如果人问有哪些功能，调用 `topos_list_features`

每次会话结束时：
- 更新所有功能状态以反映实际进度
- 确保 `agent-context.md` 反映当前状态
```
