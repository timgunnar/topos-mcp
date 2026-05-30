import { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Text, Line } from "@react-three/drei";
import * as THREE from "three";
import type { ToposData, Feature } from "../api";

const LAYER_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
const LAYER_GAP = 4;
const MODULE_GAP = 3;

function statusColor(feature: Feature): string {
  switch (feature.status) {
    case "implemented":
      return "#22c55e";
    case "in_progress":
      return "#3b82f6";
    case "deprecated":
      return "#374151";
    default:
      return "#6b7280";
  }
}

function isBugFix(feature: Feature): boolean {
  return feature.source.type === "bug_fix";
}

function NodeSphere({
  feature,
  position,
  onClick,
}: {
  feature: Feature;
  position: [number, number, number];
  onClick: (e: ThreeEvent<MouseEvent>) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { invalidate } = useThree();
  const color = statusColor(feature);
  const bugAlert = isBugFix(feature);
  const scale =
    feature.priority === "critical" ? 0.7 : feature.priority === "high" ? 0.55 : 0.4;

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    if (feature.status === "in_progress") {
      const pulse = 1 + Math.sin(clock.elapsedTime * 3) * 0.15;
      meshRef.current.scale.setScalar(pulse);
      invalidate();
    } else {
      meshRef.current.scale.setScalar(1);
    }
    if (bugAlert) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      const alert = Math.sin(clock.elapsedTime * 5) * 0.5 + 0.5;
      mat.emissive = new THREE.Color().lerpColors(
        new THREE.Color("#000000"),
        new THREE.Color("#ef4444"),
        alert
      );
      invalidate();
    }
  });

  return (
    <mesh ref={meshRef} position={position} onClick={onClick}>
      <sphereGeometry args={[scale, 32, 32]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.4}
        roughness={0.3}
        metalness={0.2}
      />
    </mesh>
  );
}

function DependencyBeam({
  start,
  end,
}: {
  start: [number, number, number];
  end: [number, number, number];
}) {
  return <Line points={[start, end]} color="#4b5563" lineWidth={0.5} transparent opacity={0.4} />;
}

function LayerPlane({
  y,
  width,
  depth,
  color,
}: {
  y: number;
  width: number;
  depth: number;
  color: string;
}) {
  return (
    <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width, depth]} />
      <meshBasicMaterial color={color} transparent opacity={0.05} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Scene({
  data,
  selectedId,
  onSelect,
}: {
  data: ToposData;
  selectedId: string | null;
  onSelect: (id: string) => void;
  timelineValue: number;
}) {
  const layers = data.project.layers;
  const totalHeight = (layers.length - 1) * LAYER_GAP;

  const nodePositions = useMemo(() => {
    const positions: Record<string, [number, number, number]> = {};
    layers.forEach((layer, li) => {
      const y = totalHeight / 2 - li * LAYER_GAP;
      const mods = layer.modules;
      const totalWidth = (mods.length - 1) * MODULE_GAP;
      mods.forEach((mod, mi) => {
        const x = totalWidth / 2 - mi * MODULE_GAP;
        const z = Math.sin(mi * 1.5) * 1.5;
        mod.features.forEach((feat, fi) => {
          const offsetX = (fi % 3) * 0.8 - 0.8;
          const offsetZ = Math.floor(fi / 3) * 0.8 - 0.4;
          positions[feat.id] = [x + offsetX, y, z + offsetZ];
        });
      });
    });
    return positions;
  }, [data]);

  const dependencies = useMemo(() => {
    const deps: { start: [number, number, number]; end: [number, number, number] }[] = [];
    layers.forEach((layer) => {
      layer.modules.forEach((mod) => {
        mod.features.forEach((feat) => {
          if (feat.depends_on) {
            feat.depends_on.forEach((depId) => {
              if (nodePositions[feat.id] && nodePositions[depId]) {
                deps.push({ start: nodePositions[depId], end: nodePositions[feat.id] });
              }
            });
          }
        });
      });
    });
    return deps;
  }, [nodePositions, layers]);

  return (
    <group>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} />

      {layers.map((layer, li) => {
        const y = totalHeight / 2 - li * LAYER_GAP;
        const color = LAYER_COLORS[li % LAYER_COLORS.length];
        return (
          <group key={layer.name}>
            <LayerPlane y={y} width={20} depth={12} color={color} />
            <Text position={[-9, y + 0.3, -5]} fontSize={0.5} color={color} anchorX="left">
              {layer.name}
            </Text>
          </group>
        );
      })}

      {dependencies.map((dep, i) => (
        <DependencyBeam key={i} start={dep.start} end={dep.end} />
      ))}

      {layers.flatMap((layer) =>
        layer.modules.flatMap((mod) =>
          mod.features.map((feat) => {
            const pos = nodePositions[feat.id];
            if (!pos) return null;
            return (
              <group key={feat.id}>
                <NodeSphere
                  feature={feat}
                  position={pos}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(feat.id);
                  }}
                />
                {selectedId === feat.id && (
                  <mesh position={[pos[0], pos[1] + 0.5, pos[2]]}>
                    <ringGeometry args={[0.5, 0.55, 32]} />
                    <meshBasicMaterial color="#ffffff" />
                  </mesh>
                )}
              </group>
            );
          })
        )
      )}

      {layers.flatMap((layer, li) => {
        const y = totalHeight / 2 - li * LAYER_GAP;
        return layer.modules.map((mod, mi) => {
          const x = ((layer.modules.length - 1) * MODULE_GAP) / 2 - mi * MODULE_GAP;
          const z = Math.sin(mi * 1.5) * 1.5;
          return (
            <Text
              key={`${layer.name}-${mod.name}`}
              position={[x, y + 1.2, z]}
              fontSize={0.3}
              color="#9ca3af"
              anchorX="center"
            >
              {mod.name}
            </Text>
          );
        });
      })}
    </group>
  );
}

export default function Topology({
  data,
  selectedId,
  onSelect,
  timelineValue,
}: {
  data: ToposData;
  selectedId: string | null;
  onSelect: (id: string) => void;
  timelineValue: number;
}) {
  return (
    <Canvas camera={{ position: [8, 6, 15], fov: 50 }} style={{ background: "#0a0a0f" }} frameloop="demand">
      <Scene data={data} selectedId={selectedId} onSelect={onSelect} timelineValue={timelineValue} />
      <OrbitControls enableDamping dampingFactor={0.1} />
    </Canvas>
  );
}
