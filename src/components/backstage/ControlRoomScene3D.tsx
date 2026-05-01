import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, Line } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { BackstageWorkflow } from "@/types/backstage";

/* ---------- Mapping helpers ---------- */
type RobotKind = "messenger" | "analyst" | "industrial" | "clockwork" | "humanoid";

type RobotProfile = {
  matchIds: string[];
  short: string;
  color: string;
  kind: RobotKind;
  zone: string;
  position: [number, number, number];
  body: "r2d2" | "3po" | "box" | "herald" | "oracle";
  extra?: "dish" | "antenna2" | "gear";
};

const PROFILES: RobotProfile[] = [
  { matchIds: ["r2d2-telegram-router"], short: "R2-D2", color: "#4f98a3", kind: "messenger", zone: "Telegram Lab", position: [-4.5, 0, -1.5], body: "r2d2", extra: "dish" },
  { matchIds: ["3po-charts-agent"], short: "3-PO", color: "#5eb8c5", kind: "analyst", zone: "Telegram Lab", position: [-2.8, 0, 1.2], body: "3po", extra: "antenna2" },
  { matchIds: ["email-campaign-webhook", "email-campaign"], short: "MAILER", color: "#e8af34", kind: "industrial", zone: "Webhook Factory", position: [3.8, 0, -2.0], body: "box" },
  { matchIds: ["delivery-enrichment"], short: "SCOUT", color: "#d4971e", kind: "industrial", zone: "Webhook Factory", position: [5.5, 0, 1.0], body: "box" },
  { matchIds: ["rss-news-aggregator", "rss-aggregator"], short: "HERALD", color: "#6daa45", kind: "clockwork", zone: "Schedule Observatory", position: [-1.5, 0, -5.5], body: "herald", extra: "gear" },
  { matchIds: ["schumann-resonance", "schumann"], short: "ΣΚUMANN", color: "#4e9e3a", kind: "clockwork", zone: "Schedule Observatory", position: [1.5, 0, -5.5], body: "herald", extra: "gear" },
  { matchIds: ["seo-audit-chat", "seo-audit"], short: "ORACLE", color: "#a86fdf", kind: "humanoid", zone: "Oracle Core", position: [0.0, 0.8, 0.0], body: "oracle" },
];

const findProfile = (id: string): RobotProfile | undefined =>
  PROFILES.find((p) => p.matchIds.includes(id));

type AgentState = "idle" | "typing" | "sending" | "receiving" | "processing";

const TRIGGER_ICONS: Record<string, string> = {
  webhook: "⚡",
  schedule: "⏰",
  telegram: "✈",
  chat: "💬",
  manual: "🖐",
};

