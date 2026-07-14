import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const dealEventSourceEnum = pgEnum("deal_event_source", [
  "webhook_n8n",
  "reconciliation",
  "manual",
]);

export const crmPipelines = pgTable("crm_pipelines", {
  id: uuid("id").primaryKey().defaultRandom(),
  crmPipelineId: text("crm_pipeline_id").notNull().unique(),
  nome: text("nome").notNull(),
  ordem: integer("ordem").notNull().default(0),
});

export const crmPipelineSteps = pgTable("crm_pipeline_steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  crmStepId: text("crm_step_id").notNull().unique(),
  pipelineId: uuid("pipeline_id")
    .notNull()
    .references(() => crmPipelines.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  ordem: integer("ordem").notNull().default(0),
  isWon: boolean("is_won").notNull().default(false),
  isLost: boolean("is_lost").notNull().default(false),
});

export const crmDeals = pgTable("crm_deals", {
  id: uuid("id").primaryKey().defaultRandom(),
  crmDealId: text("crm_deal_id").notNull().unique(),
  crmContactId: text("crm_contact_id"),
  nome: text("nome"),
  pipelineId: uuid("pipeline_id").references(() => crmPipelines.id, { onDelete: "set null" }),
  stepId: uuid("step_id").references(() => crmPipelineSteps.id, { onDelete: "set null" }),
  valor: numeric("valor", { precision: 12, scale: 2 }),
  origem: text("origem"),
  createdAtCrm: timestamp("created_at_crm", { withTimezone: true }),
  updatedAtCrm: timestamp("updated_at_crm", { withTimezone: true }),
  entrouPipelineAt: timestamp("entrou_pipeline_at", { withTimezone: true }),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
});

export const dealStageEvents = pgTable("deal_stage_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealId: uuid("deal_id")
    .notNull()
    .references(() => crmDeals.id, { onDelete: "cascade" }),
  fromStepId: uuid("from_step_id").references(() => crmPipelineSteps.id, { onDelete: "set null" }),
  toStepId: uuid("to_step_id")
    .notNull()
    .references(() => crmPipelineSteps.id, { onDelete: "cascade" }),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  source: dealEventSourceEnum("source").notNull().default("webhook_n8n"),
  rawPayload: jsonb("raw_payload"),
});

export const dailyFunnelSnapshot = pgTable(
  "daily_funnel_snapshot",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    data: date("data").notNull(),
    pipelineId: uuid("pipeline_id")
      .notNull()
      .references(() => crmPipelines.id, { onDelete: "cascade" }),
    stepId: uuid("step_id")
      .notNull()
      .references(() => crmPipelineSteps.id, { onDelete: "cascade" }),
    count: integer("count").notNull().default(0),
    valorTotal: numeric("valor_total", { precision: 14, scale: 2 }).notNull().default("0"),
  },
  (t) => [
    unique("daily_funnel_snapshot_unique").on(t.data, t.pipelineId, t.stepId),
  ]
);

export const webhookEventsLog = pgTable("webhook_events_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: text("source").notNull(),
  eventType: text("event_type").notNull(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  payload: jsonb("payload"),
  processed: boolean("processed").notNull().default(false),
  error: text("error"),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});
