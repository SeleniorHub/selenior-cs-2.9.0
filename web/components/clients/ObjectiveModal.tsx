"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/providers/ToastProvider";
import { saveObjective } from "@/lib/actions/objectives";
import type { Objective } from "@/lib/types";

export function ObjectiveModal({
  open,
  onClose,
  clientId,
  objective,
}: {
  open: boolean;
  onClose: () => void;
  clientId: string;
  objective: Objective | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [texto, setTexto] = useState(objective?.texto ?? "");
  const [icone, setIcone] = useState(objective?.icone ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!texto.trim()) {
      toast("Preencha a descrição.", true);
      return;
    }
    setSaving(true);
    try {
      await saveObjective({ id: objective?.id, clientId, texto, icone });
      toast(objective ? "Objetivo atualizado." : "Objetivo salvo.");
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
      <h3>{objective ? "Editar objetivo" : "Novo objetivo"}</h3>
      <div className="form-group">
        <label>Descrição</label>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Ex: Aumentar volume de passagens antes de elevar ticket médio"
        />
      </div>
      <div className="form-group">
        <label>Contexto (opcional)</label>
        <input value={icone} onChange={(e) => setIcone(e.target.value)} placeholder="Ex: Estratégia definida pelo cliente" />
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
