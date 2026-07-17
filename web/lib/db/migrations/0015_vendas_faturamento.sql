-- Vendas e faturamento por dia, baseado em won_at (data real de fechamento) — dá
-- pra recalcular retroativamente pra qualquer mês passado.

ALTER TABLE "daily_account_metrics" ADD COLUMN "vendas" integer NOT NULL DEFAULT 0;
ALTER TABLE "daily_account_metrics" ADD COLUMN "faturamento" numeric(14,2) NOT NULL DEFAULT 0;
