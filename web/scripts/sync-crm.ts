import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../lib/db/schema";
import { syncAllActiveCrmAccounts } from "../lib/crm/sync";

async function main() {
  const connectionString = process.env.DIRECT_URL;
  if (!connectionString) throw new Error("DIRECT_URL não definida no .env.local");
  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client, { schema });

  const accountId = process.argv[2];
  const results = await syncAllActiveCrmAccounts(db, {
    source: "sync-inicial",
    accountId,
    log: (msg) => console.log(msg),
  });

  if (!results.length) console.log("Nenhuma conta CRM ativa encontrada para sincronizar.");

  await client.end({ timeout: 1 });
  console.log("\nSync concluído.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
