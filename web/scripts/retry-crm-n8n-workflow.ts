import { config } from "dotenv";
config({ path: ".env.local" });

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../lib/db/schema";
import { createN8nCrmWebhookWorkflow } from "../lib/n8n/workflows";

// Recria o workflow n8n de uma conta CRM que já existe no banco mas cuja criação do
// workflow falhou (ex: APP_BASE_URL não configurada no momento em que a conta foi
// criada pela UI). Atualiza n8n_webhook_url e reativa a conta.
async function main() {
  const slug = process.argv[2];
  if (!slug) throw new Error("uso: tsx scripts/retry-crm-n8n-workflow.ts <webhook_slug>");

  const connectionString = process.env.DIRECT_URL;
  if (!connectionString) throw new Error("DIRECT_URL não definida no .env.local");
  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client, { schema });

  const [account] = await db
    .select({
      id: schema.crmAccounts.id,
      nome: schema.crmAccounts.nome,
      webhookSlug: schema.crmAccounts.webhookSlug,
      webhookSecret: schema.crmAccounts.webhookSecret,
    })
    .from(schema.crmAccounts)
    .where(eq(schema.crmAccounts.webhookSlug, slug));

  if (!account) throw new Error(`conta com webhook_slug="${slug}" não encontrada`);

  console.log(`Criando workflow n8n para "${account.nome}"...`);
  const workflow = await createN8nCrmWebhookWorkflow({
    clientNome: account.nome,
    webhookSlug: account.webhookSlug,
    webhookSecret: account.webhookSecret,
  });

  await db
    .update(schema.crmAccounts)
    .set({ n8nWebhookUrl: workflow.publicWebhookUrl, ativo: true })
    .where(eq(schema.crmAccounts.id, account.id));

  console.log("Workflow criado e ativado:", workflow.id);
  console.log("URL do webhook (cole no painel de Webhooks do CRM deste cliente):");
  console.log(workflow.publicWebhookUrl);

  await client.end({ timeout: 1 });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
