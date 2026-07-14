"use client";

import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import type { ChartOptions, Plugin } from "chart.js";
import "@/lib/charts/register";
import { getChartTheme, lineColor } from "@/lib/charts/theme";
import { fmtMoney } from "@/lib/format";
import { useTheme } from "@/components/providers/ThemeProvider";

export function ClientMrrChart({ labels, data, privacyMode }: { labels: string[]; data: number[]; privacyMode: boolean }) {
  const { theme: t } = useTheme();
  const ct = getChartTheme(t);
  const lc = lineColor(t);

  const gradPlugin: Plugin<"line"> = useMemo(
    () => ({
      id: "clientMRRGrad",
      beforeRender(chart) {
        const { ctx: c, chartArea: ca } = chart;
        if (!ca) return;
        const g = c.createLinearGradient(0, ca.top, 0, ca.bottom);
        if (t === "batman") {
          g.addColorStop(0, "rgba(200,168,75,0.2)");
          g.addColorStop(1, "rgba(200,168,75,0)");
        } else if (t === "dark") {
          g.addColorStop(0, "rgba(96,165,250,0.2)");
          g.addColorStop(1, "rgba(96,165,250,0)");
        } else {
          g.addColorStop(0, "rgba(23,57,93,0.15)");
          g.addColorStop(1, "rgba(23,57,93,0)");
        }
        chart.data.datasets[0].backgroundColor = g;
      },
    }),
    [t]
  );

  const options: ChartOptions<"line"> = {
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
          label: (item) => (privacyMode ? "  ••••" : `  MRR: ${fmtMoney(Number(item.raw))}/mês`),
        },
      },
    },
    scales: {
      x: { grid: { color: ct.grid }, border: { display: false }, ticks: { color: ct.text, font: { family: "Clash Display", size: 11 } } },
      y: {
        grid: { color: ct.grid },
        border: { display: false },
        ticks: {
          color: ct.text,
          font: { family: "Clash Display", size: 11 },
          callback: (v) => (privacyMode ? "" : fmtMoney(Number(v))),
        },
      },
    },
  };

  return (
    <div style={{ position: "relative", height: 200 }}>
      <Line
        data={{
          labels,
          datasets: [
            {
              label: "MRR",
              data,
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
            },
          ],
        }}
        options={options}
        plugins={[gradPlugin]}
      />
    </div>
  );
}
