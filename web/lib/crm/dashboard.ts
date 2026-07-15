import { crmFetch } from "./client";

export type CrmDashboardCounters = {
  leads: number;
  totalMessages: number;
  activePipelines: number;
  totalUnreadMessages: number | null;
};

function formatDateBr(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

// A API exige d/m/Y (ex: 09/02/2026), não ISO. O campo "leads" desse endpoint
// voltou sempre 0 em todos os testes que fizemos — não confiável, não usar.
// "totalMessages" é o que realmente presta pra medir interações no período.
export async function getDashboardCounters(apiKey: string, from: Date, to: Date): Promise<CrmDashboardCounters> {
  const json = await crmFetch<{ success: boolean; data: { counters: CrmDashboardCounters } }>("/dashboard/counters", {
    apiKey,
    query: { date_from: formatDateBr(from), date_to: formatDateBr(to) },
  });
  return json.data.counters;
}
