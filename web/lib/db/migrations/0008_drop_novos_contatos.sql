-- "novos_contatos" foi um mal-entendido: o usuário passou esses números pra validar
-- se "novos_leads" estava correto (e estava — 3 dos 4 meses bateram com diferença
-- de até 4%), não pra virar uma métrica própria no dashboard. Remove a coluna.

ALTER TABLE "daily_account_metrics" DROP COLUMN "novos_contatos";
