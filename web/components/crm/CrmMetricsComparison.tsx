"use client";

import { useMemo, useState } from "react";
import { Chart } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";
import "@/lib/charts/register";
import { getChartTheme, lineColor } from "@/lib/charts/theme";
import { useTheme } from "@/components/providers/ThemeProvider";
import { DateRangeCalendar } from "@/components/crm/DateRangeCalendar";
import { PERIOD_LABELS, brLabel, getRanges, lastNDays, toKey, todayBrasilia, type PeriodType } from "@/lib/crm/period-ranges";
import type { DailyAccountMetricRow } from "@/lib/types";

type MetricField = "novos_leads" | "interacoes";

const METRIC_LABELS: Record<MetricField, string> = {
  novos_leads: "Novos leads",
  interacoes: "Interações (conversas)",
};

function deltaPct(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

function isoWeekKey(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  const dow = (d.getDay() + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - dow);
  return toKey(monday);
}

function brShortLabel(dateStr: string): string {
  const [, m, day] = dateStr.split("-");
  return `${day}/${m}`;
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  return (
    <div style={{ width: 72, height: 32, flexShrink: 0 }}>
      <Chart
        type="line"
        data={{
          labels: data.map((_, i) => i),
          datasets: [{ data, borderColor: color, backgroundColor: "transparent", borderWidth: 1.75, pointRadius: 0, tension: 0.35 }],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          scales: { x: { display: false }, y: { display: false } },
        }}
      />
    </div>
  );
}

function MetricCard({
  label,
  current,
  previous,
  sparklineData,
  color,
}: {
  label: string;
  current: number;
  previous: number;
  sparklineData: number[];
  color: string;
}) {
  const pct = deltaPct(current, previous);
  const positive = pct >= 0;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: 14, borderRadius: "var(--radius-md)", background: "var(--surface2)" }}>
      <div>
        <div style={{ fontSize: 12, color: "var(--text-2)" }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "var(--mono)" }}>{current}</div>
        <div style={{ fontSize: 12, color: positive ? "var(--green)" : "var(--red)" }}>
          {positive ? "▲" : "▼"} {Math.abs(pct)}% vs. anterior ({previous})
        </div>
      </div>
      <Sparkline data={sparklineData} color={color} />
    </div>
  );
}

