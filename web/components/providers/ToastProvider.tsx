"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type ToastState = { msg: string; isErr: boolean; show: boolean };
type ToastFn = (msg: string, isErr?: boolean) => void;

const ToastContext = createContext<ToastFn | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>({ msg: "", isErr: false, show: false });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback<ToastFn>((msg, isErr = false) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast({ msg, isErr, show: true });
    timeoutRef.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), 2500);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className={`toast${toast.show ? " show" : ""}${toast.isErr ? " err" : ""}`}>
        <span style={{ fontSize: 15, lineHeight: 1, flexShrink: 0 }}>{toast.isErr ? "✕" : "✓"}</span>
        <span>{toast.msg}</span>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast precisa estar dentro de ToastProvider");
  return ctx;
}
