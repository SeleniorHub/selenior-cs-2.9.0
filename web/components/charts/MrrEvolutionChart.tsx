"use client";

import { useMemo } from "react";
import { Chart } from "react-chartjs-2";
import type { ChartOptions, Plugin } from "chart.js";
import "@/lib/charts/register";
import { getChartTheme, lineColor } from "@/lib/charts/theme";
import { fmtMoney } from "@/lib/format";
import { useTheme } from "@/components/providers/ThemeProvider";

export function MrrEvolutionChart({
  labels,
  total,
  novos,
  churn,
  privacyMode,
}: {
  labels: string[];
  total: number[];
  novos: number[];
  churn: (number | null)[];
  privacyMode: boolean;
}) {
  const { theme: t } = useTheme();
  const ct = getChartTheme(t);
  const lc = lineColor(t);
  const newC = t === "batman" ? "rgba(107,122,74,0.75)" : t === "dark" ? "rgba(52,211,153,0.75)" : "rgba(45,106,79,0.75)";
  const churnC = t === "batman" ? "rgba(138,74,58,0.75)" : t === "dark" ? "rgba(248,113,113,0.75)" : "rgba(139,42,46,0.75)";

  const gradPlugin: Plugin = useMemo(
    () => ({
      id: "mrrEvolGrad",
      beforeRender(chart) {
        const { ctx: c, chartArea: ca } = chart;
        if (!ca) return;
        const g = c.createLinearGradient(0, ca.top, 0, ca.bottom);
        if (t === "batman") {
          g.addColorStop(0, "rgba(200,168,75,0.18)");
          g.addColorStop(1, "rgba(200,168,75,0)");
        } else if (t === "dark") {
          g.addColorStop(0, "rgba(96,165,250,0.18)");
          g.addColorStop(1, "rgba(96,165,250,0)");
        } else {
          g.addColorStop(0, "rgba(23,57,93,0.14)");
          g.addColorStop(1, "rgba(23,57,93,0)");
        }
        chart.data.datasets[0].backgroundColor = g;
      },
    }),
    [t]
  );

  const options: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: { font: { family: "Clash Display", size: 11.5 }, color: ct.text, padding: 16, usePointStyle: true, pointStyle: "circle", boxWidth: 8, boxHeight: 8 },
      },
      tooltip: {
        backgroundColor: ct.tooltip,
        titleFont: { family: "Clash Display", size: 12 },
        bodyFont: { family: "Clash Display", size: 12 },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (item) => (privacyMode ? "  ••••" : `  ${item.dataset.label}: ${fmtMoney(Math.abs(Number(item.raw) || 0))}/mês`),
        },
      },
    },
    scales: {
      x: { grid: { color: ct.grid }, border: { display: false }, ticks: { color: ct.text, font: { family: "Clash Display", size: 11.5 } } },
      y: {
        grid: { color: ct.grid },
        border: { display: false },
        ticks: { color: ct.text, font: { family: "Clash Display", size: 11.5 }, callback: (v) => (privacyMode ? "" : fmtMoney(Math.abs(Number(v)))) },
      },
    },
  };

  return (
    <div className="chart-canvas">
      <Chart
        type="bar"
        data={{
          labels,
          datasets: [
            {
              type: "line" as const,
              label: "MRR Total",
              data: total,
              borderColor: lc,
              backgroundColor: "transparent",
              fill: true,
              tension: 0.35,
              pointBackgroundColor: lc,
              pointBorderColor: ct.border,
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 8,
              borderWidth: 2.5,
              order: 0,
            },
            { type: "bar" as const, label: "Novos", data: novos, backgroundColor: newC, borderRadius: 4, order: 1, barPercentage: 0.55 },
            { type: "bar" as const, label: "Churn", data: churn, backgroundColor: churnC, borderRadius: 4, order: 1, barPercentage: 0.55 },
          ],
        }}
        options={options}
        plugins={[gradPlugin]}
      />
    </div>
  );
}
