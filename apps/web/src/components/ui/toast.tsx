'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Check, AlertCircle, Info, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

type ToastKind = 'success' | 'error' | 'info';
type ToastPosition = 'top-right' | 'top-center';
type ToastVariant = 'default' | 'admin';

interface ToastOptions {
  title?: string;
  durationMs?: number;
  position?: ToastPosition;
  variant?: ToastVariant;
}

interface ToastItem {
  id: number;
  kind: ToastKind;
  title?: string;
  message: string;
  position: ToastPosition;
  variant: ToastVariant;
}

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface UIContextValue {
  toast: {
    success: (message: string, options?: ToastOptions) => void;
    error: (message: string, options?: ToastOptions) => void;
    info: (message: string, options?: ToastOptions) => void;
  };
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<
    | (ConfirmOptions & { resolve: (value: boolean) => void })
    | null
  >(null);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string, options?: ToastOptions) => {
      const id = ++idRef.current;
      setToasts((prev) => [
        ...prev,
        {
          id,
          kind,
          message,
          title: options?.title,
          position: options?.position ?? 'top-right',
          variant: options?.variant ?? 'default',
        },
      ]);
      setTimeout(() => remove(id), options?.durationMs ?? 3500);
    },
    [remove],
  );

  const value = useMemo<UIContextValue>(
    () => ({
      toast: {
        success: (m, options) => push('success', m, options),
        error: (m, options) => push('error', m, options),
        info: (m, options) => push('info', m, options),
      },
      confirm: (options) =>
        new Promise<boolean>((resolve) => setConfirmState({ ...options, resolve })),
    }),
    [push],
  );

  return (
    <UIContext.Provider value={value}>
      {children}

      <ToastStack
        position="top-right"
        toasts={toasts.filter((toast) => toast.position === 'top-right')}
        onClose={remove}
      />
      <ToastStack
        position="top-center"
        toasts={toasts.filter((toast) => toast.position === 'top-center')}
        onClose={remove}
      />

      {/* Confirm dialog */}
      {confirmState && (
        <ConfirmDialog
          options={confirmState}
          onResult={(ok) => {
            confirmState.resolve(ok);
            setConfirmState(null);
          }}
        />
      )}
    </UIContext.Provider>
  );
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used inside <UIProvider>');
  return ctx;
}

function ToastStack({
  position,
  toasts,
  onClose,
}: {
  position: ToastPosition;
  toasts: ToastItem[];
  onClose: (id: number) => void;
}) {
  const positionClass =
    position === 'top-center'
      ? 'left-1/2 top-5 w-[min(92vw,420px)] -translate-x-1/2 items-stretch'
      : 'right-4 top-4 items-end';

  return (
    <div className={`pointer-events-none fixed z-[1000] flex flex-col gap-2 ${positionClass}`}>
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <ToastView key={toast.id} item={toast} onClose={() => onClose(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastView({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const Icon = item.kind === 'success' ? Check : item.kind === 'error' ? AlertCircle : Info;
  const defaultAccent =
    item.kind === 'success'
      ? 'border-green-200 bg-green-50 text-green-700'
      : item.kind === 'error'
        ? 'border-red-200 bg-red-50 text-red-700'
        : 'border-sky-200 bg-sky-50 text-sky-700';
  const accent =
    item.variant === 'admin' && item.kind === 'success'
      ? 'border-flame-200/80 bg-white text-gray-800 shadow-[0_18px_45px_rgba(190,140,46,0.22)] ring-1 ring-flame-100'
      : defaultAccent;
  const iconAccent =
    item.variant === 'admin' && item.kind === 'success'
      ? 'bg-gradient-to-br from-gold-500 to-flame-500 text-white'
      : '';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.98 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className={`pointer-events-auto flex min-w-[260px] max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-lg ${accent}`}
      role="status"
    >
      <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${iconAccent}`}>
        <Icon className="h-4 w-4 shrink-0" />
      </span>
      <span className="flex-1 leading-relaxed">
        {item.title && <span className="block font-semibold text-gray-900">{item.title}</span>}
        <span className={item.title ? 'block text-gray-600' : ''}>{item.message}</span>
      </span>
      <button
        onClick={onClose}
        className="-mr-1 rounded-md p-0.5 opacity-50 transition-opacity hover:opacity-100"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}

function ConfirmDialog({
  options,
  onResult,
}: {
  options: ConfirmOptions;
  onResult: (ok: boolean) => void;
}) {
  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onResult(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onResult]);

  const confirmLabel = options.confirmLabel ?? 'Confirm';
  const cancelLabel = options.cancelLabel ?? 'Cancel';

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        {options.title && (
          <h2 className="font-heading mb-2 text-lg font-bold text-gray-900">
            {options.title}
          </h2>
        )}
        <p className="text-sm leading-relaxed text-gray-600">{options.message}</p>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={() => onResult(false)}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => onResult(true)}
            autoFocus
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors ${
              options.destructive
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-gradient-to-r from-gold-500 to-flame-500 shadow-[0_6px_16px_rgba(190,140,46,0.22)] hover:from-gold-600 hover:to-flame-600'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
