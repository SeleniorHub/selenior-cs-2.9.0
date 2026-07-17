-- Nome/número do contato vêm embutidos no próprio payload de /ticket — guardar
-- direto evita precisar de um sync separado de /contact só pra exibir quem está
-- esperando resposta no alerta de mensagens não lidas.

ALTER TABLE "crm_tickets" ADD COLUMN "contact_nome" text;
ALTER TABLE "crm_tickets" ADD COLUMN "contact_numero" text;
