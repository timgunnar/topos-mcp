# Changelog

[English](./CHANGELOG.md) | [中文](./CHANGELOG_ZH.md)

## v0.2.3

### Key Upgrades

- npm package description switched to English

## v0.2.2

### Key Upgrades

- Documentation: README/CHANGELOG now English default, Chinese as `_ZH` variant

## v0.2.1

### Key Upgrades

- English documentation with bilingual toggle links
- npm package now includes English docs
- Renamed `.devion` → `.topos` to remove legacy naming
- Fixed ESM `__dirname` incompatibility (switched to `import.meta.url`)

## v0.2.0

### Key Upgrades

- Port conflict detection: Graceful exit when HTTP port is occupied
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
