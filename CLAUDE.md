# CLAUDE.md

本文件为 Claude Code（claude.ai/code）在此仓库中工作时提供指导。

## 构建与类型检查

```bash
npm install                          # 安装所有工作区依赖
npx tsc -p packages/mcp-server/tsconfig.json --noEmit   # 类型检查 mcp-server
npx tsc -p packages/dashboard/tsconfig.json --noEmit     # 类型检查 dashboard
npx tsc -p packages/mcp-server/tsconfig.json             # 构建 mcp-server（输出: dist/）
npx vite build --outDir dist packages/dashboard/          # 构建 dashboard（输出: dist/）
```

暂无测试。根目录 `npm run build` 脚本会同时构建两个包。

## 本地运行

```bash
node packages/mcp-server/dist/index.js init     # 创建 .devion/project.yaml + agent-context.md
node packages/mcp-server/dist/index.js serve    # 启动 Dashboard（端口 4321）+ MCP stdio server
node packages/mcp-server/dist/index.js skill    # 将 Topos 工作习惯注入 CLAUDE.md
```

Dashboard 开发模式（含热更新）：`npx vite packages/dashboard/` — 将 /api 代理到 :4321。

## 架构

**npm monorepo**（`packages/*` 工作区），两个包：

### `packages/mcp-server`（`@topos/mcp`，发布到 npm）

CLI 入口（`index.ts`）包含三个命令：`init`、`serve`、`skill`。

`serve` 同时启动两个服务：
- **HTTP 服务器**（`server.ts`，端口 4321）：托管 Dashboard 静态文件（来自 `dashboard/dist/`），提供 REST API（`GET /api/project`、`PATCH /api/feature/:id`），数据变更时通过 WebSocket 广播
- **MCP stdio 服务器**（`index.ts` + `mcp.ts`）：注册 `tools.ts` 中定义的 7 个工具，分发到 `mcp.ts` 中的 `handleToolCall` 处理

数据层（`data.ts`）：`.devion/project.yaml` 的 YAML 读写。导出 `readProject`、`writeProject`、`findFeature`、`addHistoryEntry`。文件不存在时 `readProject` 返回 `createEmpty()` 默认值。

上下文生成器（`context.ts`）：从项目数据生成 `agent-context.md` — 供 Agent 上下文窗口使用的简短摘要（进行中的功能、已规划、当前计划、最近作废）。

**`mcp.ts` 中的重要模式：** 模块级可变状态（`cwd`、`data`）。每次 `handleToolCall` 调用前先执行 `reload()`（从磁盘重新读取 YAML），每次变更后执行 `save()`（写入 YAML 并重新生成 agent-context.md）。这意味着 YAML 文件始终是唯一真相来源 — 内存中的 `data` 是临时的。

### `packages/dashboard`（私有，由 Vite 打包）

React 18 + Three.js（通过 @react-three/fiber + @react-three/drei）。三个组件：

- **Topology.tsx** — `<Canvas>` 包裹 `Scene` 子组件。将分层渲染为半透明平面，功能点渲染为颜色编码的球体（状态 + 优先级决定颜色/大小），依赖关系渲染为 `<Line>` 光束，模块/分层标签渲染为 `<Text>`。`useFrame` 驱动进行中和 BUG 修复节点的脉冲动画。OrbitControls 控制相机。
- **Inspector.tsx** — 右侧滑入面板，展示功能点完整详情：状态徽章、来源类型、优先级、进度条、依赖关系、历史时间线、手动修正下拉菜单。
- **Timeline.tsx** — 底部滑块，拖动回溯项目历史日期。收集所有 `HistoryEntry.at` 日期，将 `value`（0-1）映射到日期范围。

**数据流：** App 挂载时请求 `GET /api/project`，连接 WebSocket 监听 `feature_updated` 事件（触发重新请求）。手动修正时的状态更新使用 `structuredClone` + `Object.assign` 进行乐观本地更新。

### `skill/topos-skill.md`

由 `skill` CLI 命令注入到项目 CLAUDE.md 中的 Markdown 文件。包含 Agent 工作习惯指令（启动时读取 agent-context.md，进度/完成/作废时调用 MCP 工具等）。

## 关键约束

- 无文件监听或文件系统钩子 — 设计上刻意避免复杂性。Agent 显式调用 MCP 工具；Dashboard 通过 WebSocket 或重新请求刷新。
- `project.yaml` 是唯一真相来源。`agent-context.md` 是衍生产物，每次变更时重新生成。
- `serve` 之前必须先构建 Dashboard `dist/`。开发时单独运行 Vite。
- 功能点 ID 自动生成为 `feat-001`、`feat-002` 等格式 — 非 UUID。`nextFeatureId()` 函数扫描所有现有 ID 并递增。