export function CrmMetricsComparison({ metrics }: { metrics: DailyAccountMetricRow[] }) {
  const { theme: t } = useTheme();
  const ct = getChartTheme(t);
  const lc = lineColor(t);
  const [period, setPeriod] = useState<PeriodType>("semana");
  const [metric, setMetric] = useState<MetricField>("novos_leads");
  const [showHistorico, setShowHistorico] = useState(false);
  const [customRange, setCustomRange] = useState<{ start: string; end: string } | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const byDate = useMemo(() => {
    const m = new Map<string, DailyAccountMetricRow>();
    for (const row of metrics) m.set(row.data, row);
    return m;
  }, [metrics]);

  const { currentDays, previousDays } = useMemo(() => getRanges(period, customRange), [period, customRange]);

  const sums = useMemo(() => {
    const sum = (days: string[], field: MetricField) => days.reduce((s, d) => s + (byDate.get(d)?.[field] ?? 0), 0);
    return {
      leadsCurrent: sum(currentDays, "novos_leads"),
      leadsPrevious: sum(previousDays, "novos_leads"),
      interCurrent: sum(currentDays, "interacoes"),
      interPrevious: sum(previousDays, "interacoes"),
    };
  }, [byDate, currentDays, previousDays]);

  const last30 = useMemo(() => lastNDays(todayBrasilia(), 30), []);
  const sparkLeads = useMemo(() => last30.map((d) => byDate.get(d)?.novos_leads ?? 0), [last30, byDate]);
  const sparkInter = useMemo(() => last30.map((d) => byDate.get(d)?.interacoes ?? 0), [last30, byDate]);

  const weeklyHistory = useMemo(() => {
    const byWeek = new Map<string, number>();
    for (const row of metrics) {
      const wk = isoWeekKey(row.data);
      byWeek.set(wk, (byWeek.get(wk) ?? 0) + row[metric]);
    }
    return [...byWeek.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  }, [metrics, metric]);

  const dayLabels =
    period === "personalizado" ? currentDays.map((d) => brLabel(d)) : currentDays.map((_, i) => `Dia ${i + 1}`);

  const comparisonOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top", labels: { font: { family: "Clash Display", size: 11.5 }, color: ct.text, usePointStyle: true, pointStyle: "circle", boxWidth: 8, boxHeight: 8 } },
      tooltip: { backgroundColor: ct.tooltip, titleFont: { family: "Clash Display", size: 12 }, bodyFont: { family: "Clash Display", size: 12 }, padding: 12, cornerRadius: 8 },
    },
    scales: {
      x: { grid: { color: ct.grid }, border: { display: false }, ticks: { color: ct.text, font: { family: "Clash Display", size: 11 }, maxTicksLimit: 12 } },
      y: { grid: { color: ct.grid }, border: { display: false }, ticks: { color: ct.text, font: { family: "Clash Display", size: 11 } } },
    },
  };

  const historyOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: ct.tooltip, titleFont: { family: "Clash Display", size: 12 }, bodyFont: { family: "Clash Display", size: 12 }, padding: 12, cornerRadius: 8 },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: ct.text, font: { family: "Clash Display", size: 11 } } },
      y: { grid: { color: ct.grid }, border: { display: false }, ticks: { color: ct.text, font: { family: "Clash Display", size: 11 } } },
    },
  };

  return (
    <div className="chart-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div className="chart-title">Comparação de períodos</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(Object.keys(PERIOD_LABELS) as Exclude<PeriodType, "personalizado">[]).map((k) => (
            <button
              key={k}
              className={`filter-btn${period === k ? " active" : ""}`}
              onClick={() => {
                setPeriod(k);
                setCustomRange(null);
              }}
            >
              {PERIOD_LABELS[k]}
            </button>
          ))}
          <button
            className={`filter-btn${period === "personalizado" ? " active" : ""}`}
            onClick={() => setCalendarOpen(true)}
          >
            📅 {period === "personalizado" && customRange ? `${brLabel(customRange.start)} → ${brLabel(customRange.end)}` : "Período personalizado"}
          </button>
        </div>
      </div>

      <DateRangeCalendar
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        initialStart={customRange?.start}
        initialEnd={customRange?.end}
        onApply={(start, end) => {
          setCustomRange({ start, end });
          setPeriod("personalizado");
        }}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, margin: "16px 0" }}>
        <MetricCard label="Novos leads" current={sums.leadsCurrent} previous={sums.leadsPrevious} sparklineData={sparkLeads} color={lc} />
        <MetricCard label="Interações (conversas)" current={sums.interCurrent} previous={sums.interPrevious} sparklineData={sparkInter} color={lc} />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {(Object.keys(METRIC_LABELS) as MetricField[]).map((k) => (
            <button key={k} className={`filter-btn${metric === k ? " active" : ""}`} onClick={() => setMetric(k)}>
              {METRIC_LABELS[k]}
            </button>
          ))}
        </div>
        <button className={`filter-btn${showHistorico ? " active" : ""}`} onClick={() => setShowHistorico((v) => !v)}>
          {showHistorico ? "Ver comparação" : "Ver histórico completo"}
        </button>
      </div>

      {!showHistorico ? (
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
            options={comparisonOptions}
          />
        </div>
      ) : (
        <div className="chart-canvas">
          <Chart
            type="bar"
            data={{
              labels: weeklyHistory.map(([wk]) => `sem ${brShortLabel(wk)}`),
              datasets: [{ label: METRIC_LABELS[metric], data: weeklyHistory.map(([, v]) => v), backgroundColor: lc, borderRadius: 4, barPercentage: 0.6 }],
            }}
            options={historyOptions}
          />
        </div>
      )}
    </div>
  );
}
