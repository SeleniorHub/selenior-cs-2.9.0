"use client";

import { useMemo, useState } from "react";
import { Chart } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";
import "@/lib/charts/register";
import { getChartTheme, lineColor } from "@/lib/charts/theme";
import { useTheme } from "@/components/providers/ThemeProvider";
import type { DailyAccountMetricRow } from "@/lib/types";

type PeriodType = "dia" | "semana" | "mes";
type MetricField = "novos_leads" | "total_mensagens";

const PERIOD_LABELS: Record<PeriodType, string> = {
  dia: "Ontem × Hoje",
  semana: "Semana passada × Esta semana",
  mes: "Mês passado × Este mês",
};

const METRIC_LABELS: Record<MetricField, string> = {
  novos_leads: "Novos leads",
  total_mensagens: "Interações (mensagens)",
};

function toKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
}

function todayBrasilia(): Date {
  return new Date(`${toKey(new Date())}T12:00:00`);
}

function getRanges(type: PeriodType): { currentDays: string[]; previousDays: string[] } {
  const today = todayBrasilia();

  if (type === "dia") {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return { currentDays: [toKey(today)], previousDays: [toKey(yesterday)] };
  }

  if (type === "semana") {
    const dow = (today.getDay() + 6) % 7; // 0 = segunda
    const currentDays: string[] = [];
    for (let i = 0; i <= dow; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - (dow - i));
      currentDays.push(toKey(d));
    }
    const previousDays = currentDays.map((_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (dow - i) - 7);
      return toKey(d);
    });
    return { currentDays, previousDays };
  }

  const dom = today.getDate();
  const currentDays: string[] = [];
  for (let i = 1; i <= dom; i++) currentDays.push(toKey(new Date(today.getFullYear(), today.getMonth(), i)));
  const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const daysInPrevMonth = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).getDate();
  const previousDays: string[] = [];
  for (let i = 1; i <= Math.min(dom, daysInPrevMonth); i++) {
    previousDays.push(toKey(new Date(prevMonth.getFullYear(), prevMonth.getMonth(), i)));
  }
  return { currentDays, previousDays };
}

function deltaPct(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

function MetricCard({ label, current, previous }: { label: string; current: number; previous: number }) {
  const pct = deltaPct(current, previous);
  const positive = pct >= 0;
  return (
    <div style={{ padding: 14, borderRadius: "var(--radius-md)", background: "var(--surface2)" }}>
      <div style={{ fontSize: 12, color: "var(--text-2)" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "var(--mono)" }}>{current}</div>
      <div style={{ fontSize: 12, color: positive ? "var(--green)" : "var(--red)" }}>
        {positive ? "▲" : "▼"} {Math.abs(pct)}% vs. período anterior ({previous})
      </div>
    </div>
  );
}

export function CrmMetricsComparison({ metrics }: { metrics: DailyAccountMetricRow[] }) {
  const { theme: t } = useTheme();
  const ct = getChartTheme(t);
  const lc = lineColor(t);
  const [period, setPeriod] = useState<PeriodType>("semana");
  const [metric, setMetric] = useState<MetricField>("novos_leads");

  const byDate = useMemo(() => {
    const m = new Map<string, DailyAccountMetricRow>();
    for (const row of metrics) m.set(row.data, row);
    return m;
  }, [metrics]);

  const { currentDays, previousDays } = useMemo(() => getRanges(period), [period]);

  const sums = useMemo(() => {
    const sum = (days: string[], field: MetricField) => days.reduce((s, d) => s + (byDate.get(d)?.[field] ?? 0), 0);
    return {
      leadsCurrent: sum(currentDays, "novos_leads"),
      leadsPrevious: sum(previousDays, "novos_leads"),
      msgsCurrent: sum(currentDays, "total_mensagens"),
      msgsPrevious: sum(previousDays, "total_mensagens"),
    };
  }, [byDate, currentDays, previousDays]);

  const dayLabels = currentDays.map((_, i) => `Dia ${i + 1}`);

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top", labels: { font: { family: "Clash Display", size: 11.5 }, color: ct.text, usePointStyle: true, pointStyle: "circle", boxWidth: 8, boxHeight: 8 } },
      tooltip: { backgroundColor: ct.tooltip, titleFont: { family: "Clash Display", size: 12 }, bodyFont: { family: "Clash Display", size: 12 }, padding: 12, cornerRadius: 8 },
    },
    scales: {
      x: { grid: { color: ct.grid }, border: { display: false }, ticks: { color: ct.text, font: { family: "Clash Display", size: 11 } } },
      y: { grid: { color: ct.grid }, border: { display: false }, ticks: { color: ct.text, font: { family: "Clash Display", size: 11 } } },
    },
  };

  return (
    <div className="chart-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div className="chart-title">Comparação de períodos</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(Object.keys(PERIOD_LABELS) as PeriodType[]).map((k) => (
            <button key={k} className={`filter-btn${period === k ? " active" : ""}`} onClick={() => setPeriod(k)}>
              {PERIOD_LABELS[k]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, margin: "16px 0" }}>
        <MetricCard label="Novos leads" current={sums.leadsCurrent} previous={sums.leadsPrevious} />
        <MetricCard label="Interações (mensagens)" current={sums.msgsCurrent} previous={sums.msgsPrevious} />
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {(Object.keys(METRIC_LABELS) as MetricField[]).map((k) => (
          <button key={k} className={`filter-btn${metric === k ? " active" : ""}`} onClick={() => setMetric(k)}>
            {METRIC_LABELS[k]}
          </button>
        ))}
      </div>

      <div className="chart-canvas">
        <Chart
          type="line"
          data={{
            labels: dayLabels,
            datasets: [
              {
                label: "Período atual",
                data: currentDays.map((d) => byDate.get(d)?.[metric] ?? 0),
                borderColor: lc,
                backgroundColor: "transparent",
                tension: 0.3,
                borderWidth: 2.5,
                pointRadius: 3,
              },
              {
                label: "Período anterior",
                data: previousDays.map((d) => byDate.get(d)?.[metric] ?? 0),
                borderColor: ct.text,
                backgroundColor: "transparent",
                borderDash: [5, 5],
                tension: 0.3,
                borderWidth: 2,
                pointRadius: 3,
              },
            ],
          }}
          options={options}
        />
      </div>
    </div>
  );
}
