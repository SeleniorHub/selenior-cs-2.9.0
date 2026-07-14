import { eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

// crm_accounts guarda api_key/webhook_secret e não tem nenhuma policy de RLS para
// authenticated — só a conexão Drizzle (service_role, via DATABASE_URL) enxerga essa
// tabela. Por isso essas leituras nunca passam pelo cliente Supabase normal, e nunca
// selecionam as colunas de segredo.

export type CrmAccountWithClient = {
  id: string;
  client_id: string | null;
  client_nome: string | null;
  nome: string;
  webhook_slug: string;
  ativo: boolean;
  created_at: string;
};

export async function listCrmAccountsWithClients(): Promise<CrmAccountWithClient[]> {
  const rows = await db
    .select({
      id: schema.crmAccounts.id,
      clientId: schema.crmAccounts.clientId,
      clientNome: schema.clients.nome,
      nome: schema.crmAccounts.nome,
      webhookSlug: schema.crmAccounts.webhookSlug,
      ativo: schema.crmAccounts.ativo,
      createdAt: schema.crmAccounts.createdAt,
    })
    .from(schema.crmAccounts)
    .leftJoin(schema.clients, eq(schema.crmAccounts.clientId, schema.clients.id))
    .orderBy(schema.crmAccounts.createdAt);

  return rows.map((r) => ({
    id: r.id,
    client_id: r.clientId,
    client_nome: r.clientNome,
    nome: r.nome,
    webhook_slug: r.webhookSlug,
    ativo: r.ativo,
    created_at: r.createdAt.toISOString(),
  }));
}

export async function getCrmAccountBySlug(slug: string) {
  const [row] = await db
    .select({ id: schema.crmAccounts.id })
    .from(schema.crmAccounts)
    .where(eq(schema.crmAccounts.webhookSlug, slug));
  return row ?? null;
}

export async function listClientsWithoutCrmAccount(): Promise<{ id: string; nome: string }[]> {
  const rows = await db
    .select({ id: schema.clients.id, nome: schema.clients.nome })
    .from(schema.clients)
    .leftJoin(schema.crmAccounts, eq(schema.crmAccounts.clientId, schema.clients.id))
    .where(isNull(schema.crmAccounts.id))
    .orderBy(schema.clients.nome);
  return rows;
}
