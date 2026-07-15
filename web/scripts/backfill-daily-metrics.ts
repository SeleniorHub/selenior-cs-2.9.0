import { config } from "dotenv";
config({ path: ".env.local" });

import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../lib/db/schema";

// Backfill único: novos leads retroativo pra todo o histórico que já temos em
// crm_deals (não precisa de chamada de API, é só agrupar por dia).
//
// "interacoes" (conversas com atividade no dia) NÃO dá pra recalcular
// retroativamente — o CRM só expõe o estado atual de cada ticket (updatedAt),
// não um log histórico de quando cada um teve atividade. Só é possível medir
// corretamente no fechamento do próprio dia (é o que o cron de funnel-snapshot
// faz às 23:55) — o histórico começa a acumular a partir de hoje.
async function backfillAccount(db: ReturnType<typeof drizzle>, account: { id: string; nome: string }) {
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
