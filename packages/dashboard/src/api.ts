export interface ToposData {
  project: {
    name: string;
    layers: Layer[];
    plan: Plan;
  };
}

export interface Layer {
  name: string;
  order: number;
  modules: Module[];
}

export interface Module {
  name: string;
  features: Feature[];
}

export interface Feature {
  id: string;
  title: string;
  status: "active" | "in_progress" | "implemented" | "deprecated";
  progress?: number;
  priority: "low" | "medium" | "high" | "critical";
  source: {
    type: "feature_request" | "bug_fix" | "refactor" | "optimization";
    triggered_by?: string;
    related_to?: string;
  };
  depends_on?: string[];
  history: HistoryEntry[];
}

export interface HistoryEntry {
  at: string;
  event: string;
  detail?: string;
}

export interface Plan {
  current: string[];
  next: string[];
  recently_deprecated: string[];
}

export async function fetchProject(): Promise<ToposData> {
  const res = await fetch("/api/project");
  return res.json();
}

export async function patchFeature(id: string, patch: Partial<Feature>): Promise<void> {
  await fetch(`/api/feature/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

export function connectWebSocket(onMessage: (event: string, payload: unknown) => void): WebSocket {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(`${protocol}//${location.host}/api/ws`);
  ws.onmessage = (e) => {
    const { event, payload } = JSON.parse(e.data);
    onMessage(event, payload);
  };
  return ws;
}
