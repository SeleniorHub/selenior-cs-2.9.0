import { eq, sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { countTicketsUpdatedOn } from "@/lib/crm/tickets";

export const maxDuration = 60;

function todayBrasilia(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-webhook-secret");
  if (!secret || secret !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const data = todayBrasilia();

  const accounts = await db
    .select({ id: schema.crmAccounts.id, apiKey: schema.crmAccounts.apiKey })
    .from(schema.crmAccounts)
    .where(eq(schema.crmAccounts.ativo, true));

  let totalRows = 0;
  for (const account of accounts) {
    const rows = await db
      .select({
        pipelineId: schema.crmDeals.pipelineId,
        stepId: schema.crmDeals.stepId,
        count: sql<number>`count(*)::int`,
        valorTotal: sql<string>`coalesce(sum(${schema.crmDeals.valor}), 0)::text`,
      })
      .from(schema.crmDeals)
      .where(
        sql`${schema.crmDeals.accountId} = ${account.id} and ${schema.crmDeals.pipelineId} is not null and ${schema.crmDeals.stepId} is not null`
      )
      .groupBy(schema.crmDeals.pipelineId, schema.crmDeals.stepId);

    for (const row of rows) {
      if (!row.pipelineId || !row.stepId) continue;
      await db
        .insert(schema.dailyFunnelSnapshot)
        .values({
          accountId: account.id,
          data,
          pipelineId: row.pipelineId,
          stepId: row.stepId,
          count: row.count,
          valorTotal: row.valorTotal,
        })
        .onConflictDoUpdate({
          target: [
            schema.dailyFunnelSnapshot.accountId,
            schema.dailyFunnelSnapshot.data,
            schema.dailyFunnelSnapshot.pipelineId,
            schema.dailyFunnelSnapshot.stepId,
          ],
          set: { count: row.count, valorTotal: row.valorTotal },
        });
      totalRows++;
    }

    const [{ novosLeads }] = await db
      .select({ novosLeads: sql<number>`count(*)::int` })
      .from(schema.crmDeals)
      .where(
        sql`${schema.crmDeals.accountId} = ${account.id} and (${schema.crmDeals.createdAtCrm} at time zone 'America/Sao_Paulo')::date = ${data}::date`
      );

    let interacoes = 0;
    try {
      interacoes = await countTicketsUpdatedOn(account.apiKey, data);
    } catch {
      // Não trava o snapshot do funil se só a contagem de tickets falhar.
    }

    await db
      .insert(schema.dailyAccountMetrics)
      .values({ accountId: account.id, data, novosLeads, interacoes })
      .onConflictDoUpdate({
        target: [schema.dailyAccountMetrics.accountId, schema.dailyAccountMetrics.data],
        set: { novosLeads, interacoes },
      });
  }

  return NextResponse.json({ ok: true, data, accounts: accounts.length, rows: totalRows });
}
