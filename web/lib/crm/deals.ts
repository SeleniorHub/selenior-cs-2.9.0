import { crmFetch } from "./client";
import type { CrmCommercialOrder, CrmListResponse } from "./types";

export async function listCommercialOrders(opts: { page?: number; limit?: number } = {}) {
  return crmFetch<CrmListResponse<CrmCommercialOrder>>("/commercial-order", {
    query: { page: opts.page, limit: opts.limit ?? 100 },
  });
}

export async function getCommercialOrder(id: number | string) {
  return crmFetch<CrmCommercialOrder>(`/commercial-order/${id}`);
}

export async function listAllCommercialOrders(): Promise<CrmCommercialOrder[]> {
  // limit=200 dispara erro 500 no servidor da API (confirmado empiricamente);
  // 100 é seguro.
  const all: CrmCommercialOrder[] = [];
  let page = 1;
  for (;;) {
    const res = await listCommercialOrders({ page, limit: 100 });
    all.push(...res.data);
    const totalPages = res.pagination?.totalPages ?? 1;
    if (page >= totalPages) break;
    page++;
  }
  return all;
}
