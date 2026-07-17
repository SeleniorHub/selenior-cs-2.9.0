import { eq, sql } from "drizzle-orm";
import type { db as appDb } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import type { CrmCommercialOrder } from "./types";
import { listAllCommercialOrders } from "./deals";
import { listPipelines } from "./pipelines";

type DbClient = typeof appDb;

export type SyncSource = "sync-inicial" | "reconciliation";

export type SyncAccountResult = {
  accountId: string;
  pipelines: number;
  steps: number;
  deals: number;
  stageEvents: number;
};

const CHUNK_SIZE = 200;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Fonte única de verdade pro sync de uma conta CRM: puxa pipelines/etapas/negócios
// direto da API do CRM e faz upsert idempotente em lote (não um round-trip por
// negócio — com 1000+ negócios isso não caberia no timeout de função da Vercel).
// Usado tanto pelo script manual (scripts/sync-crm.ts, origem "sync-inicial") quanto
// pelo cron de reconciliação (origem "reconciliation") — a reconciliação existe
// porque o funil ao vivo depende só do webhook do n8n, que pode falhar; ela busca
// direto na API do CRM (sem depender do n8n) e registra em deal_stage_events quando
// pega uma mudança de etapa que o webhook perdeu.
export async function syncCrmAccount(
  db: DbClient,
  account: { id: string; nome: string; apiKey: string },
  opts: { source: SyncSource; log?: (msg: string) => void }
): Promise<SyncAccountResult> {
  const log = opts.log ?? (() => {});
  log(`Conta: ${account.nome} (${account.id})`);

  const pipelines = await listPipelines(account.apiKey);

  const pipelineValues = pipelines.map((p, i) => ({
    accountId: account.id,
    crmPipelineId: String(p.id),
    nome: p.name,
    ordem: i,
  }));
  const pipelineReturning = pipelineValues.length
    ? await db
        .insert(schema.crmPipelines)
        .values(pipelineValues)
        .onConflictDoUpdate({
          target: [schema.crmPipelines.accountId, schema.crmPipelines.crmPipelineId],
          set: { nome: sql`excluded.nome`, ordem: sql`excluded.ordem` },
        })
        .returning({ id: schema.crmPipelines.id, crmPipelineId: schema.crmPipelines.crmPipelineId })
    : [];
  const pipelineIdMap = new Map(pipelineReturning.map((r) => [r.crmPipelineId, r.id]));

  const stepValues = pipelines.flatMap((p) => {
    const localPipelineId = pipelineIdMap.get(String(p.id));
    if (!localPipelineId) return [];
    return p.commercialSteps.map((s, j) => ({
      accountId: account.id,
      crmStepId: String(s.id),
      pipelineId: localPipelineId,
      nome: s.name,
      ordem: s.order ?? j,
      isWon: /ganh|won|fechad/i.test(s.name),
      isLost: /perd|lost|desist/i.test(s.name),
    }));
  });
  const stepIdMap = new Map<number, string>();
  let stepsCount = 0;
  for (const c of chunk(stepValues, CHUNK_SIZE)) {
    const returned = await db
      .insert(schema.crmPipelineSteps)
      .values(c)
      .onConflictDoUpdate({
        target: [schema.crmPipelineSteps.accountId, schema.crmPipelineSteps.crmStepId],
        set: {
          pipelineId: sql`excluded.pipeline_id`,
          nome: sql`excluded.nome`,
          ordem: sql`excluded.ordem`,
          isWon: sql`excluded.is_won`,
          isLost: sql`excluded.is_lost`,
        },
      })
      .returning({ id: schema.crmPipelineSteps.id, crmStepId: schema.crmPipelineSteps.crmStepId });
    for (const r of returned) stepIdMap.set(Number(r.crmStepId), r.id);
    stepsCount += returned.length;
  }

  const ordersRaw = await listAllCommercialOrders(account.apiKey);
  // A paginação da API do CRM já demonstrou devolver o mesmo negócio em mais de uma
  // página (instabilidade conhecida) — sem deduplicar, um INSERT em lote com a mesma
  // crm_deal_id duas vezes quebra com "ON CONFLICT DO UPDATE command cannot affect
  // row a second time". Fica o último valor de cada id (última página vence).
  const ordersById = new Map(ordersRaw.map((o) => [o.id, o]));
  const orders = [...ordersById.values()];

  const existingMap = new Map<string, string | null>();
  if (opts.source === "reconciliation" && orders.length) {
    const existingRows = await db
      .select({ crmDealId: schema.crmDeals.crmDealId, stepId: schema.crmDeals.stepId })
      .from(schema.crmDeals)
      .where(eq(schema.crmDeals.accountId, account.id));
    for (const r of existingRows) existingMap.set(r.crmDealId, r.stepId);
  }

  type DealRow = typeof schema.crmDeals.$inferInsert & { _order: CrmCommercialOrder };
  const dealRows: DealRow[] = orders.map((o) => {
    const stepId = stepIdMap.get(o.commercialSalesStepId) ?? null;
    const pipelineId = o.commercialSalesStep?.pipelineId
      ? pipelineIdMap.get(String(o.commercialSalesStep.pipelineId)) ?? null
      : null;
    return {
      accountId: account.id,
      crmDealId: String(o.id),
      crmContactId: o.contactId ? String(o.contactId) : null,
      nome: o.title || o.contact?.name || null,
      pipelineId,
      stepId,
      valor: o.amount || null,
      status: o.status ?? null,
      wonAt: o.wonAt ? new Date(o.wonAt) : null,
      lostAt: o.lostAt ? new Date(o.lostAt) : null,
      origem: opts.source,
      createdAtCrm: o.createdAt ? new Date(o.createdAt) : null,
      updatedAtCrm: o.updatedAt ? new Date(o.updatedAt) : null,
      meetingCreatedAt: o.meetingCreatedAt ? new Date(o.meetingCreatedAt) : null,
      meetingRealizedAt: o.meetingRealizedAt ? new Date(o.meetingRealizedAt) : null,
      tags: o.contact?.tags ?? null,
      _order: o,
    };
  });

  let dealCount = 0;
  const stageEventInputs: { crmDealId: string; fromStepId: string | null; toStepId: string; order: CrmCommercialOrder }[] = [];

  for (const c of chunk(dealRows, CHUNK_SIZE)) {
    const values = c.map(({ _order, ...rest }) => rest);
    const returned = await db
      .insert(schema.crmDeals)
      .values(values)
      .onConflictDoUpdate({
        target: [schema.crmDeals.accountId, schema.crmDeals.crmDealId],
        set: {
          crmContactId: sql`excluded.crm_contact_id`,
          nome: sql`excluded.nome`,
          pipelineId: sql`excluded.pipeline_id`,
          stepId: sql`excluded.step_id`,
          valor: sql`excluded.valor`,
          status: sql`excluded.status`,
          wonAt: sql`excluded.won_at`,
          lostAt: sql`excluded.lost_at`,
          updatedAtCrm: sql`excluded.updated_at_crm`,
          meetingCreatedAt: sql`excluded.meeting_created_at`,
          meetingRealizedAt: sql`excluded.meeting_realized_at`,
          tags: sql`excluded.tags`,
          syncedAt: sql`now()`,
        },
      })
      .returning({ id: schema.crmDeals.id, crmDealId: schema.crmDeals.crmDealId, stepId: schema.crmDeals.stepId });

    dealCount += returned.length;

    if (opts.source === "reconciliation") {
      const idByDealId = new Map(returned.map((r) => [r.crmDealId, r.id]));
      for (const row of c) {
        const localId = idByDealId.get(row.crmDealId!);
        if (!localId || !row.stepId) continue;
        const previousStepId = existingMap.has(row.crmDealId!) ? existingMap.get(row.crmDealId!)! : undefined;
        const isNew = previousStepId === undefined;
        const stepChanged = previousStepId !== undefined && previousStepId !== row.stepId;
        if (isNew || stepChanged) {
          stageEventInputs.push({
            crmDealId: localId,
            fromStepId: previousStepId ?? null,
            toStepId: row.stepId,
            order: row._order,
          });
        }
      }
    }
  }

  let stageEventsCount = 0;
  for (const c of chunk(stageEventInputs, CHUNK_SIZE)) {
    if (!c.length) continue;
    await db.insert(schema.dealStageEvents).values(
      c.map((e) => ({
        accountId: account.id,
        dealId: e.crmDealId,
        fromStepId: e.fromStepId,
        toStepId: e.toStepId,
        source: "reconciliation" as const,
        rawPayload: e.order as unknown as Record<string, unknown>,
      }))
    );
    stageEventsCount += c.length;
  }

  log(`  ${pipelines.length} pipelines, ${stepsCount} etapas, ${dealCount} negócios, ${stageEventsCount} eventos de reconciliação.`);
  return { accountId: account.id, pipelines: pipelines.length, steps: stepsCount, deals: dealCount, stageEvents: stageEventsCount };
}

export async function syncAllActiveCrmAccounts(
  db: DbClient,
  opts: { source: SyncSource; accountId?: string; log?: (msg: string) => void }
): Promise<SyncAccountResult[]> {
  const accounts = await db
    .select({ id: schema.crmAccounts.id, nome: schema.crmAccounts.nome, apiKey: schema.crmAccounts.apiKey })
    .from(schema.crmAccounts)
    .where(eq(schema.crmAccounts.ativo, true));

  const targets = opts.accountId ? accounts.filter((a) => a.id === opts.accountId) : accounts;
  const results: SyncAccountResult[] = [];
  for (const account of targets) {
    results.push(await syncCrmAccount(db, account, opts));
  }
  return results;
}
