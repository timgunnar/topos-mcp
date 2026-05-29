# Changelog

## [0.1.0] — 2026-05-29

### Added

- MCP Server (`@topos/mcp`) with 7 tools: `topos_add_feature`, `topos_mark_progress`, `topos_mark_done`, `topos_mark_deprecated`, `topos_get_status`, `topos_get_plan`, `topos_list_features`
- YAML-based project data persistence (`.devion/project.yaml`) with three-level hierarchy: Layer → Module → Feature
- Auto-generated `agent-context.md` summary for agent context window
- HTTP API server (port 4321) with REST endpoints and WebSocket real-time push
- CLI commands: `init` (initialize project), `serve` (start MCP + Dashboard), `skill` (inject agent habits into CLAUDE.md)
- 3D topology Dashboard with Three.js (React Three Fiber)
  - Layer planes, module node spheres, dependency beams
  - Color-coded feature status (green/blue/gray/dim)
  - Pulse animation for in-progress and bug-fix features
  - OrbitControls: drag to rotate, scroll to zoom, right-drag to pan
- Feature Inspector panel with status/priority badges, progress bar, history timeline, manual correction controls
- Timeline slider for scrubbing through project history
- WebSocket real-time updates when features are modified
- Topos Skill file for optional CLAUDE.md injection
- Feature source types: feature_request, bug_fix, refactor, optimization
- Feature statuses: active, in_progress, implemented, deprecated
- Feature dependencies with visual dependency beams
- Agent plan tracking (current / next / recently_deprecated)
