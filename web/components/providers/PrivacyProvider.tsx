"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { fmtMoney } from "@/lib/format";

type PrivacyContextValue = {
  enabled: boolean;
  canToggle: boolean;
  toggle: () => void;
  val: (n: number) => string;
};

const PrivacyContext = createContext<PrivacyContextValue | null>(null);

export function PrivacyProvider({
  role,
  children,
}: {
  role: "admin" | "viewer";
  children: React.ReactNode;
}) {
  const canToggle = role === "viewer";
  const [enabled, setEnabled] = useState(false);

  // Sincroniza com localStorage (sistema externo) uma vez, após montar no client —
  // não dá pra saber esse valor durante SSR, e ler no initializer causaria mismatch
  // de hidratação em todo lugar que exibe valores monetários.
  useEffect(() => {
    if (!canToggle) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(localStorage.getItem("selenior_privacy") === "true");
  }, [canToggle]);

  function toggle() {
    if (!canToggle) return;
    setEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("selenior_privacy", next ? "true" : "false");
      return next;
    });
  }

  function val(n: number) {
    return enabled ? "••••" : fmtMoney(n);
  }

  return (
    <PrivacyContext.Provider value={{ enabled, canToggle, toggle, val }}>{children}</PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const ctx = useContext(PrivacyContext);
  if (!ctx) throw new Error("usePrivacy precisa estar dentro de PrivacyProvider");
  return ctx;
}
