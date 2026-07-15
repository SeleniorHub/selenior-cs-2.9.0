-- "total_mensagens" media volume bruto de mensagens (todas, nas duas direções),
-- que é bem maior que o número real de "interações" que o CRM mostra no próprio
-- dashboard (conversas distintas com atividade no dia). Confirmado empiricamente
-- com o usuário: CRM mostrava 146 conversas interagidas num dia em que essa coluna
-- tinha 757. Renomeia pra "interacoes" e zera o histórico, já que os valores
-- antigos media outra coisa (não dá pra "corrigir" retroativamente — o cálculo
-- novo depende de dado que só existe no dia em que é calculado).

ALTER TABLE "daily_account_metrics" RENAME COLUMN "total_mensagens" TO "interacoes";
--> statement-breakpoint

UPDATE "daily_account_metrics" SET "interacoes" = 0;
