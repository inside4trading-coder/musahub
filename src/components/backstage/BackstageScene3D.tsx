import { Suspense, useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useFrame, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Html } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
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
  const starPositions = useMemo(() => {
    const arr = new Float32Array(300 * 3);
    for (let i = 0; i < 300; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 50;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 30;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    return arr;
  }, []);

  const dustPositions = useMemo(() => {
    const arr = new Float32Array(120 * 3);
    for (let i = 0; i < 120; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 35;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 20;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 35;
    }
    return arr;
  }, []);

  return (
    <>
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={starPositions}
            count={300}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial size={0.025} color="#ffffff" transparent opacity={0.85} sizeAttenuation />
      </points>
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={dustPositions}
            count={120}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial size={0.08} color="#4f98a3" transparent opacity={0.35} sizeAttenuation />
      </points>
    </>
  );
};

const TRIGGER_ICON: Record<TriggerKind, string> = {
  telegram: "✈",
  webhook: "⚡",
  schedule: "⏱",
  chat: "💬",
  manual: "✋",
};

const AgentNode = ({ item, selected, onSelect }: AgentNodeProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const phongRef = useRef<THREE.MeshPhongMaterial>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const heartbeatRingRef = useRef<THREE.Mesh>(null);
  const baseY = item.position[1];
  const style = TRIGGER_STYLE[item.trigger];
  const phaseOffset = useMemo(() => Math.random() * Math.PI * 2, []);

  // Heartbeat: timer aleatorio que simula ejecución reciente del workflow
  const heartbeatStart = useRef<number>(-Infinity);
  const [beating, setBeating] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const scheduleNext = () => {
      // entre 4s y 14s aleatorio
      const delay = 4000 + Math.random() * 10000;
      timeoutId = setTimeout(() => {
        heartbeatStart.current = performance.now() / 1000;
        setBeating(true);
        // duración del latido visible ~1.4s
        setTimeout(() => setBeating(false), 1400);
        scheduleNext();
      }, delay);
    };
    scheduleNext();
    return () => clearTimeout(timeoutId);
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const hbElapsed = t - heartbeatStart.current;
    const hbActive = hbElapsed >= 0 && hbElapsed < 1.4;
    // Curva doble pico (lub-dub)
    const heartbeatPulse = hbActive
      ? Math.exp(-hbElapsed * 4) * Math.abs(Math.sin(hbElapsed * 14)) * 0.45
      : 0;

    if (groupRef.current) {
      groupRef.current.position.y = baseY + Math.sin(t * 0.6 + phaseOffset) * 0.15;
      const targetScale = selected ? 1.3 : 1;
      const cur = groupRef.current.scale.x;
      groupRef.current.scale.setScalar(cur + (targetScale - cur) * 0.1);
    }

    if (meshRef.current) {
      meshRef.current.rotation.y += 0.003;
      let pulse = 1;
      switch (item.trigger) {
        case "telegram":
          pulse = 1 + Math.sin(t * 2.5 + phaseOffset) * 0.04;
          break;
        case "schedule":
          pulse = 1 + Math.sin(t * 0.7 + phaseOffset) * 0.03;
          break;
        case "webhook":
          pulse = 1 + Math.abs(Math.sin(t * 2 + phaseOffset)) * 0.05;
          break;
        case "chat":
          pulse = 1 + Math.sin(t * 1.2 + phaseOffset) * 0.04;
          break;
        default:
          pulse = 1 + Math.abs(Math.sin(t * 1.5 + phaseOffset)) * 0.035;
      }
      meshRef.current.scale.setScalar(pulse + heartbeatPulse);
    }

    if (phongRef.current) {
      const baseEm = selected ? 0.95 : 0.55;
      let em = baseEm + Math.sin(t + phaseOffset) * 0.05;
      if (style.idle === "flash") {
        em = 0.4 + Math.abs(Math.sin(t * 2)) * 0.6;
      }
      // Boost durante heartbeat
      em += heartbeatPulse * 2.2;
      phongRef.current.emissiveIntensity = em;
    }

    if (glowRef.current) {
      const s = 1.45 + Math.sin(t * 1.2 + phaseOffset) * 0.06 + heartbeatPulse * 0.6;
      glowRef.current.scale.setScalar(s);
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.12 + heartbeatPulse * 0.5;
    }

    if (ringRef.current && style.idle === "rings") {
      const s = 1.4 + ((t * 0.6) % 1) * 0.8;
      ringRef.current.scale.setScalar(s);
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.4 * (1 - ((t * 0.6) % 1));
    }

    // Onda expansiva del heartbeat
    if (heartbeatRingRef.current) {
      if (hbActive) {
        const progress = hbElapsed / 1.4;
        const s = 1 + progress * 3.5;
        heartbeatRingRef.current.scale.setScalar(s);
        const mat = heartbeatRingRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.7 * (1 - progress);
        heartbeatRingRef.current.visible = true;
      } else {
        heartbeatRingRef.current.visible = false;
      }
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(item.workflow);
  };

  return (
    <group ref={groupRef} position={item.position}>
      {/* Onda expansiva del heartbeat */}
      <mesh ref={heartbeatRingRef} rotation={[Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[style.radius * 1.1, style.radius * 1.25, 64]} />
        <meshBasicMaterial color={style.color} transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>

      {/* Glow exterior */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[style.radius, 24, 24]} />
        <meshBasicMaterial color={style.color} transparent opacity={0.12} />
      </mesh>

      {/* Esfera principal con Phong */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "default")}
      >
        <sphereGeometry args={[style.radius, 48, 48]} />
        <meshPhongMaterial
          ref={phongRef}
          color={style.color}
          emissive={style.color}
          emissiveIntensity={selected ? 0.95 : 0.55}
          specular={"#ffffff"}
          shininess={80}
        />
      </mesh>

      {/* Wireframe técnico sutil */}
      <mesh scale={1.04}>
        <sphereGeometry args={[style.radius, 16, 12]} />
        <meshBasicMaterial color={style.color} wireframe transparent opacity={0.1} />
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
        position={[0, style.radius + 0.65, 0]}
        center
        distanceFactor={10}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            whiteSpace: "nowrap",
          }}
        >
          <div
            style={{
              color: "#ffffff",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 0.2,
              textShadow: "0 1px 8px rgba(0,0,0,0.9), 0 0 14px rgba(0,0,0,0.7)",
            }}
          >
            {item.workflow.name}
          </div>
          {/* Mini-badge pill flotante con trigger */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 7px",
              borderRadius: 999,
              background: `${style.color}26`,
              border: `1px solid ${style.color}66`,
              color: "#fff",
              fontSize: 9,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              boxShadow: beating ? `0 0 12px ${style.color}aa` : "none",
              transition: "box-shadow 0.3s ease",
            }}
          >
            <span style={{ fontSize: 9, opacity: 0.9 }}>{TRIGGER_ICON[item.trigger]}</span>
            <span>{item.workflow.triggers[0]}</span>
          </div>
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
  const groupRef = useRef<THREE.Group>(null);
  const speed = 0.4 + (index % 3) * 0.15;
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const angle = (index / total) * Math.PI * 2 + clock.elapsedTime * speed;
    const r = 1.1;
    groupRef.current.position.x = Math.cos(angle) * r;
    groupRef.current.position.z = Math.sin(angle) * r;
    groupRef.current.position.y = 0.1;
  });
  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[0.07, 14, 14]} />
        <meshPhongMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1}
          shininess={60}
        />
      </mesh>
      <mesh scale={1.8}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.18} />
      </mesh>
    </group>
  );
};

