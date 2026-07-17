import type { UnreadTicketsSummary } from "@/lib/data/crm-insights";

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days === 0) return "hoje";
  if (days === 1) return "há 1 dia";
  if (days < 30) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  return months === 1 ? "há 1 mês" : `há ${months} meses`;
}

export function CrmUnreadAlert({ summary }: { summary: UnreadTicketsSummary }) {
  if (summary.conversas === 0) {
    return (
      <div className="chart-card">
        <div className="chart-title">Atendimento negligenciado</div>
        <div className="chart-sub">Nenhuma conversa com mensagem não lida no momento. 🎉</div>
      </div>
    );
  }

  return (
    <div className="chart-card">
      <div className="chart-title">Atendimento negligenciado</div>
      <div className="chart-sub">
        {summary.conversas} conversa{summary.conversas === 1 ? "" : "s"} com mensagem não lida · {summary.totalNaoLidas}{" "}
        mensagens no total.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
        {summary.itens.map((item) => (
          <div
            key={item.crmTicketId}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: "8px 12px",
              borderRadius: "var(--radius-md)",
              background: "var(--surface2)",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {item.contactNome || "Sem nome"}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-2)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 280,
                }}
              >
                {item.lastMessage || "—"} · {relativeTime(item.lastMessageHour)}
              </div>
            </div>
            <div
              style={{
                flexShrink: 0,
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "var(--mono)",
                color: "var(--red)",
                background: "var(--surface)",
                borderRadius: "var(--radius-pill)",
                padding: "3px 9px",
              }}
            >
              {item.unreadMessages}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
