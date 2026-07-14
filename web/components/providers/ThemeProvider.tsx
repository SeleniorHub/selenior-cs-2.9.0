"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

export type Theme = "light" | "dark" | "batman";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (t: Theme, save?: boolean) => void;
  dropCountRef: React.MutableRefObject<number>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Sempre começa em "light" — igual ao SSR — pra não gerar mismatch de
  // hidratação. O <html data-theme> já foi corrigido antes da hidratação pelo
  // script inline em app/layout.tsx; aqui só sincronizamos o estado React
  // (que dirige textos como "Batman"/"WAYNE") logo após montar.
  const [theme, setThemeState] = useState<Theme>("light");
  const dropCountRef = useRef(0);

  useEffect(() => {
    const saved = (localStorage.getItem("selenior_theme") as Theme) || "light";
    if (saved !== "light") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setThemeState(saved);
    }
  }, []);

  function setTheme(t: Theme, save = true) {
    if (typeof document !== "undefined") {
      document.documentElement.classList.add("theme-transitioning");
      setTimeout(() => document.documentElement.classList.remove("theme-transitioning"), 300);
      if (t === "light") document.documentElement.removeAttribute("data-theme");
      else document.documentElement.setAttribute("data-theme", t);
    }
    if (save) localStorage.setItem("selenior_theme", t);
    setThemeState(t);
  }

  return <ThemeContext.Provider value={{ theme, setTheme, dropCountRef }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme precisa estar dentro de ThemeProvider");
  return ctx;
}
