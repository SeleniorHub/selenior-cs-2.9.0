import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { z } from "zod";
import * as schema from "../lib/db/schema";

const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbycoqE3qUIILWmzk1SUyuMBg0kphSFajOwkHqQRPwNAaOSgpBu_2FP18diwebM3E_DJHw/exec";

const COMMIT = process.argv.includes("--commit");

// ── helpers portados de js/api.js e js/views.js ──

function normalizeSheetDate(v: unknown): string | undefined {
  const m = String(v || "").match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : undefined;
}

function normalizeNumericString(v: unknown): string {
  const digits = String(v ?? "").replace(/\D/g, "");
  return digits || "0";
}

function normalizeDecimalString(v: unknown): string | undefined {
  const s = String(v ?? "").trim().replace(",", ".");
  if (!s) return undefined;
  return /^-?\d+(\.\d+)?$/.test(s) ? s : undefined;
}

// ── mappers linha→objeto (posição de coluna), fiéis ao js/api.js original ──

function rowToClient(r: unknown[]) {
  return {
    legacyId: String(r[0] ?? ""),
    nome: String(r[1] ?? ""),
    nicho: String(r[2] ?? ""),
    fase: String(r[3] ?? "Onboarding"),
    churn: String(r[4] ?? "baixo"),
    dataInicio: normalizeSheetDate(r[5]),
    mrr: String(r[6] ?? "0"),
    indicador: String(r[7] ?? ""),
    comissaoVal: r[8] != null ? String(r[8]) : undefined,
    comissaoTipo: String(r[9] ?? "pct"),
    checkpoints: r[10] ? String(r[10]).split("||").filter(Boolean) : [],
    done: r[11] ? String(r[11]).split("||").filter(Boolean) : [],
    nota: String(r[12] ?? ""),
    depoimento: String(r[13] ?? ""),
    status: String(r[14] ?? "ativo"),
    dataFim: normalizeSheetDate(r[15]),
    custo: String(r[16] ?? "0"),
  };
}

function rowToReuniao(r: unknown[]) {
  return {
    legacyId: String(r[0] ?? ""),
    clienteId: String(r[1] ?? ""),
    data: normalizeSheetDate(r[2]),
    titulo: String(r[3] ?? ""),
    duracao: String(r[4] ?? ""),
    participantes: String(r[5] ?? ""),
    resumo: String(r[6] ?? ""),
    pontos: r[7] ? String(r[7]).split("||").filter(Boolean) : [],
  };
}

function rowToMeta(r: unknown[]) {
  return {
    legacyId: String(r[0] ?? ""),
    clienteId: String(r[1] ?? ""),
    mes: String(r[2] ?? ""),
    titulo: String(r[3] ?? ""),
    status: String(r[4] ?? "Não iniciado"),
    progresso: parseFloat(String(r[5])) || 0,
    total: parseFloat(String(r[6])) || 100,
    unidade: String(r[7] ?? ""),
  };
}

function rowToObj(r: unknown[]) {
  return {
    legacyId: String(r[0] ?? ""),
    clienteId: String(r[1] ?? ""),
    texto: String(r[2] ?? ""),
    icone: String(r[3] ?? ""),
  };
}

function rowToAI(r: unknown[]) {
  return {
    legacyId: String(r[0] ?? ""),
    clienteId: String(r[1] ?? ""),
    reuniaoLegacyId: r[2] ? String(r[2]) : undefined,
    texto: String(r[3] ?? ""),
    responsavel: String(r[4] ?? ""),
    concluido: String(r[6]) === "1",
    dataPrazo: normalizeSheetDate(r[7]),
  };
}

function rowToDoc(r: unknown[]) {
  return {
    legacyId: String(r[0] ?? ""),
    clienteId: String(r[1] ?? ""),
    tipo: String(r[2] ?? "outro"),
    nome: String(r[3] ?? ""),
    driveFileId: String(r[4] ?? ""),
    url: String(r[5] ?? ""),
    tamanho: parseInt(String(r[6])) || 0,
    uploadedAt: r[7] ? String(r[7]) : undefined,
  };
}

