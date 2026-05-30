import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import type { ToposData, Feature, Layer, Module, HistoryEntry } from "./types.js";

const PROJECT_FILE = "project.yaml";

export function resolveProjectPath(cwd: string): string {
  return path.join(cwd, ".topos", PROJECT_FILE);
}

export function ensureToposDir(cwd: string): void {
  const dir = path.join(cwd, ".topos");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function readProject(cwd: string): ToposData {
  const filePath = resolveProjectPath(cwd);
  if (!fs.existsSync(filePath)) {
    return createEmpty(cwd);
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  return YAML.parse(raw) as ToposData;
}

export function writeProject(cwd: string, data: ToposData): void {
  ensureToposDir(cwd);
  const yaml = YAML.stringify(data, { lineWidth: 0 });
  fs.writeFileSync(resolveProjectPath(cwd), yaml, "utf-8");
}

export function createEmpty(cwd: string): ToposData {
  const name = path.basename(cwd);
  return {
    project: {
      name,
      layers: [],
      plan: { current: [], next: [], recently_deprecated: [] },
    },
  };
}

export function findFeature(data: ToposData, featureId: string): { feature: Feature; layer: Layer; module: Module } | null {
  for (const layer of data.project.layers) {
    for (const mod of layer.modules) {
      const feature = mod.features.find((f) => f.id === featureId);
      if (feature) {
        return { feature, layer, module: mod };
      }
    }
  }
  return null;
}

export function addHistoryEntry(feature: Feature, event: string, detail?: string): void {
  feature.history.push({
    at: new Date().toISOString().slice(0, 10),
    event,
    ...(detail ? { detail } : {}),
  });
}
