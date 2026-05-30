# Topos MCP

[中文](./README.md) | [English](./README_EN.md)

面向 AI Agent 驱动开发的项目智能追踪工具。追踪哪些功能被提出、哪些已实现、哪些已作废、以及 Agent 下一步计划做什么。

## 项目背景

AI Agent 辅助开发正在成为常态，但长周期项目中存在几个核心痛点：

- **需求漂移无人知晓** — Agent 在一次次的对话中不断调整方案，旧的决策被新指令覆盖。哪些功能被提出后又作废了？人不知道，Agent 也不记得。
- **上下文丢失** — Agent 的上下文窗口有限，长对话中早期提出的需求和设计意图会逐渐丢失。跨会话之后，Agent 很难准确回忆起"我们上次做到哪了"。
- **缺乏单一事实源** — Git 追踪了代码变更历史，但无法回答"当前项目有哪些功能已实现、哪些还在规划中"。代码状态 ≠ 项目状态。
- **人无法审计 Agent 的工作** — 当一个需求从提出到实现经历了数十轮对话，人很难回溯"这个功能是谁提出的、为什么被实现、中间经历了哪些状态变化"。

Topos MCP 通过在项目中维护一个轻量的结构化状态文件（`.devion/project.yaml`），让 Agent 在每次操作时更新功能点状态，同时生成人类可读的上下文摘要（`agent-context.md`）。Agent 启动时读取上下文快速恢复认知，工作中通过
MCP 工具持续更新，人通过 3D Dashboard 一眼看清项目全貌。

![Dashboard 截图](https://raw.githubusercontent.com/timgunnar/topos-mcp/master/assets/dashboard.png)

## 数据管理

Topos MCP 的数据模型分为三个层级，结构化地描述项目全貌：

```
分层 (Layer)  →  模块 (Module)  →  功能点 (Feature)
```

- **project.yaml** — 唯一事实源，存储在 `.devion/` 目录。包含项目架构（分层/模块/功能点）、每个功能点四种状态（已规划/实现中/已实现/已作废）、四类来源（功能需求/缺陷修复/重构优化/性能优化）、依赖关系和演化历史
- **agent-context.md** — 自动生成，供 Agent 启动时读取。包含进行中的功能、已规划列表、当前计划和最近作废记录，帮助 Agent 跨会话快速恢复认知
- **MCP 工具（7 个）** — Agent 通过标准 MCP 协议调用：创建/更新/查询功能点、查看计划、记录状态变更。每次操作自动写入 YAML 并刷新 agent-context.md

设计原则：零外部依赖（无数据库、无文件监听），Agent 显式调用工具即持久化，人类随时查看 YAML。

## 运行方式

Topos MCP 支持两种运行方式，共用同一套 Dashboard 和数据服务：

| 方式 | 适用场景 | 启动命令 |
|------|---------|---------|
| **本地浏览器** | 开发调试、日常使用 | `npx @timgunnar/topos-mcp serve` → `http://localhost:4321` |
| **VS Code 插件** | IDE 内沉浸式体验 | 命令面板 → `Topos: Open Dashboard` |

两种方式可同时使用 — HTTP 服务支持多客户端并发访问，VS Code Webview 和浏览器标签页可以同时打开同一个 Dashboard。端口冲突自动检测，优雅退出。

## 安装

### npm（推荐）

```bash
npx @timgunnar/topos-mcp init    # 在当前项目初始化
npx @timgunnar/topos-mcp serve   # 启动 MCP server + Dashboard
```

### 从源码安装（GitHub）

```bash
git clone https://github.com/timgunnar/topos-mcp.git
cd topos-mcp
npm install
npm run build
node packages/mcp-server/dist/index.js init    # 在当前项目初始化
node packages/mcp-server/dist/index.js serve   # 启动 MCP server + Dashboard
```

打开 `http://localhost:4321` 查看 3D 拓扑图。

## Claude Code 配置

```json
{
  "mcpServers": {
    "topos": {
      "command": "npx",
      "args": [
        "@timgunnar/topos-mcp",
        "serve"
      ]
    }
  }
}
```

## License

MIT
