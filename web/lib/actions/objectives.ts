"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "./auth-guard";

export type ObjectiveInput = {
  id?: string;
  clientId: string;
  texto: string;
  icone: string;
};

export async function saveObjective(input: ObjectiveInput) {
  const { supabase } = await requireAdmin();
  const row = { client_id: input.clientId, texto: input.texto, icone: input.icone || null };
  if (input.id) {
    const { error } = await supabase.from("objectives").update(row).eq("id", input.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("objectives").insert(row);
    if (error) throw error;
  }
  revalidatePath(`/clientes/${input.clientId}`);
}

export async function deleteObjective(id: string, clientId: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("objectives").delete().eq("id", id);
  if (error) throw error;
  revalidatePath(`/clientes/${clientId}`);
}
