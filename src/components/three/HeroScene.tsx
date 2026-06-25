import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Paleta Musa
const COLOR_GREEN = new THREE.Color('#C1E616');
const COLOR_BLUE = new THREE.Color('#6BB3E0');
const COLOR_DARK = new THREE.Color('#2D3748');

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uMouseStrength;
  uniform float uPixelRatio;
  uniform vec2 uHalfSize;

  varying float vElevation;
  varying float vDistMouse;
  varying float vEdgeFade;

  void main() {
    vec3 p = position;
    float t = uTime * 0.45;

    // Ondas superpuestas tipo tejido de seda
    float elevation = 0.0;
    elevation += sin(p.x * 0.55 + t * 1.35) * 0.30;
    elevation += sin(p.y * 0.72 - t * 0.95) * 0.20;
    elevation += sin((p.x + p.y) * 0.30 + t * 0.65) * 0.36;
    elevation += sin(length(p.xy) * 0.42 - t * 1.15) * 0.16;

    // Ondulación suave alrededor del cursor
    float dMouse = distance(p.xy, uMouse);
    float ripple = exp(-dMouse * dMouse * 0.16) * 1.1 * uMouseStrength;
    elevation += ripple;

    p.z += elevation;

    vElevation = elevation;
    vDistMouse = dMouse;

    // Desvanece hacia los bordes para que la lámina no corte en seco
    vEdgeFade = smoothstep(0.0, 4.5, uHalfSize.x - abs(position.x))
              * smoothstep(0.0, 3.0, uHalfSize.y - abs(position.y));

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = (1.1 + elevation * 0.45 + ripple * 1.2) * (34.0 / -mvPosition.z) * uPixelRatio;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorDark;

  varying float vElevation;
  varying float vDistMouse;
  varying float vEdgeFade;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float alpha = smoothstep(0.5, 0.08, d);
    if (alpha < 0.01) discard;

    // Gradiente verde -> azul según la altura de la onda
    float mixFactor = smoothstep(-1.1, 1.6, vElevation);
    vec3 color = mix(uColorB, uColorA, mixFactor);

    // Las crestas más altas se oscurecen sutilmente hacia el tono de marca
    color = mix(color, uColorDark, smoothstep(1.4, 2.4, vElevation) * 0.3);

    // Cerca del cursor sube ligeramente la intensidad
    float glow = exp(-vDistMouse * vDistMouse * 0.18) * 0.3;

    gl_FragColor = vec4(color, alpha * vEdgeFade * (0.38 + glow));
  }
`;

const PLANE_WIDTH = 26;
const PLANE_HEIGHT = 16;

interface WaveFieldProps {
  lite: boolean;
}

function WaveField({ lite }: WaveFieldProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const mouseWorld = useRef(new THREE.Vector2(0, 0));
  const mouseTarget = useRef(new THREE.Vector2(0, 0));
  const strength = useRef(0);
  const raycastPlane = useMemo(() => new THREE.Plane(), []);
  const intersection = useMemo(() => new THREE.Vector3(), []);
  const localPoint = useMemo(() => new THREE.Vector3(), []);

  const gl = useThree((state) => state.gl);

  const geometry = useMemo(() => {
    // En móvil bajamos la densidad de la malla para mantener 60fps
    const segmentsX = lite ? 110 : 190;
    const segmentsY = lite ? 64 : 110;
    const geo = new THREE.PlaneGeometry(PLANE_WIDTH, PLANE_HEIGHT, segmentsX, segmentsY);
    geo.deleteAttribute('normal');
    geo.deleteAttribute('uv');
    return geo;
  }, [lite]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(999, 999) },
      uMouseStrength: { value: 0 },
      uPixelRatio: { value: Math.min(gl.getPixelRatio(), 2) },
      uHalfSize: { value: new THREE.Vector2(PLANE_WIDTH / 2, PLANE_HEIGHT / 2) },
      uColorA: { value: COLOR_GREEN },
      uColorB: { value: COLOR_BLUE },
      uColorDark: { value: COLOR_DARK },
    }),
    [gl]
  );

  useFrame((state, delta) => {
    if (!materialRef.current || !pointsRef.current) return;

    uniforms.uTime.value = state.clock.elapsedTime;

    // Proyecta el puntero sobre el plano inclinado de la malla
    const points = pointsRef.current;
    raycastPlane.setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 0, 1).applyQuaternion(points.quaternion),
      points.position
    );
    state.raycaster.setFromCamera(state.pointer, state.camera);
    const hit = state.raycaster.ray.intersectPlane(raycastPlane, intersection);

    if (hit) {
      localPoint.copy(intersection);
      points.worldToLocal(localPoint);
      mouseTarget.current.set(localPoint.x, localPoint.y);
      strength.current = THREE.MathUtils.lerp(strength.current, 1, delta * 3.5);
    } else {
      strength.current = THREE.MathUtils.lerp(strength.current, 0, delta * 2);
    }

    mouseWorld.current.lerp(mouseTarget.current, Math.min(delta * 5, 1));
    uniforms.uMouse.value.copy(mouseWorld.current);
    uniforms.uMouseStrength.value = strength.current;
  });

  return (
    <points ref={pointsRef} rotation={[-Math.PI / 2.35, 0, -0.1]} position={[0, -2.9, 0]}>
      <primitive object={geometry} attach="geometry" />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </points>
  );
}

interface HeroSceneProps {
  onCreated?: () => void;
  /** Versión ligera para móvil: menos partículas y menor DPR */
  lite?: boolean;
}

const HeroScene: React.FC<HeroSceneProps> = ({ onCreated, lite = false }) => {
  return (
    <Canvas
      dpr={lite ? [1, 1.5] : [1, 2]}
      camera={{ position: [0, 2.4, 9.5], fov: 40 }}
      gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
      onCreated={() => onCreated?.()}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      eventSource={typeof document !== 'undefined' ? document.body : undefined}
      eventPrefix="client"
    >
      <WaveField lite={lite} />
    </Canvas>
  );
};

export default HeroScene;
