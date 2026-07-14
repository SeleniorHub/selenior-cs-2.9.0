"use client";

import { useRouter } from "next/navigation";
import { activeClients } from "@/lib/format";
import type { Client, Meeting } from "@/lib/types";
import { useTheme } from "@/components/providers/ThemeProvider";

export function EngagementHeatmap({ clients, meetings }: { clients: Client[]; meetings: Meeting[] }) {
  const router = useRouter();
  const { theme } = useTheme();

  const ativos = activeClients(clients);
  if (!ativos.length) return <div className="empty-state">Sem clientes ativos.</div>;

  const now = new Date();
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"));
  }
  const labels = months.map((m) => {
    const [y, mo] = m.split("-");
    return new Date(parseInt(y), parseInt(mo) - 1, 1).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  });

  const baseRGB = theme === "batman" ? "200,168,75" : theme === "dark" ? "96,165,250" : "23,57,93";
  const surfRGB = theme === "batman" ? "12,12,16" : theme === "dark" ? "13,17,23" : "243,243,238";

  const data = ativos
    .map((cl) => ({
      cl,
      counts: months.map((m) => meetings.filter((r) => r.client_id === cl.id && r.data && r.data.substring(0, 7) === m).length),
    }))
    .sort((a, b) => b.counts.reduce((s, c) => s + c, 0) - a.counts.reduce((s, c) => s + c, 0));
  const max = Math.max(...data.flatMap((d) => d.counts), 1);

  return (
    <div className="heatmap-wrap">
      <div className="heatmap-header">
        <div className="heatmap-row-label" />
        {labels.map((l, i) => (
          <div className="heatmap-col-label" key={i}>
            {l}
          </div>
        ))}
      </div>
      {data.map(({ cl, counts }) => (
        <div className="heatmap-row" key={cl.id} onClick={() => router.push(`/clientes/${cl.id}`)}>
          <div className="heatmap-row-label" title={cl.nome}>
            {cl.nome.split(" ")[0]}
          </div>
          {counts.map((c, i) => {
            const alpha = c === 0 ? 0 : 0.12 + Math.min(1, c / max) * 0.75;
            const bg = c === 0 ? `rgb(${surfRGB})` : `rgba(${baseRGB},${alpha.toFixed(2)})`;
            return (
              <div className="heatmap-cell" key={i} title={`${c} reunião${c === 1 ? "" : "ões"}`} style={{ background: bg }}>
                {c || ""}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
