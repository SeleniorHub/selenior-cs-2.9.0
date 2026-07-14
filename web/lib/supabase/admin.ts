import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente com service_role — ignora RLS. Só pode ser importado em código
// server-only (Route Handlers, Server Actions, scripts). Nunca no client.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
