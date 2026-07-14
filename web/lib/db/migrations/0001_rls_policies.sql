-- RLS: SELECT liberado para qualquer usuário com profile; INSERT/UPDATE/DELETE só admin.
-- Tabelas de sistema (crm_*, daily_funnel_snapshot) só leitura para usuários; escrita é
-- sempre via service_role (webhook do N8N, sync do CRM), que ignora RLS.
-- webhook_events_log não tem nenhuma policy para authenticated/anon — só service_role acessa.

ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "client_checkpoints" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "meetings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "meeting_points" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "goals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "objectives" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "action_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mrr_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm_pipelines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm_pipeline_steps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm_deals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "deal_stage_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "daily_funnel_snapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "webhook_events_log" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Função helper: usuário autenticado atual é admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  );
$$;
--> statement-breakpoint

-- Função helper: usuário autenticado atual tem profile provisionado (admin ou viewer)?
CREATE OR REPLACE FUNCTION public.has_profile()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
  );
$$;
--> statement-breakpoint

-- profiles: cada usuário só lê o próprio registro
CREATE POLICY "profiles_select_own" ON "profiles" FOR SELECT
  USING (id = auth.uid());
--> statement-breakpoint

-- Tabelas de domínio CS: leitura para qualquer usuário provisionado, escrita só admin
CREATE POLICY "clients_select" ON "clients" FOR SELECT USING (public.has_profile());
CREATE POLICY "clients_write" ON "clients" FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
--> statement-breakpoint

CREATE POLICY "client_checkpoints_select" ON "client_checkpoints" FOR SELECT USING (public.has_profile());
CREATE POLICY "client_checkpoints_write" ON "client_checkpoints" FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
--> statement-breakpoint

CREATE POLICY "meetings_select" ON "meetings" FOR SELECT USING (public.has_profile());
CREATE POLICY "meetings_write" ON "meetings" FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
--> statement-breakpoint

CREATE POLICY "meeting_points_select" ON "meeting_points" FOR SELECT USING (public.has_profile());
CREATE POLICY "meeting_points_write" ON "meeting_points" FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
--> statement-breakpoint

CREATE POLICY "goals_select" ON "goals" FOR SELECT USING (public.has_profile());
CREATE POLICY "goals_write" ON "goals" FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
--> statement-breakpoint

CREATE POLICY "objectives_select" ON "objectives" FOR SELECT USING (public.has_profile());
CREATE POLICY "objectives_write" ON "objectives" FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
--> statement-breakpoint

CREATE POLICY "action_items_select" ON "action_items" FOR SELECT USING (public.has_profile());
CREATE POLICY "action_items_write" ON "action_items" FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
--> statement-breakpoint

CREATE POLICY "documents_select" ON "documents" FOR SELECT USING (public.has_profile());
CREATE POLICY "documents_write" ON "documents" FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
--> statement-breakpoint

CREATE POLICY "mrr_history_select" ON "mrr_history" FOR SELECT USING (public.has_profile());
CREATE POLICY "mrr_history_write" ON "mrr_history" FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
--> statement-breakpoint

-- Tabelas de funil de CRM: só leitura para usuários provisionados; escrita é sempre via service_role
CREATE POLICY "crm_pipelines_select" ON "crm_pipelines" FOR SELECT USING (public.has_profile());
CREATE POLICY "crm_pipeline_steps_select" ON "crm_pipeline_steps" FOR SELECT USING (public.has_profile());
CREATE POLICY "crm_deals_select" ON "crm_deals" FOR SELECT USING (public.has_profile());
CREATE POLICY "deal_stage_events_select" ON "deal_stage_events" FOR SELECT USING (public.has_profile());
CREATE POLICY "daily_funnel_snapshot_select" ON "daily_funnel_snapshot" FOR SELECT USING (public.has_profile());

-- webhook_events_log: nenhuma policy — só service_role acessa (ignora RLS por padrão)
