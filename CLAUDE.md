# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Type-check

```bash
npm install                          # install all workspaces
npx tsc -p packages/mcp-server/tsconfig.json --noEmit   # type-check mcp-server
npx tsc -p packages/dashboard/tsconfig.json --noEmit     # type-check dashboard
npx tsc -p packages/mcp-server/tsconfig.json             # build mcp-server (output: dist/)
npx vite build --outDir dist packages/dashboard/          # build dashboard (output: dist/)
```

There are no tests yet. The `npm run build` root script builds both packages.

## Running locally

```bash
node packages/mcp-server/dist/index.js init     # creates .devion/project.yaml + agent-context.md
node packages/mcp-server/dist/index.js serve    # starts Dashboard (port 4321) + MCP stdio server
node packages/mcp-server/dist/index.js skill    # injects Topos habits into CLAUDE.md
```

Dashboard dev mode (with HMR): `npx vite packages/dashboard/` — proxies /api to :4321.

## Architecture

**npm monorepo** (`packages/*` workspaces), two packages:

### `packages/mcp-server` (`@topos/mcp`, published to npm)

CLI entry (`index.ts`) has three commands: `init`, `serve`, `skill`.

`serve` starts two things concurrently:
- **HTTP server** (`server.ts`, port 4321): serves Dashboard static files from `dashboard/dist/`, REST API (`GET /api/project`, `PATCH /api/feature/:id`), WebSocket broadcast on mutations
- **MCP stdio server** (`index.ts` + `mcp.ts`): registers 7 tools defined in `tools.ts`, dispatches to `handleToolCall` in `mcp.ts`

Data layer (`data.ts`): YAML read/write of `.devion/project.yaml`. Exports `readProject`, `writeProject`, `findFeature`, `addHistoryEntry`. `readProject` returns a `createEmpty()` default when the file doesn't exist.

Context generator (`context.ts`): generates `agent-context.md` from project data — a short summary for the agent context window (in-progress features, planned, current plan, recently deprecated).

**Important pattern in `mcp.ts`:** Module-level mutable state (`cwd`, `data`). Every `handleToolCall` calls `reload()` (re-reads YAML from disk) before operating, then `save()` (writes YAML + regenerates agent-context.md) on every mutation. This means the YAML file is always the source of truth — the in-memory `data` is ephemeral.

### `packages/dashboard` (private, bundled by Vite)

React 18 + Three.js (via @react-three/fiber + @react-three/drei). Three components:

- **Topology.tsx** — `<Canvas>` with `Scene` child. Renders layers as semi-transparent planes, features as color-coded spheres (status + priority determine color/size), dependency beams as `<Line>`, module/layer labels as `<Text>`. `useFrame` drives pulse animations for in_progress and bug_fix features. OrbitControls for camera.
- **Inspector.tsx** — Right-side slide-in panel showing full feature details: status badge, source type, priority, progress bar, dependencies, history timeline, manual correction dropdowns.
- **Timeline.tsx** — Bottom slider scrubbing through project history dates. Collects all `HistoryEntry.at` dates, maps `value` (0-1) to date range.

**Data flow:** App fetches `GET /api/project` on mount, connects WebSocket for `feature_updated` events (triggers re-fetch). State updates on manual corrections use `structuredClone` + `Object.assign` for optimistic local updates.

### `skill/topos-skill.md`

Markdown injected into a project's CLAUDE.md by the `skill` CLI command. Contains the agent habit instructions (read agent-context.md on start, call MCP tools on progress/done/deprecated, etc.).

## Key constraints

- No watch mode or file-system hooks — the design intentionally avoids complexity. Agent calls MCP tools explicitly; Dashboard refreshes via WebSocket or re-fetch.
- `project.yaml` is the single source of truth. `agent-context.md` is a derived artifact, regenerated on every mutation.
- The Dashboard `dist/` must be built before `serve` can serve it. In dev, run Vite separately.
- Feature IDs are auto-generated as `feat-001`, `feat-002`, etc. — not UUIDs. The `nextFeatureId()` function scans all existing IDs and increments.
