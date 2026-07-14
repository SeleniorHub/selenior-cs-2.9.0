import { crmFetch } from "./client";
import type { CrmContact, CrmListResponse } from "./types";

export async function getContact(apiKey: string, identifier: number | string) {
  return crmFetch<CrmContact>(`/contact/${identifier}`, { apiKey });
}

export async function listContacts(apiKey: string, opts: { page?: number; limit?: number } = {}) {
  return crmFetch<CrmListResponse<CrmContact>>("/contact", {
    apiKey,
    query: { page: opts.page, limit: opts.limit ?? 100 },
  });
}
