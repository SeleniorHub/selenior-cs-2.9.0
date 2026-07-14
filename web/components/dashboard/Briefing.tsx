"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { activeClients, calcHealthScore, healthLabel, parseLocalDate, toLocalDateString } from "@/lib/format";
import type { ActionItem, Client, Meeting } from "@/lib/types";
import { useTheme } from "@/components/providers/ThemeProvider";

export function Briefing({
  clients,
  meetings,
  actionItems,
  onOpenMeeting,
}: {
  clients: Client[];
  meetings: Meeting[];
  actionItems: ActionItem[];
  onOpenMeeting: (meeting: Meeting) => void;
}) {
  const router = useRouter();
  const { theme } = useTheme();
  const isBatman = theme === "batman";
  const [now, setNow] = useState<Date | null>(null);

  // O horário local só é conhecido no client — mantém null até montar pra não
  // divergir do horário renderizado no servidor (hidratação).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
  }, []);

  if (!now) return <div className="briefing-card" />;

  const hour = now.getHours();
  const greeting = isBatman ? "Good evening, sir" : hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const todayStr = toLocalDateString(now);
  const dateLabel = now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const todayMeetings = meetings.filter((r) => r.data === todayStr);

  const urgentAI = actionItems
    .filter((a) => {
      if (a.concluido || !a.data_prazo) return false;
      const dp = parseLocalDate(a.data_prazo);
      dp.setHours(0, 0, 0, 0);
      return dp <= today;
    })
    .sort((a, b) => parseLocalDate(a.data_prazo!).getTime() - parseLocalDate(b.data_prazo!).getTime())
    .slice(0, 5);

  const atRisk = activeClients(clients)
    .map((cl) => ({ cl, hs: calcHealthScore(cl, meetings, actionItems) }))
    .filter((x) => x.hs < 31)
    .sort((a, b) => a.hs - b.hs)
    .slice(0, 4);

  function countBadge(n: number) {
    return n > 0 ? <span className="actions-count">{n}</span> : null;
  }

  function clientName(id: string) {
    return clients.find((c) => c.id === id)?.nome ?? "";
  }

  return (
    <div className="briefing-card">
      <div className="briefing-header">
        <div className="briefing-greeting">
          {greeting} — <span style={{ textTransform: "capitalize" }}>{dateLabel}</span>
        </div>
        <div className="briefing-time">{now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
      </div>
      <div className="briefing-cols">
        <div className="briefing-col">
          <div className="briefing-col-title">📋 Reuniões hoje {countBadge(todayMeetings.length)}</div>
          {todayMeetings.length > 0 && <div className="briefing-big">{todayMeetings.length}</div>}
          {todayMeetings.length === 0 ? (
            <div className="briefing-empty">Sem reuniões hoje ☀️</div>
          ) : (
            todayMeetings.map((r) => (
              <div className="briefing-item" key={r.id} onClick={() => onOpenMeeting(r)}>
                <div className="briefing-dot briefing-dot-blue" />
                <div>
                  <div className="briefing-item-text">{r.titulo}</div>
                  <div className="briefing-item-sub">
                    {clientName(r.client_id)}
                    {r.duracao ? " · " + r.duracao : ""}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="briefing-col">
          <div className="briefing-col-title">⚡ Urgente {countBadge(urgentAI.length)}</div>
          {urgentAI.length > 0 && <div className="briefing-big briefing-big-amber">{urgentAI.length}</div>}
          {urgentAI.length === 0 ? (
            <div className="briefing-empty">Nada urgente no momento ✓</div>
          ) : (
            urgentAI.map((a) => {
              const dp = parseLocalDate(a.data_prazo!);
              dp.setHours(0, 0, 0, 0);
              const diff = Math.round((dp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              const dLabel = diff === 0 ? "Hoje" : Math.abs(diff) + "d de atraso";
              const isOverdue = diff < 0;
              const shortText = a.texto.split("\n")[0].substring(0, 55) + (a.texto.length > 55 ? "…" : "");
              return (
                <div className="briefing-item" key={a.id} onClick={() => router.push(`/clientes/${a.client_id}?tab=actions`)}>
                  <div className={`briefing-dot ${isOverdue ? "briefing-dot-red" : "briefing-dot-amber"}`} />
                  <div>
                    <div className="briefing-item-text">{shortText}</div>
                    <div className="briefing-item-sub">
                      {clientName(a.client_id)} · {dLabel}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="briefing-col">
          <div className="briefing-col-title">🔴 Atenção {countBadge(atRisk.length)}</div>
          {atRisk.length > 0 && <div className="briefing-big briefing-big-red">{atRisk.length}</div>}
          {atRisk.length === 0 ? (
            <div className="briefing-empty">Todos os clientes saudáveis ✓</div>
          ) : (
            atRisk.map(({ cl, hs }) => {
              const hl = healthLabel(hs);
              return (
                <div className="briefing-item" key={cl.id} onClick={() => router.push(`/clientes/${cl.id}`)}>
                  <div className="briefing-dot briefing-dot-red" />
                  <div>
                    <div className="briefing-item-text">{cl.nome}</div>
                    <div className="briefing-item-sub">
                      <span className={`health-badge ${hl.cls}`} style={{ fontSize: 10, padding: "2px 7px" }}>
                        {hs}
                      </span>{" "}
                      · {cl.nicho}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
