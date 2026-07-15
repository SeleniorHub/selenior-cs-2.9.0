import { config } from "dotenv";
config({ path: ".env.local" });

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../lib/db/schema";

// Preenche manualmente o histórico de "interacoes" pra um período em que só temos o
// número visto direto no painel do CRM (a API não permite recalcular isso
// retroativamente — ver comentário em lib/crm/tickets.ts). Distribui o total
// informado igualmente entre os dias do período, pra que qualquer agregação
// (semana, mês) que caia dentro dele some certo.
//
// Uso: npx tsx scripts/set-interacoes-periodo.ts <webhook_slug> <data_inicio:YYYY-MM-DD> <data_fim:YYYY-MM-DD> <total>
// Exemplo: npx tsx scripts/set-interacoes-periodo.ts chic-estofados 2026-06-01 2026-06-30 620

async function main() {
  const [slug, dataInicio, dataFim, totalStr] = process.argv.slice(2);
  if (!slug || !dataInicio || !dataFim || !totalStr) {
    throw new Error(
      "uso: tsx scripts/set-interacoes-periodo.ts <webhook_slug> <data_inicio:YYYY-MM-DD> <data_fim:YYYY-MM-DD> <total>"
    );
  }
  const total = Number(totalStr);
  if (!Number.isFinite(total) || total < 0) throw new Error("total inválido");

  const connectionString = process.env.DIRECT_URL;
  if (!connectionString) throw new Error("DIRECT_URL não definida no .env.local");
  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client, { schema });

  const [account] = await db
    .select({ id: schema.crmAccounts.id, nome: schema.crmAccounts.nome })
    .from(schema.crmAccounts)
    .where(eq(schema.crmAccounts.webhookSlug, slug));
  if (!account) throw new Error(`conta com webhook_slug="${slug}" não encontrada`);

  const start = new Date(`${dataInicio}T12:00:00`);
  const end = new Date(`${dataFim}T12:00:00`);
  const days: string[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d));
  }
  if (!days.length) throw new Error("intervalo de datas vazio");

  const base = Math.floor(total / days.length);
  const resto = total - base * days.length;

  for (const [i, data] of days.entries()) {
    const valor = base + (i < resto ? 1 : 0);
    await db
      .insert(schema.dailyAccountMetrics)
      .values({ accountId: account.id, data, interacoes: valor })
      .onConflictDoUpdate({
        target: [schema.dailyAccountMetrics.accountId, schema.dailyAccountMetrics.data],
        set: { interacoes: valor },
      });
  }

  console.log(`${account.nome}: ${total} interações distribuídas em ${days.length} dias (${dataInicio} a ${dataFim}).`);
  await client.end({ timeout: 1 });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
