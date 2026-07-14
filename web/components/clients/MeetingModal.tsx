"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { TextListEditor } from "@/components/ui/TextListEditor";
import { useToast } from "@/components/providers/ToastProvider";
import { saveMeeting } from "@/lib/actions/meetings";
import { toLocalDateString } from "@/lib/format";
import type { Client, Meeting } from "@/lib/types";

function todayStr() {
  return toLocalDateString(new Date());
}

export function MeetingModal({
  open,
  onClose,
  clientId,
  clients,
  meeting,
}: {
  open: boolean;
  onClose: () => void;
  clientId: string | null;
  clients?: Client[];
  meeting: Meeting | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const ativos = (clients ?? []).filter((c) => (c.status || "ativo") === "ativo").sort((a, b) => a.nome.localeCompare(b.nome));

  const [titulo, setTitulo] = useState(meeting?.titulo ?? "");
  const [data, setData] = useState(meeting?.data ?? todayStr());
  const [duracao, setDuracao] = useState(meeting?.duracao ?? "");
  const [participantes, setParticipantes] = useState(meeting?.participantes ?? "");
  const [resumo, setResumo] = useState(meeting?.resumo ?? "");
  const [pontos, setPontos] = useState<string[]>(
    (meeting?.meeting_points ?? []).slice().sort((a, b) => a.ordem - b.ordem).map((p) => p.texto)
  );
  const [selectedClientId, setSelectedClientId] = useState(meeting?.client_id ?? clientId ?? ativos[0]?.id ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!titulo.trim()) {
      toast("Preencha o título.", true);
      return;
    }
    const finalClientId = clientId ?? selectedClientId;
    if (!finalClientId) {
      toast("Selecione um cliente.", true);
      return;
    }
    setSaving(true);
    try {
      await saveMeeting({
        id: meeting?.id,
        clientId: finalClientId,
        data,
        titulo,
        duracao,
        participantes,
        resumo,
        pontos,
      });
      toast("Reunião salva.");
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
      <h3>{meeting ? "Editar reunião" : "Nova reunião"}</h3>
      {!clientId && !meeting && (
        <div className="form-group">
          <label>Cliente</label>
          <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)}>
            {ativos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="form-row">
        <div className="form-group">
          <label>Título</label>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Check-in mensal" />
        </div>
        <div className="form-group">
          <label>Data</label>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Duração</label>
          <input value={duracao} onChange={(e) => setDuracao(e.target.value)} placeholder="Ex: 1h" />
        </div>
        <div className="form-group">
          <label>Participantes</label>
          <input
            value={participantes}
            onChange={(e) => setParticipantes(e.target.value)}
            placeholder="Ex: João + Cliente"
          />
        </div>
      </div>
      <div className="form-group">
        <label>Resumo</label>
        <textarea value={resumo} onChange={(e) => setResumo(e.target.value)} placeholder="Resumo geral da reunião..." />
      </div>
      <div className="form-group">
        <label>Pontos discutidos</label>
        <TextListEditor items={pontos} onChange={setPontos} placeholder="Adicionar ponto e pressionar Enter…" />
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