function rowToHistMRR(r: unknown[]) {
  return {
    legacyId: String(r[0] ?? ""),
    clienteId: String(r[1] ?? ""),
    mes: String(r[2] ?? ""),
    mrr: parseFloat(String(r[3])) || 0,
  };
}

// ── validação/coerção ──

const FASES = ["Onboarding", "Otimização", "Escala", "Consolidação", "Aceleração"] as const;
const CHURN = ["baixo", "médio", "alto"] as const;
const STATUS = ["ativo", "pausado", "churned"] as const;
const COMISSAO_TIPO = ["pct", "fixo"] as const;
const DOC_TIPOS = ["briefing", "contrato", "qbr", "apresentacao", "gravacao", "outro"] as const;
const GOAL_STATUS = ["Não iniciado", "Em progresso", "Concluído"] as const;

const ClientSchema = z.object({
  legacyId: z.string().min(1),
  nome: z.string().min(1),
  nicho: z.string(),
  fase: z.enum(FASES).catch("Onboarding"),
  churn: z.enum(CHURN).catch("baixo"),
  status: z.enum(STATUS).catch("ativo"),
  dataInicio: z.string().optional(),
  dataFim: z.string().optional(),
  mrr: z.string(),
  custo: z.string(),
  indicador: z.string(),
  comissaoVal: z.string().optional(),
  comissaoTipo: z.enum(COMISSAO_TIPO).catch("pct"),
  checkpoints: z.array(z.string()),
  done: z.array(z.string()),
  nota: z.string(),
  depoimento: z.string(),
});

const MeetingSchema = z.object({
  legacyId: z.string().min(1),
  clienteId: z.string().min(1),
  data: z.string({ error: "data inválida ou ausente" }),
  titulo: z.string(),
  duracao: z.string(),
  participantes: z.string(),
  resumo: z.string(),
  pontos: z.array(z.string()),
});

const GoalSchema = z.object({
  legacyId: z.string().min(1),
  clienteId: z.string().min(1),
  mes: z.string(),
  titulo: z.string().min(1),
  status: z.enum(GOAL_STATUS).catch("Não iniciado"),
  progresso: z.number(),
  total: z.number(),
  unidade: z.string(),
});

const ObjSchema = z.object({
  legacyId: z.string().min(1),
  clienteId: z.string().min(1),
  texto: z.string().min(1),
  icone: z.string(),
});

const AISchema = z.object({
  legacyId: z.string().min(1),
  clienteId: z.string().min(1),
  reuniaoLegacyId: z.string().optional(),
  texto: z.string().min(1),
  responsavel: z.string(),
  concluido: z.boolean(),
  dataPrazo: z.string().optional(),
});

const DocSchema = z.object({
  legacyId: z.string().min(1),
  clienteId: z.string().min(1),
  tipo: z.enum(DOC_TIPOS).catch("outro"),
  nome: z.string().min(1),
  driveFileId: z.string(),
  url: z.string(),
  tamanho: z.number(),
  uploadedAt: z.string().optional(),
});

const HistMRRSchema = z.object({
  legacyId: z.string().min(1),
  clienteId: z.string().min(1),
  mes: z.string().regex(/^\d{4}-\d{2}$/, "mês precisa ser YYYY-MM"),
  mrr: z.number(),
});

function validateAll<T>(rows: unknown[][], mapper: (r: unknown[]) => unknown, schema: z.ZodType<T>, label: string) {
  const valid: T[] = [];
  const issues: string[] = [];
  rows.forEach((r, i) => {
    const mapped = mapper(r);
    const result = schema.safeParse(mapped);
    if (result.success) {
      valid.push(result.data);
    } else {
      issues.push(`${label} linha ${i + 1} (id=${(mapped as { legacyId?: string }).legacyId ?? "?"}): ${result.error.issues.map((e) => e.message).join("; ")}`);
    }
  });
  return { valid, issues };
}

