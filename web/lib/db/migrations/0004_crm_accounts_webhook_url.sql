-- Guarda a URL pública do webhook do n8n explicitamente em vez de derivá-la por
-- convenção (o workflow original da Selenior usa o path "selenior-cs-crm-events",
-- que não segue o padrão "${webhook_slug}-crm-events" adotado depois — derivar por
-- fórmula mostraria uma URL errada para essa conta).

ALTER TABLE "crm_accounts" ADD COLUMN "n8n_webhook_url" text;
