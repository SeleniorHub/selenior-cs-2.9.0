"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "./auth-guard";

export type ActionItemInput = {
  id?: string;
  clientId: string;
  meetingId: string | null;
  texto: string;
  responsavel: string;
  dataPrazo: string;
};

function revalidateAll(clientId: string) {
  revalidatePath(`/clientes/${clientId}`);
  revalidatePath("/actions");
  revalidatePath("/dashboard");
}

export async function saveActionItem(input: ActionItemInput) {
  const { supabase } = await requireAdmin();
  const row = {
    client_id: input.clientId,
    meeting_id: input.meetingId || null,
    texto: input.texto,
    responsavel: input.responsavel,
    data_prazo: input.dataPrazo || null,
  };
  if (input.id) {
    const { error } = await supabase.from("action_items").update(row).eq("id", input.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("action_items").insert(row);
    if (error) throw error;
  }
  revalidateAll(input.clientId);
}

export async function deleteActionItem(id: string, clientId: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("action_items").delete().eq("id", id);
  if (error) throw error;
  revalidateAll(clientId);
}

export async function toggleActionItem(id: string, clientId: string) {
  const { supabase } = await requireAdmin();
  const { data: ai, error: fetchErr } = await supabase
    .from("action_items")
    .select("concluido")
    .eq("id", id)
    .single();
  if (fetchErr) throw fetchErr;
  const { error } = await supabase.from("action_items").update({ concluido: !ai.concluido }).eq("id", id);
  if (error) throw error;
  revalidateAll(clientId);
}
