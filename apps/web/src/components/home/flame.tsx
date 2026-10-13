'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect, useRef } from 'react';

type FlameProps = {
  className?: string;
};

export function Flame({ className = '' }: FlameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const heatRaw = useMotionValue(0);
  const heat = useSpring(heatRaw, { stiffness: 140, damping: 20, mass: 0.4 });

  useEffect(() => {
    let rafId = 0;
    let lastEvent: MouseEvent | null = null;

    const update = () => {
      rafId = 0;
      const el = containerRef.current;
      if (!el || !lastEvent) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = lastEvent.clientX - cx;
      const dy = lastEvent.clientY - cy;
      const dist = Math.hypot(dx, dy);
      const threshold = 320;
      heatRaw.set(Math.max(0, Math.min(1, 1 - dist / threshold)));
    };

    const onMove = (e: MouseEvent) => {
      lastEvent = e;
      if (!rafId) rafId = requestAnimationFrame(update);
    };

    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [heatRaw]);

  const hotHaloOpacity = useTransform(heat, [0, 1], [0, 0.95]);
  const hotHaloScale = useTransform(heat, [0, 1], [0.85, 1.35]);
  const hotOuterOpacity = useTransform(heat, [0, 0.1, 1], [0, 0.05, 0.95]);
  const hotInnerOpacity = useTransform(heat, [0, 0.25, 1], [0, 0.18, 0.9]);

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-end justify-center ${className}`}
      aria-hidden
    >
      <motion.div
        className="pointer-events-none absolute inset-[-45%] rounded-full blur-2xl"
        style={{
          background:
            'radial-gradient(circle, rgba(244,180,80,0.55) 0%, rgba(244,162,97,0.22) 45%, rgba(244,162,97,0) 75%)',
        }}
        animate={{ opacity: [0.55, 0.9, 0.55] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="pointer-events-none absolute inset-[-60%] rounded-full blur-2xl"
        style={{
          background:
            'radial-gradient(circle, rgba(255,80,30,0.85) 0%, rgba(255,135,40,0.5) 30%, rgba(255,200,90,0.22) 60%, rgba(255,200,90,0) 80%)',
          opacity: hotHaloOpacity,
          scale: hotHaloScale,
        }}
      />

      <motion.svg
        viewBox="0 0 100 140"
        className="relative h-24 w-auto sm:h-28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        animate={{
          rotate: [0, 2, -1.5, 3, -2.5, 1.8, -3, 1, -2, 2.2, 0],
          x: [0, 2, -1, 2, -2.5, 0, 2.5, -1.5, 0.5, -1, 0],
          scale: [1, 1.04, 0.98, 1.05, 1, 1.06, 0.97, 1.03, 0.99, 1.02, 1],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
          times: [0, 0.09, 0.19, 0.27, 0.38, 0.5, 0.62, 0.71, 0.82, 0.93, 1],
        }}
        style={{ transformOrigin: '50% 100%' }}
      >
        <defs>
          <radialGradient id="flame-outer" cx="50%" cy="68%" r="55%">
            <stop offset="0%" stopColor="#FFE38C" />
            <stop offset="55%" stopColor="#FFB347" />
            <stop offset="100%" stopColor="#FF8A1F" />
          </radialGradient>
          <radialGradient id="flame-inner" cx="50%" cy="62%" r="55%">
            <stop offset="0%" stopColor="#FFF8D6" />
            <stop offset="55%" stopColor="#FFD166" />
            <stop offset="100%" stopColor="#FFA033" stopOpacity="0.9" />
          </radialGradient>
          <radialGradient id="flame-core" cx="50%" cy="58%" r="48%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="60%" stopColor="#FFEFB0" />
            <stop offset="100%" stopColor="#FFD166" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="flame-hot-outer" cx="50%" cy="68%" r="55%">
            <stop offset="0%" stopColor="#FFCA5C" />
            <stop offset="45%" stopColor="#FF7A2E" />
            <stop offset="100%" stopColor="#B41F0A" />
          </radialGradient>
          <radialGradient id="flame-hot-inner" cx="50%" cy="58%" r="55%">
            <stop offset="0%" stopColor="#FFE99E" />
            <stop offset="50%" stopColor="#FFA748" />
            <stop offset="100%" stopColor="#E83C12" stopOpacity="0.9" />
          </radialGradient>
        </defs>

        <motion.path
          d="M50 6 C 62 32 84 58 76 94 C 72 118 60 134 50 134 C 40 134 28 118 24 94 C 16 58 38 32 50 6 Z"
          fill="url(#flame-outer)"
          animate={{
            skewX: [0, -2, 1.5, -1, 2.5, -2, 1, -1.5, 0],
            scaleY: [1, 1.05, 0.96, 1.07, 0.98, 1.04, 0.97, 1.03, 1],
            scaleX: [1, 0.98, 1.03, 0.97, 1.04, 0.96, 1.02, 0.99, 1],
          }}
          transition={{
            duration: 6.3,
            repeat: Infinity,
            ease: 'easeInOut',
            times: [0, 0.13, 0.24, 0.36, 0.5, 0.62, 0.74, 0.88, 1],
          }}
          style={{ transformOrigin: '50% 100%', transformBox: 'fill-box' }}
        />

        <motion.path
          d="M50 6 C 62 32 84 58 76 94 C 72 118 60 134 50 134 C 40 134 28 118 24 94 C 16 58 38 32 50 6 Z"
          fill="url(#flame-hot-outer)"
          animate={{
            skewX: [0, -3, 2, -1.5, 3, -2, 1, 0],
            scaleY: [1, 1.08, 0.94, 1.06, 0.96, 1.05, 0.98, 1],
            scaleX: [1, 0.96, 1.04, 0.97, 1.05, 0.95, 1.02, 1],
          }}
          transition={{
            duration: 3.2,
            repeat: Infinity,
            ease: 'easeInOut',
            times: [0, 0.14, 0.27, 0.4, 0.55, 0.7, 0.85, 1],
          }}
          style={{
            opacity: hotOuterOpacity,
            transformOrigin: '50% 100%',
            transformBox: 'fill-box',
          }}
        />

        <motion.path
          d="M50 26 C 58 48 70 68 66 94 C 64 112 57 124 50 124 C 43 124 36 112 34 94 C 30 68 42 48 50 26 Z"
          fill="url(#flame-inner)"
          animate={{
            skewX: [0, 1.5, -2, 1, -1.5, 2.5, -1, 2, -2, 0],
            scaleY: [1, 1.06, 0.95, 1.04, 0.97, 1.07, 0.96, 1.05, 0.98, 1],
            opacity: [0.9, 1, 0.92, 0.97, 0.93, 1, 0.94, 0.98, 0.91, 0.9],
          }}
          transition={{
            duration: 7.1,
            repeat: Infinity,
            ease: 'easeInOut',
            times: [0, 0.1, 0.22, 0.33, 0.44, 0.55, 0.67, 0.78, 0.89, 1],
          }}
          style={{ transformOrigin: '50% 100%', transformBox: 'fill-box' }}
        />

        <motion.path
          d="M50 26 C 58 48 70 68 66 94 C 64 112 57 124 50 124 C 43 124 36 112 34 94 C 30 68 42 48 50 26 Z"
          fill="url(#flame-hot-inner)"
          animate={{
            skewX: [0, -2, 2.5, -1.5, 2, -2.5, 1.5, -1, 0],
            scaleY: [1, 1.09, 0.93, 1.07, 0.96, 1.06, 0.95, 1.03, 1],
          }}
          transition={{
            duration: 3.9,
            repeat: Infinity,
            ease: 'easeInOut',
            times: [0, 0.13, 0.25, 0.38, 0.5, 0.62, 0.75, 0.88, 1],
          }}
          style={{
            opacity: hotInnerOpacity,
            transformOrigin: '50% 100%',
            transformBox: 'fill-box',
          }}
        />

        <motion.path
          d="M50 50 C 54 66 60 82 58 98 C 56 110 53 118 50 118 C 47 118 44 110 42 98 C 40 82 46 66 50 50 Z"
          fill="url(#flame-core)"
          animate={{
            skewX: [0, 1, -0.5, 1.5, -1, 0.5, -1.5, 0],
            opacity: [0.85, 1, 0.88, 0.96, 0.92, 1, 0.87, 0.85],
            scaleY: [1, 1.06, 0.97, 1.04, 0.98, 1.05, 0.96, 1],
          }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: 'easeInOut',
            times: [0, 0.13, 0.27, 0.4, 0.55, 0.7, 0.85, 1],
          }}
          style={{ transformOrigin: '50% 100%', transformBox: 'fill-box' }}
        />

        <motion.ellipse
          cx="50"
          cy="86"
          rx="3"
          ry="13"
          fill="#FFFFFF"
          animate={{
            x: [0, 0.5, -0.5, 0.3, -0.3, 0.4, -0.4, 0],
            opacity: [0.65, 1, 0.7, 0.95, 0.75, 1, 0.7, 0.65],
            scaleY: [0.92, 1.08, 0.94, 1.05, 0.96, 1.06, 0.95, 0.92],
          }}
          transition={{
            duration: 4.9,
            repeat: Infinity,
            ease: 'easeInOut',
            times: [0, 0.13, 0.27, 0.4, 0.53, 0.67, 0.83, 1],
          }}
          style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
        />
      </motion.svg>
    </div>
  );
}
