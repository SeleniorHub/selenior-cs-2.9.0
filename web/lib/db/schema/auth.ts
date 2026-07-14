import { pgSchema, uuid } from "drizzle-orm/pg-core";

// Referência somente-leitura à tabela auth.users gerenciada pelo Supabase Auth.
// Não migramos nem criamos essa tabela — só usamos como alvo de FK.
export const authSchema = pgSchema("auth");

export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});
