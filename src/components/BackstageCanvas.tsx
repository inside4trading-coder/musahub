import React, { Suspense, lazy, useEffect, useState } from 'react';

const BackstageScene = lazy(() => import('@/components/three/BackstageScene'));

type RenderProfile = 'full' | 'lite' | 'fallback';

function getRenderProfile(): RenderProfile {
  if (typeof window === 'undefined') return 'fallback';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'fallback';
  const nav = navigator as Navigator & { deviceMemory?: number };
  if (nav.deviceMemory !== undefined && nav.deviceMemory < 2) return 'fallback';
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) return 'fallback';
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!gl) return 'fallback';
  } catch {
    return 'fallback';
  }
  const isMobile =
    window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;
  return isMobile ? 'lite' : 'full';
}

/** Fallback estático (sin movimiento) para reduced-motion / sin WebGL. */
const StaticOrbit = () => (
  <div className="absolute inset-0 grid place-items-center" aria-hidden="true">
    <div className="relative" style={{ width: 'min(70%, 340px)', aspectRatio: '1' }}>
      <span className="absolute inset-[21%] rounded-full border border-white/15" />
      <span className="absolute inset-[10%] rounded-full border border-white/12" />
      <span className="absolute inset-0 rounded-full border border-white/10" />
      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full grid place-items-center bg-musa-dark border border-musa-green text-white font-bold text-sm text-center leading-tight">
        musa
        <br />
        hub
      </span>
      <span className="absolute top-[8%] left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-musa-green shadow-[0_0_14px_#C1E616]" />
      <span className="absolute bottom-[14%] left-[18%] w-3 h-3 rounded-full bg-musa-blue shadow-[0_0_14px_#6BB3E0]" />
    </div>
  </div>
);

const BackstageCanvas = () => {
  const [profile, setProfile] = useState<RenderProfile>('fallback');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setProfile(getRenderProfile());
  }, []);

  return (
    <div className="absolute inset-0">
      {profile === 'fallback' && <StaticOrbit />}
      {profile !== 'fallback' && (
        <div
          className="absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: ready ? 1 : 0 }}
        >
          <Suspense fallback={null}>
            <BackstageScene lite={profile === 'lite'} onCreated={() => setReady(true)} />
          </Suspense>
        </div>
      )}
    </div>
  );
};

export default BackstageCanvas;
