"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "./auth-guard";

export type GoalInput = {
  id?: string;
  clientId: string;
  mes: string;
  titulo: string;
  status: string;
  progresso: number;
  total: number;
  unidade: string;
};

export async function saveGoal(input: GoalInput) {
  const { supabase } = await requireAdmin();
  const row = {
    client_id: input.clientId,
    mes: input.mes || null,
    titulo: input.titulo,
    status: input.status,
    progresso: input.progresso,
    total: input.total,
    unidade: input.unidade || null,
  };
  if (input.id) {
    const { error } = await supabase.from("goals").update(row).eq("id", input.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("goals").insert(row);
    if (error) throw error;
  }
  revalidatePath(`/clientes/${input.clientId}`);
}

export async function deleteGoal(id: string, clientId: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) throw error;
  revalidatePath(`/clientes/${clientId}`);
}
