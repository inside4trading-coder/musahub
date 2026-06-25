import React, { Suspense, lazy, useEffect, useState } from 'react';

const HeroScene = lazy(() => import('@/components/three/HeroScene'));

/**
 * Fallback estático: mismo lenguaje visual que la escena 3D
 * (gradiente verde→azul Musa) para que el swap sea imperceptible.
 */
const StaticGradient = () => (
  <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
    <div className="absolute inset-0 bg-gradient-to-br from-musa-light via-white to-musa-blue/10" />
    <div className="absolute top-24 right-[8%] w-72 h-72 bg-musa-green/15 rounded-full blur-3xl" />
    <div className="absolute bottom-16 left-[5%] w-56 h-56 bg-musa-blue/20 rounded-full blur-2xl" />
    <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-musa-blue/10 via-musa-green/5 to-transparent" />
  </div>
);

type RenderProfile = 'full' | 'lite' | 'fallback';

function getRenderProfile(): RenderProfile {
  if (typeof window === 'undefined') return 'fallback';
  // Respeta la preferencia de movimiento reducido
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'fallback';
  // Hardware realmente de gama baja: solo fallback
  const nav = navigator as Navigator & { deviceMemory?: number };
  if (nav.deviceMemory !== undefined && nav.deviceMemory < 2) return 'fallback';
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) return 'fallback';
  // WebGL disponible
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!gl) return 'fallback';
  } catch {
    return 'fallback';
  }
  // Móvil / táctil: versión ligera (menos partículas, menor DPR)
  const isMobile =
    window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;
  return isMobile ? 'lite' : 'full';
}

const HeroCanvas = () => {
  const [profile, setProfile] = useState<RenderProfile>('fallback');
  const [sceneReady, setSceneReady] = useState(false);

  useEffect(() => {
    setProfile(getRenderProfile());
  }, []);

  return (
    <div className="absolute inset-0" aria-hidden="true">
      <StaticGradient />
      {profile !== 'fallback' && (
        <div
          className="absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: sceneReady ? 1 : 0 }}
        >
          <Suspense fallback={null}>
            <HeroScene lite={profile === 'lite'} onCreated={() => setSceneReady(true)} />
          </Suspense>
        </div>
      )}
    </div>
  );
};

export default HeroCanvas;
