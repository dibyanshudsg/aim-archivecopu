'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';

/**
 * Wraps the app's page content with a subtle slide-in + fade on every route
 * change. We deliberately do NOT use `<AnimatePresence mode="wait">` here —
 * with Next.js App Router that pattern can leave the newly mounted page
 * stuck at its `initial` state (blank screen) because AnimatePresence's
 * exit/enter orchestration races with the router's own mount/unmount of the
 * server-rendered content. The simpler, robust pattern is a key-on-pathname
 * remount: when the path changes, this `motion.div` is unmounted and a fresh
 * one mounts with its initial state, then animates in. Old content is just
 * replaced (no exit animation) — slight loss of polish, but never blank.
 *
 * Respects `prefers-reduced-motion`: a plain fade is used instead of a slide
 * for users who've opted out of motion.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  // Admin routes have their own persistent sidebar shell. Keying the whole
  // app by pathname remounts that shell on every sidebar click, which causes a
  // white flash and repeats admin boot work. Keep admin transitions local.
  if (pathname?.startsWith('/admin')) return <>{children}</>;

  return (
    <motion.div
      key={pathname ?? 'root'}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
