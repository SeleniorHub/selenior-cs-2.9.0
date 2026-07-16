import type { MeetingNoShowStats } from "@/lib/data/crm-insights";

export function CrmNoShowCard({ stats }: { stats: MeetingNoShowStats }) {
  if (stats.total === 0) {
    return (
      <div className="chart-card">
        <div className="chart-title">Taxa de no-show de reunião</div>
        <div className="chart-sub">Essa conta não usa o fluxo de reunião do CRM (nenhum negócio com reunião marcada).</div>
      </div>
    );
  }

  const pctRealizadas = (stats.realizadas / stats.total) * 100;
  const pctNoShow = (stats.noShow / stats.total) * 100;

  return (
    <div className="chart-card">
      <div className="chart-title">Taxa de no-show de reunião</div>
      <div className="chart-sub">{stats.total} negócios com reunião marcada no total.</div>
      <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 16 }}>
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            fontFamily: "var(--mono)",
            color: (stats.taxaNoShowPct ?? 0) > 30 ? "var(--red)" : "var(--green)",
            flexShrink: 0,
          }}
        >
          {stats.taxaNoShowPct}%
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", height: 22, borderRadius: 6, overflow: "hidden" }}>
            <div style={{ width: `${pctRealizadas}%`, background: "var(--green)" }} />
            <div style={{ width: `${pctNoShow}%`, background: "var(--red)" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-2)", marginTop: 6 }}>
            <span>{stats.realizadas} realizadas</span>
            <span>{stats.noShow} no-show</span>
          </div>
        </div>
      </div>
    </div>
  );
}
