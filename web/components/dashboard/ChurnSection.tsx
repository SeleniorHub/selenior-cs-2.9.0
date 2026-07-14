"use client";

import { ChurnChart } from "@/components/charts/ChurnChart";
import { usePrivacy } from "@/components/providers/PrivacyProvider";
import { parseLocalDate, parseMoney } from "@/lib/format";
import type { Client } from "@/lib/types";

export function ChurnSection({ clients }: { clients: Client[] }) {
  const privacy = usePrivacy();
  const churned = clients.filter((c) => c.status === "churned");

  if (!churned.length) {
    return (
      <div className="chart-card">
        <div className="chart-title">Análise de churn</div>
        <div className="chart-sub">Volume de saídas por mês e métricas acumuladas.</div>
        <div style={{ fontSize: 13, color: "var(--text-3)", padding: "8px 0" }}>Nenhum churn registrado. ✓</div>
      </div>
    );
  }

  const totalMRRLost = churned.reduce((s, c) => s + parseMoney(c.mrr_bruto), 0);
  const withDates = churned.filter((c) => c.data_inicio && c.data_fim);
  const avgDur = withDates.length
    ? Math.round(
        withDates.reduce((s, c) => {
          const ms =
            (parseLocalDate(c.data_fim!).getFullYear() - parseLocalDate(c.data_inicio!).getFullYear()) * 12 +
            (parseLocalDate(c.data_fim!).getMonth() - parseLocalDate(c.data_inicio!).getMonth());
          return s + Math.max(1, ms);
        }, 0) / withDates.length
      )
    : null;

  const byMonth = new Map<string, { count: number; mrr: number }>();
  churned.forEach((cl) => {
    if (!cl.data_fim) return;
    const k = cl.data_fim.substring(0, 7);
    if (!byMonth.has(k)) byMonth.set(k, { count: 0, mrr: 0 });
    const entry = byMonth.get(k)!;
    entry.count++;
    entry.mrr += parseMoney(cl.mrr_bruto);
  });
  const months = [...byMonth.keys()].sort();
  const labels = months.map((m) => {
    const [y, mo] = m.split("-");
    return new Date(parseInt(y), parseInt(mo) - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
  });

  return (
    <div className="chart-card">
      <div className="chart-title">Análise de churn</div>
      <div className="chart-sub">Volume de saídas por mês e métricas acumuladas.</div>
      <div className="fin-kpi-row">
        <div className="fin-kpi">
          <div className="fin-kpi-val">{churned.length}</div>
          <div className="fin-kpi-lbl">Total churned</div>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-val" style={{ color: "var(--red)" }}>
            -{privacy.val(totalMRRLost)}
          </div>
          <div className="fin-kpi-lbl">MRR perdido</div>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-val">{avgDur ? avgDur + "m" : "—"}</div>
          <div className="fin-kpi-lbl">Duração média</div>
        </div>
      </div>
      <ChurnChart
        labels={labels}
        counts={months.map((m) => byMonth.get(m)!.count)}
        mrrByIndex={months.map((m) => byMonth.get(m)!.mrr)}
        privacyMode={privacy.enabled}
      />
    </div>
  );
}