const AnimatedBeam = ({
  start,
  end,
  color,
}: {
  start: [number, number, number];
  end: [number, number, number];
  color: string;
}) => {
  const ref = useRef<THREE.Line>(null);

  const geometry = useMemo(() => {
    const points = [new THREE.Vector3(...start), new THREE.Vector3(...end)];
    const g = new THREE.BufferGeometry().setFromPoints(points);
    return g;
  }, [start, end]);

  const material = useMemo(
    () =>
      new THREE.LineDashedMaterial({
        color,
        dashSize: 0.3,
        gapSize: 0.15,
        transparent: true,
        opacity: 0.35,
        linewidth: 1,
      }),
    [color],
  );

  useEffect(() => {
    if (ref.current) {
      ref.current.computeLineDistances();
    }
  }, [geometry]);

  useFrame(({ clock }) => {
    if (ref.current) {
      const mat = ref.current.material as THREE.LineDashedMaterial & { dashOffset: number };
      mat.dashOffset = -clock.elapsedTime * 0.4;
    }
  });

  return <primitive object={new THREE.Line(geometry, material)} ref={ref} />;
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
        <AnimatedBeam key={i} start={l.a} end={l.b} color={l.color} />
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
        <p className="text-sm text-muted-foreground">Vista 3D disponible en escritorio.</p>
        <button
          onClick={onExit}
          className="mt-4 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          Volver al grid
        </button>
      </div>
    );
  }

  const selectedColor = selected ? TRIGGER_STYLE[primaryTrigger(selected)].color : "#4f98a3";

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-border"
      style={{ height: "calc(100vh - 240px)", minHeight: 520, background: "#07080d" }}
    >
      <Canvas dpr={[1, 1.75]} gl={{ antialias: true, alpha: false }}>
        <color attach="background" args={["#07080d"]} />
        <fog attach="fog" args={["#07080d", 12, 32]} />

        <PerspectiveCamera makeDefault position={[0, 3, 10]} fov={60} />
        <OrbitControls
          enableZoom
          enablePan={false}
          minDistance={4}
          maxDistance={18}
          autoRotate={!selected}
          autoRotateSpeed={0.35}
          dampingFactor={0.08}
          enableDamping
        />

        <ambientLight intensity={0.25} color="#1a2440" />
        <pointLight position={[0, 8, 0]} intensity={0.7} color="#ffffff" />
        <pointLight position={[-7, -2, -5]} intensity={0.6} color="#4f98a3" />
        <pointLight position={[7, -2, 5]} intensity={0.5} color="#a86fdf" />
        <pointLight position={[0, -6, 0]} intensity={0.25} color="#e8af34" />

        <Suspense fallback={null}>
          <Particles />
          <Connections items={items} />
          {items.map((it) => (
            <AgentNode
              key={it.workflow.id}
              item={it}
              selected={selected?.id === it.workflow.id}
              onSelect={setSelected}
            />
          ))}

          <EffectComposer>
            <Bloom
              intensity={0.85}
              luminanceThreshold={0.3}
              luminanceSmoothing={0.6}
              radius={0.4}
            />
          </EffectComposer>
        </Suspense>
      </Canvas>

      <div className="pointer-events-none absolute left-4 top-4 rounded-md border border-border/40 bg-background/30 px-3 py-1.5 text-[11px] text-muted-foreground backdrop-blur">
        Arrastra para orbitar · Scroll para zoom · Click en un agente
      </div>

      {selected && (
        <AgentDetailPanel
          workflow={selected}
          accentColor={selectedColor}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
};

const AgentDetailPanel = ({
  workflow,
  accentColor,
  onClose,
}: {
  workflow: BackstageWorkflow;
  accentColor: string;
  onClose: () => void;
}) => {
  return (
    <div
      className="absolute z-10 overflow-hidden animate-in slide-in-from-right-4 fade-in"
      style={{
        top: "16px",
        right: "16px",
        width: "320px",
        maxWidth: "92vw",
        background: "rgba(13, 14, 18, 0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: `1px solid ${accentColor}33`,
        borderRadius: "12px",
        color: "white",
        fontFamily: '"Satoshi", "Inter", sans-serif',
        boxShadow: `0 0 40px ${accentColor}22, 0 8px 32px rgba(0,0,0,0.6)`,
        transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div
        className="flex items-start justify-between gap-3 px-5 pt-5 pb-3"
        style={{ borderBottom: `1px solid ${accentColor}22` }}
      >
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-white">{workflow.name}</h3>
          <p className="mt-0.5 truncate text-[11px] text-white/50">{workflow.id}</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-white/60 hover:bg-white/10 hover:text-white"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="max-h-[60vh] space-y-4 overflow-y-auto px-5 py-4">
        {workflow.description && (
          <p className="text-xs leading-relaxed text-white/80">{workflow.description}</p>
        )}

        <div>
          <p
            className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: `${accentColor}cc` }}
          >
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
            <p
              className="mb-1 text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: `${accentColor}cc` }}
            >
              Schedule
            </p>
            <p className="text-xs text-white/90">{workflow.schedule}</p>
          </div>
        )}

        <div>
          <p
            className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: `${accentColor}cc` }}
          >
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
            <p
              className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: `${accentColor}cc` }}
            >
              Endpoints
            </p>
            <ul className="space-y-1">
              {workflow.endpoints.map((e) => (
                <li
                  key={`${e.method}-${e.path}`}
                  className="flex items-center gap-2 rounded-md px-2 py-1 font-mono text-[11px]"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <span
                    className="rounded px-1 py-0.5 text-[9px] font-bold"
                    style={{ background: `${accentColor}26`, color: accentColor }}
                  >
                    {e.method}
                  </span>
                  <span className="text-white/80">{e.path}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <p
            className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: `${accentColor}cc` }}
          >
            Pasos
          </p>
          <ol className="space-y-1">
            {workflow.graph.nodes.map((n, i) => (
              <li
                key={n.id}
                className="flex items-start gap-2 rounded-md px-2 py-1.5 text-[11px] text-white/85"
                style={{ background: "rgba(255,255,255,0.04)" }}
              >
                <span
                  className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
                  style={{ background: `${accentColor}33`, color: accentColor }}
                >
                  {i + 1}
                </span>
                <span>{n.label}</span>
              </li>
            ))}
          </ol>
        </div>

        {workflow.tags && workflow.tags.length > 0 && (
          <div>
            <p
              className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: `${accentColor}cc` }}
            >
              Tags
            </p>
            <div className="flex flex-wrap gap-1">
              {workflow.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-md px-1.5 py-0.5 text-[10px] text-white/60"
                  style={{ background: "rgba(255,255,255,0.06)" }}
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
