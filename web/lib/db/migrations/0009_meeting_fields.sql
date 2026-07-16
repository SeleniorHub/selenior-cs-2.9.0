-- Campos de reunião do negócio (vêm prontos no /commercial-order, nunca tinham sido
-- sincronizados). meetingCreatedAt existe + meetingRealizedAt nulo = reunião marcada
-- e não realizada (no-show).

ALTER TABLE "crm_deals" ADD COLUMN "meeting_created_at" timestamptz;
ALTER TABLE "crm_deals" ADD COLUMN "meeting_realized_at" timestamptz;
