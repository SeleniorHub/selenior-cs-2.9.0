"use client";

import type { ChartOptions } from "chart.js";
import { Bar } from "react-chartjs-2";
import "@/lib/charts/register";
import { getChartTheme } from "@/lib/charts/theme";
import { fmtMoney } from "@/lib/format";
import { useTheme } from "@/components/providers/ThemeProvider";

export function ChurnChart({
  labels,
  counts,
  mrrByIndex,
  privacyMode,
}: {
  labels: string[];
  counts: number[];
  mrrByIndex: number[];
  privacyMode: boolean;
}) {
  const { theme: t } = useTheme();
  const ct = getChartTheme(t);
  const barC = t === "batman" ? "rgba(138,74,58,0.8)" : t === "dark" ? "rgba(248,113,113,0.8)" : "rgba(139,42,46,0.8)";

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: ct.tooltip,
        titleFont: { family: "Clash Display", size: 12 },
        bodyFont: { family: "Clash Display", size: 12 },
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (item) =>
            privacyMode
              ? `  ${item.raw} cliente${item.raw === 1 ? "" : "s"} · ••••`
              : `  ${item.raw} cliente${item.raw === 1 ? "" : "s"} · ${fmtMoney(mrrByIndex[item.dataIndex])} perdidos`,
        },
      },
    },
    scales: {
      x: { grid: { color: ct.grid }, border: { display: false }, ticks: { color: ct.text, font: { family: "Clash Display", size: 11.5 } } },
      y: { grid: { color: ct.grid }, border: { display: false }, ticks: { color: ct.text, font: { family: "Clash Display", size: 11.5 }, stepSize: 1 } },
    },
  };

  return (
    <div className="chart-canvas">
      <Bar data={{ labels, datasets: [{ label: "Churns", data: counts, backgroundColor: barC, borderRadius: 5 }] }} options={options} />
    </div>
  );
}
