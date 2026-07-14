"use client";

import { parseLocalDate } from "@/lib/format";
import type { ActionItem, Meeting } from "@/lib/types";

export function MeetingPopup({
  meeting,
  actionItems,
  clienteNome,
  isAdmin,
  onClose,
  onEdit,
}: {
  meeting: Meeting | null;
  actionItems: ActionItem[];
  clienteNome: string;
  isAdmin: boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  if (!meeting) return null;
  const pontos = (meeting.meeting_points ?? []).sort((a, b) => a.ordem - b.ordem);
  const ais = actionItems.filter((a) => a.meeting_id === meeting.id);

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
            <div className="popup-title">{meeting.titulo}</div>
            <div className="popup-sub">
              {parseLocalDate(meeting.data).toLocaleDateString("pt-BR")}
              {meeting.duracao ? " · " + meeting.duracao : ""}
              {meeting.participantes ? " · " + meeting.participantes : ""}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {isAdmin && (
              <button className="topbar-btn" style={{ fontSize: 12, padding: "6px 12px" }} onClick={onEdit}>
                Editar
              </button>
            )}
            <button className="popup-close" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>
        <div className="popup-body">
          {meeting.resumo && (
            <div className="popup-section">
              <div className="popup-section-title">Resumo</div>
              <div className="popup-text">{meeting.resumo}</div>
            </div>
          )}
          {pontos.length > 0 && (
            <div className="popup-section">
              <div className="popup-section-title">Pontos discutidos</div>
              {pontos.map((p) => (
                <div className="popup-bullet" key={p.id}>
                  <div className="bullet-dot bullet-blue" />
                  <span>{p.texto}</span>
                </div>
              ))}
            </div>
          )}
          {ais.length > 0 && (
            <div className="popup-section">
              <div className="popup-section-title">Action items</div>
              {ais.map((a) => (
                <div className="popup-bullet" key={a.id}>
                  <div className="bullet-dot bullet-green" />
                  <span>
                    <strong style={{ fontWeight: 500 }}>{a.responsavel === "Cliente" ? clienteNome : a.responsavel}</strong> —{" "}
                    {a.texto}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
