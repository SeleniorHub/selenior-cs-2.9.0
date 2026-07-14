"use client";

import { useMemo, useState } from "react";
import { MeetingModal } from "@/components/clients/MeetingModal";
import { MeetingPopup } from "@/components/clients/MeetingPopup";
import { parseLocalDate, toLocalDateString } from "@/lib/format";
import type { ActionItem, Client, Meeting } from "@/lib/types";

const DAY_HEADERS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function ReunioesPageClient({
  meetings,
  clients,
  actionItems,
  isAdmin,
}: {
  meetings: Meeting[];
  clients: Client[];
  actionItems: ActionItem[];
  isAdmin: boolean;
}) {
  const [viewDate, setViewDate] = useState(new Date());
  const [dayFilter, setDayFilter] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [popupMeeting, setPopupMeeting] = useState<Meeting | null>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthMeetings = useMemo(
    () =>
      meetings
        .filter((r) => {
          if (!r.data) return false;
          const d = parseLocalDate(r.data);
          return d.getFullYear() === year && d.getMonth() === month;
        })
        .sort((a, b) => parseLocalDate(b.data).getTime() - parseLocalDate(a.data).getTime()),
    [meetings, year, month]
  );

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const meetDayCounts = new Map<number, number>();
  monthMeetings.forEach((r) => {
    const d = parseLocalDate(r.data).getDate();
    meetDayCounts.set(d, (meetDayCounts.get(d) || 0) + 1);
  });

  const displayItems = dayFilter
    ? meetings.filter((r) => {
        if (!r.data) return false;
        const d = parseLocalDate(r.data);
        return d.getFullYear() === year && d.getMonth() === month && d.getDate() === dayFilter;
      })
    : monthMeetings;

  const byWeek = new Map<string, Meeting[]>();
  displayItems.forEach((r) => {
    const d = parseLocalDate(r.data);
    const day = d.getDay();
    const mon = new Date(d);
    mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    const key = toLocalDateString(mon);
    if (!byWeek.has(key)) byWeek.set(key, []);
    byWeek.get(key)!.push(r);
  });
  const weekKeys = [...byWeek.keys()].sort((a, b) => b.localeCompare(a));

  const monthLabel = new Date(year, month, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  function clientName(id: string) {
    return clients.find((c) => c.id === id)?.nome;
  }

  return (
    <div className="dash-main">
      <div className="reunioes-header">
        <div className="reunioes-nav">
          <button className="reunioes-nav-btn" onClick={() => setViewDate(new Date(year, month - 1, 1))}>
            ‹
          </button>
          <span className="reunioes-nav-title">{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</span>
          <button className="reunioes-nav-btn" onClick={() => setViewDate(new Date(year, month + 1, 1))}>
            ›
          </button>
        </div>
        {isAdmin && (
          <button
            className="topbar-btn primary"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Nova reunião</span>
          </button>
        )}
      </div>

      <div className="chart-card" style={{ marginBottom: 14 }}>
        <div className="cal-grid">
          {DAY_HEADERS.map((d) => (
            <div className="cal-day-hdr" key={d}>
              {d}
            </div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div className="cal-cell" key={"empty" + i} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const d = i + 1;
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
            const count = meetDayCounts.get(d) || 0;
            const hasMt = count > 0;
            return (
              <div
                key={d}
                className={`cal-cell${isToday ? " cal-today" : ""}${hasMt ? " cal-has-meeting" : ""}`}
                onClick={hasMt ? () => setDayFilter(d) : undefined}
              >
                <div className="cal-day-num">{d}</div>
                {hasMt && <div className="cal-meeting-badge">{count}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {displayItems.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <div className="empty-title">{dayFilter ? "Nenhuma reunião neste dia" : "Nenhuma reunião neste mês"}</div>
          <div className="empty-sub">Use o botão Nova reunião para adicionar.</div>
        </div>
      ) : (
        <>
          {dayFilter && (
            <div style={{ marginBottom: 12 }}>
              <button className="filter-btn active" style={{ fontSize: 11.5 }} onClick={() => setDayFilter(null)}>
                ← Ver mês completo
              </button>
            </div>
          )}
          {weekKeys.map((key) => {
            const mon = new Date(key + "T12:00:00");
            const wLabel = mon.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
            return (
              <div className="semana-block" key={key}>
                <div className="semana-label">Semana de {wLabel}</div>
                {byWeek.get(key)!.map((r) => {
                  const nome = clientName(r.client_id);
                  const ais = actionItems.filter((a) => a.meeting_id === r.id);
                  const chips = [nome, r.participantes, ais.length > 0 ? `${ais.length} action items` : null].filter(Boolean) as string[];
                  return (
                    <div className="reuniao-card" key={r.id} onClick={() => setPopupMeeting(r)}>
                      <div className="reuniao-icon" style={{ fontSize: 16 }}>
                        📋
                      </div>
                      <div className="reuniao-info">
                        <div className="reuniao-title">
                          {r.titulo}
                          {nome && <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 400 }}> · {nome}</span>}
                        </div>
                        <div className="reuniao-sub">
                          {parseLocalDate(r.data).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
                          {r.duracao ? " · " + r.duracao : ""}
                        </div>
                        <div className="chip-row">
                          {chips.map((c, i) => (
                            <span className="chip" key={i}>
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span style={{ fontSize: 18, color: "var(--text-3)", marginLeft: 8 }}>›</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </>
      )}

      <MeetingPopup
        meeting={popupMeeting}
        actionItems={actionItems}
        clienteNome={popupMeeting ? clientName(popupMeeting.client_id) ?? "" : ""}
        isAdmin={isAdmin}
        onClose={() => setPopupMeeting(null)}
        onEdit={() => {
          setEditing(popupMeeting);
          setPopupMeeting(null);
          setModalOpen(true);
        }}
      />
      <MeetingModal
        key={modalOpen ? editing?.id ?? "new" : "closed"}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        clientId={null}
        clients={clients}
        meeting={editing}
      />
    </div>
  );
}
