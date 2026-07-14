"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/providers/ToastProvider";
import { addCrmAccount } from "@/lib/actions/crm-accounts";

export function AddCrmAccountModal({
  open,
  onClose,
  clients,
}: {
  open: boolean;
  onClose: () => void;
  clients: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!clientId) {
      toast("Selecione um cliente.", true);
      return;
    }
    if (!apiKey.trim()) {
      toast("Cole a chave de API.", true);
      return;
    }
    setSaving(true);
    try {
      const result = await addCrmAccount({ clientId, apiKey });
      if (result.n8nError) {
        toast(`Conta criada, mas o workflow do n8n falhou: ${result.n8nError}`, true);
      } else {
        toast("Conta CRM criada e workflow do n8n ativado.");
      }
      onClose();
      router.refresh();
    } catch {
      toast("Erro ao criar conta CRM.", true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <h3>Nova conta CRM</h3>
      {clients.length === 0 ? (
        <div className="empty-state">
          <div className="empty-sub">Todos os clientes já têm conta CRM vinculada.</div>
        </div>
      ) : (
        <>
          <div className="form-group">
            <label>Cliente</label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Chave de API do CRM Oráculo</label>
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Cole a chave gerada no CRM deste cliente"
              autoComplete="off"
            />
          </div>
        </>
      )}
      <div className="modal-actions">
        <button className="btn-cancel" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn-save" disabled={saving || clients.length === 0} onClick={handleSave}>
          {saving ? "Criando..." : "Criar conta"}
        </button>
      </div>
    </Modal>
  );
}
