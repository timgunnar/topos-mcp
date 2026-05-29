export type FeatureStatus = "active" | "in_progress" | "implemented" | "deprecated";

export type SourceType = "feature_request" | "bug_fix" | "refactor" | "optimization";

export interface HistoryEntry {
  at: string;
  event: string;
  detail?: string;
}

export interface FeatureSource {
  type: SourceType;
  triggered_by?: string;
  related_to?: string;
}

export interface Feature {
  id: string;
  title: string;
  status: FeatureStatus;
  progress?: number;
  priority: "low" | "medium" | "high" | "critical";
  source: FeatureSource;
  depends_on?: string[];
  history: HistoryEntry[];
}

export interface Module {
  name: string;
  features: Feature[];
}

export interface Layer {
  name: string;
  order: number;
  modules: Module[];
}

export interface Plan {
  current: string[];
  next: string[];
  recently_deprecated: string[];
}

export interface Project {
  name: string;
  layers: Layer[];
  plan: Plan;
}

export interface ToposData {
  project: Project;
}
