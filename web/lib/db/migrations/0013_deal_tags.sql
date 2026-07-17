-- Tags do contato do negócio, já vêm embutidas em /commercial-order — não precisa
-- de sync separado de /contact. Usado pra origem do lead (ex: "META", "Instagram").

ALTER TABLE "crm_deals" ADD COLUMN "tags" jsonb;
