# Changelog

[中文](./CHANGELOG.md) | [English](./CHANGELOG_EN.md)

## v0.2.0

### 关键升级

- VS Code 扩展 (`topos-vscode`)：Webview 内嵌 3D Dashboard，命令面板一键打开
- `serve-http` 命令：仅启动 HTTP + WebSocket Dashboard，不含 MCP stdio
- 端口占用检测：HTTP 被占时优雅退出，多进程复用同一 Dashboard 实例
- Three.js 性能优化：`frameloop="demand"`，idle 时零 GPU 占用

### 关键 BUG 修复

- 修复端口冲突时进程僵死问题（EADDRINUSE 后调用 `process.exit(0)`）
- 修复日志前缀不一致（统一为 `Dashboard:` 前缀）

### 测试

- 尚未添加自动化测试

## v0.1.0

### 关键升级

- MCP Server (`@timgunnar/topos-mcp`) 发布，包含 7 个工具用于功能点 CRUD 和计划查询
- 三层数据模型（分层 → 模块 → 功能点），YAML 持久化（`.devion/project.yaml`）
- `agent-context.md` 自动生成，供 Agent 启动时读取项目状态摘要
- CLI 三个命令：`init`（初始化）、`serve`（启动 MCP + Dashboard）、`skill`（注入 Agent 工作习惯到 CLAUDE.md）
- 3D 拓扑仪表盘（Three.js + React Three Fiber），支持 OrbitControls 交互
  - 分层平面、模块节点球、依赖光束、状态颜色编码
  - 进行中和 BUG 修复节点的脉冲动画
- 功能点详情面板（Inspector）：状态/来源类型/优先级徽章、进度条、演化历史时间线、手动修正控件
- 时间轴滑块（Timeline）：拖动回溯项目历史
- WebSocket 实时推送，功能点变更时 Dashboard 自动刷新
- 功能点四种来源类型（功能需求 / 缺陷修复 / 重构优化 / 性能优化）和四种状态（已规划 / 实现中 / 已实现 / 已作废）
- Agent 计划追踪（当前任务 / 下一步 / 最近作废）

### 关键 BUG 修复

- 修复 `init` 命令未将 `project.yaml` 写入磁盘的问题（`readProject` 仅创建内存对象）
- 修复 `index.ts` 中 `readProject` 从错误模块导入的问题（`./context.js` → `./data.js`）
- 修复 3D 拓扑场景中脉冲动画缩放双重乘法（`setScalar(scale * pulse)` → `setScalar(pulse)`）
- 修复模块标签 Z 坐标硬编码为 0，改为跟随模块的 Z 偏移量

### 测试

- 尚未添加自动化测试
