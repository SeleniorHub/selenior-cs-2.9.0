import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { authUsers } from "./auth";

export const profileRoleEnum = pgEnum("profile_role", ["admin", "viewer"]);

export const profiles = pgTable("profiles", {
  id: uuid("id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  role: profileRoleEnum("role").notNull().default("viewer"),
  nome: text("nome"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
