import { createHash } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import type { CrmCommercialOrder, CrmWebhookEvent, CrmWebhookPayload } from "@/lib/crm/types";

const COMMERCIAL_ORDER_EVENTS: CrmWebhookEvent[] = [
  "COMMERCIAL_ORDER_CREATED",
  "COMMERCIAL_ORDER_CHANGED",
  "COMMERCIAL_ORDER_STEP_CHANGED",
];

function idempotencyKeyFor(accountId: string, event: string, data: unknown): string {
  const raw = JSON.stringify({ accountId, event, data });
  return createHash("sha256").update(raw).digest("hex");
}

async function handleCommercialOrderEvent(accountId: string, order: CrmCommercialOrder) {
  const crmDealId = String(order.id);

  const [existing] = await db
    .select({ id: schema.crmDeals.id, stepId: schema.crmDeals.stepId })
    .from(schema.crmDeals)
    .where(and(eq(schema.crmDeals.accountId, accountId), eq(schema.crmDeals.crmDealId, crmDealId)));

  let stepId: string | null = null;
  let pipelineId: string | null = null;
  if (order.commercialSalesStepId) {
    const [step] = await db
      .select({ id: schema.crmPipelineSteps.id, pipelineId: schema.crmPipelineSteps.pipelineId })
      .from(schema.crmPipelineSteps)
      .where(
        and(
          eq(schema.crmPipelineSteps.accountId, accountId),
          eq(schema.crmPipelineSteps.crmStepId, String(order.commercialSalesStepId))
        )
      );
    if (step) {
      stepId = step.id;
      pipelineId = step.pipelineId;
    }
  }

  const [row] = await db
    .insert(schema.crmDeals)
    .values({
      accountId,
      crmDealId,
      crmContactId: order.contactId ? String(order.contactId) : null,
      nome: order.title || order.contact?.name || null,
      pipelineId,
      stepId,
      valor: order.amount || null,
      origem: "webhook_n8n",
      createdAtCrm: order.createdAt ? new Date(order.createdAt) : null,
      updatedAtCrm: order.updatedAt ? new Date(order.updatedAt) : null,
      meetingCreatedAt: order.meetingCreatedAt ? new Date(order.meetingCreatedAt) : null,
      meetingRealizedAt: order.meetingRealizedAt ? new Date(order.meetingRealizedAt) : null,
      tags: order.contact?.tags ?? null,
    })
    .onConflictDoUpdate({
      target: [schema.crmDeals.accountId, schema.crmDeals.crmDealId],
      set: {
        crmContactId: order.contactId ? String(order.contactId) : null,
        nome: order.title || order.contact?.name || null,
        pipelineId,
        stepId,
        valor: order.amount || null,
        updatedAtCrm: order.updatedAt ? new Date(order.updatedAt) : null,
        meetingCreatedAt: order.meetingCreatedAt ? new Date(order.meetingCreatedAt) : null,
        meetingRealizedAt: order.meetingRealizedAt ? new Date(order.meetingRealizedAt) : null,
        tags: order.contact?.tags ?? null,
        syncedAt: new Date(),
      },
    })
    .returning({ id: schema.crmDeals.id });

  const isNew = !existing;
  const stepChanged = existing && existing.stepId !== stepId;
  if ((isNew || stepChanged) && stepId) {
    await db.insert(schema.dealStageEvents).values({
      accountId,
      dealId: row.id,
      fromStepId: existing?.stepId ?? null,
      toStepId: stepId,
      source: "webhook_n8n",
      rawPayload: order as unknown as Record<string, unknown>,
    });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const [account] = await db
    .select({ id: schema.crmAccounts.id, webhookSecret: schema.crmAccounts.webhookSecret, ativo: schema.crmAccounts.ativo })
    .from(schema.crmAccounts)
    .where(eq(schema.crmAccounts.webhookSlug, slug));

  if (!account || !account.ativo) {
    return NextResponse.json({ ok: false, error: "conta não encontrada" }, { status: 404 });
  }

  const secret = request.headers.get("x-webhook-secret");
  if (!secret || secret !== account.webhookSecret) {
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

  const idempotencyKey = idempotencyKeyFor(account.id, payload.event, payload.data);
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
      await handleCommercialOrderEvent(account.id, payload.data as CrmCommercialOrder);
    }
    // CONTACT_*, TICKET_*, MEETING_CREATED, TAG_APPLIED: registrados no log
    // abaixo mas sem ação própria ainda — o funil hoje só depende de negócios.
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  await db.insert(schema.webhookEventsLog).values({
    accountId: account.id,
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
