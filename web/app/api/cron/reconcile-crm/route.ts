import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { syncAllActiveCrmAccounts } from "@/lib/crm/sync";

// Roda 1x/dia (via n8n), pouco antes do snapshot noturno. O funil ao vivo depende do
// webhook do n8n, que já falhou por instabilidade da própria instância — esta rota
// busca direto na API do CRM (sem depender do n8n) e corrige qualquer negócio que o
// webhook tenha perdido, registrando a mudança em deal_stage_events com
// source="reconciliation".
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-webhook-secret");
  if (!secret || secret !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const results = await syncAllActiveCrmAccounts(db, { source: "reconciliation" });

    return NextResponse.json({
      ok: true,
      accounts: results.length,
      totalDeals: results.reduce((s, r) => s + r.deals, 0),
      totalStageEvents: results.reduce((s, r) => s + r.stageEvents, 0),
    });
  } catch (e) {
    const error = e instanceof Error ? { message: e.message, stack: e.stack } : { message: String(e) };
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }
}
