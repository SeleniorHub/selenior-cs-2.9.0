-- status "cru" do CRM (OPEN/WON/LOST) — fonte de verdade pra vendas. wonAt sozinho
-- não é confiável (achamos negócios status=LOST com wonAt preenchido também).

ALTER TABLE "crm_deals" ADD COLUMN "status" text;
ALTER TABLE "crm_deals" ADD COLUMN "won_at" timestamptz;
ALTER TABLE "crm_deals" ADD COLUMN "lost_at" timestamptz;
