import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';

const INTERACTIVE_SELECTOR = 'a, button, [role="button"], input, textarea, select, [data-cursor-hover]';

/** Cursor personalizado: punto + halo que escala sobre elementos interactivos. */
const CustomCursor = () => {
  const [enabled, setEnabled] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const reduced = useReducedMotion();

  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);
  const haloX = useSpring(mouseX, { stiffness: 320, damping: 28, mass: 0.6 });
  const haloY = useSpring(mouseY, { stiffness: 320, damping: 28, mass: 0.6 });

  useEffect(() => {
    // Solo en dispositivos con puntero fino
    if (!window.matchMedia('(pointer: fine)').matches) return;
    setEnabled(true);

    const handleMove = (e: PointerEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      const target = e.target as Element | null;
      setIsHovering(!!target?.closest?.(INTERACTIVE_SELECTOR));
    };

    window.addEventListener('pointermove', handleMove, { passive: true });
    return () => window.removeEventListener('pointermove', handleMove);
  }, [mouseX, mouseY]);

  if (!enabled || reduced) return null;

  return (
    <>
      {/* Punto central */}
      <motion.div
        aria-hidden="true"
        className="fixed top-0 left-0 z-[100] pointer-events-none w-2 h-2 rounded-full bg-musa-dark"
        style={{ x: mouseX, y: mouseY, translateX: '-50%', translateY: '-50%' }}
      />
      {/* Halo */}
      <motion.div
        aria-hidden="true"
        className="fixed top-0 left-0 z-[100] pointer-events-none w-9 h-9 rounded-full border border-musa-dark/30"
        style={{ x: haloX, y: haloY, translateX: '-50%', translateY: '-50%' }}
        animate={{
          scale: isHovering ? 1.7 : 1,
          backgroundColor: isHovering ? 'rgba(193, 230, 22, 0.12)' : 'rgba(193, 230, 22, 0)',
        }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      />
    </>
  );
};

export default CustomCursor;
