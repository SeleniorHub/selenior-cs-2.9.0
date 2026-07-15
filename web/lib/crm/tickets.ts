import { crmFetch } from "./client";

export type CrmTicket = {
  id: number;
  status: string;
  isGroup: boolean;
  updatedAt: string;
  createdAt: string;
};

export async function listTickets(apiKey: string, opts: { page?: number; limit?: number } = {}) {
  return crmFetch<{ data: CrmTicket[]; pagination?: { page: number; limit: number; total: number; totalPages: number } }>(
    "/ticket",
    { apiKey, query: { page: opts.page, limit: opts.limit ?? 100 } }
  );
}

function brDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

// O endpoint /ticket ignora completamente date_from/date_to (confirmado
// empiricamente), mas a listagem vem ordenada por updatedAt decrescente (mais
// recente primeiro — confirmado empiricamente também). Aproveitando isso, paginamos
// só até passar do dia alvo em vez de buscar tudo: pra ~2500 tickets isso reduz de
// ~26 páginas pra normalmente 1-2, essencial pro cron caber no timeout de função da
// Vercel (buscar tudo levava mais de 50s só nessa etapa).
export async function countTicketsUpdatedOn(apiKey: string, dateStr: string): Promise<number> {
  const seen = new Set<number>();
  let page = 1;
  for (;;) {
    const res = await listTickets(apiKey, { page, limit: 100 });
    if (!res.data.length) break;

    let sawNewerOrEqual = false;
    for (const t of res.data) {
      const d = brDate(t.updatedAt);
      if (d === dateStr) {
        seen.add(t.id);
        sawNewerOrEqual = true;
      } else if (d > dateStr) {
        sawNewerOrEqual = true;
      }
    }

    const totalPages = res.pagination?.totalPages ?? 1;
    if (!sawNewerOrEqual || page >= totalPages) break;
    page++;
  }
  return seen.size;
}
