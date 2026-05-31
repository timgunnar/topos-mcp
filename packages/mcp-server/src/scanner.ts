import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import type { Layer, Module, Feature, ToposData, SourceType } from "./types.js";

export interface ScanResult {
  layers: Layer[];
  confidence: "high" | "medium" | "low";
  source: string;
}

/** Check dir (and one level of subdirs) for source code files. */
function hasCodeFiles(dirPath: string): boolean {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    // Check top-level files
    if (entries.some(e => e.isFile() && /\.(ts|js|py|rs|go|java|rb)$/.test(e.name))) return true;
    // Check one level deeper (src/, lib/, etc.)
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules" && entry.name !== "dist" && entry.name !== ".git") {
        try {
          const subEntries = fs.readdirSync(path.join(dirPath, entry.name), { withFileTypes: true });
          if (subEntries.some(e => e.isFile() && /\.(ts|js|py|rs|go|java|rb)$/.test(e.name))) return true;
        } catch { /* skip unreadable dirs */ }
      }
    }
  } catch { return false; }
  return false;
}

// DirScanner: scan packages/, src/, lib/, apps/ directories
export function scanDirectory(cwd: string): ScanResult {
  const layers: Layer[] = [];
  const srcDirs = ["packages", "src", "lib", "apps"];
  let order = 0;

  for (const dirName of srcDirs) {
    const dirPath = path.join(cwd, dirName);
    if (!fs.existsSync(dirPath)) continue;

    const modules: Module[] = [];
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
      const features: Feature[] = [];
      const modPath = path.join(dirPath, entry.name);
      try {
        const hasCode = hasCodeFiles(modPath);
        if (hasCode) {
          features.push({
            id: "",
            title: `${entry.name} source code`,
            status: "implemented",
            priority: "medium",
            source: { type: "pre_existing" },
            history: [],
            depends_on: [],
          });
        }
      } catch { continue; }

      if (features.length > 0) {
        modules.push({ name: entry.name, features });
      }
    }

    if (modules.length > 0) {
      layers.push({ name: dirName, order: order++, modules });
    }
  }

  return { layers, confidence: "low", source: "directory" };
}

// GitScanner: parse git log
export function scanGit(cwd: string): ScanResult {
  const layers: Layer[] = [];
  try {
    const log = execSync("git log --all --oneline -n 100 2>/dev/null", {
      cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"],
    });
    const lines = log.trim().split("\n").filter(Boolean);
    if (lines.length === 0) return { layers, confidence: "high", source: "git" };

    const modMap = new Map<string, Feature[]>();

    for (const line of lines) {
      // Skip merge commits
      if (line.includes("Merge ")) continue;
      // Extract message (after hash)
      const hashEnd = line.indexOf(" ");
      if (hashEnd < 0) continue;
      const msg = line.substring(hashEnd + 1).trim();

      let type: SourceType = "pre_existing";
      let title = msg;

      const prefixMatch = msg.match(/^(feat|fix|refactor|perf|chore|docs|style|test|build|ci|revert)(\(.+?\))?:\s*(.+)/);
      if (prefixMatch) {
        const p = prefixMatch[1];
        title = prefixMatch[3];
        if (p === "feat") type = "feature_request";
        else if (p === "fix") type = "bug_fix";
        else if (p === "refactor") type = "refactor";
        else if (p === "perf") type = "optimization";
        else type = "pre_existing";
      }

      // Module inference from scope or path
      let module = "general";
      const scopeMatch = msg.match(/^(feat|fix|refactor|perf)\((.+?)\):/);
      if (scopeMatch) {
        module = scopeMatch[2];
      }

      const shortTitle = title.length > 80 ? title.substring(0, 77) + "..." : title;

      if (!modMap.has(module)) modMap.set(module, []);
      const existing = modMap.get(module)!;
      if (!existing.some(e => e.title === shortTitle)) {
        existing.push({
          id: "",
          title: shortTitle,
          status: "implemented",
          priority: "medium",
          source: { type: type },
          history: [],
          depends_on: [],
        });
      }
    }

    const modules: Module[] = [];
    let order = 0;
    for (const [name, features] of modMap) {
      if (features.length > 0) {
        modules.push({ name, features });
      }
    }

    if (modules.length > 0) {
      layers.push({ name: "Inferred from Git", order: 0, modules });
    }
  } catch {
    // git not available — return empty
  }
  return { layers, confidence: "high", source: "git" };
}

