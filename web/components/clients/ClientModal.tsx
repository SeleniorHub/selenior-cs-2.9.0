"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { TextListEditor } from "@/components/ui/TextListEditor";
import { useToast } from "@/components/providers/ToastProvider";
import { saveClient } from "@/lib/actions/clients";
import type { Client } from "@/lib/types";

const FASES = ["Onboarding", "Otimização", "Escala", "Consolidação", "Aceleração"];

function formFromClient(client: Client | null) {
  if (!client) {
    return {
      nome: "",
      nicho: "",
      fase: "Onboarding",
      churn: "baixo",
      status: "ativo",
      dataInicio: "",
      dataFim: "",
      mrr: "",
      custo: "",
      indicador: "",
      comissaoVal: "",
      comissaoTipo: "pct",
      checkpoints: [] as string[],
      nota: "",
      depoimento: "",
    };
  }
  return {
    nome: client.nome,
    nicho: client.nicho ?? "",
    fase: client.fase,
    churn: client.churn,
    status: client.status,
    dataInicio: client.data_inicio ?? "",
    dataFim: client.data_fim ?? "",
    mrr: client.mrr_bruto,
    custo: client.custo_mensal,
    indicador: client.indicador ?? "",
    comissaoVal: client.comissao_valor ?? "",
    comissaoTipo: client.comissao_tipo,
    checkpoints: (client.client_checkpoints ?? []).sort((a, b) => a.ordem - b.ordem).map((c) => c.texto),
    nota: client.nota_interna ?? "",
    depoimento: client.depoimento ?? "",
  };
}

export function ClientModal({
  open,
  onClose,
  client,
}: {
  open: boolean;
  onClose: () => void;
  client: Client | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState(() => formFromClient(client));
  const doneItems = (client?.client_checkpoints ?? []).filter((c) => c.done).map((c) => c.texto);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof ReturnType<typeof formFromClient>>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.nome.trim()) {
      toast("Preencha o nome.", true);
      return;
    }
    setSaving(true);
    try {
      await saveClient({ id: client?.id, ...form });
      toast("Salvo com sucesso.");
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
      <h3>{client ? "Editar cliente" : "Novo cliente"}</h3>
      <div className="modal-section">Informações gerais</div>
      <div className="form-row">
        <div className="form-group">
          <label>Nome</label>
          <input value={form.nome} onChange={(e) => set("nome", e.target.value)} />
        </div>
        <div className="form-group">
          <label>Nicho</label>
          <input value={form.nicho} onChange={(e) => set("nicho", e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Fase</label>
          <select value={form.fase} onChange={(e) => set("fase", e.target.value)}>
            {FASES.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Risco de churn</label>
          <select value={form.churn} onChange={(e) => set("churn", e.target.value)}>
            <option value="baixo">Baixo</option>
            <option value="médio">Médio</option>
            <option value="alto">Alto</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Status</label>
          <select value={form.status} onChange={(e) => set("status", e.target.value)}>
            <option value="ativo">Ativo</option>
            <option value="pausado">Pausado</option>
            <option value="churned">Churned</option>
          </select>
        </div>
        {form.status === "churned" && (
          <div className="form-group">
            <label>Data de saída</label>
            <input type="date" value={form.dataFim} onChange={(e) => set("dataFim", e.target.value)} />
          </div>
        )}
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Data de início do contrato</label>
          <input type="date" value={form.dataInicio} onChange={(e) => set("dataInicio", e.target.value)} />
        </div>
        <div className="form-group">
          <label>Valor mensal bruto (R$)</label>
          <input value={form.mrr} onChange={(e) => set("mrr", e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label>Custo mensal do cliente (R$)</label>
        <input
          value={form.custo}
          onChange={(e) => set("custo", e.target.value)}
          placeholder="Ex: 500 — ferramentas, tráfego pago, etc."
        />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Indicado por</label>
          <input value={form.indicador} onChange={(e) => set("indicador", e.target.value)} />
        </div>
        <div className="form-group">
          <label>Comissão</label>
          <input value={form.comissaoVal} onChange={(e) => set("comissaoVal", e.target.value)} placeholder="Ex: 10" />
        </div>
      </div>
      <div className="form-group">
        <label>Tipo de comissão</label>
        <select value={form.comissaoTipo} onChange={(e) => set("comissaoTipo", e.target.value)}>
          <option value="pct">Porcentagem (%)</option>
          <option value="fixo">Valor fixo (R$)</option>
        </select>
      </div>
      <div className="modal-section">Checkpoints</div>
      <div className="form-group">
        <label>Marcos de entrega</label>
        <TextListEditor
          items={form.checkpoints}
          onChange={(items) => set("checkpoints", items)}
          placeholder="Adicionar checkpoint e pressionar Enter…"
          doneItems={doneItems}
        />
        <div className="form-hint">Clique no item no painel do cliente para marcar como concluído.</div>
      </div>
      <div className="modal-section">Observações</div>
      <div className="form-group">
        <label>Nota interna</label>
        <textarea value={form.nota} onChange={(e) => set("nota", e.target.value)} />
      </div>
      <div className="form-group">
        <label>Depoimento</label>
        <textarea value={form.depoimento} onChange={(e) => set("depoimento", e.target.value)} />
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
