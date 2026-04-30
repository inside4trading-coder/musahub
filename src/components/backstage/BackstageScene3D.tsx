import { Suspense, useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useFrame, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Html, Line } from "@react-three/drei";
import * as THREE from "three";
import { X } from "lucide-react";
import type { BackstageWorkflow } from "@/types/backstage";
import { TriggerBadge } from "./TriggerBadge";
import { IntegrationChip } from "./IntegrationChip";

type TriggerKind = "telegram" | "webhook" | "schedule" | "chat" | "manual";

const TRIGGER_STYLE: Record<
  TriggerKind,
  { color: string; radius: number; idle: "pulse" | "flash" | "breathe" | "rings" | "spin" }
> = {
  telegram: { color: "#4f98a3", radius: 0.55, idle: "pulse" },
  webhook: { color: "#e8af34", radius: 0.5, idle: "flash" },
  schedule: { color: "#6daa45", radius: 0.5, idle: "breathe" },
  chat: { color: "#a86fdf", radius: 0.65, idle: "rings" },
  manual: { color: "#797876", radius: 0.45, idle: "spin" },
};

const INTEGRATION_COLORS: Record<string, string> = {
  OpenAI: "#10a37f",
  "OpenAI Vision": "#10a37f",
  Supabase: "#3ecf8e",
  Telegram: "#229ed9",
  Notion: "#ffffff",
  Gmail: "#ea4335",
  "Google Maps": "#4285f4",
  SMTP: "#f59e0b",
  DataForSEO: "#6366f1",
  "PDF.co": "#ef4444",
  "chart-img": "#06b6d4",
  RSS: "#f97316",
  HTTP: "#94a3b8",
};

const integrationColor = (name: string) => INTEGRATION_COLORS[name] ?? "#6b7280";

const primaryTrigger = (wf: BackstageWorkflow): TriggerKind => {
  const t = (wf.triggers[0] ?? "manual").toLowerCase();
  if (t in TRIGGER_STYLE) return t as TriggerKind;
  return "manual";
};

type PositionedWorkflow = {
  workflow: BackstageWorkflow;
  position: [number, number, number];
  trigger: TriggerKind;
};

const computeLayout = (workflows: BackstageWorkflow[]): PositionedWorkflow[] => {
  const groups: Record<string, BackstageWorkflow[]> = {};
  workflows.forEach((wf) => {
    const t = primaryTrigger(wf);
    groups[t] = groups[t] ?? [];
    groups[t].push(wf);
  });

  const order: TriggerKind[] = ["telegram", "webhook", "schedule", "chat", "manual"];
  const ordered: BackstageWorkflow[] = [];
  order.forEach((t) => (groups[t] ?? []).forEach((w) => ordered.push(w)));
  Object.keys(groups).forEach((t) => {
    if (!order.includes(t as TriggerKind)) ordered.push(...groups[t]);
  });

  const total = ordered.length;
  return ordered.map((workflow, index) => {
    const trigger = primaryTrigger(workflow);
    const angle = (index / total) * Math.PI * 2;
    const x = Math.cos(angle) * 5;
    const z = Math.sin(angle) * 3.5;
    const seed = Math.sin(index * 12.9898) * 43758.5453;
    const frac = seed - Math.floor(seed);
    let y = (frac - 0.5) * 1.5;
    if (trigger === "chat") y += 1.2;
    return { workflow, position: [x, y, z], trigger };
  });
};