// CLScanner: parse CHANGELOG.md
export function scanChangelog(cwd: string): ScanResult {
  const layers: Layer[] = [];
  const changelogPath = path.join(cwd, "CHANGELOG.md");
  if (!fs.existsSync(changelogPath)) return { layers, confidence: "high", source: "changelog" };

  let content: string;
  try {
    content = fs.readFileSync(changelogPath, "utf-8");
  } catch {
    return { layers, confidence: "high", source: "changelog" };
  }

  const lines = content.split("\n");
  const versions: string[] = [];
  for (const line of lines) {
    const m = line.match(/^##\s+v?([\d.]+)/);
    if (m) versions.push(m[1]);
  }

  if (versions.length > 0) {
    // Cap at last 10 versions
    const recent = versions.slice(0, 10);
    layers.push({
      name: "Release History",
      order: 0,
      modules: recent.map((v, i) => ({
        name: `v${v}`,
        features: [{
          id: "",
          title: `Released v${v}`,
          status: "implemented",
          priority: "medium",
          source: { type: "pre_existing" as SourceType },
          history: [{ at: "", event: "inferred", detail: `From CHANGELOG.md` }],
          depends_on: [],
        }],
      })),
    });
  }

  return { layers, confidence: "high", source: "changelog" };
}

// PkgScanner: parse package.json workspaces
export function scanPackageJson(cwd: string): ScanResult {
  const layers: Layer[] = [];
  const pkgPath = path.join(cwd, "package.json");
  if (!fs.existsSync(pkgPath)) return { layers, confidence: "medium", source: "package.json" };

  let pkg: any;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  } catch {
    return { layers, confidence: "medium", source: "package.json" };
  }

  if (pkg.workspaces) {
    const workspaceDirs: string[] = Array.isArray(pkg.workspaces)
      ? pkg.workspaces
      : (pkg.workspaces.packages || []);

    const modules: Module[] = [];
    for (const ws of workspaceDirs) {
      if (ws.includes("*")) {
        const base = ws.replace(/\*.*$/, "");
        const basePath = path.join(cwd, base);
        if (!fs.existsSync(basePath)) continue;

        let entries: fs.Dirent[];
        try { entries = fs.readdirSync(basePath, { withFileTypes: true }); } catch { continue; }

        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          const subPkg = path.join(basePath, entry.name, "package.json");
          if (!fs.existsSync(subPkg)) continue;

          let sub: any;
          try { sub = JSON.parse(fs.readFileSync(subPkg, "utf-8")); } catch { continue; }

          modules.push({
            name: sub.name || entry.name,
            features: [{
              id: "",
              title: sub.description || `${sub.name || entry.name} package`,
              status: "implemented",
              priority: "medium",
              source: { type: "pre_existing" as SourceType },
              history: [{ at: "", event: "inferred", detail: "From package.json" }],
              depends_on: [],
            }],
          });
        }
      }
    }

    if (modules.length > 0) {
      layers.push({ name: "Workspaces", order: 0, modules });
    }
  }

  return { layers, confidence: "medium", source: "package.json" };
}

// Merger: merge ScanResults into ToposData, assigning feature IDs
export function mergeScanResults(results: ScanResult[]): ToposData {
  const nonEmpty = results.filter(r => r.layers.length > 0);
  if (nonEmpty.length === 0) {
    return {
      project: {
        name: path.basename(process.cwd()),
        layers: [],
        plan: { current: [], next: [], recently_deprecated: [] },
      },
    };
  }

  // Merge layers, deduplicating by name
  const layerMap = new Map<string, Layer>();
  let maxOrder = 0;

  for (const result of nonEmpty) {
    for (const layer of result.layers) {
      if (!layerMap.has(layer.name)) {
        layerMap.set(layer.name, {
          name: layer.name,
          order: maxOrder++,
          modules: [],
        });
      }
      const existing = layerMap.get(layer.name)!;

      for (const mod of layer.modules) {
        let existingMod = existing.modules.find(m => m.name === mod.name);
        if (!existingMod) {
          existingMod = { name: mod.name, features: [] };
          existing.modules.push(existingMod);
        }

        // Deduplicate features by title
        for (const feat of mod.features) {
          if (!existingMod.features.some(f => f.title === feat.title)) {
            existingMod.features.push(feat);
          }
        }
      }
    }
  }

  // Assign feature IDs
  let idCounter = 1;
  for (const layer of layerMap.values()) {
    for (const mod of layer.modules) {
      for (const feat of mod.features) {
        feat.id = `feat-${String(idCounter++).padStart(3, "0")}`;
      }
    }
  }

  return {
    project: {
      name: path.basename(process.cwd()),
      layers: Array.from(layerMap.values()),
      plan: { current: [], next: [], recently_deprecated: [] },
    },
  };
}
