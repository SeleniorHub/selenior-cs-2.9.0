import { config } from "dotenv";
config({ path: ".env.local" });

import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../lib/db/schema";

// Backfill de vendas/faturamento pra todo o histórico que já temos em crm_deals —
// diferente de interações, won_at é um campo real e estável do CRM, dá pra
// recalcular retroativamente sem perder precisão.
async function backfillAccount(db: ReturnType<typeof drizzle>, account: { id: string; nome: string }) {
  console.log(`\n=== ${account.nome} ===`);

  const rows = await db
    .select({
      data: sql<string>`(${schema.crmDeals.wonAt} at time zone 'America/Sao_Paulo')::date::text`,
      vendas: sql<number>`count(*)::int`,
      faturamento: sql<string>`coalesce(sum(${schema.crmDeals.valor}), 0)::text`,
    })
    .from(schema.crmDeals)
    .where(sql`${schema.crmDeals.accountId} = ${account.id} and ${schema.crmDeals.status} = 'WON' and ${schema.crmDeals.wonAt} is not null`)
    .groupBy(sql`(${schema.crmDeals.wonAt} at time zone 'America/Sao_Paulo')::date`);

  for (const row of rows) {
    await db
      .insert(schema.dailyAccountMetrics)
      .values({ accountId: account.id, data: row.data, vendas: row.vendas, faturamento: row.faturamento })
      .onConflictDoUpdate({
        target: [schema.dailyAccountMetrics.accountId, schema.dailyAccountMetrics.data],
        set: { vendas: row.vendas, faturamento: row.faturamento },
      });
  }
  console.log(`  vendas/faturamento: ${rows.length} dias com dado histórico.`);
}

async function main() {
  const connectionString = process.env.DIRECT_URL;
  if (!connectionString) throw new Error("DIRECT_URL não definida no .env.local");
  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client, { schema });

  const accountFilter = process.argv[2];
  const accounts = await db
    .select({ id: schema.crmAccounts.id, nome: schema.crmAccounts.nome })
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