/* ---------- Workstation ---------- */
function Workstation({ color, position, active }: { color: string; position: [number, number, number]; active: boolean }) {
  const coreRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const panelRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (coreRef.current) {
      const speed = active ? 0.066 : 0.022;
      coreRef.current.rotation.y += speed;
      coreRef.current.rotation.x += speed / 2;
    }
    if (ringRef.current) {
      const mat = ringRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = active ? 0.5 + Math.sin(t * 4) * 0.2 : 0.45;
    }
    if (panelRef.current) {
      panelRef.current.opacity = 0.14 + Math.sin(t * 1.6) * 0.04;
    }
  });

  return (
    <group position={position}>
      {/* Pedestal */}
      <mesh position={[0, 0.09, 0]}>
        <cylinderGeometry args={[0.9, 1.1, 0.18, 24]} />
        <meshStandardMaterial color={0x111319} roughness={0.8} metalness={0.5} />
      </mesh>
      {/* Core */}
      <mesh ref={coreRef} position={[0, 0.38, 0]}>
        <octahedronGeometry args={[0.18, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} roughness={0.2} metalness={0.6} />
      </mesh>
      {/* Ring horizontal */}
      <mesh ref={ringRef} position={[0, 0.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.32, 0.018, 12, 40]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} transparent opacity={0.45} />
      </mesh>
      {/* Tilted ring */}
      <mesh position={[0, 0.42, 0]} rotation={[Math.PI / 4, 0, 0]}>
        <torusGeometry args={[0.38, 0.012, 8, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} transparent opacity={0.25} />
      </mesh>
      {/* Holo panel */}
      <mesh position={[0, 0.82, 0.44]} rotation={[-0.35, 0, 0]}>
        <planeGeometry args={[0.7, 0.42]} />
        <meshStandardMaterial
          ref={panelRef}
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          transparent
          opacity={0.14}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Wireframe lines on panel */}
      {[0.1, 0, -0.1].map((y, i) => (
        <mesh key={i} position={[0, 0.82 + y, 0.45]} rotation={[-0.35, 0, 0]}>
          <planeGeometry args={[0.65, 0.005]} />
          <meshBasicMaterial color={color} transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* Keyboard */}
      <mesh position={[0, 0.32, 0.52]} rotation={[-0.4, 0, 0]}>
        <boxGeometry args={[0.5, 0.04, 0.28]} />
        <meshStandardMaterial color={0x1a1c24} roughness={0.7} metalness={0.4} />
      </mesh>
      <pointLight color={color} intensity={0.6} distance={3.5} position={[0, 0.4, 0]} />
    </group>
  );
}

/* ---------- Robot ---------- */
type RobotProps = {
  profile: RobotProfile;
  workflow: BackstageWorkflow;
  state: AgentState;
  onClick: () => void;
  onPositionReady: (pos: THREE.Vector3) => void;
  selected: boolean;
};

function Robot({ profile, workflow, state, onClick, onPositionReady, selected }: RobotProps) {
  const groupRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const armRRef = useRef<THREE.Group>(null);
  const eyeMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const antennaBallRef = useRef<THREE.MeshStandardMaterial>(null);
  const gearRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const ringMatRef = useRef<THREE.MeshBasicMaterial>(null);

  const phaseOffset = useMemo(() => Math.random() * Math.PI * 2, []);
  const baseY = profile.position[1];

  useFrame(({ clock }) => {
    if (!groupRef.current || !innerRef.current) return;
    const t = clock.elapsedTime;
    const ph = phaseOffset;

    // Float + sway
    groupRef.current.position.y = baseY + Math.sin(t * 0.55 + ph) * 0.1;
    innerRef.current.rotation.z = Math.sin(t * 0.38 + ph) * 0.022;

    // Scale pulse per kind
    let s = 0.9;
    switch (profile.kind) {
      case "messenger": s += Math.sin(t * 2.2 + ph) * 0.025; break;
      case "analyst":   s += Math.sin(t * 1.8 + ph) * 0.022; break;
      case "industrial":s += Math.abs(Math.sin(t * 1.4 + ph)) * 0.018; break;
      case "clockwork": s += Math.sin(t * 0.7 + ph) * 0.015; break;
      case "humanoid":  s += Math.sin(t * 1.0 + ph) * 0.020; break;
    }
    innerRef.current.scale.setScalar(s);

    // Eye pulse
    let eyeBase = 1.4;
    let antBase = 1.2;
    if (state === "sending") eyeBase = 2.4;
    if (state === "receiving") eyeBase = 2.8;
    if (state === "processing") { eyeBase = 2.2; antBase = 2.0; }

    if (eyeMatRef.current) {
      eyeMatRef.current.emissiveIntensity = eyeBase + Math.sin(t * 3 + ph) * 0.6;
    }
    if (antennaBallRef.current) {
      antennaBallRef.current.emissiveIntensity = antBase + Math.sin(t * 4 + ph) * 0.8;
    }
    if (gearRef.current) gearRef.current.rotation.z += 0.018;

    // Head animations per state (lerp)
    if (headRef.current) {
      let targetX = 0;
      let targetY = 0;
      if (profile.kind === "messenger") targetY = Math.sin(t * 0.6 + ph) * 0.28;
      if (state === "typing") targetX = 0.18;
      if (state === "receiving") targetX = -0.12;
      headRef.current.rotation.x += (targetX - headRef.current.rotation.x) * 0.08;
      headRef.current.rotation.y += (targetY - headRef.current.rotation.y) * 0.08;
    }
    // Right arm typing
    if (armRRef.current) {
      const targetZ = state === "typing" ? -0.8 : -0.05;
      armRRef.current.rotation.z += (targetZ - armRRef.current.rotation.z) * 0.1;
    }

    // Torso rotation when sending
    if (torsoRef.current) {
      const targetY = state === "sending" ? 0.4 : 0;
      torsoRef.current.rotation.y += (targetY - torsoRef.current.rotation.y) * 0.06;
    }

    // Halo emphasis when selected
    if (haloRef.current) {
      const mat = haloRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = selected ? 0.18 : 0.06;
    }

    // Sending pulse ring
    if (ringRef.current && ringMatRef.current) {
      if (state === "sending") {
        const pt = (t * 1.5) % 1;
        ringRef.current.scale.setScalar(0.4 + pt * 1.6);
        ringMatRef.current.opacity = (1 - pt) * 0.6;
      } else {
        ringMatRef.current.opacity = 0;
      }
    }

    // Report world position for data packets
    const world = new THREE.Vector3();
    groupRef.current.getWorldPosition(world);
    onPositionReady(world);
  });

  const c = profile.color;
  const bodyMat = (
    <meshStandardMaterial
      color={c}
      emissive={c}
      emissiveIntensity={0.28}
      roughness={0.32}
      metalness={0.78}
    />
  );
  const darkMat = (
    <meshStandardMaterial color={0x0d0e12} roughness={0.6} metalness={0.5} />
  );

  // Body
  const renderBody = () => {
    switch (profile.body) {
      case "r2d2":
        return <cylinderGeometry args={[0.28, 0.32, 0.55, 12]} />;
      case "3po":
        return <cylinderGeometry args={[0.26, 0.30, 0.52, 12]} />;
      case "herald":
        return <boxGeometry args={[0.56, 0.52, 0.38]} />;
      case "oracle":
        return <boxGeometry args={[0.60, 0.60, 0.34]} />;
      default:
        return <boxGeometry args={[0.58, 0.52, 0.40]} />;
    }
  };

  const renderHead = () => {
    switch (profile.body) {
      case "r2d2":
        return <sphereGeometry args={[0.28, 16, 16]} />;
      case "3po":
        return <sphereGeometry args={[0.26, 16, 16]} />;
      case "herald":
        return <cylinderGeometry args={[0.24, 0.26, 0.30, 8]} />;
      case "oracle":
        return <boxGeometry args={[0.44, 0.38, 0.38]} />;
      default:
        return <boxGeometry args={[0.50, 0.38, 0.42]} />;
    }
  };

  return (
    <group ref={groupRef} position={profile.position}>
      <group ref={innerRef} onClick={(e) => { e.stopPropagation(); onClick(); }}>
        {/* Halo */}
        <mesh ref={haloRef}>
          <sphereGeometry args={[1.0, 24, 24]} />
          <meshBasicMaterial color={c} transparent opacity={0.06} side={THREE.BackSide} />
        </mesh>
        {/* Wireframe technical */}
        <mesh scale={1.06}>
          <sphereGeometry args={[0.55, 12, 12]} />
          <meshBasicMaterial color={c} wireframe transparent opacity={0.08} />
        </mesh>

        {/* Sending ring (ground) */}
        <mesh ref={ringRef} position={[0, -0.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.25, 0.32, 32]} />
          <meshBasicMaterial ref={ringMatRef} color={c} transparent opacity={0} side={THREE.DoubleSide} />
        </mesh>

        <group ref={torsoRef}>
          {/* Body */}
          <mesh position={[0, 0.05, 0]}>
            {renderBody()}
            {bodyMat}
          </mesh>

          {/* Chest panel */}
          <mesh position={[0, 0.05, 0.21]}>
            <boxGeometry args={[0.28, 0.22, 0.05]} />
            {darkMat}
          </mesh>
          {[-0.08, 0, 0.08].map((x, i) => (
            <mesh key={i} position={[x, 0.05, 0.24]}>
              <sphereGeometry args={[0.028, 8, 8]} />
              <meshStandardMaterial color={c} emissive={c} emissiveIntensity={1.6} />
            </mesh>
          ))}

          {/* Neck */}
          <mesh position={[0, 0.4, 0]}>
            <cylinderGeometry args={[0.08, 0.10, 0.12, 8]} />
            {darkMat}
          </mesh>

          {/* Head */}
          <group ref={headRef} position={[0, 0.6, 0]}>
            <mesh>
              {renderHead()}
              {bodyMat}
            </mesh>
            {/* Eyes */}
            <mesh position={[-0.09, 0.02, 0.22]}>
              <sphereGeometry args={[0.06, 10, 10]} />
              <meshStandardMaterial
                ref={eyeMatRef}
                color={0xffffff}
                emissive={c}
                emissiveIntensity={1.8}
                roughness={0.05}
                metalness={0.1}
              />
            </mesh>
            <mesh position={[0.09, 0.02, 0.22]}>
              <sphereGeometry args={[0.06, 10, 10]} />
              <meshStandardMaterial color={0xffffff} emissive={c} emissiveIntensity={1.8} roughness={0.05} metalness={0.1} />
            </mesh>
            {/* Antenna principal */}
            <mesh position={[0, 0.45, 0]}>
              <cylinderGeometry args={[0.018, 0.022, 0.28, 6]} />
              {darkMat}
            </mesh>
            <mesh position={[0, 0.6, 0]}>
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshStandardMaterial ref={antennaBallRef} color={c} emissive={c} emissiveIntensity={2.0} />
            </mesh>
            {/* Extras */}
            {profile.extra === "antenna2" && (
              <mesh position={[0.18, 0.32, 0]} rotation={[0, 0, -0.5]}>
                <cylinderGeometry args={[0.014, 0.018, 0.22, 6]} />
                {darkMat}
              </mesh>
            )}
            {profile.extra === "dish" && (
              <mesh position={[-0.28, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
                <coneGeometry args={[0.22, 0.12, 12]} />
                <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.5} metalness={0.7} roughness={0.3} />
              </mesh>
            )}
            {profile.extra === "gear" && (
              <mesh ref={gearRef} position={[0.30, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                <torusGeometry args={[0.2, 0.04, 8, 20]} />
                <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.6} metalness={0.8} roughness={0.4} />
              </mesh>
            )}
          </group>

          {/* Arms */}
          {/* Left arm */}
          <group position={[-0.35, 0.18, 0]}>
            <mesh position={[0, -0.12, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 0.25, 8]} />
              {bodyMat}
            </mesh>
            <mesh position={[0, -0.27, 0]}>
              <sphereGeometry args={[0.055, 8, 8]} />
              {darkMat}
            </mesh>
            <mesh position={[0, -0.42, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 0.22, 8]} />
              {bodyMat}
            </mesh>
            <mesh position={[0, -0.55, 0]}>
              <sphereGeometry args={[0.06, 8, 8]} />
              {darkMat}
            </mesh>
          </group>
          {/* Right arm (animated for typing) */}
          <group ref={armRRef} position={[0.35, 0.18, 0]} rotation={[0, 0, -0.05]}>
            <mesh position={[0, -0.12, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 0.25, 8]} />
              {bodyMat}
            </mesh>
            <mesh position={[0, -0.27, 0]}>
              <sphereGeometry args={[0.055, 8, 8]} />
              {darkMat}
            </mesh>
            <mesh position={[0, -0.42, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 0.22, 8]} />
              {bodyMat}
            </mesh>
            <mesh position={[0, -0.55, 0]}>
              <sphereGeometry args={[0.06, 8, 8]} />
              {darkMat}
            </mesh>
          </group>

          {/* Legs */}
          {[-0.15, 0.15].map((x, i) => (
            <group key={i} position={[x, -0.25, 0]}>
              <mesh>
                <sphereGeometry args={[0.07, 8, 8]} />
                {darkMat}
              </mesh>
              <mesh position={[0, -0.18, 0]}>
                <cylinderGeometry args={[0.07, 0.06, 0.28, 8]} />
                {bodyMat}
              </mesh>
              <mesh position={[0, -0.34, 0]}>
                <sphereGeometry args={[0.06, 8, 8]} />
                {darkMat}
              </mesh>
              <mesh position={[0, -0.48, 0]}>
                <cylinderGeometry args={[0.06, 0.06, 0.22, 8]} />
                {bodyMat}
              </mesh>
              <mesh position={[0, -0.62, 0.04]}>
                <boxGeometry args={[0.14, 0.06, 0.2]} />
                {darkMat}
              </mesh>
            </group>
          ))}
        </group>
      </group>

      {/* Floating label */}
      <Html position={[0, 1.3, 0]} center distanceFactor={9} zIndexRange={[0, 0]}>
        <div style={{ pointerEvents: "none", textAlign: "center", userSelect: "none" }}>
          <div
            style={{
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.02em",
              textShadow: `0 0 12px ${c}, 0 2px 6px rgba(0,0,0,0.85)`,
              whiteSpace: "nowrap",
            }}
          >
            {profile.short} · {workflow.name.split("—").pop()?.trim() ?? workflow.name}
          </div>
          <div
            style={{
              marginTop: 4,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 8px",
              borderRadius: 999,
              fontSize: 10,
              fontWeight: 600,
              color: c,
              background: "rgba(7,8,13,0.65)",
              border: `1px solid ${c}66`,
              backdropFilter: "blur(6px)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              whiteSpace: "nowrap",
            }}
          >
            {TRIGGER_ICONS[workflow.triggers[0]] ?? "⚡"} {workflow.triggers[0]}
          </div>
        </div>
      </Html>
    </group>
  );
}

/* ---------- Data Packet ---------- */
function DataPacket({
  from,
  to,
  color,
  duration = 1.8,
  startDelay,
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  color: string;
  duration?: number;
  startDelay: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const startRef = useRef<number | null>(null);

  const curve = useMemo(() => {
    const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    mid.y += 1.4;
    return new THREE.QuadraticBezierCurve3(from.clone().add(new THREE.Vector3(0, 0.6, 0)), mid, to.clone().add(new THREE.Vector3(0, 0.6, 0)));
  }, [from, to]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (startRef.current === null) startRef.current = t + startDelay;
    let elapsed = t - startRef.current;
    if (elapsed < 0) {
      if (matRef.current) matRef.current.opacity = 0;
      if (ref.current) ref.current.scale.setScalar(0.001);
      return;
    }
    let progress = elapsed / duration;
    if (progress >= 1) {
      // restart
      startRef.current = t + 0.8 + Math.random() * 1.5;
      progress = 0;
    }
    const pos = curve.getPoint(progress);
    if (ref.current) {
      ref.current.position.copy(pos);
      const s = Math.sin(progress * Math.PI); // 0->1->0
      ref.current.scale.setScalar(s);
    }
    if (matRef.current) {
      matRef.current.opacity = Math.sin(progress * Math.PI);
    }
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.045, 12, 12]} />
      <meshStandardMaterial ref={matRef} color={color} emissive={color} emissiveIntensity={2.4} transparent opacity={0} />
    </mesh>
  );
}

/* ---------- Connection ---------- */
function Connection({ from, to, color }: { from: THREE.Vector3; to: THREE.Vector3; color: string }) {
  const ref = useRef<any>(null);
  const points = useMemo(() => {
    const a = from.clone().add(new THREE.Vector3(0, 0.6, 0));
    const b = to.clone().add(new THREE.Vector3(0, 0.6, 0));
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    mid.y += 1.0;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    return curve.getPoints(40);
  }, [from, to]);

  useFrame(() => {
    if (ref.current && ref.current.material) {
      ref.current.material.dashOffset = (ref.current.material.dashOffset ?? 0) - 0.004;
    }
  });

  return (
    <Line
      ref={ref as any}
      points={points}
      color={color}
      lineWidth={1}
      transparent
      opacity={0.22}
      dashed
      dashSize={0.3}
      gapSize={0.15}
    />
  );
}

/* ---------- Environment ---------- */
function LabEnvironment() {
  return (
    <group>
      {/* Floor */}
      <mesh position={[0, -0.04, 0]} receiveShadow>
        <cylinderGeometry args={[4.5, 4.5, 0.06, 48]} />
        <meshStandardMaterial color={0x0d0f14} roughness={0.9} metalness={0.3} />
      </mesh>
      {/* Floor edge glow */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[4.5, 0.02, 8, 48]} />
        <meshStandardMaterial color={"#4ECDC4"} emissive={"#4ECDC4"} emissiveIntensity={1.2} transparent opacity={0.5} />
      </mesh>
      {/* Oracle elevated platform */}
      <mesh position={[0, 0.07, 0]}>
        <cylinderGeometry args={[1.4, 1.6, 0.22, 24]} />
        <meshStandardMaterial color={0x111520} emissive={"#4ECDC4"} emissiveIntensity={0.08} roughness={0.8} metalness={0.3} />
      </mesh>
      {/* Columns */}
      {[
        [-7, 0, -6],
        [7, 0, -6],
        [-7, 0, 6],
        [7, 0, 6],
      ].map((p, i) => (
        <mesh key={i} position={p as any}>
          <cylinderGeometry args={[0.055, 0.055, 5.5, 8]} />
          <meshStandardMaterial color={0x1a1c24} metalness={0.8} roughness={0.4} />
        </mesh>
      ))}
      {/* Grid helper */}
      <gridHelper args={[30, 30, 0x4f98a3, 0x0d1520]} position={[0, -0.04, 0]} />
    </group>
  );
}

function Particles() {
  const points = useMemo(() => {
    const create = (count: number, spread: number) => {
      const arr = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        arr[i * 3] = (Math.random() - 0.5) * spread;
        arr[i * 3 + 1] = Math.random() * spread * 0.6;
        arr[i * 3 + 2] = (Math.random() - 0.5) * spread;
      }
      return arr;
    };
    return {
      white: create(400, 80),
      teal: create(100, 60),
      purple: create(60, 50),
    };
  }, []);

  return (
    <group>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={points.white.length / 3} array={points.white} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial color={0xffffff} size={0.04} transparent opacity={0.65} sizeAttenuation />
      </points>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={points.teal.length / 3} array={points.teal} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial color={"#4ECDC4"} size={0.09} transparent opacity={0.22} sizeAttenuation />
      </points>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={points.purple.length / 3} array={points.purple} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial color={"#a86fdf"} size={0.07} transparent opacity={0.15} sizeAttenuation />
      </points>
    </group>
  );
}

function SceneFog() {
  const { scene } = useThree();
  useEffect(() => {
    scene.fog = new THREE.FogExp2(0x07080d, 0.032);
    scene.background = new THREE.Color(0x07080d);
  }, [scene]);
  return null;
}

/* ---------- Main scene wrapper ---------- */
const ROUTES: Array<{ from: string; to: string; intervalMs: number }> = [
  { from: "r2d2-telegram-router", to: "3po-charts-agent", intervalMs: 4000 },
  { from: "email-campaign-webhook", to: "delivery-enrichment", intervalMs: 5500 },
  { from: "rss-news-aggregator", to: "seo-audit-chat", intervalMs: 6000 },
  { from: "schumann-resonance", to: "seo-audit-chat", intervalMs: 7000 },
  { from: "seo-audit-chat", to: "email-campaign-webhook", intervalMs: 5000 },
  { from: "seo-audit-chat", to: "rss-news-aggregator", intervalMs: 8000 },
];

const CONNECTIONS: Array<[string, string]> = [
  ["r2d2-telegram-router", "3po-charts-agent"],
  ["email-campaign-webhook", "delivery-enrichment"],
  ["rss-news-aggregator", "schumann-resonance"],
  ["rss-news-aggregator", "seo-audit-chat"],
  ["schumann-resonance", "seo-audit-chat"],
  ["seo-audit-chat", "email-campaign-webhook"],
];

const EVENT_MSGS = [
  "📨 R2-D2 enrutó mensaje Telegram",
  "📊 3-PO generó gráfico de conversión",
  "✉️ MAILER envió campaña a 340 contactos",
  "🗺️ SCOUT enriqueció 12 direcciones",
  "📰 HERALD agregó 28 artículos RSS",
  "🌍 ΣΚUMANN analizó resonancia diaria",
  "🔎 ORACLE entregó auditoría SEO",
];

type SceneProps = {
  workflows: BackstageWorkflow[];
  selectedId: string | null;
  onSelect: (wf: BackstageWorkflow) => void;
  onStateChange: (id: string, state: AgentState) => void;
  states: Record<string, AgentState>;
};

function Scene({ workflows, selectedId, onSelect, onStateChange, states }: SceneProps) {
  const positionsRef = useRef<Record<string, THREE.Vector3>>({});
  const [, force] = useState(0);

  // Track positions; force re-render when first available
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Map workflows by id, only those with profile
  const robots = useMemo(() => {
    return workflows
      .map((wf) => ({ wf, profile: findProfile(wf.id) }))
      .filter((r): r is { wf: BackstageWorkflow; profile: RobotProfile } => !!r.profile);
  }, [workflows]);

  return (
    <>
      <SceneFog />
      <ambientLight intensity={0.18} color={"#1a2238"} />
      <pointLight position={[0, 8, 0]} intensity={1.2} color={"#4ECDC4"} distance={20} />
      <pointLight position={[-8, 4, -8]} intensity={0.6} color={"#a86fdf"} distance={18} />
      <pointLight position={[8, 4, 8]} intensity={0.6} color={"#e8af34"} distance={18} />

      <LabEnvironment />
      <Particles />

      {robots.map(({ wf, profile }) => (
        <group key={wf.id}>
          <Workstation
            color={profile.color}
            position={[profile.position[0], profile.position[1], profile.position[2] + 0.9]}
            active={states[wf.id] === "processing" || states[wf.id] === "typing"}
          />
          <Robot
            profile={profile}
            workflow={wf}
            state={states[wf.id] ?? "idle"}
            selected={selectedId === wf.id}
            onClick={() => onSelect(wf)}
            onPositionReady={(pos) => {
              positionsRef.current[wf.id] = pos;
            }}
          />
        </group>
      ))}

      {/* Connections */}
      {ready &&
        CONNECTIONS.map(([a, b], i) => {
          const pa = positionsRef.current[a];
          const pb = positionsRef.current[b];
          const profA = findProfile(a);
          if (!pa || !pb || !profA) return null;
          return <Connection key={i} from={pa} to={pb} color={profA.color} />;
        })}

      {/* Data packets */}
      {ready &&
        ROUTES.map((r, i) => {
          const pa = positionsRef.current[r.from];
          const pb = positionsRef.current[r.to];
          const profA = findProfile(r.from);
          if (!pa || !pb || !profA) return null;
          return (
            <DataPacket
              key={i}
              from={pa}
              to={pb}
              color={profA.color}
              startDelay={(r.intervalMs / 1000) * (i / ROUTES.length)}
            />
          );
        })}

      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={6}
        maxDistance={22}
        maxPolarAngle={Math.PI / 2.05}
        autoRotate={!selectedId}
        autoRotateSpeed={0.35}
      />

      <EffectComposer>
        <Bloom intensity={0.9} luminanceThreshold={0.2} luminanceSmoothing={0.4} mipmapBlur />
      </EffectComposer>
    </>
  );
}

/* ---------- Detail panel overlay ---------- */
function DetailPanel({
  workflow,
  state,
  onClose,
  connectedNames,
}: {
  workflow: BackstageWorkflow;
  state: AgentState;
  onClose: () => void;
  connectedNames: { name: string; color: string }[];
}) {
  const profile = findProfile(workflow.id);
  const c = profile?.color ?? "#4ECDC4";
  return (
    <div
      className="absolute right-4 top-4 z-20 max-h-[calc(100%-2rem)] w-[340px] overflow-y-auto rounded-[14px] p-5 text-white animate-in fade-in slide-in-from-right-4"
      style={{
        background: "rgba(7,8,13,0.88)",
        backdropFilter: "blur(20px)",
        border: `1px solid ${c}44`,
        boxShadow: `0 0 40px ${c}22, 0 8px 32px rgba(0,0,0,0.6)`,
      }}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
            {workflow.id}
          </div>
          <h3 className="text-lg font-bold leading-tight" style={{ color: c }}>
            {profile?.short ?? workflow.name}
          </h3>
          <p className="text-xs text-white/70">{workflow.name}</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-white/60 hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: c, borderColor: `${c}66`, background: `${c}14` }}
        >
          {TRIGGER_ICONS[workflow.triggers[0]] ?? "⚡"} {workflow.triggers[0]}
        </span>
        <span
          className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/80"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: c }} />
          {state}
        </span>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/60">
          {profile?.zone}
        </span>
      </div>

      {workflow.description && (
        <p className="mb-4 text-xs leading-relaxed text-white/80">{workflow.description}</p>
      )}

      <div className="mb-4">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/50">
          Integraciones
        </p>
        <div className="flex flex-wrap gap-1.5">
          {workflow.integrations.map((i) => (
            <span
              key={i}
              className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/85"
            >
              {i}
            </span>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/50">
          Pasos
        </p>
        <ol className="space-y-1">
          {workflow.graph.nodes.map((n, idx) => (
            <li
              key={n.id}
              className="flex items-center gap-2 rounded-md border border-white/5 bg-white/[0.03] px-2 py-1 text-xs text-white/85"
            >
              <span className="text-[10px] text-white/40">{idx + 1}</span>
              <span>{n.label}</span>
            </li>
          ))}
        </ol>
      </div>

      {connectedNames.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/50">
            Conectado con
          </p>
          <div className="flex flex-wrap gap-1.5">
            {connectedNames.map((cn) => (
              <span
                key={cn.name}
                className="rounded-md border px-2 py-0.5 text-[11px]"
                style={{ color: cn.color, borderColor: `${cn.color}55`, background: `${cn.color}10` }}
              >
                {cn.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Component public ---------- */
type Props = {
  workflows: BackstageWorkflow[];
  onExit: () => void;
  onSelectWorkflow?: (wf: BackstageWorkflow) => void;
};

export const ControlRoomScene3D = ({ workflows, onExit, onSelectWorkflow }: Props) => {
  const [selected, setSelected] = useState<BackstageWorkflow | null>(null);
  const [states, setStates] = useState<Record<string, AgentState>>({});
  const { toast } = useToast();

  // Random per-agent state changes + paired interactions
  useEffect(() => {
    const timers: number[] = [];
    const robots = workflows.filter((w) => findProfile(w.id));

    const pickState = (kind: RobotKind): AgentState => {
      const opts: AgentState[] =
        kind === "messenger"
          ? ["idle", "typing", "sending", "receiving"]
          : kind === "analyst"
          ? ["idle", "typing", "processing", "receiving"]
          : kind === "industrial"
          ? ["idle", "typing", "sending"]
          : kind === "clockwork"
          ? ["idle", "processing", "sending"]
          : ["idle", "processing", "receiving"];
      return opts[Math.floor(Math.random() * opts.length)];
    };

    const setStateFor = (id: string, s: AgentState, ms = 1800) => {
      setStates((prev) => ({ ...prev, [id]: s }));
      window.setTimeout(() => {
        setStates((prev) => ({ ...prev, [id]: "idle" }));
      }, ms);
    };

    robots.forEach((wf) => {
      const profile = findProfile(wf.id)!;
      const loop = () => {
        const next = pickState(profile.kind);
        setStateFor(wf.id, next);

        // Paired interactions
        if (wf.id === "r2d2-telegram-router" && next === "sending") {
          window.setTimeout(() => setStateFor("3po-charts-agent", "receiving"), 800);
        }
        if (wf.id === "rss-news-aggregator" && next === "processing") {
          window.setTimeout(() => setStateFor("schumann-resonance", "processing"), 400);
        }
        if (wf.id === "schumann-resonance" && next === "processing") {
          window.setTimeout(() => setStateFor("rss-news-aggregator", "processing"), 400);
        }

        const delay = 3000 + Math.random() * 4000;
        timers.push(window.setTimeout(loop, delay));
      };
      timers.push(window.setTimeout(loop, Math.random() * 3000));
    });

    // Toast events
    const eventTimer = window.setInterval(() => {
      const msg = EVENT_MSGS[Math.floor(Math.random() * EVENT_MSGS.length)];
      toast({ description: msg, duration: 3000 });
    }, 4000 + Math.random() * 5000);
    timers.push(eventTimer);

    return () => timers.forEach((t) => clearTimeout(t));
  }, [workflows, toast]);

  const connectedNames = useMemo(() => {
    if (!selected) return [];
    const ids = CONNECTIONS.flatMap(([a, b]) =>
      a === selected.id ? [b] : b === selected.id ? [a] : [],
    );
    return ids
      .map((id) => {
        const p = findProfile(id);
        return p ? { name: p.short, color: p.color } : null;
      })
      .filter((x): x is { name: string; color: string } => !!x);
  }, [selected]);

  const handleSelect = (wf: BackstageWorkflow) => {
    setSelected(wf);
    onSelectWorkflow?.(wf);
  };

  return (
    <div className="relative h-[calc(100vh-12rem)] min-h-[560px] w-full overflow-hidden rounded-2xl border border-border bg-[#07080d]">
      <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={onExit} className="bg-background/60 backdrop-blur">
          <ArrowLeft className="mr-1 h-3 w-3" />
          Salir
        </Button>
        <span className="rounded-full border border-white/10 bg-black/50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70 backdrop-blur">
          ⚙ Control Room · Quantum Lab
        </span>
      </div>

      <Canvas
        camera={{ position: [9, 6, 11], fov: 45, near: 0.1, far: 100 }}
        dpr={[1, 1.6]}
        gl={{ antialias: true, alpha: false }}
      >
        <Scene
          workflows={workflows}
          selectedId={selected?.id ?? null}
          onSelect={handleSelect}
          onStateChange={(id, s) => setStates((prev) => ({ ...prev, [id]: s }))}
          states={states}
        />
      </Canvas>

      {selected && (
        <DetailPanel
          workflow={selected}
          state={states[selected.id] ?? "idle"}
          onClose={() => setSelected(null)}
          connectedNames={connectedNames}
        />
      )}
    </div>
  );
};

export default ControlRoomScene3D;