const Particles = () => {
  const positions = useMemo(() => {
    const arr = new Float32Array(200 * 3);
    for (let i = 0; i < 200; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 30;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 20;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    return arr;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={200}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.04} color="#4f98a3" transparent opacity={0.6} />
    </points>
  );
};

type AgentNodeProps = {
  item: PositionedWorkflow;
  selected: boolean;
  onSelect: (wf: BackstageWorkflow) => void;
  offset: number;
};

const AgentNode = ({ item, selected, onSelect, offset }: AgentNodeProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const baseY = item.position[1];
  const style = TRIGGER_STYLE[item.trigger];

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.position.y = baseY + Math.sin(t * 0.5 + offset) * 0.12;
    }
    if (meshRef.current) {
      switch (style.idle) {
        case "pulse":
          meshRef.current.scale.setScalar(1 + Math.sin(t * 3) * 0.05);
          break;
        case "breathe":
          meshRef.current.scale.setScalar(1 + Math.sin(t * 0.8) * 0.04);
          break;
        case "spin":
          meshRef.current.rotation.y += 0.005;
          break;
        case "rings":
          meshRef.current.rotation.y += 0.008;
          break;
      }
    }
    if (matRef.current) {
      const baseEm = selected ? 1.2 : 0.4;
      if (style.idle === "flash") {
        matRef.current.emissiveIntensity = 0.3 + Math.abs(Math.sin(t * 2)) * 0.7;
      } else {
        matRef.current.emissiveIntensity = baseEm;
      }
    }
    if (ringRef.current && style.idle === "rings") {
      const s = 1.4 + ((t * 0.6) % 1) * 0.8;
      ringRef.current.scale.setScalar(s);
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.4 * (1 - ((t * 0.6) % 1));
    }
  });

  const targetScale = selected ? 1.3 : 1;
  useFrame(() => {
    if (groupRef.current) {
      const cur = groupRef.current.scale.x;
      const next = cur + (targetScale - cur) * 0.1;
      groupRef.current.scale.setScalar(next);
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(item.workflow);
  };

  return (
    <group ref={groupRef} position={item.position}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "default")}
      >
        <sphereGeometry args={[style.radius, 32, 32]} />
        <meshStandardMaterial
          ref={matRef}
          color={style.color}
          emissive={style.color}
          emissiveIntensity={selected ? 1.2 : 0.4}
          roughness={0.3}
          metalness={0.6}
        />
      </mesh>

      <mesh scale={1.08}>
        <sphereGeometry args={[style.radius, 16, 16]} />
        <meshBasicMaterial color={style.color} wireframe opacity={0.15} transparent />
      </mesh>

      {style.idle === "rings" && (
        <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[style.radius * 1.05, style.radius * 1.15, 48]} />
          <meshBasicMaterial color={style.color} transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
      )}

      {item.workflow.integrations.map((name, i) => (
        <Satellite
          key={name}
          index={i}
          total={item.workflow.integrations.length}
          color={integrationColor(name)}
        />
      ))}

      <Html
        position={[0, style.radius + 0.55, 0]}
        center
        distanceFactor={10}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div
          style={{
            padding: "3px 8px",
            borderRadius: 6,
            background: "rgba(13,13,15,0.75)",
            color: "#fff",
            fontSize: 11,
            fontWeight: 600,
            whiteSpace: "nowrap",
            border: `1px solid ${style.color}66`,
            backdropFilter: "blur(4px)",
          }}
        >
          {item.workflow.name}
        </div>
      </Html>
    </group>
  );
};

const Satellite = ({
  index,
  total,
  color,
}: {
  index: number;
  total: number;
  color: string;
}) => {
  const ref = useRef<THREE.Mesh>(null);
  const speed = 0.4 + (index % 3) * 0.15;
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const angle = (index / total) * Math.PI * 2 + clock.elapsedTime * speed;
    const r = 1.1;
    ref.current.position.x = Math.cos(angle) * r;
    ref.current.position.z = Math.sin(angle) * r;
    ref.current.position.y = 0.1;
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.09, 12, 12]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.8}
        roughness={0.4}
      />
    </mesh>
  );
};

const Connections = ({ items }: { items: PositionedWorkflow[] }) => {
  const lines = useMemo(() => {
    const out: { a: [number, number, number]; b: [number, number, number]; color: string }[] = [];
    const byTrigger: Record<string, PositionedWorkflow[]> = {};
    items.forEach((it) => {
      byTrigger[it.trigger] = byTrigger[it.trigger] ?? [];
      byTrigger[it.trigger].push(it);
    });
    Object.entries(byTrigger).forEach(([trig, group]) => {
      if (group.length < 2) return;
      const color = TRIGGER_STYLE[trig as TriggerKind]?.color ?? "#4f98a3";
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          out.push({ a: group[i].position, b: group[j].position, color });
        }
      }
    });
    return out;
  }, [items]);

  return (
    <>
      {lines.map((l, i) => (
        <Line
          key={i}
          points={[l.a, l.b]}
          color={l.color}
          lineWidth={0.8}
          transparent
          opacity={0.3}
        />
      ))}
    </>
  );
};

type Props = {
  workflows: BackstageWorkflow[];
  onExit: () => void;
};

