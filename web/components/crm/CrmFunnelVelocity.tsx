import type { FunnelStepVelocity } from "@/lib/data/crm-insights";

export function CrmFunnelVelocity({ steps }: { steps: FunnelStepVelocity[] }) {
  if (!steps.length) {
    return (
      <div className="chart-card">
        <div className="chart-title">Velocidade do funil</div>
        <div className="chart-sub">
          Ainda não há transições de etapa suficientes registradas — o rastreamento começou em 14/07/2026, vai
          ficando mais preciso com o tempo.
        </div>
      </div>
    );
  }

  const max = Math.max(...steps.map((s) => s.mediaDias), 1);

  return (
    <div className="chart-card">
      <div className="chart-title">Velocidade do funil</div>
      <div className="chart-sub">
        Tempo médio até um negócio mover pra próxima etapa. Rastreamento começou em 14/07/2026 — etapas com poucas
        amostras (⚠) ainda não são estatisticamente confiáveis.
      </div>
      <div style={{ marginTop: 12 }}>
        {steps.map((s) => (
          <div key={s.stepId} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div
              style={{
                width: 150,
                fontSize: 12,
                color: "var(--text-2)",
                flexShrink: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {s.nome}
            </div>
            <div style={{ flex: 1, background: "var(--surface2)", borderRadius: 6, height: 22, position: "relative", overflow: "hidden" }}>
              <div style={{ width: `${(s.mediaDias / max) * 100}%`, background: "var(--primary)", height: "100%", borderRadius: 6 }} />
            </div>
            <div style={{ width: 100, fontSize: 12, fontFamily: "var(--mono)", textAlign: "right", flexShrink: 0 }}>
              {s.mediaDias.toFixed(1)}d {s.amostras < 3 ? "⚠" : ""} ({s.amostras})
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
