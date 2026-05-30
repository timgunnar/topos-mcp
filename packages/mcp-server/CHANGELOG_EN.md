# Changelog

[中文](./CHANGELOG.md) | [English](./CHANGELOG_EN.md)

## v0.2.0

### Key Upgrades

- VS Code extension (`topos-vscode`): Webview embedded 3D Dashboard, one-click open from command palette
- `serve-http` command: Start HTTP + WebSocket Dashboard only, without MCP stdio
- Port conflict detection: Graceful exit when HTTP port is occupied; multiple processes can reuse the same Dashboard instance
- Three.js performance optimization: `frameloop="demand"`, zero GPU usage at idle

### Key Bug Fixes

- Fixed zombie process on port conflict (calls `process.exit(0)` after EADDRINUSE)
- Fixed inconsistent log prefix (unified to `Dashboard:` prefix)

### Tests

- No automated tests yet

## v0.1.0

### Key Upgrades

- MCP Server (`@timgunnar/topos-mcp`) released with 7 tools for feature CRUD and plan queries
- Three-level data model (Layer → Module → Feature), YAML persistence (`.topos/project.yaml`)
- `agent-context.md` auto-generated for Agent to read project status summary on startup
- CLI with three commands: `init`, `serve` (MCP + Dashboard), `skill` (inject Agent habits into CLAUDE.md)
- 3D Topology Dashboard (Three.js + React Three Fiber) with OrbitControls interaction
  - Layer planes, module node spheres, dependency beams, status color coding
  - Pulse animation for in-progress and bug-fix nodes
- Feature Inspector panel: status/source type/priority badges, progress bar, history timeline, manual correction controls
- Timeline slider: drag to rewind through project history
- WebSocket real-time push; Dashboard auto-refreshes on feature changes
- Four source types (feature request / bug fix / refactor / optimization) and four statuses (active / in progress / implemented / deprecated)
- Agent plan tracking (current tasks / next steps / recently deprecated)

### Key Bug Fixes

- Fixed `init` command not writing `project.yaml` to disk (`readProject` only created in-memory object)
- Fixed `readProject` import in `index.ts` from wrong module (`./context.js` → `./data.js`)
- Fixed pulse animation double-scaling in 3D topology (`setScalar(scale * pulse)` → `setScalar(pulse)`)
- Fixed module label Z coordinate hardcoded to 0; now follows module Z offset

### Tests

- No automated tests yet
