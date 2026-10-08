"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Toast } from "./Toast";

type ToastData = { ok: boolean; message: string; id: number };
const ToastContext = createContext<((t: { ok: boolean; message: string }) => void) | null>(null);

/** Lives in the admin layout so notifications survive forms that unmount (e.g. after deleting an item). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastData | null>(null);
  const show = useCallback((t: { ok: boolean; message: string }) => setToast({ ...t, id: Date.now() }), []);
  const close = useCallback(() => setToast(null), []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && <Toast key={toast.id} ok={toast.ok} message={toast.message} onDone={close} />}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
