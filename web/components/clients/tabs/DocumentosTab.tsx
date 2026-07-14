"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DocumentModal } from "@/components/clients/DocumentModal";
import { useToast } from "@/components/providers/ToastProvider";
import { deleteDocument, getDocumentUrl } from "@/lib/actions/documents";
import { docIcon, docTipoLabel, formatBytes } from "@/lib/format";
import type { ClientDocument } from "@/lib/types";

const ORDER = ["briefing", "contrato", "qbr", "apresentacao", "gravacao", "outro"];

export function DocumentosTab({
  clientId,
  documents,
  isAdmin,
}: {
  clientId: string;
  documents: ClientDocument[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);

  const byTipo = new Map<string, ClientDocument[]>();
  documents.forEach((d) => {
    const t = d.tipo || "outro";
    if (!byTipo.has(t)) byTipo.set(t, []);
    byTipo.get(t)!.push(d);
  });

  async function handleOpen(d: ClientDocument) {
    if (!d.storage_path) return;
    setOpening(d.id);
    try {
      const url = await getDocumentUrl(d.storage_path);
      window.open(url, "_blank", "noopener");
    } catch {
      toast("Erro ao abrir documento", true);
    } finally {
      setOpening(null);
    }
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    try {
      await deleteDocument(id, clientId);
      toast("Removido.");
      router.refresh();
    } catch {
      toast("Erro ao remover", true);
    }
  }

  return (
    <div>
      {isAdmin && (
        <button className="edit-btn" onClick={() => setModalOpen(true)}>
          + Documento
        </button>
      )}
      {documents.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <div className="empty-title">Sem documentos</div>
          <div className="empty-sub">Faça upload de briefings, contratos, gravações e outros arquivos.</div>
        </div>
      ) : (
        ORDER.filter((t) => byTipo.has(t)).map((t) => (
          <div key={t}>
            <div className="mini-title" style={{ marginTop: 16 }}>
              {docTipoLabel(t)}
            </div>
            {byTipo
              .get(t)!
              .sort((a, b) => (b.uploaded_at || "").localeCompare(a.uploaded_at || ""))
              .map((d) => {
                const dt = d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString("pt-BR") : "";
                const meta = [formatBytes(d.tamanho), dt].filter(Boolean).join(" · ");
                return (
                  <div className="doc-item" key={d.id} onClick={() => handleOpen(d)}>
                    <div className="doc-icon">{docIcon(t)}</div>
                    <div className="doc-info">
                      <div className="doc-name">{opening === d.id ? "Abrindo..." : d.nome}</div>
                      <div className="doc-meta">{meta}</div>
                    </div>
                    <span className="doc-arrow">↗</span>
                    {isAdmin && (
                      <button className="doc-rm" title="Remover" onClick={(e) => handleDelete(e, d.id)}>
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        ))
      )}
      <DocumentModal open={modalOpen} onClose={() => setModalOpen(false)} clientId={clientId} />
    </div>
  );
}
