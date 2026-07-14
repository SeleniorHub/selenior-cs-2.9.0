"use client";

import { useState } from "react";
import { Alerts } from "@/components/dashboard/Alerts";
import { Briefing } from "@/components/dashboard/Briefing";
import { ChurnSection } from "@/components/dashboard/ChurnSection";
import { CohortTable } from "@/components/dashboard/CohortTable";
import { EngagementHeatmap } from "@/components/dashboard/EngagementHeatmap";
import { FinancialSection } from "@/components/dashboard/FinancialSection";
import { Kpis } from "@/components/dashboard/Kpis";
import { MrrEvolutionSection } from "@/components/dashboard/MrrEvolutionSection";
import { SafraPopup } from "@/components/dashboard/SafraPopup";
import { PhaseChart } from "@/components/charts/PhaseChart";
import { MeetingModal } from "@/components/clients/MeetingModal";
import { MeetingPopup } from "@/components/clients/MeetingPopup";
import { activeClients } from "@/lib/format";
import type { ActionItem, Client, Meeting, MrrHistoryEntry } from "@/lib/types";

const FASES = ["Onboarding", "Otimização", "Escala", "Consolidação", "Aceleração"];

export function DashboardClient({
  clients,
  meetings,
  actionItems,
  mrrHistory,
  isAdmin,
}: {
  clients: Client[];
  meetings: Meeting[];
  actionItems: ActionItem[];
  mrrHistory: MrrHistoryEntry[];
  isAdmin: boolean;
}) {
  const [safra, setSafra] = useState<{ month: string; category: string } | null>(null);
  const [popupMeeting, setPopupMeeting] = useState<Meeting | null>(null);
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [meetingModalClientId, setMeetingModalClientId] = useState<string | null>(null);
  const [meetingModalMeeting, setMeetingModalMeeting] = useState<Meeting | null>(null);

  const now = new Date();
  const fmt = now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const ativos = activeClients(clients);
  const phaseCounts = FASES.map((f) => ativos.filter((c) => c.fase === f).length);

  return (
    <div className="dash-main">
      <div className="dash-header">
        <div className="dash-sub">Atualizado em {fmt}</div>
      </div>
      <Briefing clients={clients} meetings={meetings} actionItems={actionItems} onOpenMeeting={setPopupMeeting} />
      <Kpis clients={clients} />
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-title">Distribuição por fase</div>
          <div className="chart-sub">Clique em um segmento para filtrar a lista de clientes.</div>
          <PhaseChart counts={phaseCounts} />
        </div>
        <div className="chart-card">
          <div className="chart-title">Evolução de MRR</div>
          <div className="chart-sub">MRR total por mês (histórico real) + variação por novos e churns.</div>
          <MrrEvolutionSection clients={clients} mrrHistory={mrrHistory} />
        </div>
      </div>
      <div className="chart-card cohort-card">
        <div className="chart-title">Safra de clientes — por mês de entrada</div>
        <div className="chart-sub">Mostra como cada coorte está distribuída entre as fases hoje. Vermelho indica churn.</div>
        <div>
          <CohortTable clients={clients} onOpenSafra={(month, category) => setSafra({ month, category })} />
        </div>
      </div>
      <FinancialSection clients={clients} />
      <ChurnSection clients={clients} />
      <div className="chart-card">
        <div className="chart-title">Engajamento — reuniões por cliente</div>
        <div className="chart-sub">Frequência de reuniões nos últimos 6 meses. Clique no cliente para abrir.</div>
        <EngagementHeatmap clients={clients} meetings={meetings} />
      </div>
      <div className="chart-card">
        <div className="chart-title">Sinais de alerta</div>
        <div className="chart-sub">Clientes que precisam de atenção: risco manual, sem reunião há +30 dias, ou ações vencidas.</div>
        <Alerts
          clients={clients}
          meetings={meetings}
          actionItems={actionItems}
          isAdmin={isAdmin}
          onNewMeeting={(clientId) => {
            setMeetingModalClientId(clientId);
            setMeetingModalMeeting(null);
            setMeetingModalOpen(true);
          }}
        />
      </div>

      <SafraPopup monthKey={safra?.month ?? null} category={safra?.category ?? null} clients={clients} onClose={() => setSafra(null)} />
      <MeetingPopup
        meeting={popupMeeting}
        actionItems={actionItems}
        clienteNome={popupMeeting ? clients.find((c) => c.id === popupMeeting.client_id)?.nome ?? "" : ""}
        isAdmin={isAdmin}
        onClose={() => setPopupMeeting(null)}
        onEdit={() => {
          setMeetingModalClientId(popupMeeting?.client_id ?? null);
          setMeetingModalMeeting(popupMeeting);
          setPopupMeeting(null);
          setMeetingModalOpen(true);
        }}
      />
      <MeetingModal
        key={meetingModalOpen ? meetingModalMeeting?.id ?? "new" : "closed"}
        open={meetingModalOpen}
        onClose={() => setMeetingModalOpen(false)}
        clientId={meetingModalClientId}
        clients={clients}
        meeting={meetingModalMeeting}
      />
    </div>
  );
}
