import { eq, sql } from "drizzle-orm";
import type { db as appDb } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { firstResponseAt, listAllTickets } from "./tickets";

type DbClient = typeof appDb;

const CHUNK_SIZE = 200;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function syncTicketsForAccount(
  db: DbClient,
  account: { id: string; nome: string; apiKey: string },
  log: (msg: string) => void = () => {}
): Promise<number> {
  const ticketsRaw = await listAllTickets(account.apiKey);
  const byId = new Map(ticketsRaw.map((t) => [t.id, t]));
  const tickets = [...byId.values()];

  const values = tickets.map((t) => ({
    accountId: account.id,
    crmTicketId: String(t.id),
    crmContactId: t.contactId ? String(t.contactId) : null,
    contactNome: t.contact?.name ?? null,
    contactNumero: t.contact?.number ?? null,
    status: t.status,
    isGroup: t.isGroup,
    unreadMessages: t.unreadMessages ?? 0,
    queueId: t.queueId ? String(t.queueId) : null,
    lastMessage: t.lastMessage,
    lastMessageHour: t.lastMessageHour ? new Date(t.lastMessageHour) : null,
    createdAtCrm: t.createdAt ? new Date(t.createdAt) : null,
    updatedAtCrm: t.updatedAt ? new Date(t.updatedAt) : null,
    firstResponseAt: firstResponseAt(t) ? new Date(firstResponseAt(t)!) : null,
  }));

  let count = 0;
  for (const c of chunk(values, CHUNK_SIZE)) {
    await db
      .insert(schema.crmTickets)
      .values(c)
      .onConflictDoUpdate({
        target: [schema.crmTickets.accountId, schema.crmTickets.crmTicketId],
        set: {
          crmContactId: sql`excluded.crm_contact_id`,
          contactNome: sql`excluded.contact_nome`,
          contactNumero: sql`excluded.contact_numero`,
          status: sql`excluded.status`,
          isGroup: sql`excluded.is_group`,
          unreadMessages: sql`excluded.unread_messages`,
          queueId: sql`excluded.queue_id`,
          lastMessage: sql`excluded.last_message`,
          lastMessageHour: sql`excluded.last_message_hour`,
          updatedAtCrm: sql`excluded.updated_at_crm`,
          firstResponseAt: sql`excluded.first_response_at`,
          syncedAt: sql`now()`,
        },
      });
    count += c.length;
  }

  log(`  ${account.nome}: ${count} tickets sincronizados.`);
  return count;
}

export async function syncAllTicketsForActiveAccounts(
  db: DbClient,
  log: (msg: string) => void = () => {}
): Promise<{ accountId: string; nome: string; count: number }[]> {
  const accounts = await db
    .select({ id: schema.crmAccounts.id, nome: schema.crmAccounts.nome, apiKey: schema.crmAccounts.apiKey })
    .from(schema.crmAccounts)
    .where(eq(schema.crmAccounts.ativo, true));

  const results: { accountId: string; nome: string; count: number }[] = [];
  for (const account of accounts) {
    const count = await syncTicketsForAccount(db, account, log);
    results.push({ accountId: account.id, nome: account.nome, count });
  }
  return results;
}
