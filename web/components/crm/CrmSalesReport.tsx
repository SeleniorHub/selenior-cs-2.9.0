"use client";

import { useMemo, useState } from "react";
import { DateRangeCalendar } from "@/components/crm/DateRangeCalendar";
import { PERIOD_LABELS, brLabel, getRanges, type PeriodType } from "@/lib/crm/period-ranges";
import { fmtMoney } from "@/lib/format";
import type { DailyAccountMetricRow } from "@/lib/types";

function deltaPct(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

function StatCard({ label, value, current, previous }: { label: string; value: string; current: number; previous: number }) {
  const pct = deltaPct(current, previous);
  const positive = pct >= 0;
  return (
    <div style={{ padding: 14, borderRadius: "var(--radius-md)", background: "var(--surface2)" }}>
      <div style={{ fontSize: 12, color: "var(--text-2)" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--mono)" }}>{value}</div>
      <div style={{ fontSize: 12, color: positive ? "var(--green)" : "var(--red)" }}>
        {positive ? "▲" : "▼"} {Math.abs(pct)}% vs. anterior
      </div>
    </div>
  );
}

export function CrmSalesReport({ metrics }: { metrics: DailyAccountMetricRow[] }) {
  const [period, setPeriod] = useState<PeriodType>("mes");
  const [customRange, setCustomRange] = useState<{ start: string; end: string } | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const byDate = useMemo(() => {
    const m = new Map<string, DailyAccountMetricRow>();
    for (const row of metrics) m.set(row.data, row);
    return m;
  }, [metrics]);

  const { currentDays, previousDays } = useMemo(() => getRanges(period, customRange), [period, customRange]);

  const stats = useMemo(() => {
    function sums(days: string[]) {
      let vendas = 0;
      let faturamento = 0;
      let leads = 0;
      for (const d of days) {
        const row = byDate.get(d);
        if (!row) continue;
        vendas += row.vendas;
        faturamento += Number(row.faturamento);
        leads += row.novos_leads;
      }
      return { vendas, faturamento, leads, ticketMedio: vendas > 0 ? faturamento / vendas : 0, conversao: leads > 0 ? (vendas / leads) * 100 : 0 };
    }
    return { current: sums(currentDays), previous: sums(previousDays) };
  }, [byDate, currentDays, previousDays]);

  return (
    <div className="chart-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div className="chart-title">Relatório de vendas</div>
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
          <button className={`filter-btn${period === "personalizado" ? " active" : ""}`} onClick={() => setCalendarOpen(true)}>
            📅 {period === "personalizado" && customRange ? `${brLabel(customRange.start)} → ${brLabel(customRange.end)}` : "Período personalizado"}
          </button>
        </div>
      </div>
      <div className="chart-sub">
        Vendas = negócios com status &ldquo;ganho&rdquo; no CRM. Conversão = vendas ÷ novos leads no mesmo período.
        Ticket médio só considera negócios com valor preenchido no CRM.
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, margin: "16px 0" }}>
        <StatCard label="Vendas" value={String(stats.current.vendas)} current={stats.current.vendas} previous={stats.previous.vendas} />
        <StatCard
          label="Taxa de conversão"
          value={`${stats.current.conversao.toFixed(1)}%`}
          current={stats.current.conversao}
          previous={stats.previous.conversao}
        />
        <StatCard
          label="Ticket médio"
          value={fmtMoney(stats.current.ticketMedio)}
          current={stats.current.ticketMedio}
          previous={stats.previous.ticketMedio}
        />
        <StatCard
          label="Faturamento"
          value={fmtMoney(stats.current.faturamento)}
          current={stats.current.faturamento}
          previous={stats.previous.faturamento}
        />
      </div>
    </div>
  );
}
