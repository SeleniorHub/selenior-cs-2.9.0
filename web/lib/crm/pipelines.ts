import { crmFetch } from "./client";
import type { CrmPipeline } from "./types";

export async function listPipelines(apiKey: string): Promise<CrmPipeline[]> {
  const json = await crmFetch<{ records: CrmPipeline[] }>("/pipeline", { apiKey });
  return json.records ?? [];
}
