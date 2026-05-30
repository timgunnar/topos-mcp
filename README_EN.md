# Topos MCP

[中文](./README.md) | [English](./README_EN.md)

An intelligent project tracking tool for AI Agent-driven development. Track which features have been proposed, which are implemented, which are deprecated, and what the Agent plans to do next.

## Project Background

AI Agent-assisted development is becoming the norm, but long-term projects face several core pain points:

- **Requirement drift goes unnoticed** — The Agent continuously adjusts its approach across conversations; old decisions are overwritten by new instructions. Which features were proposed and then deprecated? Neither the human nor the Agent remembers.
- **Context loss** — The Agent's context window is limited. Early requirements and design intent from long conversations gradually fade. Across sessions, the Agent struggles to recall "where we left off."
- **No single source of truth** — Git tracks code change history, but cannot answer "what features are currently implemented and what's still planned?" Code state ≠ project state.
- **Humans can't audit Agent work** — When a requirement goes through dozens of conversation rounds from proposal to implementation, it's hard to trace back "who proposed this feature, why was it implemented, and what status changes occurred along the way."

Topos MCP solves this by maintaining a lightweight structured state file (`.devion/project.yaml`) in the project. The Agent updates feature status on every operation, while a human-readable context summary (`agent-context.md`) is auto-generated. The Agent reads the context on startup to quickly recover awareness, continuously updates via MCP tools during work, and humans get a bird's-eye view of the entire project through the 3D Dashboard.

![Dashboard Screenshot](https://raw.githubusercontent.com/timgunnar/topos-mcp/master/assets/dashboard.png)

## Install

### npm (Recommended)

```bash
npx @timgunnar/topos-mcp init    # Initialize in current project
npx @timgunnar/topos-mcp serve   # Start MCP server + Dashboard
```

### From Source (GitHub)

```bash
git clone https://github.com/timgunnar/topos-mcp.git
cd topos-mcp
npm install
npm run build
node packages/mcp-server/dist/index.js init    # Initialize in current project
node packages/mcp-server/dist/index.js serve   # Start MCP server + Dashboard
```

Open `http://localhost:4321` to view the 3D topology.

## Claude Code Configuration

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
