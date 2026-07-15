import { config } from "dotenv";
config({ path: ".env.local" });

import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../lib/db/schema";
import { getDashboardCounters } from "../lib/crm/dashboard";

// Backfill único: novos leads retroativo pra todo o histórico que já temos em
// crm_deals (não precisa de chamada de API, é só agrupar por dia); total de
// mensagens retroativo pros últimos N dias via /dashboard/counters (uma chamada por
// dia — a API só dá o agregado do período pedido, não uma série histórica pronta).
const BACKFILL_DAYS = Number(process.argv[3] ?? 60);

function todayBrasilia(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function daysAgo(n: number): Date {
  const d = new Date(`${todayBrasilia()}T12:00:00`);
  d.setDate(d.getDate() - n);
  return d;
}

async function backfillAccount(db: ReturnType<typeof drizzle>, account: { id: string; nome: string; apiKey: string }) {
  console.log(`\n=== ${account.nome} ===`);

  const leadRows = await db
    .select({
      data: sql<string>`(${schema.crmDeals.createdAtCrm} at time zone 'America/Sao_Paulo')::date::text`,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.crmDeals)
    .where(sql`${schema.crmDeals.accountId} = ${account.id} and ${schema.crmDeals.createdAtCrm} is not null`)
    .groupBy(sql`(${schema.crmDeals.createdAtCrm} at time zone 'America/Sao_Paulo')::date`);

  for (const row of leadRows) {
    await db
      .insert(schema.dailyAccountMetrics)
      .values({ accountId: account.id, data: row.data, novosLeads: row.count })
      .onConflictDoUpdate({
        target: [schema.dailyAccountMetrics.accountId, schema.dailyAccountMetrics.data],
        set: { novosLeads: row.count },
      });
  }
  console.log(`  novos_leads: ${leadRows.length} dias com dado histórico.`);

  let messagesDone = 0;
  for (let i = 0; i < BACKFILL_DAYS; i++) {
    const day = daysAgo(i);
    const dataStr = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(day);
    try {
      const counters = await getDashboardCounters(account.apiKey, day, day);
      await db
        .insert(schema.dailyAccountMetrics)
        .values({ accountId: account.id, data: dataStr, totalMensagens: counters.totalMessages })
        .onConflictDoUpdate({
          target: [schema.dailyAccountMetrics.accountId, schema.dailyAccountMetrics.data],
          set: { totalMensagens: counters.totalMessages },
        });
      messagesDone++;
    } catch (e) {
      console.log(`  [${dataStr}] falhou: ${e instanceof Error ? e.message : e}`);
    }
  }
  console.log(`  total_mensagens: ${messagesDone}/${BACKFILL_DAYS} dias preenchidos.`);
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
  for (const account of targets) {
    await backfillAccount(db, account);
  }

  await client.end({ timeout: 1 });
  console.log("\nBackfill concluído.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
