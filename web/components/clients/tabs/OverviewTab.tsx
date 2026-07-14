"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { usePrivacy } from "@/components/providers/PrivacyProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { toggleCheckpoint } from "@/lib/actions/clients";
import { calcMRR, calcMesAtual, parseLocalDate } from "@/lib/format";
import type { Client } from "@/lib/types";

function mesStrip(mes: number) {
  const dots = [];
  for (let i = 1; i <= 12; i++) {
    dots.push(<div key={i} className={`mes-dot ${i < mes ? "done" : i === mes ? "cur" : ""}`} title={`Mês ${i}`} />);
  }
  return <div className="mes-strip">{dots}</div>;
}

export function OverviewTab({ client, isAdmin }: { client: Client; isAdmin: boolean }) {
  const privacy = usePrivacy();
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState<string | null>(null);
  const { bruto, comissao, custo, liquido } = calcMRR(client);
  const cps = [...(client.client_checkpoints ?? [])].sort((a, b) => a.ordem - b.ordem);
  const doneCount = cps.filter((c) => c.done).length;

  async function handleToggle(checkpointId: string) {
    if (!isAdmin) return;
    setPending(checkpointId);
    try {
      await toggleCheckpoint(client.id, checkpointId);
      router.refresh();
    } catch {
      toast("Erro ao salvar checkpoint", true);
    } finally {
      setPending(null);
    }
  }

  return (
    <div>
      <div className="overview-grid">
        <div className="mini-card">
          <div className="mini-title">
            Checkpoints ({doneCount}/{cps.length})
          </div>
          {cps.length === 0 ? (
            <span style={{ fontSize: 13, color: "var(--text-3)" }}>Nenhum checkpoint.</span>
          ) : (
            cps.map((cp) => (
              <div
                key={cp.id}
                className="cp-item cp-item-toggle"
                style={isAdmin ? { cursor: pending === cp.id ? "wait" : "pointer", userSelect: "none" } : undefined}
                onClick={() => handleToggle(cp.id)}
              >
                <div className={`cp-check ${cp.done ? "cp-check-done" : ""}`}>
                  {cp.done && (
                    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: 9, height: 9 }}>
                      <polyline points="2 6 5 9 10 3" />
                    </svg>
                  )}
                </div>
                <span className={cp.done ? "cp-done-lbl" : ""}>{cp.texto}</span>
              </div>
            ))
          )}
        </div>
        <div className="mini-card">
          <div className="mini-title">Financeiro</div>
          <div className="kpi-row">
            <div className="kpi">
              <div className="kpi-val">{privacy.val(bruto)}</div>
              <div className="kpi-lbl">MRR bruto</div>
            </div>
            {comissao > 0 && (
              <div className="kpi">
                <div className="kpi-val red">-{privacy.val(comissao)}</div>
                <div className="kpi-lbl">Comissão</div>
              </div>
            )}
            {custo > 0 && (
              <div className="kpi">
                <div className="kpi-val red">-{privacy.val(custo)}</div>
                <div className="kpi-lbl">Custo</div>
              </div>
            )}
            <div className="kpi">
              <div className="kpi-val green">{privacy.val(liquido)}</div>
              <div className="kpi-lbl">Líquido</div>
            </div>
          </div>
          {client.indicador && (
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-3)" }}>
              Indicado por <strong style={{ color: "var(--text-2)" }}>{client.indicador}</strong>
              {client.comissao_valor
                ? " · " + (client.comissao_tipo === "pct" ? client.comissao_valor + "%" : "R$" + client.comissao_valor)
                : ""}
            </div>
          )}
          <div style={{ marginTop: 14 }}>
            <div className="mini-title">Progresso no contrato</div>
            {mesStrip(calcMesAtual(client.data_inicio))}
            {client.data_inicio && (
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6 }}>
                desde {parseLocalDate(client.data_inicio).toLocaleDateString("pt-BR")}
              </div>
            )}
          </div>
        </div>
      </div>
      {client.nota_interna && (
        <div className="section-gap">
          <div className="mini-title">Nota interna</div>
          <div className="note-box">{client.nota_interna}</div>
        </div>
      )}
      {client.depoimento && (
        <div className="section-gap">
          <div className="mini-title">Depoimento</div>
          <div className="depo-box">&quot;{client.depoimento}&quot;</div>
        </div>
      )}
    </div>
  );
}