async function main() {
  const authHash = process.env.MIGRATION_AUTH_HASH;
  if (!authHash) {
    throw new Error(
      "Defina MIGRATION_AUTH_HASH no .env.local (hash SHA-256 da senha de admin do app antigo)."
    );
  }

  console.log(`Buscando dados de ${SCRIPT_URL} ...`);
  const res = await fetch(`${SCRIPT_URL}?auth=${authHash}`);
  const json = await res.json();
  if (!json.ok) {
    throw new Error("Falha ao buscar dados do Apps Script: " + (json.error ?? "erro desconhecido"));
  }
  const data = json.data as Record<string, unknown[][]>;

  const clients = validateAll(data.Clientes ?? [], rowToClient, ClientSchema, "Cliente");
  const meetings = validateAll(data.Reunioes ?? [], rowToReuniao, MeetingSchema, "Reunião");
  const goals = validateAll(data.Metas ?? [], rowToMeta, GoalSchema, "Meta");
  const objectives = validateAll(data.Objetivos ?? [], rowToObj, ObjSchema, "Objetivo");
  const actionItems = validateAll(data.ActionItems ?? [], rowToAI, AISchema, "ActionItem");
  const documents = validateAll(data.Documentos ?? [], rowToDoc, DocSchema, "Documento");
  const mrrHistory = validateAll(data.HistoricoMRR ?? [], rowToHistMRR, HistMRRSchema, "HistoricoMRR");

  const clientLegacyIds = new Set(clients.valid.map((c) => c.legacyId));
  const orphanChecks: [string, { clienteId: string; legacyId: string }[]][] = [
    ["Reunião", meetings.valid],
    ["Meta", goals.valid],
    ["Objetivo", objectives.valid],
    ["ActionItem", actionItems.valid],
    ["Documento", documents.valid],
    ["HistoricoMRR", mrrHistory.valid],
  ];
  const orphanIssues: string[] = [];
  for (const [label, rows] of orphanChecks) {
    for (const row of rows) {
      if (!clientLegacyIds.has(row.clienteId)) {
        orphanIssues.push(`${label} id=${row.legacyId} referencia cliente inexistente (clienteId=${row.clienteId})`);
      }
    }
  }

  console.log("\n=== Resumo ===");
  console.log(`Clientes:        ${clients.valid.length} válidos / ${data.Clientes?.length ?? 0} total`);
  console.log(`Reuniões:        ${meetings.valid.length} válidas / ${data.Reunioes?.length ?? 0} total`);
  console.log(`Metas:           ${goals.valid.length} válidas / ${data.Metas?.length ?? 0} total`);
  console.log(`Objetivos:       ${objectives.valid.length} válidos / ${data.Objetivos?.length ?? 0} total`);
  console.log(`Action items:    ${actionItems.valid.length} válidos / ${data.ActionItems?.length ?? 0} total`);
  console.log(`Documentos:      ${documents.valid.length} válidos / ${data.Documentos?.length ?? 0} total`);
  console.log(`Histórico MRR:   ${mrrHistory.valid.length} válidos / ${data.HistoricoMRR?.length ?? 0} total`);

  const allIssues = [
    ...clients.issues,
    ...meetings.issues,
    ...goals.issues,
    ...objectives.issues,
    ...actionItems.issues,
    ...documents.issues,
    ...mrrHistory.issues,
    ...orphanIssues,
  ];
  if (allIssues.length) {
    console.log(`\n=== ${allIssues.length} problema(s) encontrado(s) (linhas serão puladas) ===`);
    allIssues.forEach((i) => console.log(" - " + i));
  } else {
    console.log("\nNenhum problema de validação encontrado.");
  }

  if (!COMMIT) {
    console.log("\nDry-run — nada foi escrito no banco. Rode com --commit para aplicar.");
    return;
  }

  const connectionString = process.env.DIRECT_URL;
  if (!connectionString) throw new Error("DIRECT_URL não definida no .env.local");
  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client, { schema });

  console.log("\n=== Aplicando no Postgres ===");

  await db.transaction(async (tx) => {
    const clientIdMap = new Map<string, string>();
    for (const c of clients.valid) {
      const [row] = await tx
        .insert(schema.clients)
        .values({
          nome: c.nome,
          nicho: c.nicho || null,
          fase: c.fase,
          churn: c.churn,
          status: c.status,
          dataInicio: c.dataInicio || null,
          dataFim: c.dataFim || null,
          mrrBruto: normalizeNumericString(c.mrr),
          custoMensal: normalizeNumericString(c.custo),
          comissaoValor: normalizeDecimalString(c.comissaoVal) || null,
          comissaoTipo: c.comissaoTipo,
          indicador: c.indicador || null,
          notaInterna: c.nota || null,
          depoimento: c.depoimento || null,
          legacySheetId: c.legacyId,
        })
        .onConflictDoUpdate({
          target: schema.clients.legacySheetId,
          set: {
            nome: c.nome,
            nicho: c.nicho || null,
            fase: c.fase,
            churn: c.churn,
            status: c.status,
            dataInicio: c.dataInicio || null,
            dataFim: c.dataFim || null,
            mrrBruto: normalizeNumericString(c.mrr),
            custoMensal: normalizeNumericString(c.custo),
            comissaoValor: normalizeDecimalString(c.comissaoVal) || null,
            comissaoTipo: c.comissaoTipo,
            indicador: c.indicador || null,
            notaInterna: c.nota || null,
            depoimento: c.depoimento || null,
            updatedAt: new Date(),
          },
        })
        .returning({ id: schema.clients.id });
      clientIdMap.set(c.legacyId, row.id);

      await tx.delete(schema.clientCheckpoints).where(eq(schema.clientCheckpoints.clientId, row.id));
      const doneNorm = c.done.map((d) => d.trim().toLowerCase());
      if (c.checkpoints.length) {
        await tx.insert(schema.clientCheckpoints).values(
          c.checkpoints.map((texto, ordem) => ({
            clientId: row.id,
            texto,
            ordem,
            done: doneNorm.includes(texto.trim().toLowerCase()),
          }))
        );
      }
    }
    console.log(`Clientes: ${clientIdMap.size} upserted`);

    const meetingIdMap = new Map<string, string>();
    for (const m of meetings.valid) {
      const clientId = clientIdMap.get(m.clienteId);
      if (!clientId) continue;
      const [row] = await tx
        .insert(schema.meetings)
        .values({
          clientId,
          data: m.data,
          titulo: m.titulo || null,
          duracao: m.duracao || null,
          participantes: m.participantes || null,
          resumo: m.resumo || null,
          legacySheetId: m.legacyId,
        })
        .onConflictDoUpdate({
          target: schema.meetings.legacySheetId,
          set: {
            clientId,
            data: m.data,
            titulo: m.titulo || null,
            duracao: m.duracao || null,
            participantes: m.participantes || null,
            resumo: m.resumo || null,
          },
        })
        .returning({ id: schema.meetings.id });
      meetingIdMap.set(m.legacyId, row.id);

      await tx.delete(schema.meetingPoints).where(eq(schema.meetingPoints.meetingId, row.id));
      if (m.pontos.length) {
        await tx.insert(schema.meetingPoints).values(
          m.pontos.map((texto, ordem) => ({ meetingId: row.id, texto, ordem }))
        );
      }
    }
    console.log(`Reuniões: ${meetingIdMap.size} upserted`);

    let goalCount = 0;
    for (const g of goals.valid) {
      const clientId = clientIdMap.get(g.clienteId);
      if (!clientId) continue;
      await tx
        .insert(schema.goals)
        .values({
          clientId,
          mes: g.mes || null,
          titulo: g.titulo,
          status: g.status,
          progresso: String(g.progresso),
          total: String(g.total),
          unidade: g.unidade || null,
          legacySheetId: g.legacyId,
        })
        .onConflictDoUpdate({
          target: schema.goals.legacySheetId,
          set: {
            clientId,
            mes: g.mes || null,
            titulo: g.titulo,
            status: g.status,
            progresso: String(g.progresso),
            total: String(g.total),
            unidade: g.unidade || null,
          },
        });
      goalCount++;
    }
    console.log(`Metas: ${goalCount} upserted`);

    let objCount = 0;
    for (const o of objectives.valid) {
      const clientId = clientIdMap.get(o.clienteId);
      if (!clientId) continue;
      await tx
        .insert(schema.objectives)
        .values({ clientId, texto: o.texto, icone: o.icone || null, legacySheetId: o.legacyId })
        .onConflictDoUpdate({
          target: schema.objectives.legacySheetId,
          set: { clientId, texto: o.texto, icone: o.icone || null },
        });
      objCount++;
    }
    console.log(`Objetivos: ${objCount} upserted`);

    let aiCount = 0;
    for (const a of actionItems.valid) {
      const clientId = clientIdMap.get(a.clienteId);
      if (!clientId) continue;
      const meetingId = a.reuniaoLegacyId ? meetingIdMap.get(a.reuniaoLegacyId) ?? null : null;
      await tx
        .insert(schema.actionItems)
        .values({
          clientId,
          meetingId,
          texto: a.texto,
          responsavel: a.responsavel || null,
          dataPrazo: a.dataPrazo || null,
          concluido: a.concluido,
          legacySheetId: a.legacyId,
        })
        .onConflictDoUpdate({
          target: schema.actionItems.legacySheetId,
          set: {
            clientId,
            meetingId,
            texto: a.texto,
            responsavel: a.responsavel || null,
            dataPrazo: a.dataPrazo || null,
            concluido: a.concluido,
          },
        });
      aiCount++;
    }
    console.log(`Action items: ${aiCount} upserted`);

    let docCount = 0;
    for (const d of documents.valid) {
      const clientId = clientIdMap.get(d.clienteId);
      if (!clientId) continue;
      const uploadedAt = d.uploadedAt && !isNaN(new Date(d.uploadedAt).getTime()) ? new Date(d.uploadedAt) : new Date();
      await tx
        .insert(schema.documents)
        .values({
          clientId,
          tipo: d.tipo,
          nome: d.nome,
          storagePath: null,
          legacyDriveUrl: d.url || null,
          tamanho: d.tamanho || null,
          uploadedAt,
          legacySheetId: d.legacyId,
        })
        .onConflictDoUpdate({
          target: schema.documents.legacySheetId,
          set: { clientId, tipo: d.tipo, nome: d.nome, legacyDriveUrl: d.url || null, tamanho: d.tamanho || null },
        });
      docCount++;
    }
    console.log(`Documentos (metadados; arquivo continua no Drive): ${docCount} upserted`);

    let histCount = 0;
    for (const h of mrrHistory.valid) {
      const clientId = clientIdMap.get(h.clienteId);
      if (!clientId) continue;
      await tx
        .insert(schema.mrrHistory)
        .values({ clientId, mes: h.mes + "-01", mrr: String(h.mrr), legacySheetId: h.legacyId })
        .onConflictDoUpdate({
          target: schema.mrrHistory.legacySheetId,
          set: { clientId, mes: h.mes + "-01", mrr: String(h.mrr) },
        });
      histCount++;
    }
    console.log(`Histórico MRR: ${histCount} upserted`);
  });

  await client.end({ timeout: 1 });
  console.log("\nMigração concluída.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
