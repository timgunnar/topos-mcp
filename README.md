# Topos MCP

面向 AI Agent 驱动开发的项目智能追踪工具。追踪哪些功能被提出、哪些已实现、哪些已作废、以及 Agent 下一步计划做什么。

## 项目背景

AI Agent 辅助开发正在成为常态，但长期项目中存在几个核心痛点：

- **需求漂移无人知晓** — Agent 在一次次的对话中不断调整方案，旧的决策被新指令覆盖。哪些功能被提出后又作废了？人不知道，Agent 也不记得。
- **上下文丢失** — Agent 的上下文窗口有限，长对话中早期提出的需求和设计意图会逐渐丢失。跨会话之后，Agent 很难准确回忆起"我们上次做到哪了"。
- **缺乏单一事实源** — Git 追踪了代码变更历史，但无法回答"当前项目有哪些功能已实现、哪些还在规划中"。代码状态 ≠ 项目状态。
- **人无法审计 Agent 的工作** — 当一个需求从提出到实现经历了数十轮对话，人很难回溯"这个功能是谁提出的、为什么被实现、中间经历了哪些状态变化"。

Topos MCP 通过在项目中维护一个轻量的结构化状态文件（`.devion/project.yaml`），让 Agent 在每次操作时更新功能点状态，同时生成人类可读的上下文摘要（`agent-context.md`）。Agent 启动时读取上下文快速恢复认知，工作中通过
MCP 工具持续更新，人通过 3D Dashboard 一眼看清项目全貌。

![Dashboard 截图](assets/dashboard.png)

## 安装

### npm（推荐）

```bash
npx @topos/mcp init    # 在当前项目初始化
npx @topos/mcp serve   # 启动 MCP server + Dashboard
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
        "@topos/mcp",
        "serve"
      ]
    }
  }
}
```

## License

MIT
