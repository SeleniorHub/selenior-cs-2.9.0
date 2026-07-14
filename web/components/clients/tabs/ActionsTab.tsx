"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ActionItemModal } from "@/components/clients/ActionItemModal";
import { useToast } from "@/components/providers/ToastProvider";
import { deleteActionItem, toggleActionItem } from "@/lib/actions/action-items";
import { ownerTagClass, parseLocalDate } from "@/lib/format";
import type { ActionItem, Meeting } from "@/lib/types";

export function ActionsTab({
  clientId,
  clienteNome,
  items,
  meetings,
  isAdmin,
}: {
  clientId: string;
  clienteNome: string;
  items: ActionItem[];
  meetings: Meeting[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ActionItem | null>(null);

  const pending = items.filter((a) => !a.concluido);
  const done = items.filter((a) => a.concluido);

  async function handleToggle(id: string) {
    try {
      await toggleActionItem(id, clientId);
      router.refresh();
    } catch {
      toast("Erro", true);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteActionItem(id, clientId);
      toast("Removido.");
      router.refresh();
    } catch {
      toast("Erro", true);
    }
  }

  function Row({ a }: { a: ActionItem }) {
    const resp = a.responsavel === "Cliente" ? clienteNome : a.responsavel;
    const prazoDisplay = a.data_prazo ? parseLocalDate(a.data_prazo).toLocaleDateString("pt-BR") : "Sem prazo";
    return (
      <div className="ai-item">
        <div
          className={`ai-check ${a.concluido ? "done" : ""}`}
          onClick={isAdmin ? () => handleToggle(a.id) : undefined}
          style={isAdmin ? { cursor: "pointer" } : undefined}
        >
          {a.concluido ? "✓" : ""}
        </div>
        <div className="ai-info">
          <div className={`ai-text ${a.concluido ? "done" : ""}`} style={{ whiteSpace: "pre-wrap" }}>
            {a.texto}
          </div>
          <div className="ai-meta">
            {prazoDisplay}
            {a.meeting_id ? " · reunião vinculada" : ""}
          </div>
        </div>
        <span className={`owner-tag ${ownerTagClass(resp ?? "")}`}>{resp}</span>
        {isAdmin && (
          <>
            <button
              onClick={() => {
                setEditing(a);
                setModalOpen(true);
              }}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-3)", fontSize: 12, padding: "2px 5px" }}
              title="Editar"
            >
              ✎
            </button>
            <button
              onClick={() => handleDelete(a.id)}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-3)", fontSize: 11 }}
            >
              ✕
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      {isAdmin && (
        <button
          className="edit-btn"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          + Action item
        </button>
      )}
      {pending.length > 0 && (
        <>
          <div className="ai-section-title" style={{ marginTop: 16 }}>
            Pendentes ({pending.length})
          </div>
          {pending.map((a) => (
            <Row a={a} key={a.id} />
          ))}
        </>
      )}
      {done.length > 0 && (
        <>
          <div className="ai-section-title" style={{ marginTop: 16 }}>
            Concluídos
          </div>
          {done.map((a) => (
            <Row a={a} key={a.id} />
          ))}
        </>
      )}
      {pending.length === 0 && done.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">✓</div>
          <div className="empty-title">Tudo em dia</div>
          <div className="empty-sub">Nenhuma tarefa pendente para este cliente.</div>
        </div>
      )}
      <ActionItemModal
        key={modalOpen ? editing?.id ?? "new" : "closed"}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        clientId={clientId}
        clienteNome={clienteNome}
        meetings={meetings}
        item={editing}
      />
    </div>
  );
}
