-- Contas de CRM por cliente: cada cliente monitorado (ou a própria Selenior, com
-- client_id null) passa a ter sua própria conta na plataforma CRM Oráculo, com API
-- key e webhook_slug/secret próprios. As tabelas de funil (crm_pipelines,
-- crm_pipeline_steps, crm_deals, daily_funnel_snapshot) passam a ser escopadas por
-- account_id em vez de globais.
--
-- Esta migração só cria a estrutura (sem segredos). O backfill dos dados já
-- existentes (que pertenciam à conta "própria" da Selenior) e a criação dessa conta
-- inicial acontecem em scripts/setup-crm-accounts.ts, que lê as chaves do .env.local
-- e finaliza as constraints NOT NULL/UNIQUE compostas depois do backfill.

CREATE TABLE "crm_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "client_id" uuid REFERENCES "clients"("id") ON DELETE CASCADE,
  "nome" text NOT NULL,
  "api_key" text NOT NULL,
  "webhook_slug" text NOT NULL UNIQUE,
  "webhook_secret" text NOT NULL,
  "ativo" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

ALTER TABLE "crm_pipelines" ADD COLUMN "account_id" uuid REFERENCES "crm_accounts"("id") ON DELETE CASCADE;
--> statement-breakpoint

ALTER TABLE "crm_pipeline_steps" ADD COLUMN "account_id" uuid REFERENCES "crm_accounts"("id") ON DELETE CASCADE;
--> statement-breakpoint

ALTER TABLE "crm_deals" ADD COLUMN "account_id" uuid REFERENCES "crm_accounts"("id") ON DELETE CASCADE;
--> statement-breakpoint

ALTER TABLE "daily_funnel_snapshot" ADD COLUMN "account_id" uuid REFERENCES "crm_accounts"("id") ON DELETE CASCADE;
--> statement-breakpoint

ALTER TABLE "webhook_events_log" ADD COLUMN "account_id" uuid REFERENCES "crm_accounts"("id") ON DELETE SET NULL;
--> statement-breakpoint

-- crm_accounts guarda api_key/webhook_secret em texto puro: nenhuma policy é criada
-- (nem para authenticated, nem para anon) — só o service_role (conexão Drizzle direta
-- via DATABASE_URL) acessa esta tabela, igual ao padrão já usado em webhook_events_log.
ALTER TABLE "crm_accounts" ENABLE ROW LEVEL SECURITY;
