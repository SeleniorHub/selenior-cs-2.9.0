"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/providers/ToastProvider";
import { saveMrrHistory } from "@/lib/actions/mrr-history";
import { toLocalDateString } from "@/lib/format";
import type { MrrHistoryEntry } from "@/lib/types";

function currentMonth() {
  return toLocalDateString(new Date()).substring(0, 7);
}

export function MrrHistoryModal({
  open,
  onClose,
  clientId,
  entry,
}: {
  open: boolean;
  onClose: () => void;
  clientId: string;
  entry: MrrHistoryEntry | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [mes, setMes] = useState(entry ? entry.mes.substring(0, 7) : currentMonth());
  const [mrr, setMrr] = useState(entry ? entry.mrr : "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const mrrNum = parseFloat(mrr);
    if (!mes || !mrrNum) {
      toast("Preencha mês e valor.", true);
      return;
    }
    setSaving(true);
    try {
      await saveMrrHistory({ id: entry?.id, clientId, mes, mrr: mrrNum });
      toast("Registro salvo.");
      onClose();
      router.refresh();
    } catch {
      toast("Erro ao salvar", true);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;
  return (
    <div
      className="modal-overlay open"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-box" style={{ maxWidth: 380 }}>
        <div className="modal-header">
          <div className="modal-title">{entry ? "Editar registro" : "Novo registro de MRR"}</div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Mês</label>
            <input type="month" className="input" value={mes} onChange={(e) => setMes(e.target.value)} />
          </div>
          <div className="form-group">
            <label>MRR bruto (R$)</label>
            <input
              type="number"
              className="input"
              placeholder="0"
              min={0}
              step="0.01"
              value={mrr}
              onChange={(e) => setMrr(e.target.value)}
            />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-save" disabled={saving} onClick={handleSave}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