export const BackstageScene3D = ({ workflows, onExit }: Props) => {
  const [selected, setSelected] = useState<BackstageWorkflow | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const items = useMemo(() => computeLayout(workflows.filter((w) => w.active)), [workflows]);

  if (isMobile) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 p-12 text-center">
        <p className="text-sm text-muted-foreground">
          Vista 3D disponible en escritorio.
        </p>
        <button
          onClick={onExit}
          className="mt-4 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          Volver al grid
        </button>
      </div>
    );
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-border"
      style={{ height: "calc(100vh - 240px)", minHeight: 520, background: "#0d0d0f" }}
    >
      <Canvas dpr={[1, 1.75]} gl={{ antialias: true, alpha: false }}>
        <color attach="background" args={["#0d0d0f"]} />
        <fog attach="fog" args={["#0d0d0f", 14, 28]} />

        <PerspectiveCamera makeDefault position={[0, 3, 10]} fov={60} />
        <OrbitControls
          enableZoom
          enablePan={false}
          minDistance={4}
          maxDistance={18}
          autoRotate={!selected}
          autoRotateSpeed={0.4}
          dampingFactor={0.08}
          enableDamping
        />

        <ambientLight intensity={0.15} />
        <pointLight position={[0, 8, 0]} intensity={0.8} color="#ffffff" />
        <pointLight position={[-6, -2, -4]} intensity={0.4} color="#4f98a3" />
        <pointLight position={[6, -2, 4]} intensity={0.3} color="#a86fdf" />

        <Suspense fallback={null}>
          <Particles />
          <Connections items={items} />
          {items.map((it, i) => (
            <AgentNode
              key={it.workflow.id}
              item={it}
              selected={selected?.id === it.workflow.id}
              onSelect={setSelected}
              offset={i * 0.7}
            />
          ))}
        </Suspense>
      </Canvas>

      <div className="pointer-events-none absolute left-4 top-4 rounded-md border border-border/50 bg-background/40 px-3 py-1.5 text-[11px] text-muted-foreground backdrop-blur">
        Arrastra para orbitar · Scroll para zoom · Click en un agente
      </div>

      {selected && (
        <AgentDetailPanel
          workflow={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
};

const AgentDetailPanel = ({
  workflow,
  onClose,
}: {
  workflow: BackstageWorkflow;
  onClose: () => void;
}) => {
  return (
    <div className="absolute right-4 top-4 z-10 w-[360px] max-w-[92vw] overflow-hidden rounded-2xl border border-border bg-background/95 shadow-2xl backdrop-blur-xl animate-in slide-in-from-right-4 fade-in">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-foreground">{workflow.name}</h3>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{workflow.id}</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="max-h-[60vh] space-y-4 overflow-y-auto px-4 py-4">
        {workflow.description && (
          <p className="text-xs leading-relaxed text-foreground/80">{workflow.description}</p>
        )}

        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Triggers
          </p>
          <div className="flex flex-wrap gap-1.5">
            {workflow.triggers.map((t) => (
              <TriggerBadge key={t} trigger={t} />
            ))}
          </div>
        </div>

        {workflow.schedule && (
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Schedule
            </p>
            <p className="text-xs text-foreground/90">{workflow.schedule}</p>
          </div>
        )}

        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Integraciones
          </p>
          <div className="flex flex-wrap gap-1.5">
            {workflow.integrations.map((i) => (
              <IntegrationChip key={i} name={i} />
            ))}
          </div>
        </div>

        {workflow.endpoints && workflow.endpoints.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Endpoints
            </p>
            <ul className="space-y-1">
              {workflow.endpoints.map((e) => (
                <li
                  key={`${e.method}-${e.path}`}
                  className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-1 font-mono text-[11px]"
                >
                  <span
                    className="rounded px-1 py-0.5 text-[9px] font-bold"
                    style={{
                      background: "hsl(var(--secondary) / 0.15)",
                      color: "hsl(var(--secondary))",
                    }}
                  >
                    {e.method}
                  </span>
                  <span className="text-foreground/80">{e.path}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Pasos
          </p>
          <ol className="space-y-1">
            {workflow.graph.nodes.map((n, i) => (
              <li
                key={n.id}
                className="flex items-start gap-2 rounded-md bg-muted/30 px-2 py-1.5 text-[11px] text-foreground/85"
              >
                <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-secondary/20 text-[9px] font-bold text-secondary">
                  {i + 1}
                </span>
                <span>{n.label}</span>
              </li>
            ))}
          </ol>
        </div>

        {workflow.tags && workflow.tags.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Tags
            </p>
            <div className="flex flex-wrap gap-1">
              {workflow.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                >
                  #{t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BackstageScene3D;
