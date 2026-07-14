import { sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

function todayBrasilia(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-webhook-secret");
  if (!secret || secret !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const data = todayBrasilia();

  const rows = await db
    .select({
      pipelineId: schema.crmDeals.pipelineId,
      stepId: schema.crmDeals.stepId,
      count: sql<number>`count(*)::int`,
      valorTotal: sql<string>`coalesce(sum(${schema.crmDeals.valor}), 0)::text`,
    })
    .from(schema.crmDeals)
    .where(sql`${schema.crmDeals.pipelineId} is not null and ${schema.crmDeals.stepId} is not null`)
    .groupBy(schema.crmDeals.pipelineId, schema.crmDeals.stepId);

  for (const row of rows) {
    if (!row.pipelineId || !row.stepId) continue;
    await db
      .insert(schema.dailyFunnelSnapshot)
      .values({
        data,
        pipelineId: row.pipelineId,
        stepId: row.stepId,
        count: row.count,
        valorTotal: row.valorTotal,
      })
      .onConflictDoUpdate({
        target: [schema.dailyFunnelSnapshot.data, schema.dailyFunnelSnapshot.pipelineId, schema.dailyFunnelSnapshot.stepId],
        set: { count: row.count, valorTotal: row.valorTotal },
      });
  }

  return NextResponse.json({ ok: true, data, rows: rows.length });
}
