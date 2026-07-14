"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Doughnut } from "react-chartjs-2";
import type { ChartOptions, Plugin } from "chart.js";
import "@/lib/charts/register";
import { getChartTheme } from "@/lib/charts/theme";
import { useTheme } from "@/components/providers/ThemeProvider";

const FASES = ["Onboarding", "Otimização", "Escala", "Consolidação", "Aceleração"];

export function PhaseChart({ counts }: { counts: number[] }) {
  const router = useRouter();
  const { theme } = useTheme();
  const ct = getChartTheme(theme);
  const total = counts.reduce((a, b) => a + b, 0);

  const centerPlugin: Plugin<"doughnut"> = useMemo(
    () => ({
      id: "phaseCenter",
      afterDraw(chart) {
        const {
          ctx: c,
          chartArea: { left, top, width, height },
        } = chart;
        c.save();
        c.textAlign = "center";
        c.textBaseline = "middle";
        const cx = left + width / 2;
        const cy = top + height / 2;
        c.font = '600 24px "Clash Display",sans-serif';
        c.fillStyle = ct.text;
        c.fillText(String(total), cx, cy - 9);
        c.font = '500 11px "Clash Display",sans-serif';
        c.globalAlpha = 0.45;
        c.fillText("ativos", cx, cy + 12);
        c.restore();
      },
    }),
    [total, ct.text]
  );

  const options: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "65%",
    onClick: (_evt, elements) => {
      if (!elements.length) return;
      const idx = elements[0].index;
      if (!counts[idx]) return;
      router.push(`/clientes?fase=${encodeURIComponent(FASES[idx])}`);
    },
    plugins: {
      legend: {
        position: "right",
        labels: {
          font: { family: "Clash Display", size: 11.5 },
          color: ct.text,
          padding: 14,
          boxWidth: 8,
          boxHeight: 8,
          usePointStyle: true,
          pointStyle: "circle",
          filter: (item) => counts[item.index!] > 0,
        },
      },
      tooltip: {
        backgroundColor: ct.tooltip,
        titleFont: { family: "Clash Display", size: 12 },
        bodyFont: { family: "Clash Display", size: 12 },
        padding: 10,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: (item) => ` ${item.label}: ${item.raw} cliente${item.raw === 1 ? "" : "s"} — clique para filtrar`,
        },
      },
    },
  };

  return (
    <div className="chart-canvas">
      <Doughnut
        data={{ labels: FASES, datasets: [{ data: counts, backgroundColor: ct.phases, borderColor: ct.border, borderWidth: 2 }] }}
        options={options}
        plugins={[centerPlugin]}
      />
    </div>
  );
}
