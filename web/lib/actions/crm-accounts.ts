"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { createN8nCrmWebhookWorkflow } from "@/lib/n8n/workflows";
import { requireAdmin } from "./auth-guard";

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base || "cliente";
  let suffix = 1;
  for (;;) {
    const [existing] = await db
      .select({ id: schema.crmAccounts.id })
      .from(schema.crmAccounts)
      .where(eq(schema.crmAccounts.webhookSlug, slug));
    if (!existing) return slug;
    suffix++;
    slug = `${base}-${suffix}`;
  }
}

export type AddCrmAccountInput = {
  clientId: string;
  apiKey: string;
};

export async function addCrmAccount(input: AddCrmAccountInput) {
  await requireAdmin();

  const [client] = await db
    .select({ id: schema.clients.id, nome: schema.clients.nome })
    .from(schema.clients)
    .where(eq(schema.clients.id, input.clientId));
  if (!client) throw new Error("cliente não encontrado");

  const webhookSlug = await uniqueSlug(slugify(client.nome));
  const webhookSecret = randomBytes(32).toString("hex");

  const [account] = await db
    .insert(schema.crmAccounts)
    .values({
      clientId: client.id,
      nome: client.nome,
      apiKey: input.apiKey.trim(),
      webhookSlug,
      webhookSecret,
      ativo: true,
    })
    .returning({ id: schema.crmAccounts.id, webhookSlug: schema.crmAccounts.webhookSlug });

  let n8nWorkflowId: string | null = null;
  let n8nError: string | null = null;
  try {
    const workflow = await createN8nCrmWebhookWorkflow({
      clientNome: client.nome,
      webhookSlug: account.webhookSlug,
      webhookSecret,
    });
    n8nWorkflowId = workflow.id;
  } catch (e) {
    n8nError = e instanceof Error ? e.message : String(e);
  }

  revalidatePath("/crm");
  return { accountId: account.id, webhookSlug: account.webhookSlug, n8nWorkflowId, n8nError };
}

export async function setCrmAccountAtivo(id: string, ativo: boolean) {
  await requireAdmin();
  await db.update(schema.crmAccounts).set({ ativo }).where(eq(schema.crmAccounts.id, id));
  revalidatePath("/crm");
}
