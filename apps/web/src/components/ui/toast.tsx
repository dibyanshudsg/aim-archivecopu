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

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
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
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
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
    (kind: ToastKind, message: string) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, kind, message }]);
      setTimeout(() => remove(id), 3500);
    },
    [remove],
  );

  const value = useMemo<UIContextValue>(
    () => ({
      toast: {
        success: (m) => push('success', m),
        error: (m) => push('error', m),
        info: (m) => push('info', m),
      },
      confirm: (options) =>
        new Promise<boolean>((resolve) => setConfirmState({ ...options, resolve })),
    }),
    [push],
  );

  return (
    <UIContext.Provider value={value}>
      {children}

      {/* Toasts */}
      <div className="pointer-events-none fixed top-4 right-4 z-[1000] flex flex-col gap-2">
        {toasts.map((t) => (
          <ToastView key={t.id} item={t} onClose={() => remove(t.id)} />
        ))}
      </div>

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

function ToastView({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const Icon = item.kind === 'success' ? Check : item.kind === 'error' ? AlertCircle : Info;
  const accent =
    item.kind === 'success'
      ? 'border-green-200 bg-green-50 text-green-700'
      : item.kind === 'error'
        ? 'border-red-200 bg-red-50 text-red-700'
        : 'border-sky-200 bg-sky-50 text-sky-700';

  return (
    <div
      className={`pointer-events-auto flex min-w-[260px] max-w-sm items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm shadow-lg ${accent}`}
      role="status"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="flex-1 leading-relaxed">{item.message}</p>
      <button
        onClick={onClose}
        className="-mr-1 rounded-md p-0.5 opacity-50 transition-opacity hover:opacity-100"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
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
                : 'bg-gold-500 hover:bg-gold-600'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
