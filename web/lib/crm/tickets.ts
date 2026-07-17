import { crmFetch } from "./client";

export type CrmTicketTracking = {
  startedAt: string | null;
  finishedAt: string | null;
};

export type CrmTicket = {
  id: number;
  status: string;
  isGroup: boolean;
  unreadMessages: number;
  contactId: number | null;
  queueId: number | null;
  lastMessage: string | null;
  lastMessageHour: string | null;
  createdAt: string;
  updatedAt: string;
  ticketTrakings?: CrmTicketTracking[];
  contact?: { name: string | null; number: string | null };
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

const PAGE_CONCURRENCY = 4;

// Sync completo (todos os tickets) — precisa pra tendência de tempo de resposta e
// pro alerta de mensagens não lidas, que quer ver tickets abertos mesmo que não
// tenham tido atividade hoje. A paginação já demonstrou devolver duplicatas entre
// páginas (mesmo problema visto em /commercial-order), por isso dedupe por id.
export async function listAllTickets(apiKey: string): Promise<CrmTicket[]> {
  const first = await listTickets(apiKey, { page: 1, limit: 100 });
  const totalPages = first.pagination?.totalPages ?? 1;
  const byId = new Map<number, CrmTicket>();
  for (const t of first.data) byId.set(t.id, t);

  const remainingPages = Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) => i + 2);
  for (let i = 0; i < remainingPages.length; i += PAGE_CONCURRENCY) {
    const batch = remainingPages.slice(i, i + PAGE_CONCURRENCY);
    const results = await Promise.all(batch.map((page) => listTickets(apiKey, { page, limit: 100 })));
    for (const res of results) for (const t of res.data) byId.set(t.id, t);
  }

  return [...byId.values()];
}

// Primeira resposta de um atendente = menor startedAt entre os "trakings" do
// ticket. null se ninguém atendeu ainda.
export function firstResponseAt(ticket: CrmTicket): string | null {
  const started = (ticket.ticketTrakings ?? [])
    .map((t) => t.startedAt)
    .filter((s): s is string => Boolean(s))
    .sort();
  return started[0] ?? null;
}
