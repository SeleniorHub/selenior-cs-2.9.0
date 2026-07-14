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
  const [created, setCreated] = useState<{ webhookUrl: string | null; error: string | null } | null>(null);

  function handleClose() {
    setCreated(null);
    setApiKey("");
    onClose();
  }

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
      setCreated({ webhookUrl: result.n8nWebhookUrl, error: result.n8nError });
      router.refresh();
    } catch {
      toast("Erro ao criar conta CRM.", true);
    } finally {
      setSaving(false);
    }
  }

  if (created) {
    return (
      <Modal open={open} onClose={handleClose}>
        <h3>Conta CRM criada</h3>
        {created.error ? (
          <div className="form-group">
            <p>A conta foi salva, mas o workflow do n8n não pôde ser criado automaticamente:</p>
            <p style={{ color: "var(--red)", fontSize: 13 }}>{created.error}</p>
          </div>
        ) : (
          <div className="form-group">
            <label>Cole esta URL no painel de Webhooks do CRM deste cliente</label>
            <input readOnly value={created.webhookUrl ?? ""} onFocus={(e) => e.target.select()} />
          </div>
        )}
        <div className="modal-actions">
          <button className="btn-save" onClick={handleClose}>
            Concluído
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={handleClose}>
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
        <button className="btn-cancel" onClick={handleClose}>
          Cancelar
        </button>
        <button className="btn-save" disabled={saving || clients.length === 0} onClick={handleSave}>
          {saving ? "Criando..." : "Criar conta"}
        </button>
      </div>
    </Modal>
  );
}
