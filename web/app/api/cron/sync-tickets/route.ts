import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { syncAllTicketsForActiveAccounts } from "@/lib/crm/sync-tickets";

// Sync completo de tickets (todas as contas ativas), roda a cada 3h via n8n. Base
// pro alerta de mensagens não lidas e tempo médio de resposta.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-webhook-secret");
  if (!secret || secret !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const results = await syncAllTicketsForActiveAccounts(db);
    return NextResponse.json({
      ok: true,
      accounts: results.length,
      totalTickets: results.reduce((s, r) => s + r.count, 0),
    });
  } catch (e) {
    const error = e instanceof Error ? { message: e.message, stack: e.stack } : { message: String(e) };
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }
}
