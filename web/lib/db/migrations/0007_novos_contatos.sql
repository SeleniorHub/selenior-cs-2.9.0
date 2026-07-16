-- Novos contatos (qualquer pessoa nova no WhatsApp) é diferente de novos_leads
-- (só quem virou negócio no funil de vendas). Métrica adicional pedida pelo
-- usuário, preenchida via backfill manual por enquanto (não sincronizamos /contact).

ALTER TABLE "daily_account_metrics" ADD COLUMN "novos_contatos" integer NOT NULL DEFAULT 0;
