import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function randomPassword() {
  return (
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 6).toUpperCase() +
    "!1"
  );
}

const SEED_USERS: { email: string; role: "admin" | "viewer"; nome: string }[] = [
  { email: "jmandacari@gmail.com", role: "admin", nome: "João Pedro" },
  { email: "seleniorhub@gmail.com", role: "viewer", nome: "Visualização" },
];

async function ensureUser(entry: (typeof SEED_USERS)[number]) {
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) throw listErr;

  let user = list.users.find((u) => u.email === entry.email);
  let password: string | null = null;

  if (!user) {
    password = randomPassword();
    const { data, error } = await supabase.auth.admin.createUser({
      email: entry.email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    user = data.user;
    console.log(`Criado: ${entry.email} — senha: ${password}`);
  } else {
    console.log(`Já existia: ${entry.email} (id ${user.id})`);
  }

  const { error: upsertErr } = await supabase
    .from("profiles")
    .upsert({ id: user.id, role: entry.role, nome: entry.nome }, { onConflict: "id" });
  if (upsertErr) throw upsertErr;

  console.log(`  profile role=${entry.role} ok`);
}

(async () => {
  for (const entry of SEED_USERS) {
    await ensureUser(entry);
  }
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
