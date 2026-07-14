"use client";

import { FinancialChart } from "@/components/charts/FinancialChart";
import { usePrivacy } from "@/components/providers/PrivacyProvider";
import { activeClients, calcMRR } from "@/lib/format";
import type { Client } from "@/lib/types";

export function FinancialSection({ clients }: { clients: Client[] }) {
  const privacy = usePrivacy();
  const ativos = activeClients(clients);
  let totalBruto = 0,
    totalCusto = 0,
    totalComissao = 0;
  ativos.forEach((cl) => {
    const { bruto, custo, comissao } = calcMRR(cl);
    totalBruto += bruto;
    totalCusto += custo;
    totalComissao += comissao;
  });
  const totalDed = totalCusto + totalComissao;
  const margem = totalBruto - totalDed;
  const pct = totalBruto > 0 ? Math.round((margem / totalBruto) * 100) : 0;

  return (
    <div className="chart-card">
      <div className="chart-title">Financeiro</div>
      <div className="chart-sub">Margem bruta da operação e composição de receita por cliente. Clique na barra para abrir o cliente.</div>
      <div className="fin-kpi-row">
        <div className="fin-kpi">
          <div className="fin-kpi-val">{privacy.val(totalBruto)}</div>
          <div className="fin-kpi-lbl">Receita bruta</div>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-val" style={{ color: "var(--red)" }}>
            -{privacy.val(totalDed)}
          </div>
          <div className="fin-kpi-lbl">Custos + comissões</div>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-val" style={{ color: "var(--green)" }}>
            {privacy.val(margem)}
          </div>
          <div className="fin-kpi-lbl">Margem bruta</div>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-val" style={{ color: pct >= 70 ? "var(--green)" : pct >= 50 ? "var(--amber)" : "var(--red)" }}>
            {privacy.enabled ? "••" : pct + "%"}
          </div>
          <div className="fin-kpi-lbl">% margem</div>
        </div>
      </div>
      {ativos.length > 0 && <FinancialChart clients={ativos} privacyMode={privacy.enabled} />}
    </div>
  );
}
