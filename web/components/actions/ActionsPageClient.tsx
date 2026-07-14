"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionItemModal } from "@/components/clients/ActionItemModal";
import { useToast } from "@/components/providers/ToastProvider";
import { toggleActionItem } from "@/lib/actions/action-items";
import { colorFor, initials, ownerTagClass, parseLocalDate } from "@/lib/format";
import type { ActionItem, Client, Meeting } from "@/lib/types";

const FILTERS = ["todos", "Leo", "João Pedro", "Cliente"];
const FILTER_LABELS: Record<string, string> = { todos: "Todos", Leo: "Leo", "João Pedro": "João Pedro", Cliente: "Clientes" };

function ActionRow({
  a,
  clients,
  isAdmin,
  onToggle,
  onEdit,
}: {
  a: ActionItem;
  clients: Client[];
  isAdmin: boolean;
  onToggle: (id: string) => void;
  onEdit: (a: ActionItem) => void;
}) {
  const router = useRouter();
  const cl = clients.find((c) => c.id === a.client_id);
  const clienteNome = cl?.nome ?? "—";
  const resp = a.responsavel === "Cliente" ? clienteNome : a.responsavel;

  let urgencyCls = "";
  let dataLabel = "";
  let dataCls = "date-none";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (a.data_prazo) {
    const dp = parseLocalDate(a.data_prazo);
    dp.setHours(0, 0, 0, 0);
    const diff = Math.round((dp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (!a.concluido) {
      if (dp < today) urgencyCls = " actions-row-overdue";
      else if (dp.getTime() === today.getTime()) urgencyCls = " actions-row-today";
    }
    if (diff < 0) {
      dataLabel = Math.abs(diff) + "d atrás";
      dataCls = "date-overdue";
    } else if (diff === 0) {
      dataLabel = "Hoje";
      dataCls = "date-today";
    } else if (diff === 1) {
      dataLabel = "Amanhã";
      dataCls = "date-soon";
    } else {
      dataLabel = dp.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
    }
  }

  const idx = cl ? clients.indexOf(cl) : 0;
  const ci = colorFor(idx);

  return (
    <div className={`actions-row${urgencyCls}`} onClick={() => router.push(`/clientes/${a.client_id}`)}>
      <div
        className={`ai-check ${a.concluido ? "done" : ""}`}
        onClick={
          isAdmin
            ? (e) => {
                e.stopPropagation();
                onToggle(a.id);
              }
            : undefined
        }
      >
        {a.concluido ? "✓" : ""}
      </div>
      <div className="actions-info">
        <div className={`actions-text ${a.concluido ? "done" : ""}`} style={{ whiteSpace: "pre-wrap" }}>
          {a.texto}
        </div>
        <div className="actions-meta">
          {cl && (
            <div className="avatar-mini" style={{ background: ci.bg, color: ci.txt }} title={cl.nome}>
              {initials(cl.nome)}
            </div>
          )}
          <span className="actions-cliente">{clienteNome}</span>
        </div>
      </div>
      <span className={`owner-tag ${ownerTagClass(resp ?? "")}`}>{resp}</span>
      {isAdmin && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(a);
          }}
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-3)", fontSize: 12, padding: "2px 6px", flexShrink: 0 }}
          title="Editar"
        >
          ✎
        </button>
      )}
      {dataLabel ? <span className={`actions-date ${dataCls}`}>{dataLabel}</span> : <span className="actions-date date-none">—</span>}
    </div>
  );
}

export function ActionsPageClient({
  actionItems,
  clients,
  meetings,
  isAdmin,
}: {
  actionItems: ActionItem[];
  clients: Client[];
  meetings: Meeting[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [filter, setFilter] = useState("todos");
  const [showDone, setShowDone] = useState(false);
  const [editing, setEditing] = useState<ActionItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const items = useMemo(
    () =>
      actionItems.filter((a) => {
        if (filter !== "todos" && a.responsavel !== filter) return false;
        if (!showDone && a.concluido) return false;
        return true;
      }),
    [actionItems, filter, showDone]
  );

  const buckets = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const b: Record<string, ActionItem[]> = {
      atrasados: [],
      hoje: [],
      amanha: [],
      semana: [],
      futuro: [],
      semData: [],
      concluidos: [],
    };
    items.forEach((a) => {
      if (a.concluido) {
        b.concluidos.push(a);
        return;
      }
      if (!a.data_prazo) {
        b.semData.push(a);
        return;
      }
      const dp = parseLocalDate(a.data_prazo);
      dp.setHours(0, 0, 0, 0);
      if (dp < today) b.atrasados.push(a);
      else if (dp.getTime() === today.getTime()) b.hoje.push(a);
      else if (dp.getTime() === tomorrow.getTime()) b.amanha.push(a);
      else if (dp < weekEnd) b.semana.push(a);
      else b.futuro.push(a);
    });
    (["atrasados", "hoje", "amanha", "semana", "futuro"] as const).forEach((k) => {
      b[k].sort((a, c) => parseLocalDate(a.data_prazo!).getTime() - parseLocalDate(c.data_prazo!).getTime());
    });
    return b;
  }, [items]);

  async function handleToggle(id: string) {
    const a = actionItems.find((x) => x.id === id);
    if (!a) return;
    try {
      await toggleActionItem(id, a.client_id);
      router.refresh();
    } catch {
      toast("Erro", true);
    }
  }

  const sections: [string, string, string][] = [
    ["atrasados", "Atrasados", "overdue"],
    ["hoje", "Hoje", "today"],
    ["amanha", "Amanhã", ""],
    ["semana", "Esta semana", ""],
    ["futuro", "Próximos", ""],
    ["semData", "Sem prazo", ""],
  ];
  if (showDone) sections.push(["concluidos", "Concluídos", "done"]);

  const hasAny = sections.some(([k]) => buckets[k].length > 0);
  const editingClientMeetings = editing ? meetings.filter((m) => m.client_id === editing.client_id) : [];
  const editingClientNome = editing ? clients.find((c) => c.id === editing.client_id)?.nome ?? "" : "";

  return (
    <div className="dash-main">
      <div className="dash-header">
        <div className="dash-sub">Sua agenda do dia a dia</div>
      </div>
      <div className="actions-toolbar">
        {FILTERS.map((f) => (
          <button key={f} className={`filter-btn${filter === f ? " active" : ""}`} onClick={() => setFilter(f)}>
            {FILTER_LABELS[f]}
          </button>
        ))}
        <label className="actions-toggle">
          <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
          <span>Mostrar concluídos</span>
        </label>
      </div>
      <div>
        {!hasAny ? (
          <div className="empty-state">Nenhum action item nessas condições.</div>
        ) : (
          sections.map(([key, label, cls]) => {
            const arr = buckets[key];
            if (arr.length === 0) return null;
            return (
              <div className="actions-section" key={key}>
                <div className={`actions-section-title ${cls}`}>
                  {label} <span className="actions-count">{arr.length}</span>
                </div>
                {arr.map((a) => (
                  <ActionRow
                    key={a.id}
                    a={a}
                    clients={clients}
                    isAdmin={isAdmin}
                    onToggle={handleToggle}
                    onEdit={(item) => {
                      setEditing(item);
                      setModalOpen(true);
                    }}
                  />
                ))}
              </div>
            );
          })
        )}
      </div>

      {editing && (
        <ActionItemModal
          key={modalOpen ? editing.id : "closed"}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          clientId={editing.client_id}
          clienteNome={editingClientNome}
          meetings={editingClientMeetings}
          item={editing}
        />
      )}
    </div>
  );
}
