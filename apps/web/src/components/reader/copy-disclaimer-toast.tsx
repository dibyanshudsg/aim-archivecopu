'use client';

import { useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Info, X } from 'lucide-react';

const DISMISS_KEY = 'aim-copy-disclaimer-dismissed';
const ACK_KEY = 'aim-copy-disclaimer-acked';

// Heuristic: catches the common Tesseract failure mode where a Devanagari word
// is wholly substituted with a short Latin token (प्रभो → wat, अहम् → SET).
// Won't catch silent character drops/inserts (क्या → कया) — those need a dict.
function selectionLikelyHasOcrErrors(text: string): boolean {
  if (!text || text.trim().length < 3) return false;
  if (!/[ऀ-ॿ]/.test(text)) return false;
  if (/[ऀ-ॿ][A-Za-z]|[A-Za-z][ऀ-ॿ]/.test(text)) return true;
  if (/[ऀ-ॿ]\s+[A-Za-z]{2,6}\s+[ऀ-ॿ]/.test(text)) return true;
  return false;
}

export function CopyDisclaimerToast() {
  const [visible, setVisible] = useState(false);
  const [dismissedForever, setDismissedForever] = useState(true);
  const [acked, setAcked] = useState(false);
  const [reason, setReason] = useState<'first-time' | 'detected'>('first-time');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setDismissedForever(window.localStorage.getItem(DISMISS_KEY) === '1');
    setAcked(window.localStorage.getItem(ACK_KEY) === '1');
  }, []);

  useEffect(() => {
    if (dismissedForever) return;
    const onCopy = () => {
      const sel = window.getSelection?.()?.toString().trim();
      if (!sel) return;
      if (acked) {
        if (!selectionLikelyHasOcrErrors(sel)) return;
        setReason('detected');
      } else {
        setReason('first-time');
      }
      setVisible(true);
    };
    document.addEventListener('copy', onCopy);
    return () => document.removeEventListener('copy', onCopy);
  }, [dismissedForever, acked]);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setVisible(false), 8000);
    return () => clearTimeout(t);
  }, [visible]);

  const handleOkay = useCallback(() => {
    window.localStorage.setItem(ACK_KEY, '1');
    setAcked(true);
    setVisible(false);
  }, []);

  const handleDismissForever = useCallback(() => {
    window.localStorage.setItem(DISMISS_KEY, '1');
    setDismissedForever(true);
    setVisible(false);
  }, []);

  const title =
    reason === 'detected'
      ? 'This selection may have OCR errors'
      : 'Copied text may contain OCR errors';
  const body =
    reason === 'detected'
      ? 'We spotted unusual character patterns suggesting the text was misread. Please verify against the visible content before quoting or citing.'
      : 'The searchable text layer for legacy issues is generated automatically. Please verify against the visible content before quoting or citing.';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-auto fixed bottom-6 left-1/2 z-[1000] flex w-[min(92vw,440px)] -translate-x-1/2 items-start gap-3 rounded-2xl border border-flame-200/80 bg-white px-4 py-3 shadow-[0_18px_45px_rgba(190,140,46,0.22)] ring-1 ring-flame-100 md:w-[560px]"
          role="status"
          aria-live="polite"
        >
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold-500 to-flame-500 text-white">
            <Info className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-gray-600">{body}</p>
            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleOkay}
                className="rounded-lg bg-gradient-to-r from-gold-500 to-flame-500 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_6px_16px_rgba(190,140,46,0.22)] transition-colors hover:from-gold-600 hover:to-flame-600"
              >
                Okay
              </button>
              <button
                type="button"
                onClick={handleDismissForever}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
              >
                Don&apos;t show again
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={handleOkay}
            aria-label="Dismiss"
            className="-mr-1 mt-0.5 rounded-md p-0.5 text-gray-400 opacity-60 transition-opacity hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
