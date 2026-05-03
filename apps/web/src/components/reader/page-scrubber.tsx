'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface Props {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  currentPage: number;
  numPages: number;
  /** When false the scrubber stays hidden — single-page mode has no
   *  inter-page scrolling so the indicator would be misleading. */
  enabled: boolean;
  onJumpToPage: (page: number) => void;
}

const HIDE_DELAY_MS = 1500;
const TRACK_TOP_PX = 80;
const TRACK_BOTTOM_PX = 80;

export function ReaderPageScrubber({
  scrollContainerRef,
  currentPage,
  numPages,
  enabled,
  onJumpToPage,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);

  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  // Reveal the scrubber and re-arm the auto-hide timer. Holds the pill open
  // while the user is dragging — the timer only fires after they release.
  const showAndScheduleHide = useCallback(() => {
    setVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
    }, HIDE_DELAY_MS);
  }, []);

  // Track scroll progress and pop the scrubber into view on scroll.
  useEffect(() => {
    if (!enabled) return;
    const sc = scrollContainerRef.current;
    if (!sc) return;

    const update = () => {
      const max = sc.scrollHeight - sc.clientHeight;
      const p = max <= 0 ? 0 : Math.max(0, Math.min(1, sc.scrollTop / max));
      setProgress(p);
      showAndScheduleHide();
    };

    update();
    sc.addEventListener('scroll', update, { passive: true });
    return () => {
      sc.removeEventListener('scroll', update);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [enabled, scrollContainerRef, showAndScheduleHide]);

  // Hide whenever the scrubber is disabled (e.g. switched to single-page mode).
  useEffect(() => {
    if (!enabled) {
      setVisible(false);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    }
  }, [enabled]);

  // Drag — translate pointer Y to the target scrollTop and apply directly.
  // The pill's position then follows naturally via the scroll listener above.
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    setVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    e.currentTarget.setPointerCapture(e.pointerId);
    applyPointerY(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    e.preventDefault();
    applyPointerY(e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* pointer might already be released */
    }
    showAndScheduleHide();
  };

  const applyPointerY = (clientY: number) => {
    const track = trackRef.current;
    const sc = scrollContainerRef.current;
    if (!track || !sc) return;
    const rect = track.getBoundingClientRect();
    const usable = rect.height;
    if (usable <= 0) return;
    const local = clientY - rect.top;
    const p = Math.max(0, Math.min(1, local / usable));
    const max = sc.scrollHeight - sc.clientHeight;
    if (max <= 0) return;
    sc.scrollTo({ top: p * max, behavior: 'auto' });
  };

  // One-page step buttons — reuse the parent's nav so debouncing + scroll-to
  // logic match the rest of the reader.
  const stepUp = () => onJumpToPage(Math.max(1, currentPage - 1));
  const stepDown = () => onJumpToPage(Math.min(numPages, currentPage + 1));

  if (!enabled) return null;

  return (
    <div
      ref={trackRef}
      className="pointer-events-none fixed right-0 z-30 md:hidden"
      style={{
        top: `${TRACK_TOP_PX}px`,
        bottom: `${TRACK_BOTTOM_PX}px`,
      }}
    >
      <AnimatePresence>
        {visible && (
          <motion.div
            key="scrubber-pill"
            initial={{ x: 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 80, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            // Position the pill on the track at the current progress.
            style={{
              position: 'absolute',
              top: `calc(${progress * 100}% - 28px)`,
              right: 8,
            }}
            className="pointer-events-auto"
          >
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className={`flex touch-none flex-col items-center overflow-hidden rounded-full bg-gradient-to-b from-gold-500 to-flame-500 text-white shadow-lg ring-1 ring-flame-600/30 select-none ${
                dragging ? 'scale-110' : ''
              } transition-transform duration-150`}
              style={{ cursor: dragging ? 'grabbing' : 'grab' }}
            >
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  stepUp();
                  showAndScheduleHide();
                }}
                aria-label="Previous page"
                className="flex h-7 w-12 items-center justify-center text-white/90 hover:bg-white/10"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <div className="flex h-9 w-12 items-center justify-center border-y border-white/15 px-2 text-xs font-semibold tabular-nums">
                {currentPage}/{numPages || '—'}
              </div>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  stepDown();
                  showAndScheduleHide();
                }}
                aria-label="Next page"
                className="flex h-7 w-12 items-center justify-center text-white/90 hover:bg-white/10"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
