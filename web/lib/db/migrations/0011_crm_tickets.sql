-- Tickets (conversas de atendimento), sincronizados periodicamente (não via
-- webhook). Base pro alerta de mensagens não lidas e tempo médio de resposta.

CREATE TABLE "crm_tickets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "account_id" uuid NOT NULL REFERENCES "crm_accounts"("id") ON DELETE CASCADE,
  "crm_ticket_id" text NOT NULL,
  "crm_contact_id" text,
  "status" text,
  "is_group" boolean NOT NULL DEFAULT false,
  "unread_messages" integer NOT NULL DEFAULT 0,
  "queue_id" text,
  "last_message" text,
  "last_message_hour" timestamptz,
  "created_at_crm" timestamptz,
  "updated_at_crm" timestamptz,
  "first_response_at" timestamptz,
  "synced_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "crm_tickets_account_unique" UNIQUE ("account_id", "crm_ticket_id")
);
--> statement-breakpoint

ALTER TABLE "crm_tickets" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "crm_tickets_select" ON "crm_tickets" FOR SELECT USING (public.has_profile());
