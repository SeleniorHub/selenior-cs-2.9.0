import { crmFetch } from "./client";
import type { CrmPipeline } from "./types";

export async function listPipelines(): Promise<CrmPipeline[]> {
  const json = await crmFetch<{ records: CrmPipeline[] }>("/pipeline");
  return json.records ?? [];
}
