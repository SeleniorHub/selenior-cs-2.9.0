import { config } from "dotenv";
config({ path: ".env.local" });

import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../lib/db/schema";
import { listAllCommercialOrders } from "../lib/crm/deals";
import { listPipelines } from "../lib/crm/pipelines";

async function syncAccount(db: ReturnType<typeof drizzle>, account: { id: string; nome: string; apiKey: string }) {
  console.log(`\n=== Conta: ${account.nome} (${account.id}) ===`);
  console.log("Buscando pipelines do CRM...");
  const pipelines = await listPipelines(account.apiKey);
  console.log(`${pipelines.length} pipelines encontrados.`);

  const stepIdMap = new Map<number, string>();

  for (const [i, p] of pipelines.entries()) {
    const [row] = await db
      .insert(schema.crmPipelines)
      .values({ accountId: account.id, crmPipelineId: String(p.id), nome: p.name, ordem: i })
      .onConflictDoUpdate({
        target: [schema.crmPipelines.accountId, schema.crmPipelines.crmPipelineId],
        set: { nome: p.name, ordem: i },
      })
      .returning({ id: schema.crmPipelines.id });

    for (const [j, s] of p.commercialSteps.entries()) {
      const isWon = /ganh|won|fechad/i.test(s.name);
      const isLost = /perd|lost|desist/i.test(s.name);
      const [stepRow] = await db
        .insert(schema.crmPipelineSteps)
        .values({
          accountId: account.id,
          crmStepId: String(s.id),
          pipelineId: row.id,
          nome: s.name,
          ordem: s.order ?? j,
          isWon,
          isLost,
        })
        .onConflictDoUpdate({
          target: [schema.crmPipelineSteps.accountId, schema.crmPipelineSteps.crmStepId],
          set: { pipelineId: row.id, nome: s.name, ordem: s.order ?? j, isWon, isLost },
        })
        .returning({ id: schema.crmPipelineSteps.id });
      stepIdMap.set(s.id, stepRow.id);
    }
  }
  console.log(`Pipelines e etapas sincronizados (${stepIdMap.size} etapas).`);

  console.log("Buscando negócios (commercial-orders) do CRM...");
  const orders = await listAllCommercialOrders(account.apiKey);
  console.log(`${orders.length} negócios encontrados.`);

  let dealCount = 0;
  for (const o of orders) {
    const stepId = stepIdMap.get(o.commercialSalesStepId) ?? null;
    const pipelineId = o.commercialSalesStep?.pipelineId
      ? (
          await db
            .select({ id: schema.crmPipelines.id })
            .from(schema.crmPipelines)
            .where(
              and(
                eq(schema.crmPipelines.accountId, account.id),
                eq(schema.crmPipelines.crmPipelineId, String(o.commercialSalesStep.pipelineId))
              )
            )
        )[0]?.id ?? null
      : null;

    await db
      .insert(schema.crmDeals)
      .values({
        accountId: account.id,
        crmDealId: String(o.id),
        crmContactId: o.contactId ? String(o.contactId) : null,
        nome: o.title || o.contact?.name || null,
        pipelineId,
        stepId,
        valor: o.amount || null,
        origem: "sync-inicial",
        createdAtCrm: o.createdAt ? new Date(o.createdAt) : null,
        updatedAtCrm: o.updatedAt ? new Date(o.updatedAt) : null,
      })
      .onConflictDoUpdate({
        target: [schema.crmDeals.accountId, schema.crmDeals.crmDealId],
        set: {
          crmContactId: o.contactId ? String(o.contactId) : null,
          nome: o.title || o.contact?.name || null,
          pipelineId,
          stepId,
          valor: o.amount || null,
          updatedAtCrm: o.updatedAt ? new Date(o.updatedAt) : null,
          syncedAt: new Date(),
        },
      });
    dealCount++;
  }
  console.log(`Negócios sincronizados: ${dealCount}`);
}

async function main() {
  const connectionString = process.env.DIRECT_URL;
  if (!connectionString) throw new Error("DIRECT_URL não definida no .env.local");
  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client, { schema });

  const accountFilter = process.argv[2];
  const accounts = await db
    .select({ id: schema.crmAccounts.id, nome: schema.crmAccounts.nome, apiKey: schema.crmAccounts.apiKey })
    .from(schema.crmAccounts)
    .where(eq(schema.crmAccounts.ativo, true));

  const targets = accountFilter ? accounts.filter((a) => a.id === accountFilter) : accounts;
  if (!targets.length) {
    console.log("Nenhuma conta CRM ativa encontrada para sincronizar.");
  }

  for (const account of targets) {
    await syncAccount(db, account);
  }

  await client.end({ timeout: 1 });
  console.log("\nSync concluído.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
