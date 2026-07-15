-- Métricas diárias por conta CRM (novos leads, total de mensagens) pra permitir
-- comparação de períodos (ontem x hoje, semana x semana, mês x mês) que o CRM não
-- oferece nativamente — só dá pra pedir um total agregado por período, não uma
-- série histórica dia a dia.

CREATE TABLE "daily_account_metrics" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "account_id" uuid NOT NULL REFERENCES "crm_accounts"("id") ON DELETE CASCADE,
  "data" date NOT NULL,
  "novos_leads" integer NOT NULL DEFAULT 0,
  "total_mensagens" integer NOT NULL DEFAULT 0,
  CONSTRAINT "daily_account_metrics_unique" UNIQUE ("account_id", "data")
);
--> statement-breakpoint

ALTER TABLE "daily_account_metrics" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "daily_account_metrics_select" ON "daily_account_metrics" FOR SELECT USING (public.has_profile());
