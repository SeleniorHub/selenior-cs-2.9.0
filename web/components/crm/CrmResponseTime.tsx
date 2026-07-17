"use client";

import { Chart } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";
import "@/lib/charts/register";
import { getChartTheme, lineColor } from "@/lib/charts/theme";
import { useTheme } from "@/components/providers/ThemeProvider";
import type { ResponseTimeStats } from "@/lib/data/crm-insights";

export function formatMinutes(minutes: number): string {
  if (minutes < 1) return `${Math.max(1, Math.round(minutes * 60))}s`;
  if (minutes < 60) return `${Math.round(minutes)}min`;
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)}h`;
  return `${(minutes / 1440).toFixed(1)}d`;
}

function brShortLabel(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

export function CrmResponseTime({ stats }: { stats: ResponseTimeStats }) {
  const { theme: t } = useTheme();
  const ct = getChartTheme(t);
  const lc = lineColor(t);

  if (stats.amostras === 0) {
    return (
      <div className="chart-card">
        <div className="chart-title">Tempo médio de resposta</div>
        <div className="chart-sub">Ainda não há tickets com resposta registrada nos últimos 60 dias.</div>
      </div>
    );
  }

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: ct.tooltip,
        titleFont: { family: "Clash Display", size: 12 },
        bodyFont: { family: "Clash Display", size: 12 },
        padding: 12,
        cornerRadius: 8,
        callbacks: { label: (item) => `  ${formatMinutes(Number(item.raw))}` },
      },
    },
    scales: {
      x: { grid: { color: ct.grid }, border: { display: false }, ticks: { color: ct.text, font: { family: "Clash Display", size: 11 } } },
      y: {
        grid: { color: ct.grid },
        border: { display: false },
        ticks: { color: ct.text, font: { family: "Clash Display", size: 11 }, callback: (v) => formatMinutes(Number(v)) },
      },
    },
  };

  return (
    <div className="chart-card">
      <div className="chart-title">Tempo médio de resposta</div>
      <div className="chart-sub">
        Mediana (não média — poucos tickets antigos parados distorceriam pra cima) dos últimos 60 dias, {stats.amostras}{" "}
        tickets considerados.
      </div>
      <div style={{ fontSize: 30, fontWeight: 700, fontFamily: "var(--mono)", margin: "10px 0" }}>
        {stats.medianaMinutos !== null ? formatMinutes(stats.medianaMinutos) : "—"}
      </div>
      {stats.semanas.length > 1 && (
        <div className="chart-canvas" style={{ height: 160 }}>
          <Chart
            type="line"
            data={{
              labels: stats.semanas.map((s) => `sem ${brShortLabel(s.semana)}`),
              datasets: [
                {
                  data: stats.semanas.map((s) => s.medianaMinutos),
                  borderColor: lc,
                  backgroundColor: "transparent",
                  tension: 0.3,
                  borderWidth: 2.5,
                  pointRadius: 3,
                },
              ],
            }}
            options={options}
          />
        </div>
      )}
    </div>
  );
}
