import type { TagBreakdownItem } from "@/lib/data/crm-insights";

export function CrmTagBreakdown({ tags }: { tags: TagBreakdownItem[] }) {
  if (!tags.length) {
    return (
      <div className="chart-card">
        <div className="chart-title">Origem dos negócios (por tag)</div>
        <div className="chart-sub">Nenhum negócio com tag registrada.</div>
      </div>
    );
  }

  const max = Math.max(...tags.map((t) => t.negocios), 1);

  return (
    <div className="chart-card">
      <div className="chart-title">Origem dos negócios (por tag)</div>
      <div className="chart-sub">
        Tags do contato de cada negócio — mistura origem de lead (ex: META, Indicação) com marcações operacionais do
        time. Um negócio pode ter mais de uma tag.
      </div>
      <div style={{ marginTop: 12 }}>
        {tags.map((t) => (
          <div key={t.nome} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
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
              {t.nome}
            </div>
            <div style={{ flex: 1, background: "var(--surface2)", borderRadius: 6, height: 22, position: "relative", overflow: "hidden" }}>
              <div
                style={{
                  width: `${(t.negocios / max) * 100}%`,
                  background: t.cor || "var(--primary)",
                  height: "100%",
                  borderRadius: 6,
                }}
              />
            </div>
            <div style={{ width: 28, fontSize: 12, fontFamily: "var(--mono)", textAlign: "right", flexShrink: 0 }}>{t.negocios}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
