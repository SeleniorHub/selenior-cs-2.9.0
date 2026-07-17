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
import { clients } from "./cs";

export const dealEventSourceEnum = pgEnum("deal_event_source", [
  "webhook_n8n",
  "reconciliation",
  "manual",
]);

// Uma conta CRM por cliente monitorado (client_id null = conta própria da Selenior).
// Cada conta tem sua própria API key e sua própria URL de webhook (webhook_slug).
export const crmAccounts = pgTable("crm_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  apiKey: text("api_key").notNull(),
  webhookSlug: text("webhook_slug").notNull().unique(),
  webhookSecret: text("webhook_secret").notNull(),
  n8nWebhookUrl: text("n8n_webhook_url"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const crmPipelines = pgTable(
  "crm_pipelines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => crmAccounts.id, { onDelete: "cascade" }),
    crmPipelineId: text("crm_pipeline_id").notNull(),
    nome: text("nome").notNull(),
    ordem: integer("ordem").notNull().default(0),
  },
  (t) => [unique("crm_pipelines_account_unique").on(t.accountId, t.crmPipelineId)]
);

export const crmPipelineSteps = pgTable(
  "crm_pipeline_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => crmAccounts.id, { onDelete: "cascade" }),
    crmStepId: text("crm_step_id").notNull(),
    pipelineId: uuid("pipeline_id")
      .notNull()
      .references(() => crmPipelines.id, { onDelete: "cascade" }),
    nome: text("nome").notNull(),
    ordem: integer("ordem").notNull().default(0),
    isWon: boolean("is_won").notNull().default(false),
    isLost: boolean("is_lost").notNull().default(false),
  },
  (t) => [unique("crm_pipeline_steps_account_unique").on(t.accountId, t.crmStepId)]
);

export const crmDeals = pgTable(
  "crm_deals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => crmAccounts.id, { onDelete: "cascade" }),
    crmDealId: text("crm_deal_id").notNull(),
    crmContactId: text("crm_contact_id"),
    nome: text("nome"),
    pipelineId: uuid("pipeline_id").references(() => crmPipelines.id, { onDelete: "set null" }),
    stepId: uuid("step_id").references(() => crmPipelineSteps.id, { onDelete: "set null" }),
    valor: numeric("valor", { precision: 12, scale: 2 }),
    // status "cru" do CRM (OPEN/WON/LOST) — fonte de verdade pra saber se um
    // negócio está ganho de verdade. wonAt sozinho não é confiável: achamos
    // negócios com status=LOST que também tinham wonAt preenchido (fica "marcado"
    // mesmo se depois revertido).
    status: text("status"),
    wonAt: timestamp("won_at", { withTimezone: true }),
    lostAt: timestamp("lost_at", { withTimezone: true }),
    origem: text("origem"),
    createdAtCrm: timestamp("created_at_crm", { withTimezone: true }),
    updatedAtCrm: timestamp("updated_at_crm", { withTimezone: true }),
    entrouPipelineAt: timestamp("entrou_pipeline_at", { withTimezone: true }),
    // Pra medir taxa de no-show: reunião foi marcada mas nunca aconteceu quando
    // meetingCreatedAt existe e meetingRealizedAt é nulo.
    meetingCreatedAt: timestamp("meeting_created_at", { withTimezone: true }),
    meetingRealizedAt: timestamp("meeting_realized_at", { withTimezone: true }),
    // Tags do contato desse negócio (vêm embutidas no próprio payload de
    // /commercial-order, não precisa de sync separado de /contact). Usado pra
    // origem do lead (ex: "META", "Instagram", "Indicação").
    tags: jsonb("tags").$type<{ id: number; name: string; color: string }[]>(),
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("crm_deals_account_unique").on(t.accountId, t.crmDealId)]
);

export const dealStageEvents = pgTable("deal_stage_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Denormalizado pra permitir filtrar por conta direto (sem precisar de um IN com
  // milhares de deal_ids, que estoura limite de query do PostgREST).
  accountId: uuid("account_id")
    .notNull()
    .references(() => crmAccounts.id, { onDelete: "cascade" }),
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
    accountId: uuid("account_id")
      .notNull()
      .references(() => crmAccounts.id, { onDelete: "cascade" }),
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
    unique("daily_funnel_snapshot_unique").on(t.accountId, t.data, t.pipelineId, t.stepId),
  ]
);

// Métricas diárias por conta, pra comparação de períodos (ontem x hoje, semana x
// semana, mês x mês etc.) que o CRM não oferece nativamente.
export const dailyAccountMetrics = pgTable(
  "daily_account_metrics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => crmAccounts.id, { onDelete: "cascade" }),
    data: date("data").notNull(),
    novosLeads: integer("novos_leads").notNull().default(0),
    // Número de conversas (tickets) distintas com atividade no dia — não é
    // contagem de mensagens brutas. Calculado ao final do dia (cron 23:55) via
    // updatedAt dos tickets; não dá pra recalcular retroativamente pra dias
    // passados (o CRM só expõe o estado atual do ticket, não um log histórico).
    interacoes: integer("interacoes").notNull().default(0),
    // Vendas (negócios com status=WON) e faturamento por dia — baseado em won_at,
    // que reflete a data real de fechamento (esse sim dá pra recalcular
    // retroativamente pra qualquer mês passado, diferente de interações).
    vendas: integer("vendas").notNull().default(0),
    faturamento: numeric("faturamento", { precision: 14, scale: 2 }).notNull().default("0"),
  },
  (t) => [unique("daily_account_metrics_unique").on(t.accountId, t.data)]
);

// Tickets (conversas de atendimento) sincronizados periodicamente — não via
// webhook, é sync completo (cron a cada 3h). Usado pro alerta de mensagens não
// lidas e pra medir tempo médio de primeira resposta.
export const crmTickets = pgTable(
  "crm_tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => crmAccounts.id, { onDelete: "cascade" }),
    crmTicketId: text("crm_ticket_id").notNull(),
    crmContactId: text("crm_contact_id"),
    contactNome: text("contact_nome"),
    contactNumero: text("contact_numero"),
    status: text("status"),
    isGroup: boolean("is_group").notNull().default(false),
    unreadMessages: integer("unread_messages").notNull().default(0),
    queueId: text("queue_id"),
    lastMessage: text("last_message"),
    lastMessageHour: timestamp("last_message_hour", { withTimezone: true }),
    createdAtCrm: timestamp("created_at_crm", { withTimezone: true }),
    updatedAtCrm: timestamp("updated_at_crm", { withTimezone: true }),
    firstResponseAt: timestamp("first_response_at", { withTimezone: true }),
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("crm_tickets_account_unique").on(t.accountId, t.crmTicketId)]
);

export const webhookEventsLog = pgTable("webhook_events_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id").references(() => crmAccounts.id, { onDelete: "set null" }),
  source: text("source").notNull(),
  eventType: text("event_type").notNull(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  payload: jsonb("payload"),
  processed: boolean("processed").notNull().default(false),
  error: text("error"),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});
