"use client";

import { useState } from "react";
import { MeetingModal } from "@/components/clients/MeetingModal";
import { MeetingPopup } from "@/components/clients/MeetingPopup";
import { parseLocalDate } from "@/lib/format";
import type { ActionItem, Meeting } from "@/lib/types";

export function ReunioesTab({
  clientId,
  clienteNome,
  meetings,
  actionItems,
  isAdmin,
}: {
  clientId: string;
  clienteNome: string;
  meetings: Meeting[];
  actionItems: ActionItem[];
  isAdmin: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [popupMeeting, setPopupMeeting] = useState<Meeting | null>(null);

  const sorted = [...meetings].sort((a, b) => parseLocalDate(b.data).getTime() - parseLocalDate(a.data).getTime());
  const byWeek = new Map<string, Meeting[]>();
  sorted.forEach((r) => {
    const d = parseLocalDate(r.data);
    const monday = new Date(d);
    monday.setDate(d.getDate() - d.getDay() + 1);
    const key = monday.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    if (!byWeek.has(key)) byWeek.set(key, []);
    byWeek.get(key)!.push(r);
  });

  return (
    <div>
      {sorted.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <div className="empty-title">Nenhuma reunião ainda</div>
          <div className="empty-sub">Registre a primeira reunião para iniciar o histórico deste cliente.</div>
        </div>
      ) : (
        [...byWeek.entries()].map(([week, items]) => (
          <div className="semana-block" key={week}>
            <div className="semana-label">Semana de {week}</div>
            {items.map((r) => {
              const ais = actionItems.filter((a) => a.meeting_id === r.id);
              const chips = [r.participantes, ais.length > 0 ? `${ais.length} action items` : ""].filter(Boolean);
              return (
                <div className="reuniao-card" key={r.id} onClick={() => setPopupMeeting(r)}>
                  <div className="reuniao-icon" style={{ fontSize: 16 }}>
                    📋
                  </div>
                  <div className="reuniao-info">
                    <div className="reuniao-title">{r.titulo}</div>
                    <div className="reuniao-sub">
                      {parseLocalDate(r.data).toLocaleDateString("pt-BR")}
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
        ))
      )}
      {isAdmin && (
        <button
          className="edit-btn"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          + Adicionar reunião
        </button>
      )}

      <MeetingPopup
        meeting={popupMeeting}
        actionItems={actionItems}
        clienteNome={clienteNome}
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
        clientId={clientId}
        meeting={editing}
      />
    </div>
  );
}
