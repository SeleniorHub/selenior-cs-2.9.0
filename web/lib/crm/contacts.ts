import { crmFetch } from "./client";
import type { CrmContact, CrmListResponse } from "./types";

export async function getContact(identifier: number | string) {
  return crmFetch<CrmContact>(`/contact/${identifier}`);
}

export async function listContacts(opts: { page?: number; limit?: number } = {}) {
  return crmFetch<CrmListResponse<CrmContact>>("/contact", {
    query: { page: opts.page, limit: opts.limit ?? 100 },
  });
}
