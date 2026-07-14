"use client";

import { useRouter } from "next/navigation";
import { usePrivacy } from "@/components/providers/PrivacyProvider";
import { calcMRR, colorFor, initials, parseLocalDate } from "@/lib/format";
import type { Client } from "@/lib/types";

export function SafraPopup({
  monthKey,
  category,
  clients,
  onClose,
}: {
  monthKey: string | null;
  category: string | null;
  clients: Client[];
  onClose: () => void;
}) {
  const router = useRouter();
  const privacy = usePrivacy();
  if (!monthKey || !category) return null;

  const date = parseLocalDate(monthKey + "-01");
  const monthLabel = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const isChurn = category === "__churn__";
  const isAll = category === "__all__";
  const categoryLabel = isChurn ? "Churned" : isAll ? "Todos os clientes" : category;

  const matching = clients
    .filter((cl) => {
      if (!cl.data_inicio) return false;
      const d = parseLocalDate(cl.data_inicio);
      const k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
      if (k !== monthKey) return false;
      if (isAll) return true;
      if (isChurn) return cl.status === "churned";
      return (cl.status || "ativo") === "ativo" && cl.fase === category;
    })
    .sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <div
      className="popup-overlay show"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="popup">
        <div className="popup-header">
          <div>
            <div className="popup-title">
              Safra {monthLabel} — {categoryLabel}
            </div>
            <div className="popup-sub">
              {matching.length} cliente{matching.length === 1 ? "" : "s"}
            </div>
          </div>
          <button className="popup-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="popup-body">
          {matching.length === 0 ? (
            <div className="empty-state">Sem clientes nesta categoria.</div>
          ) : (
            matching.map((cl) => {
              const idx = clients.indexOf(cl);
              const ci = colorFor(idx);
              const status = cl.status || "ativo";
              const detail =
                status === "churned"
                  ? cl.data_fim
                    ? "Saiu em " + parseLocalDate(cl.data_fim).toLocaleDateString("pt-BR")
                    : "Sem data de saída"
                  : `${privacy.val(calcMRR(cl).liquido)}/mês · ${cl.fase}${status === "pausado" ? " · Pausado" : ""}`;
              return (
                <div
                  className="popup-client-row"
                  key={cl.id}
                  onClick={() => {
                    onClose();
                    router.push(`/clientes/${cl.id}`);
                  }}
                >
                  <div className="avatar" style={{ background: ci.bg, color: ci.txt }}>
                    {initials(cl.nome)}
                  </div>
                  <div className="popup-client-info">
                    <div className="popup-client-name">{cl.nome}</div>
                    <div className="popup-client-meta">{detail}</div>
                  </div>
                  <span style={{ fontSize: 14, color: "var(--text-3)" }}>›</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
