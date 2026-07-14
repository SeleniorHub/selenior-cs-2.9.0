"use client";

import { usePrivacy } from "@/components/providers/PrivacyProvider";
import { activeClients, calcMRR } from "@/lib/format";
import type { Client } from "@/lib/types";

export function Kpis({ clients }: { clients: Client[] }) {
  const privacy = usePrivacy();
  const ativos = activeClients(clients);
  const churned = clients.filter((c) => c.status === "churned");
  let mrrB = 0,
    mrrL = 0;
  ativos.forEach((cl) => {
    const { bruto, liquido } = calcMRR(cl);
    mrrB += bruto;
    mrrL += liquido;
  });
  const riscoAlto = ativos.filter((c) => c.churn === "alto").length;
  const pctRisco = ativos.length ? Math.round((riscoAlto / ativos.length) * 100) : 0;
  const pctLiquido = mrrB > 0 ? Math.round((mrrL / mrrB) * 100) : 100;

  return (
    <div className="kpi-grid">
      <div className="metric">
        <div className="metric-label">Clientes ativos</div>
        <div className="metric-value">{ativos.length}</div>
        <div className="metric-sub">
          {churned.length ? (
            <span style={{ color: "var(--red)" }}>↓ {churned.length} churned</span>
          ) : (
            "nenhum churn registrado"
          )}
        </div>
      </div>
      <div className="metric">
        <div className="metric-label">MRR bruto</div>
        <div className="metric-value">{privacy.val(mrrB)}</div>
        <div className="metric-sub">receita mensal total</div>
      </div>
      <div className="metric metric-success">
        <div className="metric-label">MRR líquido</div>
        <div className="metric-value">{privacy.val(mrrL)}</div>
        <div className="metric-sub">
          {mrrB > mrrL ? (
            <>
              <span style={{ color: "var(--text-3)" }}>-{privacy.val(mrrB - mrrL)}</span> em deduções ·{" "}
              {privacy.enabled ? "••" : pctLiquido + "%"} do bruto
            </>
          ) : (
            "sem deduções"
          )}
        </div>
      </div>
      <div className={`metric${riscoAlto > 0 ? " metric-danger" : ""}`}>
        <div className="metric-label">Em risco alto</div>
        <div className="metric-value">{riscoAlto}</div>
        <div className="metric-sub">
          <span style={{ color: riscoAlto > 0 ? "var(--red)" : "var(--green)" }}>{pctRisco}%</span> da base ativa
        </div>
      </div>
    </div>
  );
}
