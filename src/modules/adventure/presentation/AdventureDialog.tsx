'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import './adventure.css';

export function AdventureDialog({ title, children, onClose, busy = false }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => { dialog?.close(); };
  }, []);
  return <dialog ref={ref} className="adventure-dialog" aria-label={title} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    <header className="adventure-dialog-header"><h2>{title}</h2><button type="button" aria-label="Cerrar aventura" disabled={busy} onClick={onClose}><X size={22} /></button></header>
    {children}
  </dialog>;
}
