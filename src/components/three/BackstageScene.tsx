import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Paleta Musa
const GREEN = new THREE.Color('#C1E616');
const BLUE = new THREE.Color('#6BB3E0');

/** Sprite circular suave para nodos con glow (additive). */
function makeSprite(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.3, 'rgba(255,255,255,0.55)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}

interface Pulse {
  target: THREE.Vector3;
  t: number;
  sp: number;
}

function Constellation({ lite }: { lite: boolean }) {
  const group = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const ring1 = useRef<THREE.Group>(null);
  const ring2 = useRef<THREE.Group>(null);
  const ring3 = useRef<THREE.Group>(null);

  const sprite = useMemo(() => makeSprite(), []);
  const COUNT = lite ? 48 : 88;

  // Agentes distribuidos en una capa esférica (achatada)
  const { agentGeo, agentPositions } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    const list: THREE.Vector3[] = [];
    for (let i = 0; i < COUNT; i++) {
      const r = 2.3 + Math.random() * 1.8;
      const theta = Math.acos(2 * Math.random() - 1);
      const phi = Math.random() * Math.PI * 2;
      const x = r * Math.sin(theta) * Math.cos(phi);
      const y = r * Math.sin(theta) * Math.sin(phi) * 0.72;
      const z = r * Math.cos(theta);
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      list.push(new THREE.Vector3(x, y, z));
      const c = Math.random() < 0.62 ? GREEN : BLUE;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return { agentGeo: geo, agentPositions: list };
  }, [COUNT]);

  // Conexiones núcleo -> agentes + pulsos de datos viajando
  const { lineGeo, pulseGeo, pulsePos, pulses } = useMemo(() => {
    const subset = agentPositions.filter((_, i) => i % 2 === 0).slice(0, lite ? 14 : 26);
    const lp: number[] = [];
    subset.forEach((p) => lp.push(0, 0, 0, p.x, p.y, p.z));
    const lgeo = new THREE.BufferGeometry();
    lgeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lp), 3));

    const pp = new Float32Array(subset.length * 3);
    const pcol = new Float32Array(subset.length * 3);
    subset.forEach((_, i) => {
      const c = Math.random() < 0.5 ? GREEN : BLUE;
      pcol[i * 3] = c.r;
      pcol[i * 3 + 1] = c.g;
      pcol[i * 3 + 2] = c.b;
    });
    const pgeo = new THREE.BufferGeometry();
    pgeo.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    pgeo.setAttribute('color', new THREE.BufferAttribute(pcol, 3));

    const pl: Pulse[] = subset.map((p) => ({
      target: p,
      t: Math.random(),
      sp: 0.35 + Math.random() * 0.5,
    }));
    return { lineGeo: lgeo, pulseGeo: pgeo, pulsePos: pp, pulses: pl };
  }, [agentPositions, lite]);

  // Aro unitario en plano XY (para que el agente “orbite” al girar en Z)
  const ringGeo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const seg = 100;
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a), Math.sin(a), 0));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);

  const singlePoint = useMemo(() => new Float32Array([0, 0, 0]), []);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05);
    if (group.current) {
      group.current.rotation.y += d * 0.1;
      group.current.rotation.x += (state.pointer.y * 0.3 - group.current.rotation.x) * 0.05;
      group.current.rotation.z += (-state.pointer.x * 0.14 - group.current.rotation.z) * 0.05;
    }
    if (ring1.current) ring1.current.rotation.z += d * 0.5;
    if (ring2.current) ring2.current.rotation.z -= d * 0.34;
    if (ring3.current) ring3.current.rotation.z += d * 0.22;
    if (core.current) {
      core.current.rotation.x += d * 0.4;
      core.current.rotation.y += d * 0.5;
      const s = 1 + Math.sin(state.clock.elapsedTime * 1.6) * 0.06;
      core.current.scale.setScalar(s);
    }
    for (let i = 0; i < pulses.length; i++) {
      const pu = pulses[i];
      pu.t += pu.sp * d;
      if (pu.t > 1) pu.t -= 1;
      pulsePos[i * 3] = pu.target.x * pu.t;
      pulsePos[i * 3 + 1] = pu.target.y * pu.t;
      pulsePos[i * 3 + 2] = pu.target.z * pu.t;
    }
    pulseGeo.attributes.position.needsUpdate = true;
  });

  return (
    <group ref={group}>
      {/* Núcleo Musa Hub */}
      <mesh ref={core}>
        <icosahedronGeometry args={[0.95, 1]} />
        <meshBasicMaterial color={GREEN} wireframe transparent opacity={0.85} />
      </mesh>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[singlePoint, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={sprite}
          color={GREEN}
          size={3.4}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>

      {/* Conexiones núcleo -> agentes */}
      <lineSegments geometry={lineGeo}>
        <lineBasicMaterial
          color={GREEN}
          transparent
          opacity={0.14}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      {/* Pulsos de datos */}
      <points geometry={pulseGeo}>
        <pointsMaterial
          map={sprite}
          vertexColors
          size={0.6}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>

      {/* Agentes */}
      <points geometry={agentGeo}>
        <pointsMaterial
          map={sprite}
          vertexColors
          size={0.44}
          transparent
          opacity={0.95}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>

      {/* Aros orbitales con agente que los recorre */}
      <group ref={ring1} rotation={[Math.PI / 2.2, 0, 0]}>
        <lineLoop geometry={ringGeo} scale={[2.6, 2.6, 2.6]}>
          <lineBasicMaterial color={BLUE} transparent opacity={0.28} />
        </lineLoop>
        <points position={[2.6, 0, 0]}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[singlePoint, 3]} />
          </bufferGeometry>
          <pointsMaterial
            map={sprite}
            color={GREEN}
            size={1.2}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            sizeAttenuation
          />
        </points>
      </group>

      <group ref={ring2} rotation={[Math.PI / 3, Math.PI / 4, 0]}>
        <lineLoop geometry={ringGeo} scale={[3.3, 3.3, 3.3]}>
          <lineBasicMaterial color={GREEN} transparent opacity={0.22} />
        </lineLoop>
        <points position={[3.3, 0, 0]}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[singlePoint, 3]} />
          </bufferGeometry>
          <pointsMaterial
            map={sprite}
            color={BLUE}
            size={1.2}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            sizeAttenuation
          />
        </points>
      </group>

      <group ref={ring3} rotation={[Math.PI / 2.6, -Math.PI / 5, 0]}>
        <lineLoop geometry={ringGeo} scale={[3.9, 3.9, 3.9]}>
          <lineBasicMaterial color={BLUE} transparent opacity={0.16} />
        </lineLoop>
      </group>
    </group>
  );
}

interface BackstageSceneProps {
  onCreated?: () => void;
  lite?: boolean;
}

const BackstageScene: React.FC<BackstageSceneProps> = ({ onCreated, lite = false }) => {
  return (
    <Canvas
      dpr={lite ? [1, 1.5] : [1, 2]}
      camera={{ position: [0, 0, 9.2], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={() => onCreated?.()}
      style={{ position: 'absolute', inset: 0 }}
    >
      <Constellation lite={lite} />
    </Canvas>
  );
};

export default BackstageScene;
