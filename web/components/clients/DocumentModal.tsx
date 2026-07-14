"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/providers/ToastProvider";
import { uploadDocument } from "@/lib/actions/documents";

const TIPOS = [
  { value: "briefing", label: "Briefing" },
  { value: "contrato", label: "Contrato" },
  { value: "qbr", label: "QBR / Relatório" },
  { value: "apresentacao", label: "Apresentação" },
  { value: "gravacao", label: "Gravação" },
  { value: "outro", label: "Outro" },
];

export function DocumentModal({
  open,
  onClose,
  clientId,
}: {
  open: boolean;
  onClose: () => void;
  clientId: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [tipo, setTipo] = useState("briefing");
  const [nome, setNome] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  function handleFileChange() {
    const file = fileRef.current?.files?.[0];
    if (file && !nome.trim()) setNome(file.name);
  }

  async function handleSave() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast("Selecione um arquivo.", true);
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.set("clientId", clientId);
      formData.set("tipo", tipo);
      formData.set("nome", nome.trim() || file.name);
      formData.set("file", file);
      await uploadDocument(formData);
      toast("Documento salvo.");
      setNome("");
      if (fileRef.current) fileRef.current.value = "";
      onClose();
      router.refresh();
    } catch (e) {
      toast("Erro ao enviar: " + (e instanceof Error ? e.message : ""), true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <h3>Novo documento</h3>
      <div className="form-row">
        <div className="form-group">
          <label>Tipo</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Nome</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do arquivo" />
        </div>
      </div>
      <div className="form-group">
        <label>Arquivo</label>
        <input ref={fileRef} type="file" onChange={handleFileChange} />
      </div>
      <div className="form-hint">Máximo recomendado: ~20MB.</div>
      <div className="modal-actions">
        <button className="btn-cancel" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn-save" disabled={saving} onClick={handleSave}>
          {saving ? "Enviando..." : "Upload"}
        </button>
      </div>
    </Modal>
  );
}
