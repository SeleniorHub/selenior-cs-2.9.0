"use client";

import { MrrEvolutionChart } from "@/components/charts/MrrEvolutionChart";
import { usePrivacy } from "@/components/providers/PrivacyProvider";
import { parseLocalDate, parseMoney } from "@/lib/format";
import type { Client, MrrHistoryEntry } from "@/lib/types";

export function MrrEvolutionSection({ clients, mrrHistory }: { clients: Client[]; mrrHistory: MrrHistoryEntry[] }) {
  const privacy = usePrivacy();
  const monthMap = new Map<string, number>();

  if (mrrHistory.length) {
    mrrHistory.forEach((h) => {
      const key = h.mes.substring(0, 7);
      monthMap.set(key, (monthMap.get(key) || 0) + parseFloat(h.mrr));
    });
  } else {
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
      const dEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      let tot = 0;
      clients.forEach((cl) => {
        if (!cl.data_inicio) return;
        const s = parseLocalDate(cl.data_inicio);
        const e = cl.data_fim ? parseLocalDate(cl.data_fim) : null;
        if (s <= dEnd && (!e || e >= d)) tot += parseMoney(cl.mrr_bruto);
      });
      if (tot > 0) monthMap.set(key, tot);
    }
  }

  const months = [...monthMap.keys()].sort();

  if (!months.length) {
    return (
      <div className="chart-canvas">
        <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="empty-title" style={{ textAlign: "center" }}>
            Adicione registros em Histórico MRR para ver a evolução
          </div>
        </div>
      </div>
    );
  }

  const newMRR = months.map((m) => {
    let n = 0;
    if (mrrHistory.length) {
      const clientFirst = new Map<string, string>();
      mrrHistory.forEach((h) => {
        const mes = h.mes.substring(0, 7);
        const prev = clientFirst.get(h.client_id);
        if (!prev || mes < prev) clientFirst.set(h.client_id, mes);
      });
      clientFirst.forEach((first, cid) => {
        if (first === m) {
          n += mrrHistory
            .filter((h) => h.client_id === cid && h.mes.substring(0, 7) === m)
            .reduce((s, h) => s + parseFloat(h.mrr), 0);
        }
      });
    } else {
      clients.forEach((cl) => {
        if (cl.data_inicio && cl.data_inicio.substring(0, 7) === m) n += parseMoney(cl.mrr_bruto);
      });
    }
    return n;
  });

  const churnMRR = months.map((m) => {
    let c = 0;
    clients.forEach((cl) => {
      if (cl.status === "churned" && cl.data_fim && cl.data_fim.substring(0, 7) === m) c += parseMoney(cl.mrr_bruto);
    });
    return c > 0 ? -c : null;
  });

  const labels = months.map((m) => {
    const [y, mo] = m.split("-");
    return new Date(parseInt(y), parseInt(mo) - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
  });

  return (
    <MrrEvolutionChart
      labels={labels}
      total={months.map((m) => monthMap.get(m) || 0)}
      novos={newMRR}
      churn={churnMRR}
      privacyMode={privacy.enabled}
    />
  );
}
