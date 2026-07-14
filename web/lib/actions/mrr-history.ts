"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "./auth-guard";

export type MrrHistoryInput = {
  id?: string;
  clientId: string;
  mes: string;
  mrr: number;
};

export async function saveMrrHistory(input: MrrHistoryInput) {
  const { supabase } = await requireAdmin();
  const row = { client_id: input.clientId, mes: input.mes + "-01", mrr: input.mrr };
  if (input.id) {
    const { error } = await supabase.from("mrr_history").update(row).eq("id", input.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("mrr_history").insert(row);
    if (error) throw error;
  }
  revalidatePath(`/clientes/${input.clientId}`);
  revalidatePath("/dashboard");
}

export async function deleteMrrHistory(id: string, clientId: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("mrr_history").delete().eq("id", id);
  if (error) throw error;
  revalidatePath(`/clientes/${clientId}`);
  revalidatePath("/dashboard");
}
