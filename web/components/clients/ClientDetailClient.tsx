"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ClientModal } from "@/components/clients/ClientModal";
import { OverviewTab } from "@/components/clients/tabs/OverviewTab";
import { ReunioesTab } from "@/components/clients/tabs/ReunioesTab";
import { MetasTab } from "@/components/clients/tabs/MetasTab";
import { ActionsTab } from "@/components/clients/tabs/ActionsTab";
import { DocumentosTab } from "@/components/clients/tabs/DocumentosTab";
import { HistoricoTab } from "@/components/clients/tabs/HistoricoTab";
import { usePrivacy } from "@/components/providers/PrivacyProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { deleteClient } from "@/lib/actions/clients";
import {
  calcHealthScore,
  calcMRR,
  calcMesAtual,
  churnBadgeClass,
  colorFor,
  fmtTempo,
  healthLabel,
  initials,
} from "@/lib/format";
import type { ActionItem, Client, ClientDocument, Goal, Meeting, MrrHistoryEntry, Objective } from "@/lib/types";

const TABS = [
  { key: "overview", label: "Visão geral" },
  { key: "reunioes", label: "Reuniões" },
  { key: "metas", label: "Metas & Objetivos" },
  { key: "actions", label: "Action items" },
  { key: "documentos", label: "Documentos" },
  { key: "historico", label: "Histórico MRR" },
];

export function ClientDetailClient({
  client,
  clientIndex,
  meetings,
  goals,
  objectives,
  actionItems,
  documents,
  mrrHistory,
  isAdmin,
  allMeetings,
  allActionItems,
}: {
  client: Client;
  clientIndex: number;
  meetings: Meeting[];
  goals: Goal[];
  objectives: Objective[];
  actionItems: ActionItem[];
  documents: ClientDocument[];
  mrrHistory: MrrHistoryEntry[];
  isAdmin: boolean;
  allMeetings: Meeting[];
  allActionItems: ActionItem[];
}) {
  const router = useRouter();
  const toast = useToast();
  const privacy = usePrivacy();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [tab, setTab] = useState(tabParam && TABS.some((t) => t.key === tabParam) ? tabParam : "overview");
  const [editModalOpen, setEditModalOpen] = useState(false);

  const ci = colorFor(clientIndex);
  const { liquido } = calcMRR(client);
  const hs = calcHealthScore(client, allMeetings, allActionItems);
  const hl = healthLabel(hs);
  const churn = churnBadgeClass(client.churn);
  const mesAtual = calcMesAtual(client.data_inicio);

  async function handleDelete() {
    if (!confirm("Remover este cliente?")) return;
    try {
      await deleteClient(client.id);
      toast("Removido.");
      router.push("/clientes");
    } catch {
      toast("Erro ao remover", true);
    }
  }

  return (
    <div>
      <div className="client-topbar">
        <button className="back-btn" onClick={() => router.push("/clientes")}>
          ← Clientes
        </button>
        <div className="client-header-info">
          <div className="avatar" style={{ width: 52, height: 52, fontSize: 18, borderRadius: 12, background: ci.bg, color: ci.txt }}>
            {initials(client.nome)}
          </div>
          <div>
            <div className="client-name-lg">{client.nome}</div>
            <div className="client-meta-sm">
              {client.nicho}
              {client.data_inicio ? " · " + fmtTempo(client.data_inicio) + " de contrato" : ""}
            </div>
          </div>
          <div className="header-badges">
            <div className="client-header-stats">
              <div className="client-stat">
                <div className="client-stat-val">{privacy.val(liquido)}</div>
                <div className="client-stat-lbl">líquido/mês</div>
              </div>
              <div className="client-stat">
                <div className="client-stat-val">Mês {mesAtual}/12</div>
                <div className="client-stat-lbl">no contrato</div>
              </div>
            </div>
            <div className="client-header-badges">
              <span className="badge phase-badge">{client.fase}</span>
              <span className={`badge ${churn.cls}`}>{churn.label}</span>
              <span className={`health-badge ${hl.cls} health-badge-lg`}>
                {hl.label} · {hs}
              </span>
            </div>
          </div>
        </div>
        {isAdmin && (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="topbar-btn" onClick={() => setEditModalOpen(true)}>
              Editar
            </button>
            <button className="topbar-btn" style={{ color: "var(--red)" }} onClick={handleDelete}>
              Remover
            </button>
          </div>
        )}
      </div>

      <div className="client-tabs">
        {TABS.map((t) => (
          <div key={t.key} className={`ctab${tab === t.key ? " active" : ""}`} onClick={() => setTab(t.key)}>
            {t.label}
          </div>
        ))}
      </div>

      <div className="client-content">
        {tab === "overview" && <OverviewTab client={client} isAdmin={isAdmin} />}
        {tab === "reunioes" && (
          <ReunioesTab clientId={client.id} clienteNome={client.nome} meetings={meetings} actionItems={actionItems} isAdmin={isAdmin} />
        )}
        {tab === "metas" && <MetasTab clientId={client.id} goals={goals} objectives={objectives} isAdmin={isAdmin} />}
        {tab === "actions" && (
          <ActionsTab clientId={client.id} clienteNome={client.nome} items={actionItems} meetings={meetings} isAdmin={isAdmin} />
        )}
        {tab === "documentos" && <DocumentosTab clientId={client.id} documents={documents} isAdmin={isAdmin} />}
        {tab === "historico" && <HistoricoTab clientId={client.id} history={mrrHistory} isAdmin={isAdmin} />}
      </div>

      <ClientModal key={editModalOpen ? "open" : "closed"} open={editModalOpen} onClose={() => setEditModalOpen(false)} client={client} />
    </div>
  );
}
