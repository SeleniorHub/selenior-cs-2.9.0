"use client";

import { usePrivacy } from "@/components/providers/PrivacyProvider";
import { calcMRR, parseLocalDate } from "@/lib/format";
import type { Client } from "@/lib/types";

const FASES = ["Onboarding", "Otimização", "Escala", "Consolidação", "Aceleração"];

export function CohortTable({
  clients,
  onOpenSafra,
}: {
  clients: Client[];
  onOpenSafra: (monthKey: string, category: string) => void;
}) {
  const privacy = usePrivacy();
  const byMonth = new Map<string, Client[]>();
  clients.forEach((cl) => {
    if (!cl.data_inicio) return;
    const d = parseLocalDate(cl.data_inicio);
    const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(cl);
  });
  const sortedKeys = [...byMonth.keys()].sort();

  if (!sortedKeys.length) {
    return <div className="empty-state">Nenhum cliente com data de início definida ainda.</div>;
  }

  const totals = { total: 0, fases: FASES.map(() => 0), churn: 0, mrr: 0 };

  return (
    <table className="cohort-table">
      <thead>
        <tr>
          <th>Safra</th>
          <th>Total</th>
          {FASES.map((f) => (
            <th key={f} title={f}>
              {f.slice(0, 4)}
            </th>
          ))}
          <th className="cohort-churn-col">Churn</th>
          <th>MRR ativo</th>
        </tr>
      </thead>
      <tbody>
        {sortedKeys.map((k) => {
          const safra = byMonth.get(k)!;
          const date = parseLocalDate(k + "-01");
          const label = date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
          const total = safra.length;
          const counts = FASES.map((f) => safra.filter((c) => (c.status || "ativo") === "ativo" && c.fase === f).length);
          const churn = safra.filter((c) => c.status === "churned").length;
          const mrr = safra.filter((c) => (c.status || "ativo") === "ativo").reduce((s, c) => s + calcMRR(c).liquido, 0);
          totals.total += total;
          counts.forEach((v, i) => (totals.fases[i] += v));
          totals.churn += churn;
          totals.mrr += mrr;
          return (
            <tr key={k}>
              <td className="cohort-label">{label}</td>
              <td
                className={`cohort-count cohort-cell${total > 0 ? " has-val" : ""}`}
                onClick={total > 0 ? () => onOpenSafra(k, "__all__") : undefined}
              >
                {total}
              </td>
              {counts.map((c, i) => (
                <td
                  key={i}
                  className={`cohort-cell${c > 0 ? " has-val" : ""}`}
                  onClick={c > 0 ? () => onOpenSafra(k, FASES[i]) : undefined}
                >
                  {c || ""}
                </td>
              ))}
              <td className={`cohort-churn${churn > 0 ? " has-val" : ""}`} onClick={churn > 0 ? () => onOpenSafra(k, "__churn__") : undefined}>
                {churn || ""}
              </td>
              <td className="cohort-mrr">{mrr ? privacy.val(mrr) : "—"}</td>
            </tr>
          );
        })}
        <tr className="cohort-totals">
          <td>Total</td>
          <td>{totals.total}</td>
          {totals.fases.map((c, i) => (
            <td key={i}>{c || ""}</td>
          ))}
          <td className="cohort-churn-col">{totals.churn || ""}</td>
          <td>{totals.mrr ? privacy.val(totals.mrr) : "—"}</td>
        </tr>
      </tbody>
    </table>
  );
}
