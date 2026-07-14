"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import {
  buildDocumentPath,
  deleteDocument as removeFromStorage,
  getSignedDocumentUrl,
  uploadDocument as uploadToStorage,
} from "@/lib/storage/documents";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "./auth-guard";

export async function getDocumentUrl(storagePath: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");
  return getSignedDocumentUrl(supabase, storagePath);
}

export async function uploadDocument(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const clientId = String(formData.get("clientId"));
  const tipo = String(formData.get("tipo"));
  const nome = String(formData.get("nome"));
  const file = formData.get("file") as File;
  if (!file || !file.size) throw new Error("Nenhum arquivo selecionado");

  const documentId = randomUUID();
  const path = buildDocumentPath(clientId, documentId, nome);
  await uploadToStorage(supabase, path, file);

  const { error } = await supabase.from("documents").insert({
    id: documentId,
    client_id: clientId,
    tipo,
    nome,
    storage_path: path,
    tamanho: file.size,
    uploaded_by: user.id,
  });
  if (error) throw error;

  revalidatePath(`/clientes/${clientId}`);
}

export async function deleteDocument(id: string, clientId: string) {
  const { supabase } = await requireAdmin();
  const { data: doc, error: fetchErr } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("id", id)
    .single();
  if (fetchErr) throw fetchErr;

  if (doc.storage_path) await removeFromStorage(supabase, doc.storage_path);

  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw error;

  revalidatePath(`/clientes/${clientId}`);
}
