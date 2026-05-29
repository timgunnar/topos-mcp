import { useState, useEffect } from "react";
import type { ToposData } from "./api";
import { fetchProject, connectWebSocket } from "./api";
import Topology from "./components/Topology";
import Inspector from "./components/Inspector";
import Timeline from "./components/Timeline";
import "./App.css";

export default function App() {
  const [data, setData] = useState<ToposData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [timelineValue, setTimelineValue] = useState(1);

  useEffect(() => {
    fetchProject().then(setData);
  }, []);

  useEffect(() => {
    const ws = connectWebSocket((event) => {
      if (event === "feature_updated") {
        fetchProject().then(setData);
      }
    });
    return () => ws.close();
  }, []);

  if (!data) {
    return <div className="loading">加载项目中...</div>;
  }

  return (
    <div className="app">
      <Topology
        data={data}
        selectedId={selectedId}
        onSelect={setSelectedId}
        timelineValue={timelineValue}
      />
      {selectedId && (
        <Inspector
          featureId={selectedId}
          data={data}
          onClose={() => setSelectedId(null)}
          onUpdate={(id, patch) => {
            setData((prev) => {
              if (!prev) return prev;
              const next = structuredClone(prev);
              for (const layer of next.project.layers) {
                for (const mod of layer.modules) {
                  const feat = mod.features.find((f) => f.id === id);
                  if (feat) {
                    Object.assign(feat, patch);
                    return next;
                  }
                }
              }
              return next;
            });
          }}
        />
      )}
      <Timeline data={data} value={timelineValue} onChange={setTimelineValue} />
      <div className="help">拖拽旋转 · 滚轮缩放 · 右键平移 · 点击节点查看详情</div>
    </div>
  );
}
