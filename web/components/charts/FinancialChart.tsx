"use client";

import { useRouter } from "next/navigation";
import { Bar } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";
import "@/lib/charts/register";
import { getChartTheme } from "@/lib/charts/theme";
import { calcMRR, fmtMoney } from "@/lib/format";
import type { Client } from "@/lib/types";
import { useTheme } from "@/components/providers/ThemeProvider";

export function FinancialChart({ clients, privacyMode }: { clients: Client[]; privacyMode: boolean }) {
  const router = useRouter();
  const { theme: t } = useTheme();
  const ct = getChartTheme(t);
  const sorted = [...clients].sort((a, b) => calcMRR(b).bruto - calcMRR(a).bruto);

  const liqC = t === "batman" ? "rgba(200,168,75,0.85)" : t === "dark" ? "rgba(96,165,250,0.85)" : "rgba(23,57,93,0.85)";
  const comC = t === "batman" ? "rgba(138,109,53,0.75)" : t === "dark" ? "rgba(251,191,36,0.75)" : "rgba(196,148,23,0.75)";
  const cusC = t === "batman" ? "rgba(138,74,58,0.75)" : t === "dark" ? "rgba(248,113,113,0.75)" : "rgba(139,42,46,0.75)";

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (_evt, els) => {
      if (!els.length) return;
      router.push(`/clientes/${sorted[els[0].index].id}`);
    },
    plugins: {
      legend: {
        position: "top",
        labels: { font: { family: "Clash Display", size: 11.5 }, color: ct.text, padding: 14, usePointStyle: true, pointStyle: "circle", boxWidth: 8, boxHeight: 8 },
      },
      tooltip: {
        backgroundColor: ct.tooltip,
        titleFont: { family: "Clash Display", size: 12 },
        bodyFont: { family: "Clash Display", size: 12 },
        padding: 10,
        cornerRadius: 8,
        callbacks: { label: (item) => (privacyMode ? "  ••••" : `  ${item.dataset.label}: ${fmtMoney(Number(item.raw))}`) },
      },
    },
    scales: {
      x: { grid: { color: ct.grid }, border: { display: false }, ticks: { color: ct.text, font: { family: "Clash Display", size: 11.5 } }, stacked: true },
      y: {
        grid: { color: ct.grid },
        border: { display: false },
        ticks: { color: ct.text, font: { family: "Clash Display", size: 11.5 }, callback: (v) => (privacyMode ? "" : fmtMoney(Number(v))) },
        stacked: true,
      },
    },
  };

  return (
    <div className="chart-canvas" style={{ height: 240 }}>
      <Bar
        data={{
          labels: sorted.map((cl) => cl.nome.split(" ")[0]),
          datasets: [
            { label: "Líquido", data: sorted.map((cl) => calcMRR(cl).liquido), backgroundColor: liqC, borderRadius: 4, stack: "s" },
            { label: "Comissão", data: sorted.map((cl) => calcMRR(cl).comissao), backgroundColor: comC, borderRadius: 0, stack: "s" },
            { label: "Custo", data: sorted.map((cl) => calcMRR(cl).custo), backgroundColor: cusC, borderRadius: 0, stack: "s" },
          ],
        }}
        options={options}
      />
    </div>
  );
}
