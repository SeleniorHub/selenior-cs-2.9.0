CREATE TYPE "public"."profile_role" AS ENUM('admin', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."churn_risk" AS ENUM('baixo', 'médio', 'alto');--> statement-breakpoint
CREATE TYPE "public"."client_phase" AS ENUM('Onboarding', 'Otimização', 'Escala', 'Consolidação', 'Aceleração');--> statement-breakpoint
CREATE TYPE "public"."client_status" AS ENUM('ativo', 'pausado', 'churned');--> statement-breakpoint
CREATE TYPE "public"."commission_type" AS ENUM('pct', 'fixo');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('briefing', 'contrato', 'qbr', 'apresentacao', 'gravacao', 'outro');--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('Não iniciado', 'Em progresso', 'Concluído');--> statement-breakpoint
CREATE TYPE "public"."deal_event_source" AS ENUM('webhook_n8n', 'reconciliation', 'manual');--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"role" "profile_role" DEFAULT 'viewer' NOT NULL,
	"nome" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "action_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"meeting_id" uuid,
	"texto" text NOT NULL,
	"responsavel" text,
	"data_prazo" date,
	"concluido" boolean DEFAULT false NOT NULL,
	"legacy_sheet_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "action_items_legacy_sheet_id_unique" UNIQUE("legacy_sheet_id")
);
--> statement-breakpoint
CREATE TABLE "client_checkpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"texto" text NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"nicho" text,
	"fase" "client_phase" DEFAULT 'Onboarding' NOT NULL,
	"churn" "churn_risk" DEFAULT 'baixo' NOT NULL,
	"status" "client_status" DEFAULT 'ativo' NOT NULL,
	"mrr_bruto" numeric(12, 2) DEFAULT '0' NOT NULL,
	"custo_mensal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"comissao_valor" numeric(12, 2),
	"comissao_tipo" "commission_type" DEFAULT 'pct' NOT NULL,
	"indicador" text,
	"nota_interna" text,
	"depoimento" text,
	"data_inicio" date,
	"data_fim" date,
	"legacy_sheet_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clients_legacy_sheet_id_unique" UNIQUE("legacy_sheet_id")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"tipo" "document_type" DEFAULT 'outro' NOT NULL,
	"nome" text NOT NULL,
	"storage_path" text,
	"legacy_drive_url" text,
	"tamanho" integer,
	"uploaded_by" uuid,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"legacy_sheet_id" text,
	CONSTRAINT "documents_legacy_sheet_id_unique" UNIQUE("legacy_sheet_id")
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"mes" text,
	"titulo" text NOT NULL,
	"status" "goal_status" DEFAULT 'Não iniciado' NOT NULL,
	"progresso" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) DEFAULT '100' NOT NULL,
	"unidade" text,
	"legacy_sheet_id" text,
	CONSTRAINT "goals_legacy_sheet_id_unique" UNIQUE("legacy_sheet_id")
);
--> statement-breakpoint
CREATE TABLE "meeting_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_id" uuid NOT NULL,
	"texto" text NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"data" date NOT NULL,
	"titulo" text,
	"duracao" text,
	"participantes" text,
	"resumo" text,
	"legacy_sheet_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meetings_legacy_sheet_id_unique" UNIQUE("legacy_sheet_id")
);
--> statement-breakpoint
CREATE TABLE "mrr_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"mes" date NOT NULL,
	"mrr" numeric(12, 2) DEFAULT '0' NOT NULL,
	"legacy_sheet_id" text,
	CONSTRAINT "mrr_history_legacy_sheet_id_unique" UNIQUE("legacy_sheet_id"),
	CONSTRAINT "mrr_history_client_mes_unique" UNIQUE("client_id","mes")
);
--> statement-breakpoint
CREATE TABLE "objectives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"texto" text NOT NULL,
	"icone" text,
	"legacy_sheet_id" text,
	CONSTRAINT "objectives_legacy_sheet_id_unique" UNIQUE("legacy_sheet_id")
);
--> statement-breakpoint
CREATE TABLE "crm_deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"crm_deal_id" text NOT NULL,
	"crm_contact_id" text,
	"nome" text,
	"pipeline_id" uuid,
	"step_id" uuid,
	"valor" numeric(12, 2),
	"origem" text,
	"created_at_crm" timestamp with time zone,
	"updated_at_crm" timestamp with time zone,
	"entrou_pipeline_at" timestamp with time zone,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crm_deals_crm_deal_id_unique" UNIQUE("crm_deal_id")
);
--> statement-breakpoint
CREATE TABLE "crm_pipeline_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"crm_step_id" text NOT NULL,
	"pipeline_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"is_won" boolean DEFAULT false NOT NULL,
	"is_lost" boolean DEFAULT false NOT NULL,
	CONSTRAINT "crm_pipeline_steps_crm_step_id_unique" UNIQUE("crm_step_id")
);
--> statement-breakpoint
CREATE TABLE "crm_pipelines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"crm_pipeline_id" text NOT NULL,
	"nome" text NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "crm_pipelines_crm_pipeline_id_unique" UNIQUE("crm_pipeline_id")
);
--> statement-breakpoint
CREATE TABLE "daily_funnel_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"data" date NOT NULL,
	"pipeline_id" uuid NOT NULL,
	"step_id" uuid NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"valor_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	CONSTRAINT "daily_funnel_snapshot_unique" UNIQUE("data","pipeline_id","step_id")
);
--> statement-breakpoint
CREATE TABLE "deal_stage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"from_step_id" uuid,
	"to_step_id" uuid NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source" "deal_event_source" DEFAULT 'webhook_n8n' NOT NULL,
	"raw_payload" jsonb
);
--> statement-breakpoint
CREATE TABLE "webhook_events_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"event_type" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"payload" jsonb,
	"processed" boolean DEFAULT false NOT NULL,
	"error" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_events_log_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_items" ADD CONSTRAINT "action_items_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_items" ADD CONSTRAINT "action_items_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_checkpoints" ADD CONSTRAINT "client_checkpoints_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_profiles_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_points" ADD CONSTRAINT "meeting_points_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mrr_history" ADD CONSTRAINT "mrr_history_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objectives" ADD CONSTRAINT "objectives_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_pipeline_id_crm_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."crm_pipelines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_step_id_crm_pipeline_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."crm_pipeline_steps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_pipeline_steps" ADD CONSTRAINT "crm_pipeline_steps_pipeline_id_crm_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."crm_pipelines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_funnel_snapshot" ADD CONSTRAINT "daily_funnel_snapshot_pipeline_id_crm_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."crm_pipelines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_funnel_snapshot" ADD CONSTRAINT "daily_funnel_snapshot_step_id_crm_pipeline_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."crm_pipeline_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_stage_events" ADD CONSTRAINT "deal_stage_events_deal_id_crm_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."crm_deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_stage_events" ADD CONSTRAINT "deal_stage_events_from_step_id_crm_pipeline_steps_id_fk" FOREIGN KEY ("from_step_id") REFERENCES "public"."crm_pipeline_steps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_stage_events" ADD CONSTRAINT "deal_stage_events_to_step_id_crm_pipeline_steps_id_fk" FOREIGN KEY ("to_step_id") REFERENCES "public"."crm_pipeline_steps"("id") ON DELETE cascade ON UPDATE no action;