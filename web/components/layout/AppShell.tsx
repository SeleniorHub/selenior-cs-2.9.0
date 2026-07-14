"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePrivacy } from "@/components/providers/PrivacyProvider";
import { useTheme, type Theme } from "@/components/providers/ThemeProvider";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Panorama",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/actions",
    label: "Action items",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3 7-7" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    href: "/clientes",
    label: "Clientes",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: "/reunioes",
    label: "Reuniões",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
];

const THEME_ICONS: Record<Theme, string> = { light: "☀️", dark: "🌙", batman: "🦇" };
const THEME_LABELS: Record<Theme, string> = { light: "Claro", dark: "Escuro", batman: "Batman" };

const TOPBAR_TITLES: Record<string, string> = {
  "/dashboard": "Panorama",
  "/actions": "Action items",
  "/clientes": "Clientes",
  "/reunioes": "Reuniões",
};

export default function AppShell({
  children,
  role,
  email,
}: {
  children: React.ReactNode;
  role: "admin" | "viewer";
  email: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const privacy = usePrivacy();
  const { theme, setTheme, dropCountRef } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showBatman, setShowBatman] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  function toggleThemeMenu() {
    const opening = !menuOpen;
    setMenuOpen(opening);
    if (opening) {
      dropCountRef.current++;
      if (dropCountRef.current >= 10) {
        dropCountRef.current = 0;
        setMenuOpen(false);
        setTimeout(activateBatmanMode, 250);
      }
    }
  }

  function selectTheme(t: Theme) {
    setMenuOpen(false);
    dropCountRef.current = 0;
    setTheme(t, true);
  }

  function activateBatmanMode() {
    setShowBatman(true);
    setTimeout(() => setShowBatman(false), 3600);
    setTheme("batman", true);
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const title = TOPBAR_TITLES[pathname] ?? "Panorama";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/logo-dark.png" alt="Selenior" className="sidebar-logo" />
          <span className="batman-brand">🦇</span>
          <span className="sidebar-tag">{theme === "batman" ? "WAYNE" : "CS"}</span>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`side-nav-btn${pathname === item.href ? " active" : ""}`}
            >
              <span className="side-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sync-status">
            <div className="sync-dot" id="sync-dot" />
            <span id="sync-label">Aguardando...</span>
          </div>
          <div className="sidebar-user">
            <span
              className={`mode-badge ${role === "admin" ? "mode-admin" : "mode-view"}`}
              title={email}
            >
              {role === "admin" ? "Admin" : "Visualização"}
            </span>
            <button
              className="sidebar-logout"
              title="Sair"
              onClick={handleLogout}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
          {privacy.canToggle && (
            <button
              className={`privacy-toggle${privacy.enabled ? " active" : ""}`}
              title="Ocultar valores financeiros"
              onClick={privacy.toggle}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, flexShrink: 0 }}>
                {privacy.enabled ? (
                  <>
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </>
                ) : (
                  <>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </>
                )}
              </svg>
              <span>Privacidade</span>
              <div className="privacy-pill" />
            </button>
          )}
          <div className="theme-switcher-wrap" ref={wrapRef}>
            <button
              className={`theme-trigger${menuOpen ? " open" : ""}`}
              onClick={toggleThemeMenu}
            >
              <span>{THEME_ICONS[theme]}</span>
              <span>{THEME_LABELS[theme]}</span>
              <svg className="theme-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <div className={`theme-menu${menuOpen ? " open" : ""}`}>
              <button className={theme === "light" ? "active" : ""} onClick={() => selectTheme("light")}>☀️ &nbsp;Claro</button>
              <button className={theme === "dark" ? "active" : ""} onClick={() => selectTheme("dark")}>🌙 &nbsp;Escuro</button>
            </div>
          </div>
          <div className="app-version">
            {theme === "batman" ? "Alfred Pennyworth, Butler" : "v0.1.0"}
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <h1 className="topbar-context">{title}</h1>
          </div>
          <div className="topbar-right" />
        </header>
        {children}
      </div>

      <div id="batman-overlay" className={showBatman ? "show" : ""}>
        <div className="bat-signal">🦇</div>
        <div className="batman-mode-text">BATMAN MODE</div>
        <div className="batman-alfred">Good evening. Alfred Pennyworth at your service, sir.</div>
      </div>
    </div>
  );
}
