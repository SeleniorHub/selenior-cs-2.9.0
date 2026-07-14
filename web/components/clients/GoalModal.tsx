"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/providers/ToastProvider";
import { saveGoal } from "@/lib/actions/goals";
import type { Goal } from "@/lib/types";

export function GoalModal({
  open,
  onClose,
  clientId,
  goal,
}: {
  open: boolean;
  onClose: () => void;
  clientId: string;
  goal: Goal | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [titulo, setTitulo] = useState(goal?.titulo ?? "");
  const [mes, setMes] = useState(goal?.mes ?? "");
  const [status, setStatus] = useState(goal?.status ?? "Não iniciado");
  const [progresso, setProgresso] = useState(goal ? parseFloat(goal.progresso) : 0);
  const [total, setTotal] = useState(goal ? parseFloat(goal.total) : 100);
  const [unidade, setUnidade] = useState(goal?.unidade ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!titulo.trim()) {
      toast("Preencha o título.", true);
      return;
    }
    setSaving(true);
    try {
      await saveGoal({ id: goal?.id, clientId, mes, titulo, status, progresso, total, unidade });
      toast("Meta salva.");
      onClose();
      router.refresh();
    } catch {
      toast("Erro ao salvar", true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <h3>{goal ? "Editar meta" : "Nova meta"}</h3>
      <div className="form-group">
        <label>Título</label>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Volume de passagens" />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Mês (ex: Junho/2026)</label>
          <input value={mes} onChange={(e) => setMes(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="Não iniciado">Não iniciado</option>
            <option value="Em progresso">Em progresso</option>
            <option value="Concluído">Concluído</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Progresso atual</label>
          <input type="number" value={progresso} onChange={(e) => setProgresso(parseFloat(e.target.value) || 0)} />
        </div>
        <div className="form-group">
          <label>Total / Meta</label>
          <input type="number" value={total} onChange={(e) => setTotal(parseFloat(e.target.value) || 0)} />
        </div>
      </div>
      <div className="form-group">
        <label>Unidade (ex: passagens, contatos, R$)</label>
        <input value={unidade} onChange={(e) => setUnidade(e.target.value)} />
      </div>
      <div className="modal-actions">
        <button className="btn-cancel" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn-save" disabled={saving} onClick={handleSave}>
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </Modal>
  );
}
