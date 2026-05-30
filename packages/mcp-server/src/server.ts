import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { WebSocketServer, WebSocket } from "ws";
import type { ToposData } from "./types.js";
import { readProject, writeProject, findFeature, addHistoryEntry } from "./data.js";
import { writeContext } from "./context.js";

const PORT = 4321;

const clients = new Set<WebSocket>();

function broadcast(event: string, payload: unknown): void {
  const msg = JSON.stringify({ event, payload });
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  }
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath);
  const mimes: Record<string, string> = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".woff2": "font/woff2",
  };
  return mimes[ext] || "application/octet-stream";
}

export function startServer(cwd: string): void {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || "/", `http://localhost:${PORT}`);

    // Dashboard static files
    if (req.method === "GET" && !url.pathname.startsWith("/api/")) {
      const dashboardDist = path.join(__dirname, "..", "..", "dashboard", "dist");
      let filePath = path.join(dashboardDist, url.pathname === "/" ? "index.html" : url.pathname);
      if (!fs.existsSync(filePath)) {
        filePath = path.join(dashboardDist, "index.html");
      }
      try {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { "Content-Type": getMimeType(filePath) });
        res.end(content);
      } catch {
        res.writeHead(404);
        res.end("Not found");
      }
      return;
    }

    // API: GET /api/project
    if (req.method === "GET" && url.pathname === "/api/project") {
      const data = readProject(cwd);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data));
      return;
    }

    // API: GET /api/feature/:id/history
    if (req.method === "GET" && url.pathname.startsWith("/api/feature/") && url.pathname.endsWith("/history")) {
      const featureId = url.pathname.split("/")[3];
      const data = readProject(cwd);
      const found = findFeature(data, featureId);
      if (!found) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: "Feature not found" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ history: found.feature.history }));
      return;
    }

    // API: PATCH /api/feature/:id
    if (req.method === "PATCH" && url.pathname.startsWith("/api/feature/")) {
      const featureId = url.pathname.split("/")[3];
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        const patch = JSON.parse(body);
        const data = readProject(cwd);
        const found = findFeature(data, featureId);
        if (!found) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: "Feature not found" }));
          return;
        }
        if (patch.status) {
          found.feature.status = patch.status;
          addHistoryEntry(found.feature, "manually_corrected", `status → ${patch.status}`);
        }
        if (patch.priority) found.feature.priority = patch.priority;
        if (patch.title) found.feature.title = patch.title;
        writeProject(cwd, data);
        writeContext(cwd, data);
        broadcast("feature_updated", { featureId, patch });
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true }));
      });
      return;
    }

    res.writeHead(404);
    res.end("Not found");
  });

  // WebSocket
  const wss = new WebSocketServer({ server });
  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.on("close", () => clients.delete(ws));
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.log(`Port ${PORT} is already in use — dashboard not started. Is another Topos instance running?`);
      process.exit(0);
    }
    throw err;
  });

  server.listen(PORT, () => {
    console.log(`Dashboard: http://localhost:${PORT}`);
  });
}
