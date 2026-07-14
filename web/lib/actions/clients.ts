"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "./auth-guard";

export type ClientInput = {
  id?: string;
  nome: string;
  nicho: string;
  fase: string;
  churn: string;
  status: string;
  dataInicio: string;
  dataFim: string;
  mrr: string;
  custo: string;
  indicador: string;
  comissaoVal: string;
  comissaoTipo: string;
  checkpoints: string[];
  nota: string;
  depoimento: string;
};

export async function saveClient(input: ClientInput) {
  const { supabase } = await requireAdmin();

  const row = {
    nome: input.nome,
    nicho: input.nicho || null,
    fase: input.fase,
    churn: input.churn,
    status: input.status,
    data_inicio: input.dataInicio || null,
    data_fim: input.status === "churned" ? input.dataFim || null : null,
    mrr_bruto: input.mrr.replace(/\D/g, "") || "0",
    custo_mensal: input.custo.replace(/\D/g, "") || "0",
    comissao_valor: input.comissaoVal || null,
    comissao_tipo: input.comissaoTipo,
    indicador: input.indicador || null,
    nota_interna: input.nota || null,
    depoimento: input.depoimento || null,
  };

  let clientId = input.id;
  if (clientId) {
    const { error } = await supabase.from("clients").update(row).eq("id", clientId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase.from("clients").insert(row).select("id").single();
    if (error) throw error;
    clientId = data.id;
  }

  const { data: existingCps } = await supabase
    .from("client_checkpoints")
    .select("texto, done")
    .eq("client_id", clientId);

  const norm = (s: string) => s.trim().toLowerCase();
  const newCheckpoints = input.checkpoints
    .map((texto, ordem) => {
      const prev = existingCps?.find((c) => norm(c.texto) === norm(texto));
      return { client_id: clientId, texto, ordem, done: prev?.done ?? false };
    });

  await supabase.from("client_checkpoints").delete().eq("client_id", clientId);
  if (newCheckpoints.length) {
    const { error } = await supabase.from("client_checkpoints").insert(newCheckpoints);
    if (error) throw error;
  }

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clientId}`);
  revalidatePath("/dashboard");
  return clientId;
}

export async function deleteClient(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/clientes");
  revalidatePath("/dashboard");
}

export async function toggleCheckpoint(clientId: string, checkpointId: string) {
  const { supabase } = await requireAdmin();
  const { data: cp, error: fetchErr } = await supabase
    .from("client_checkpoints")
    .select("done")
    .eq("id", checkpointId)
    .single();
  if (fetchErr) throw fetchErr;
  const { error } = await supabase
    .from("client_checkpoints")
    .update({ done: !cp.done })
    .eq("id", checkpointId);
  if (error) throw error;
  revalidatePath(`/clientes/${clientId}`);
  revalidatePath("/dashboard");
}
