"use client";

import { useRouter } from "next/navigation";
import { activeClients, calcHealthScore, colorFor, healthLabel, initials, parseLocalDate } from "@/lib/format";
import type { ActionItem, Client, Meeting } from "@/lib/types";

type Reason = { label: string; cls: string };

export function Alerts({
  clients,
  meetings,
  actionItems,
  isAdmin,
  onNewMeeting,
}: {
  clients: Client[];
  meetings: Meeting[];
  actionItems: ActionItem[];
  isAdmin: boolean;
  onNewMeeting: (clientId: string) => void;
}) {
  const router = useRouter();
  const ativos = activeClients(clients);
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const LIMIT_DAYS = 30;

  const alerts: { cl: Client; reasons: Reason[]; needsMeeting: boolean; hasOverdueAI: boolean }[] = [];

  ativos.forEach((cl) => {
    const reasons: Reason[] = [];
    let needsMeeting = false;
    let hasOverdueAI = false;
    if (cl.churn === "alto") {
      reasons.push({ label: "Risco alto", cls: "alert-tag-red" });
      needsMeeting = true;
    }
    const clMeetings = meetings.filter((r) => r.client_id === cl.id);
    if (clMeetings.length === 0) {
      if (cl.data_inicio) {
        const daysSinceStart = Math.floor((now.getTime() - parseLocalDate(cl.data_inicio).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceStart > 15) {
          reasons.push({ label: "Sem reuniões registradas", cls: "alert-tag-amber" });
          needsMeeting = true;
        }
      }
    } else {
      const latest = clMeetings.reduce((mx, m) => (parseLocalDate(m.data) > parseLocalDate(mx.data) ? m : mx));
      const days = Math.floor((now.getTime() - parseLocalDate(latest.data).getTime()) / (1000 * 60 * 60 * 24));
      if (days > LIMIT_DAYS) {
        reasons.push({ label: `${days} dias sem reunião`, cls: "alert-tag-amber" });
        needsMeeting = true;
      }
    }
    const overdue = actionItems.filter((a) => a.client_id === cl.id && !a.concluido && a.data_prazo && parseLocalDate(a.data_prazo) < today).length;
    if (overdue > 0) {
      reasons.push({ label: `${overdue} ação${overdue > 1 ? "ões" : ""}${overdue > 1 ? " vencidas" : " vencida"}`, cls: "alert-tag-red" });
      hasOverdueAI = true;
    }
    if (reasons.length) alerts.push({ cl, reasons, needsMeeting, hasOverdueAI });
  });

  if (!alerts.length) return <div className="empty-state">Nenhum sinal de alerta. ✓</div>;

  alerts.sort((a, b) => {
    const hsA = calcHealthScore(a.cl, meetings, actionItems);
    const hsB = calcHealthScore(b.cl, meetings, actionItems);
    if (b.reasons.length !== a.reasons.length) return b.reasons.length - a.reasons.length;
    return hsA - hsB;
  });

  return (
    <div>
      {alerts.map(({ cl, reasons, needsMeeting, hasOverdueAI }) => {
        const idx = clients.indexOf(cl);
        const ci = colorFor(idx);
        const hs = calcHealthScore(cl, meetings, actionItems);
        const hl = healthLabel(hs);
        return (
          <div className="alert-row" key={cl.id} onClick={() => router.push(`/clientes/${cl.id}`)}>
            <div className="avatar" style={{ background: ci.bg, color: ci.txt }}>
              {initials(cl.nome)}
            </div>
            <div className="alert-info">
              <div className="alert-name">{cl.nome}</div>
              <div className="alert-tags">
                {reasons.map((r, i) => (
                  <span className={`alert-tag ${r.cls}`} key={i}>
                    {r.label}
                  </span>
                ))}
                <span className={`health-badge ${hl.cls}`} style={{ marginLeft: 4 }}>
                  {hs}
                </span>
              </div>
            </div>
            {isAdmin && (needsMeeting || hasOverdueAI) && (
              <div className="alert-actions">
                {needsMeeting && (
                  <button
                    className="alert-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNewMeeting(cl.id);
                    }}
                  >
                    + Reunião
                  </button>
                )}
                {hasOverdueAI && (
                  <button
                    className="alert-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/clientes/${cl.id}?tab=actions`);
                    }}
                  >
                    Ver ações
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
