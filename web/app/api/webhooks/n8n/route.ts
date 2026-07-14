import { createHash } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import type { CrmCommercialOrder, CrmWebhookEvent, CrmWebhookPayload } from "@/lib/crm/types";

const COMMERCIAL_ORDER_EVENTS: CrmWebhookEvent[] = [
  "COMMERCIAL_ORDER_CREATED",
  "COMMERCIAL_ORDER_CHANGED",
  "COMMERCIAL_ORDER_STEP_CHANGED",
];

function idempotencyKeyFor(event: string, data: unknown): string {
  const raw = JSON.stringify({ event, data });
  return createHash("sha256").update(raw).digest("hex");
}

async function handleCommercialOrderEvent(event: CrmWebhookEvent, order: CrmCommercialOrder) {
  const crmDealId = String(order.id);

  const [existing] = await db
    .select({ id: schema.crmDeals.id, stepId: schema.crmDeals.stepId })
    .from(schema.crmDeals)
    .where(eq(schema.crmDeals.crmDealId, crmDealId));

  let stepId: string | null = null;
  let pipelineId: string | null = null;
  if (order.commercialSalesStepId) {
    const [step] = await db
      .select({ id: schema.crmPipelineSteps.id, pipelineId: schema.crmPipelineSteps.pipelineId })
      .from(schema.crmPipelineSteps)
      .where(eq(schema.crmPipelineSteps.crmStepId, String(order.commercialSalesStepId)));
    if (step) {
      stepId = step.id;
      pipelineId = step.pipelineId;
    }
  }

  const [row] = await db
    .insert(schema.crmDeals)
    .values({
      crmDealId,
      crmContactId: order.contactId ? String(order.contactId) : null,
      nome: order.title || order.contact?.name || null,
      pipelineId,
      stepId,
      valor: order.amount || null,
      origem: "webhook_n8n",
      createdAtCrm: order.createdAt ? new Date(order.createdAt) : null,
      updatedAtCrm: order.updatedAt ? new Date(order.updatedAt) : null,
    })
    .onConflictDoUpdate({
      target: schema.crmDeals.crmDealId,
      set: {
        crmContactId: order.contactId ? String(order.contactId) : null,
        nome: order.title || order.contact?.name || null,
        pipelineId,
        stepId,
        valor: order.amount || null,
        updatedAtCrm: order.updatedAt ? new Date(order.updatedAt) : null,
        syncedAt: new Date(),
      },
    })
    .returning({ id: schema.crmDeals.id });

  const isNew = !existing;
  const stepChanged = existing && existing.stepId !== stepId;
  if ((isNew || stepChanged) && stepId) {
    await db.insert(schema.dealStageEvents).values({
      dealId: row.id,
      fromStepId: existing?.stepId ?? null,
      toStepId: stepId,
      source: "webhook_n8n",
      rawPayload: order as unknown as Record<string, unknown>,
    });
  }
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-webhook-secret");
  if (!secret || secret !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let payload: CrmWebhookPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  if (!payload?.event) {
    return NextResponse.json({ ok: false, error: "campo 'event' ausente" }, { status: 400 });
  }

  const idempotencyKey = idempotencyKeyFor(payload.event, payload.data);
  const [alreadyProcessed] = await db
    .select({ id: schema.webhookEventsLog.id })
    .from(schema.webhookEventsLog)
    .where(eq(schema.webhookEventsLog.idempotencyKey, idempotencyKey));

  if (alreadyProcessed) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  let error: string | null = null;
  try {
    if (COMMERCIAL_ORDER_EVENTS.includes(payload.event)) {
      await handleCommercialOrderEvent(payload.event, payload.data as CrmCommercialOrder);
    }
    // CONTACT_*, TICKET_*, MEETING_CREATED, TAG_APPLIED: registrados no log
    // abaixo mas sem ação própria ainda — o funil hoje só depende de negócios.
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  await db.insert(schema.webhookEventsLog).values({
    source: "n8n",
    eventType: payload.event,
    idempotencyKey,
    payload: payload as unknown as Record<string, unknown>,
    processed: !error,
    error,
  });

  if (error) {
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
