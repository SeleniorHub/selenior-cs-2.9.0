import type { SupabaseClient } from "@supabase/supabase-js";

export const DOCUMENTS_BUCKET = "client-documents";
const SIGNED_URL_TTL_SECONDS = 300;

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function buildDocumentPath(clientId: string, documentId: string, filename: string) {
  return `${clientId}/${documentId}-${sanitizeFilename(filename)}`;
}

export async function uploadDocument(
  supabase: SupabaseClient,
  path: string,
  file: File | Blob
) {
  const { error } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(path, file, {
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function getSignedDocumentUrl(supabase: SupabaseClient, path: string) {
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteDocument(supabase: SupabaseClient, path: string) {
  const { error } = await supabase.storage.from(DOCUMENTS_BUCKET).remove([path]);
  if (error) throw error;
}
