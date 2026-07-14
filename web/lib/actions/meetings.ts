"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "./auth-guard";

export type MeetingInput = {
  id?: string;
  clientId: string;
  data: string;
  titulo: string;
  duracao: string;
  participantes: string;
  resumo: string;
  pontos: string[];
};

export async function saveMeeting(input: MeetingInput) {
  const { supabase } = await requireAdmin();

  const row = {
    client_id: input.clientId,
    data: input.data,
    titulo: input.titulo,
    duracao: input.duracao || null,
    participantes: input.participantes || null,
    resumo: input.resumo || null,
  };

  let meetingId = input.id;
  if (meetingId) {
    const { error } = await supabase.from("meetings").update(row).eq("id", meetingId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase.from("meetings").insert(row).select("id").single();
    if (error) throw error;
    meetingId = data.id;
  }

  await supabase.from("meeting_points").delete().eq("meeting_id", meetingId);
  if (input.pontos.length) {
    const points = input.pontos.map((texto, ordem) => ({ meeting_id: meetingId, texto, ordem }));
    const { error } = await supabase.from("meeting_points").insert(points);
    if (error) throw error;
  }

  revalidatePath(`/clientes/${input.clientId}`);
  revalidatePath("/reunioes");
  revalidatePath("/dashboard");
  return meetingId;
}

export async function deleteMeeting(id: string, clientId: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("meetings").delete().eq("id", id);
  if (error) throw error;
  revalidatePath(`/clientes/${clientId}`);
  revalidatePath("/reunioes");
}
