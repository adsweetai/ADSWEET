"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

export interface ToastOptions {
  message: ReactNode;
  /** Knop "Ongedaan maken". */
  undo?: () => void;
  durationMs?: number;
}

interface ToastApi {
  show: (o: ToastOptions) => void;
  close: () => void;
}

const Ctx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const c = useContext(Ctx);
  if (!c) throw new Error("useToast hoort binnen een ToastProvider.");
  return c;
}

/** Melding onderaan met "Ongedaan maken". Eén tegelijk; verdwijnt na 6 seconden. */
export function ToastProvider({
  children,
  undoLabel,
  closeLabel,
}: {
  children: ReactNode;
  undoLabel: string;
  closeLabel: string;
}) {
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const close = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setToast(null);
  }, []);
  const show = useCallback((o: ToastOptions) => {
    if (timer.current) clearTimeout(timer.current);
    setToast(o);
    timer.current = setTimeout(() => setToast(null), o.durationMs ?? 6000);
  }, []);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  return (
    <Ctx.Provider value={{ show, close }}>
      {children}
      {toast ? (
        <div role="status" aria-live="polite" className="as-toast">
          <span>{toast.message}</span>
          {toast.undo ? (
            <button
              type="button"
              className="as-toast__undo"
              onClick={() => {
                const u = toast.undo;
                close();
                u?.();
              }}
            >
              <Icon name="undo" size={14} />
              {undoLabel}
            </button>
          ) : null}
          <button type="button" className="as-toast__close" aria-label={closeLabel} onClick={close}>
            <Icon name="x" size={16} />
          </button>
        </div>
      ) : null}
    </Ctx.Provider>
  );
}
