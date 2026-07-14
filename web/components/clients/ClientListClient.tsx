"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePrivacy } from "@/components/providers/PrivacyProvider";
import { ClientModal } from "@/components/clients/ClientModal";
import {
  calcHealthScore,
  calcMRR,
  calcMesAtual,
  churnBadgeClass,
  colorFor,
  healthLabel,
  initials,
  parseLocalDate,
  progressPct,
} from "@/lib/format";
import type { ActionItem, Client, Meeting } from "@/lib/types";

const FILTERS = ["todos", "Onboarding", "Otimização", "Escala", "Consolidação", "Aceleração", "churn"];
const FILTER_LABELS: Record<string, string> = {
  todos: "Todos",
  Onboarding: "Onboarding",
  Otimização: "Otimização",
  Escala: "Escala",
  Consolidação: "Consolidação",
  Aceleração: "Aceleração",
  churn: "⚠ Risco alto",
};

export function ClientListClient({
  clients,
  meetings,
  actionItems,
  isAdmin,
}: {
  clients: Client[];
  meetings: Meeting[];
  actionItems: ActionItem[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const privacy = usePrivacy();
  const searchParams = useSearchParams();
  const faseParam = searchParams.get("fase");
  const [filter, setFilter] = useState(faseParam && FILTERS.includes(faseParam) ? faseParam : "todos");
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const ativos = clients.filter((c) => (c.status || "ativo") === "ativo");
  const totalMrr = ativos.reduce(
    (acc, cl) => {
      const { bruto, liquido } = calcMRR(cl);
      acc.bruto += bruto;
      acc.liquido += liquido;
      return acc;
    },
    { bruto: 0, liquido: 0 }
  );
  const altoRisco = ativos.filter((c) => c.churn === "alto").length;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return clients.filter((c) => {
      const status = c.status || "ativo";
      if (!showInactive && status !== "ativo") return false;
      if (filter === "churn" && c.churn !== "alto") return false;
      if (filter !== "todos" && filter !== "churn" && c.fase !== filter) return false;
      if (q && !c.nome.toLowerCase().includes(q) && !(c.nicho ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [clients, filter, search, showInactive]);

  return (
    <div className="main">
      <div className="summary-grid">
        <div className="metric">
          <div className="metric-label">Clientes ativos</div>
          <div className="metric-value">{ativos.length}</div>
          <div className="metric-sub">contratos vigentes</div>
        </div>
        <div className="metric">
          <div className="metric-label">MRR bruto</div>
          <div className="metric-value">{privacy.val(totalMrr.bruto)}</div>
          <div className="metric-sub">receita total mensal</div>
        </div>
        <div className="metric">
          <div className="metric-label">Deduções</div>
          <div className="metric-value" style={{ color: "var(--red)" }}>
            -{privacy.val(totalMrr.bruto - totalMrr.liquido)}
          </div>
          <div className="metric-sub">comissões + custos</div>
        </div>
        <div className="metric">
          <div className="metric-label">MRR líquido</div>
          <div className="metric-value" style={{ color: "var(--green)" }}>
            {privacy.val(totalMrr.liquido)}
          </div>
          <div className="metric-sub">{altoRisco > 0 ? `${altoRisco} em risco alto` : "tudo ok"}</div>
        </div>
      </div>

      <div className="toolbar">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`filter-btn${filter === f ? " active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
        <label className="actions-toggle">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          <span>Mostrar inativos</span>
        </label>
        <input
          className="search-box"
          type="text"
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="client-list">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <div className="empty-title">Nenhum cliente encontrado</div>
            <div className="empty-sub">Tente outro filtro ou termo de busca.</div>
          </div>
        ) : (
          filtered.map((cl) => {
            const idx = clients.indexOf(cl);
            const ci = colorFor(idx);
            const { liquido } = calcMRR(cl);
            const pct = progressPct(cl);
            const aiPendentes = actionItems.filter((a) => a.client_id === cl.id && !a.concluido).length;
            const status = cl.status || "ativo";
            const cps = cl.client_checkpoints ?? [];
            const doneCount = cps.filter((c) => c.done).length;
            const hs = status === "ativo" ? calcHealthScore(cl, meetings, actionItems) : null;
            const hl = hs !== null ? healthLabel(hs) : null;
            const churn = churnBadgeClass(cl.churn);
            return (
              <div
                key={cl.id}
                className={`client-row${status !== "ativo" ? " client-row-inactive" : ""}`}
                onClick={() => router.push(`/clientes/${cl.id}`)}
              >
                <div className="avatar" style={{ background: ci.bg, color: ci.txt }}>
                  {initials(cl.nome)}
                </div>
                <div className="row-info">
                  <div className="row-name">
                    {cl.nome}
                    {status === "churned" && <span className="status-tag status-churned"> Churned</span>}
                    {status === "pausado" && <span className="status-tag status-paused"> Pausado</span>}
                  </div>
                  <div className="row-sub">
                    {cl.nicho} · Mês {calcMesAtual(cl.data_inicio)}/12
                    {cl.data_inicio
                      ? " · desde " +
                        parseLocalDate(cl.data_inicio).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
                      : ""}{" "}
                    · {doneCount}/{cps.length} checkpoints
                    {aiPendentes > 0 ? ` · ${aiPendentes} ação pendente` : ""}
                  </div>
                  <div className="progress-wrap">
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="row-right">
                  <span className="badge mrr-badge">{privacy.val(liquido)}/mês</span>
                  <span className="badge phase-badge">{cl.fase}</span>
                  <span className={`badge ${churn.cls}`}>{churn.label}</span>
                  {hl && (
                    <span className={`health-badge ${hl.cls}`}>{hs}</span>
                  )}
                  <span style={{ fontSize: 16, color: "var(--text-3)" }}>›</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isAdmin && (
        <button className="add-row-btn" onClick={() => setModalOpen(true)}>
          + Adicionar cliente
        </button>
      )}

      <ClientModal key={modalOpen ? "open" : "closed"} open={modalOpen} onClose={() => setModalOpen(false)} client={null} />
    </div>
  );
}
