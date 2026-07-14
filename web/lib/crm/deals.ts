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

export async function listAllCommercialOrders(apiKey: string): Promise<CrmCommercialOrder[]> {
  // limit=200 dispara erro 500 no servidor da API (confirmado empiricamente);
  // 100 é seguro.
  const all: CrmCommercialOrder[] = [];
  let page = 1;
  for (;;) {
    const res = await listCommercialOrders(apiKey, { page, limit: 100 });
    all.push(...res.data);
    const totalPages = res.pagination?.totalPages ?? 1;
    if (page >= totalPages) break;
    page++;
  }
  return all;
}
