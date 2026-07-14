-- Bucket privado para documentos de cliente, substituindo o Google Drive.
-- Limite de 20MB por arquivo, alinhado com o hint que já existia na UI legada.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('client-documents', 'client-documents', false, 20971520)
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint

-- Mesma regra das tabelas de negócio: leitura para qualquer usuário provisionado,
-- escrita (upload/remoção) só admin. Downloads reais acontecem via URL assinada
-- gerada no servidor, não por listagem direta do bucket pelo client.
CREATE POLICY "client_documents_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'client-documents' AND public.has_profile());

CREATE POLICY "client_documents_write" ON storage.objects FOR ALL
  USING (bucket_id = 'client-documents' AND public.is_admin())
  WITH CHECK (bucket_id = 'client-documents' AND public.is_admin());
