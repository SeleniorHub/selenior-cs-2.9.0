"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/providers/ToastProvider";
import { saveActionItem } from "@/lib/actions/action-items";
import { parseLocalDate } from "@/lib/format";
import type { ActionItem, Meeting } from "@/lib/types";

export function ActionItemModal({
  open,
  onClose,
  clientId,
  clienteNome,
  meetings,
  item,
}: {
  open: boolean;
  onClose: () => void;
  clientId: string;
  clienteNome: string;
  meetings: Meeting[];
  item: ActionItem | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [texto, setTexto] = useState(item?.texto ?? "");
  const [responsavel, setResponsavel] = useState(item?.responsavel ?? "Leo");
  const [dataPrazo, setDataPrazo] = useState(item?.data_prazo ?? "");
  const [meetingId, setMeetingId] = useState(item?.meeting_id ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!texto.trim()) {
      toast("Preencha a descrição.", true);
      return;
    }
    setSaving(true);
    try {
      await saveActionItem({
        id: item?.id,
        clientId,
        meetingId: meetingId || null,
        texto,
        responsavel,
        dataPrazo,
      });
      toast(item ? "Atualizado." : "Action item salvo.");
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
      <h3>{item ? "Editar action item" : "Novo action item"}</h3>
      <div className="form-group">
        <label>Descrição</label>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Descreva a ação..." />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Responsável</label>
          <select value={responsavel} onChange={(e) => setResponsavel(e.target.value)}>
            <option value="Leo">Leo</option>
            <option value="João Pedro">João Pedro</option>
            <option value="Cliente">{clienteNome || "Cliente"}</option>
          </select>
        </div>
        <div className="form-group">
          <label>Data prazo (opcional)</label>
          <input type="date" value={dataPrazo} onChange={(e) => setDataPrazo(e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label>Reunião vinculada (opcional)</label>
        <select value={meetingId} onChange={(e) => setMeetingId(e.target.value)}>
          <option value="">Nenhuma</option>
          {meetings.map((m) => (
            <option key={m.id} value={m.id}>
              {m.titulo} ({parseLocalDate(m.data).toLocaleDateString("pt-BR")})
            </option>
          ))}
        </select>
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
