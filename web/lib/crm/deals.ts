import { crmFetch } from "./client";
import type { CrmCommercialOrder, CrmListResponse } from "./types";

export async function listCommercialOrders(apiKey: string, opts: { page?: number; limit?: number } = {}) {
  return crmFetch<CrmListResponse<CrmCommercialOrder>>("/commercial-order", {
    apiKey,
    query: { page: opts.page, limit: opts.limit ?? 100 },
  });
}

export async function getCommercialOrder(apiKey: string, id: number | string) {
  return crmFetch<CrmCommercialOrder>(`/commercial-order/${id}`, { apiKey });
}

const PAGE_CONCURRENCY = 4;

export async function listAllCommercialOrders(apiKey: string): Promise<CrmCommercialOrder[]> {
  // limit=200 dispara erro 500 no servidor da API (confirmado empiricamente);
  // 100 é seguro. Busca a primeira página pra descobrir totalPages, depois busca o
  // resto em paralelo (concorrência limitada — a API já se mostrou instável, então
  // não vale sobrecarregar) em vez de sequencial, que sozinho já consumia a maior
  // parte do tempo da reconciliação diária.
  const first = await listCommercialOrders(apiKey, { page: 1, limit: 100 });
  const totalPages = first.pagination?.totalPages ?? 1;
  const all: CrmCommercialOrder[] = [...first.data];

  const remainingPages = Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) => i + 2);
  for (let i = 0; i < remainingPages.length; i += PAGE_CONCURRENCY) {
    const batch = remainingPages.slice(i, i + PAGE_CONCURRENCY);
    const results = await Promise.all(batch.map((page) => listCommercialOrders(apiKey, { page, limit: 100 })));
    for (const res of results) all.push(...res.data);
  }

  return all;
}
