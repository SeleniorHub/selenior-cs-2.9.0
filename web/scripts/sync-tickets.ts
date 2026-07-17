import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../lib/db/schema";
import { syncAllTicketsForActiveAccounts } from "../lib/crm/sync-tickets";

async function main() {
  const connectionString = process.env.DIRECT_URL;
  if (!connectionString) throw new Error("DIRECT_URL não definida no .env.local");
  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client, { schema });

  const results = await syncAllTicketsForActiveAccounts(db, (msg) => console.log(msg));
  console.log("\nTotal:", results.reduce((s, r) => s + r.count, 0), "tickets.");

  await client.end({ timeout: 1 });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
