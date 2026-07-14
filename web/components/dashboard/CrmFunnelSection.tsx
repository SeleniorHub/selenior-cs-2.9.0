"use client";

import { fmtMoney } from "@/lib/format";
import type { CrmDealRow, CrmPipelineRow, CrmPipelineStepRow } from "@/lib/types";

export function CrmFunnelSection({
  pipelines,
  steps,
  deals,
}: {
  pipelines: CrmPipelineRow[];
  steps: CrmPipelineStepRow[];
  deals: CrmDealRow[];
}) {
  if (!pipelines.length) {
    return (
      <div className="chart-card">
        <div className="chart-title">Funil de vendas (CRM)</div>
        <div className="chart-sub">Ainda não sincronizado com o CRM Selenior Hub.</div>
      </div>
    );
  }

  const dealCountByPipeline = new Map<string, number>();
  deals.forEach((d) => {
    if (!d.pipeline_id) return;
    dealCountByPipeline.set(d.pipeline_id, (dealCountByPipeline.get(d.pipeline_id) ?? 0) + 1);
  });
  const mainPipeline =
    [...pipelines].sort((a, b) => (dealCountByPipeline.get(b.id) ?? 0) - (dealCountByPipeline.get(a.id) ?? 0))[0] ??
    pipelines[0];

  const pipelineSteps = steps.filter((s) => s.pipeline_id === mainPipeline.id).sort((a, b) => a.ordem - b.ordem);
  const dealsInPipeline = deals.filter((d) => d.pipeline_id === mainPipeline.id);
  const total = dealsInPipeline.length;
  const max = Math.max(1, ...pipelineSteps.map((s) => dealsInPipeline.filter((d) => d.step_id === s.id).length));
  const totalValor = dealsInPipeline.reduce((s, d) => s + (parseFloat(d.valor ?? "0") || 0), 0);

  return (
    <div className="chart-card">
      <div className="chart-title">Funil de vendas — {mainPipeline.nome}</div>
      <div className="chart-sub">
        {total} negócio{total === 1 ? "" : "s"} em aberto · {fmtMoney(totalValor)} em pipeline · sincronizado via CRM Selenior Hub
      </div>
      <div>
        {pipelineSteps.map((s) => {
          const count = dealsInPipeline.filter((d) => d.step_id === s.id).length;
          const pct = Math.round((count / max) * 100);
          return (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 150, fontSize: 12, color: "var(--text-2)", flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {s.nome}
              </div>
              <div style={{ flex: 1, background: "var(--surface2)", borderRadius: 6, height: 22, position: "relative", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${pct}%`,
                    background: s.is_won ? "var(--green)" : s.is_lost ? "var(--red)" : "var(--primary)",
                    height: "100%",
                    borderRadius: 6,
                    transition: "width 0.3s",
                  }}
                />
              </div>
              <div style={{ width: 28, fontSize: 12, fontFamily: "var(--mono)", color: "var(--text)", textAlign: "right", flexShrink: 0 }}>
                {count}
              </div>
            </div>
          );
        })}
        {pipelineSteps.length === 0 && <div className="empty-state">Sem etapas sincronizadas para este pipeline.</div>}
      </div>
    </div>
  );
}
