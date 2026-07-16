-- Denormaliza account_id em deal_stage_events pra permitir filtrar por conta direto
-- (sem IN gigante com milhares de deal_ids, que estoura limite de query do
-- PostgREST). Backfill via join com crm_deals — a tabela hoje tem poucas linhas
-- (rastreamento começou em 14/07/2026), então é rápido.

ALTER TABLE "deal_stage_events" ADD COLUMN "account_id" uuid REFERENCES "crm_accounts"("id") ON DELETE CASCADE;
--> statement-breakpoint

UPDATE "deal_stage_events" e
SET "account_id" = d."account_id"
FROM "crm_deals" d
WHERE d."id" = e."deal_id";
--> statement-breakpoint

ALTER TABLE "deal_stage_events" ALTER COLUMN "account_id" SET NOT NULL;
