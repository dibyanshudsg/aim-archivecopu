'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export function AdminDialog({ label, onClose, busy = false, children }: {
  label: string;
  onClose: () => void;
  busy?: boolean;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => { if (dialog.open) dialog.close(); };
  }, []);

  return <dialog
    ref={dialogRef}
    aria-label={label}
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}
    onClick={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}
    className="admin-dialog m-auto w-[calc(100%_-_2rem)] max-w-lg max-h-[calc(100dvh_-_2rem)] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-0 text-gray-900 shadow-2xl backdrop:bg-gray-950/45"
  >
    <div className="relative p-6 sm:p-7">
      <button type="button" disabled={busy} onClick={onClose} aria-label="Close dialog" className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-flame-600 disabled:opacity-50"><X className="h-5 w-5" aria-hidden="true" /></button>
      {children}
    </div>
  </dialog>;
}
