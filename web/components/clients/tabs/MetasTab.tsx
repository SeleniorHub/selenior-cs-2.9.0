"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoalModal } from "@/components/clients/GoalModal";
import { ObjectiveModal } from "@/components/clients/ObjectiveModal";
import { useToast } from "@/components/providers/ToastProvider";
import { deleteGoal } from "@/lib/actions/goals";
import { deleteObjective } from "@/lib/actions/objectives";
import type { Goal, Objective } from "@/lib/types";

export function MetasTab({
  clientId,
  goals,
  objectives,
  isAdmin,
}: {
  clientId: string;
  goals: Goal[];
  objectives: Objective[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [objModalOpen, setObjModalOpen] = useState(false);
  const [editingObj, setEditingObj] = useState<Objective | null>(null);

  const byMes = new Map<string, Goal[]>();
  goals.forEach((g) => {
    const key = g.mes || "Sem mês";
    if (!byMes.has(key)) byMes.set(key, []);
    byMes.get(key)!.push(g);
  });

  async function handleDeleteGoal(id: string) {
    try {
      await deleteGoal(id, clientId);
      toast("Meta removida.");
      router.refresh();
    } catch {
      toast("Erro", true);
    }
  }

  async function handleDeleteObj(id: string) {
    try {
      await deleteObjective(id, clientId);
      toast("Removido.");
      router.refresh();
    } catch {
      toast("Erro", true);
    }
  }

  return (
    <div>
      {isAdmin && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            className="edit-btn"
            onClick={() => {
              setEditingGoal(null);
              setGoalModalOpen(true);
            }}
          >
            + Meta
          </button>
          <button
            className="edit-btn"
            onClick={() => {
              setEditingObj(null);
              setObjModalOpen(true);
            }}
          >
            + Objetivo
          </button>
        </div>
      )}

      {goals.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎯</div>
          <div className="empty-title">Sem metas cadastradas</div>
          <div className="empty-sub">Defina metas mensais para acompanhar o progresso do cliente.</div>
        </div>
      ) : (
        [...byMes.entries()].map(([mes, ms]) => (
          <div key={mes}>
            <div className="mini-title" style={{ marginBottom: 10 }}>
              {mes}
            </div>
            <div className="metas-grid">
              {ms.map((m) => {
                const total = parseFloat(m.total);
                const progresso = parseFloat(m.progresso);
                const pct = total > 0 ? Math.min(100, Math.round((progresso / total) * 100)) : 0;
                const stCls = m.status === "Concluído" ? "ms-ok" : m.status === "Em progresso" ? "ms-prog" : "ms-none";
                const fillCls = m.status === "Concluído" ? "" : "amber";
                return (
                  <div className="meta-card" key={m.id}>
                    <div className="meta-header">
                      <span className="meta-title">{m.titulo}</span>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <span className={`meta-status ${stCls}`}>{m.status}</span>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => {
                                setEditingGoal(m);
                                setGoalModalOpen(true);
                              }}
                              style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-3)", fontSize: 12, padding: "2px 5px" }}
                              title="Editar"
                            >
                              ✎
                            </button>
                            <button
                              onClick={() => handleDeleteGoal(m.id)}
                              style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-3)", fontSize: 11, marginLeft: 4 }}
                            >
                              ✕
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="prog-bar">
                      <div className={`prog-fill ${fillCls}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="meta-sub">
                      {m.progresso} de {m.total}
                      {m.unidade ? " " + m.unidade : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {objectives.length > 0 && (
        <>
          <div className="mini-title" style={{ marginBottom: 10, marginTop: 20 }}>
            Objetivos gerais
          </div>
          {objectives.map((o) => (
            <div className="obj-item" key={o.id}>
              <div className="obj-icon">🎯</div>
              <div className="obj-text">
                {o.texto}
                <div className="obj-sub">{o.icone || ""}</div>
              </div>
              {isAdmin && (
                <div style={{ display: "flex", alignItems: "center", marginLeft: "auto" }}>
                  <button
                    onClick={() => {
                      setEditingObj(o);
                      setObjModalOpen(true);
                    }}
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-3)", fontSize: 12, padding: "2px 5px" }}
                    title="Editar"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => handleDeleteObj(o.id)}
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-3)", fontSize: 11, marginLeft: 4 }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          ))}
        </>
      )}

      <GoalModal
        key={goalModalOpen ? editingGoal?.id ?? "new" : "closed"}
        open={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        clientId={clientId}
        goal={editingGoal}
      />
      <ObjectiveModal
        key={objModalOpen ? editingObj?.id ?? "new" : "closed"}
        open={objModalOpen}
        onClose={() => setObjModalOpen(false)}
        clientId={clientId}
        objective={editingObj}
      />
    </div>
  );
}
