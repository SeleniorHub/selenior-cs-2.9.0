import {
  boolean,
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { profiles } from "./profiles";

export const clientPhaseEnum = pgEnum("client_phase", [
  "Onboarding",
  "Otimização",
  "Escala",
  "Consolidação",
  "Aceleração",
]);
export const churnRiskEnum = pgEnum("churn_risk", ["baixo", "médio", "alto"]);
export const clientStatusEnum = pgEnum("client_status", ["ativo", "pausado", "churned"]);
export const commissionTypeEnum = pgEnum("commission_type", ["pct", "fixo"]);
export const goalStatusEnum = pgEnum("goal_status", [
  "Não iniciado",
  "Em progresso",
  "Concluído",
]);
export const documentTypeEnum = pgEnum("document_type", [
  "briefing",
  "contrato",
  "qbr",
  "apresentacao",
  "gravacao",
  "outro",
]);

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull(),
  nicho: text("nicho"),
  fase: clientPhaseEnum("fase").notNull().default("Onboarding"),
  churn: churnRiskEnum("churn").notNull().default("baixo"),
  status: clientStatusEnum("status").notNull().default("ativo"),
  mrrBruto: numeric("mrr_bruto", { precision: 12, scale: 2 }).notNull().default("0"),
  custoMensal: numeric("custo_mensal", { precision: 12, scale: 2 }).notNull().default("0"),
  comissaoValor: numeric("comissao_valor", { precision: 12, scale: 2 }),
  comissaoTipo: commissionTypeEnum("comissao_tipo").notNull().default("pct"),
  indicador: text("indicador"),
  notaInterna: text("nota_interna"),
  depoimento: text("depoimento"),
  dataInicio: date("data_inicio"),
  dataFim: date("data_fim"),
  legacySheetId: text("legacy_sheet_id").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const clientCheckpoints = pgTable("client_checkpoints", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  texto: text("texto").notNull(),
  done: boolean("done").notNull().default(false),
  ordem: integer("ordem").notNull().default(0),
});

export const meetings = pgTable("meetings", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  data: date("data").notNull(),
  titulo: text("titulo"),
  duracao: text("duracao"),
  participantes: text("participantes"),
  resumo: text("resumo"),
  legacySheetId: text("legacy_sheet_id").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const meetingPoints = pgTable("meeting_points", {
  id: uuid("id").primaryKey().defaultRandom(),
  meetingId: uuid("meeting_id")
    .notNull()
    .references(() => meetings.id, { onDelete: "cascade" }),
  texto: text("texto").notNull(),
  ordem: integer("ordem").notNull().default(0),
});

export const goals = pgTable("goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  mes: text("mes"),
  titulo: text("titulo").notNull(),
  status: goalStatusEnum("status").notNull().default("Não iniciado"),
  progresso: numeric("progresso", { precision: 12, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull().default("100"),
  unidade: text("unidade"),
  legacySheetId: text("legacy_sheet_id").unique(),
});

export const objectives = pgTable("objectives", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  texto: text("texto").notNull(),
  icone: text("icone"),
  legacySheetId: text("legacy_sheet_id").unique(),
});

export const actionItems = pgTable("action_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  meetingId: uuid("meeting_id").references(() => meetings.id, { onDelete: "set null" }),
  texto: text("texto").notNull(),
  responsavel: text("responsavel"),
  dataPrazo: date("data_prazo"),
  concluido: boolean("concluido").notNull().default(false),
  legacySheetId: text("legacy_sheet_id").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  tipo: documentTypeEnum("tipo").notNull().default("outro"),
  nome: text("nome").notNull(),
  storagePath: text("storage_path"),
  legacyDriveUrl: text("legacy_drive_url"),
  tamanho: integer("tamanho"),
  uploadedBy: uuid("uploaded_by").references(() => profiles.id, { onDelete: "set null" }),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  legacySheetId: text("legacy_sheet_id").unique(),
});

export const mrrHistory = pgTable(
  "mrr_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    mes: date("mes").notNull(),
    mrr: numeric("mrr", { precision: 12, scale: 2 }).notNull().default("0"),
    legacySheetId: text("legacy_sheet_id").unique(),
  },
  (t) => [unique("mrr_history_client_mes_unique").on(t.clientId, t.mes)]
);
