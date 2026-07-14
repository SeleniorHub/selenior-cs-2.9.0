"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClientMrrChart } from "@/components/charts/ClientMrrChart";
import { MrrHistoryModal } from "@/components/clients/MrrHistoryModal";
import { usePrivacy } from "@/components/providers/PrivacyProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { deleteMrrHistory } from "@/lib/actions/mrr-history";
import type { MrrHistoryEntry } from "@/lib/types";

export function HistoricoTab({
  clientId,
  history,
  isAdmin,
}: {
  clientId: string;
  history: MrrHistoryEntry[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const privacy = usePrivacy();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MrrHistoryEntry | null>(null);

  const sorted = [...history].sort((a, b) => a.mes.localeCompare(b.mes));

  async function handleDelete(id: string) {
    try {
      await deleteMrrHistory(id, clientId);
      toast("Removido.");
      router.refresh();
    } catch {
      toast("Erro ao remover", true);
    }
  }

  const addBtn = isAdmin && (
    <button
      className="edit-btn"
      style={{ marginBottom: 16 }}
      onClick={() => {
        setEditing(null);
        setModalOpen(true);
      }}
    >
      + Adicionar registro
    </button>
  );

  if (!sorted.length) {
    return (
      <div>
        {addBtn}
        <div className="empty-state">
          <div className="empty-icon">📈</div>
          <div className="empty-title">Sem histórico de MRR</div>
          <div className="empty-sub">
            Registre o MRR mensal deste cliente para visualizar a evolução da receita ao longo do tempo.
          </div>
        </div>
        <MrrHistoryModal
          key={modalOpen ? editing?.id ?? "new" : "closed"}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          clientId={clientId}
          entry={editing}
        />
      </div>
    );
  }

  const labels = sorted.map((h) => {
    const [y, mo] = h.mes.substring(0, 7).split("-");
    return new Date(parseInt(y), parseInt(mo) - 1, 1)
      .toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
      .replace(".", "");
  });
  const data = sorted.map((h) => parseFloat(h.mrr));
  const max = Math.max(...data);
  const trend = data.length > 1 ? data[data.length - 1] - data[data.length - 2] : 0;

  return (
    <div>
      {addBtn}
      <div className="overview-grid">
        <div className="mini-card">
          <div className="mini-title">Evolução de MRR</div>
          <ClientMrrChart labels={labels} data={data} privacyMode={privacy.enabled} />
          {data.length > 1 && (
            <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-3)" }}>
              Variação:{" "}
              <strong style={{ color: trend >= 0 ? "var(--green)" : "var(--red)" }}>
                {trend >= 0 ? "+" : ""}
                {privacy.val(trend)}
              </strong>{" "}
              no último mês · pico {privacy.val(max)}
            </div>
          )}
        </div>
        <div className="mini-card">
          <div className="mini-title">Registros mensais</div>
          <div>
            {sorted.map((h) => (
              <div className="hist-mrr-row" key={h.id}>
                <span className="hist-mrr-mes">{h.mes.substring(0, 7)}</span>
                <span className="hist-mrr-val">{privacy.val(parseFloat(h.mrr))}/mês</span>
                {isAdmin && (
                  <>
                    <button
                      className="hist-mrr-edit"
                      title="Editar"
                      onClick={() => {
                        setEditing(h);
                        setModalOpen(true);
                      }}
                    >
                      ✎
                    </button>
                    <button className="hist-mrr-rm" title="Remover" onClick={() => handleDelete(h.id)}>
                      ✕
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <MrrHistoryModal open={modalOpen} onClose={() => setModalOpen(false)} clientId={clientId} entry={editing} />
    </div>
  );
}
