"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CrmFunnelSection } from "@/components/dashboard/CrmFunnelSection";
import { AddCrmAccountModal } from "@/components/crm/AddCrmAccountModal";
import { useToast } from "@/components/providers/ToastProvider";
import { setCrmAccountAtivo } from "@/lib/actions/crm-accounts";
import type { CrmAccountWithClient } from "@/lib/data/crm-accounts";
import type { CrmDealRow, CrmPipelineRow, CrmPipelineStepRow } from "@/lib/types";

export function CrmPageClient({
  accounts,
  selectedAccountId,
  funnel,
  isAdmin,
  clientsWithoutAccount,
}: {
  accounts: CrmAccountWithClient[];
  selectedAccountId: string | null;
  funnel: { pipelines: CrmPipelineRow[]; steps: CrmPipelineStepRow[]; deals: CrmDealRow[] } | null;
  isAdmin: boolean;
  clientsWithoutAccount: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function handleToggleAtivo(account: CrmAccountWithClient) {
    setTogglingId(account.id);
    try {
      await setCrmAccountAtivo(account.id, !account.ativo);
      toast(account.ativo ? "Conta desativada." : "Conta ativada.");
      router.refresh();
    } catch {
      toast("Erro ao atualizar conta.", true);
    } finally {
      setTogglingId(null);
    }
  }

  if (!accounts.length) {
    return (
      <div className="main">
        <div className="empty-state">
          <div className="empty-icon">🔌</div>
          <div className="empty-title">Nenhuma conta CRM cadastrada</div>
          <div className="empty-sub">Cadastre a primeira conta para começar a acompanhar o funil de vendas.</div>
        </div>
        {isAdmin && (
          <button className="add-row-btn" onClick={() => setModalOpen(true)}>
            + Nova conta CRM
          </button>
        )}
        <AddCrmAccountModal
          key={modalOpen ? "open" : "closed"}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          clients={clientsWithoutAccount}
        />
      </div>
    );
  }

  return (
    <div className="main">
      <div className="toolbar">
        {accounts.map((a) => (
          <button
            key={a.id}
            className={`filter-btn${selectedAccountId === a.id ? " active" : ""}`}
            onClick={() => router.push(`/crm?account=${a.id}`)}
          >
            {a.nome}
            {!a.ativo && " (inativa)"}
          </button>
        ))}
      </div>

      {funnel && (
        <CrmFunnelSection pipelines={funnel.pipelines} steps={funnel.steps} deals={funnel.deals} />
      )}

      {isAdmin && (
        <div className="chart-card">
          <div className="chart-title">Contas CRM cadastradas</div>
          <div className="chart-sub">Cada conta tem sua própria chave de API e URL de webhook no n8n.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {accounts.map((a) => (
              <div
                key={a.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "8px 12px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--surface2)",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{a.nome}</div>
                  <div style={{ fontSize: 12, color: "var(--text-2)", fontFamily: "var(--mono)" }}>
                    {a.n8n_webhook_url ?? `/api/webhooks/n8n/${a.webhook_slug}`}
                  </div>
                </div>
                <button
                  className="btn-cancel"
                  disabled={togglingId === a.id}
                  onClick={() => handleToggleAtivo(a)}
                >
                  {a.ativo ? "Desativar" : "Ativar"}
                </button>
              </div>
            ))}
          </div>
          <button className="add-row-btn" onClick={() => setModalOpen(true)}>
            + Nova conta CRM
          </button>
        </div>
      )}

      <AddCrmAccountModal
        key={modalOpen ? "open" : "closed"}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        clients={clientsWithoutAccount}
      />
    </div>
  );
}
