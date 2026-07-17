import { createClient } from "@/lib/supabase/server";

export type MeetingNoShowStats = {
  total: number;
  realizadas: number;
  noShow: number;
  taxaNoShowPct: number | null;
};

// meeting_created_at/meeting_realized_at vêm prontos do /commercial-order da API do
// CRM. Nem toda conta usa esse fluxo (algumas não marcam reunião pelo CRM) — nesse
// caso total fica 0 e a UI deve mostrar "sem dados", não "0% de no-show".
export async function getMeetingNoShowStats(accountId: string): Promise<MeetingNoShowStats> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_deals")
    .select("meeting_realized_at")
    .eq("account_id", accountId)
    .not("meeting_created_at", "is", null);
  if (error) throw error;

  const total = data?.length ?? 0;
  const realizadas = (data ?? []).filter((d) => d.meeting_realized_at !== null).length;
  const noShow = total - realizadas;
  return { total, realizadas, noShow, taxaNoShowPct: total > 0 ? Math.round((noShow / total) * 100) : null };
}

export type FunnelStepVelocity = {
  stepId: string;
  nome: string;
  amostras: number;
  mediaDias: number;
};

// Tempo médio que um negócio fica numa etapa antes de mover pra próxima, calculado
// a partir de transições consecutivas em deal_stage_events (só conta etapas com
// pelo menos uma transição de saída registrada). O rastreamento começou em
// 14/07/2026 — poucos dias de histórico ainda, então amostras baixas são normais e
// a UI deve avisar em vez de esconder.
export async function getFunnelVelocity(accountId: string): Promise<FunnelStepVelocity[]> {
  const supabase = await createClient();
  const { data: events, error } = await supabase
    .from("deal_stage_events")
    .select("deal_id, to_step_id, changed_at")
    .eq("account_id", accountId)
    .order("deal_id")
    .order("changed_at");
  if (error) throw error;

  const byDeal = new Map<string, { toStepId: string; changedAt: string }[]>();
  for (const e of events ?? []) {
    const arr = byDeal.get(e.deal_id) ?? [];
    arr.push({ toStepId: e.to_step_id, changedAt: e.changed_at });
    byDeal.set(e.deal_id, arr);
  }

  const durationsByStep = new Map<string, number[]>();
  for (const evts of byDeal.values()) {
    for (let i = 0; i < evts.length - 1; i++) {
      const days = (new Date(evts[i + 1].changedAt).getTime() - new Date(evts[i].changedAt).getTime()) / 86400000;
      const arr = durationsByStep.get(evts[i].toStepId) ?? [];
      arr.push(days);
      durationsByStep.set(evts[i].toStepId, arr);
    }
  }

  const { data: steps, error: stepsError } = await supabase
    .from("crm_pipeline_steps")
    .select("id, nome, ordem")
    .eq("account_id", accountId)
    .order("ordem");
  if (stepsError) throw stepsError;

  return (steps ?? [])
    .map((s) => {
      const durations = durationsByStep.get(s.id) ?? [];
      return {
        stepId: s.id,
        nome: s.nome as string,
        amostras: durations.length,
        mediaDias: durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      };
    })
    .filter((s) => s.amostras > 0);
}

export type UnreadTicketAlert = {
  crmTicketId: string;
  contactNome: string | null;
  unreadMessages: number;
  lastMessage: string | null;
  lastMessageHour: string | null;
};

export type UnreadTicketsSummary = {
  conversas: number;
  totalNaoLidas: number;
  itens: UnreadTicketAlert[];
};

// unread_messages é estado atual do ticket (sincronizado a cada 3h, não é
// histórico) — é literalmente "quantas mensagens estão esperando resposta agora".
export async function getUnreadTicketsAlert(accountId: string, limit = 8): Promise<UnreadTicketsSummary> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_tickets")
    .select("crm_ticket_id, contact_nome, unread_messages, last_message, last_message_hour")
    .eq("account_id", accountId)
    .gt("unread_messages", 0)
    .order("unread_messages", { ascending: false });
  if (error) throw error;

  const rows = data ?? [];
  return {
    conversas: rows.length,
    totalNaoLidas: rows.reduce((s, r) => s + r.unread_messages, 0),
    itens: rows.slice(0, limit).map((r) => ({
      crmTicketId: r.crm_ticket_id,
      contactNome: r.contact_nome,
      unreadMessages: r.unread_messages,
      lastMessage: r.last_message,
      lastMessageHour: r.last_message_hour,
    })),
  };
}

export type ResponseTimeStats = {
  amostras: number;
  medianaMinutos: number | null;
  semanas: { semana: string; medianaMinutos: number }[];
};

function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function isoWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  const dow = (d.getDay() + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - dow);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(monday);
}

// Usa mediana, não média — tickets antigos só respondidos muito depois (backlog)
// distorcem a média pra um número sem sentido (achamos isso empiricamente: uma
// conta deu média de 14 dias por causa de poucos tickets de meses atrás). Só olha
// os últimos `daysBack` dias pra refletir desempenho atual, não histórico morto.
export async function getResponseTimeStats(accountId: string, daysBack = 60): Promise<ResponseTimeStats> {
  const supabase = await createClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);

  const { data, error } = await supabase
    .from("crm_tickets")
    .select("created_at_crm, first_response_at")
    .eq("account_id", accountId)
    .not("first_response_at", "is", null)
    .gte("created_at_crm", cutoff.toISOString());
  if (error) throw error;

  const withMinutes = (data ?? [])
    .map((t) => ({
      week: isoWeekKey(t.created_at_crm as string),
      minutes: (new Date(t.first_response_at as string).getTime() - new Date(t.created_at_crm as string).getTime()) / 60000,
    }))
    .filter((t) => t.minutes >= 0);

  const byWeek = new Map<string, number[]>();
  for (const t of withMinutes) {
    const arr = byWeek.get(t.week) ?? [];
    arr.push(t.minutes);
    byWeek.set(t.week, arr);
  }

  const semanas = [...byWeek.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([semana, minutos]) => ({ semana, medianaMinutos: median(minutos) ?? 0 }));

  return {
    amostras: withMinutes.length,
    medianaMinutos: median(withMinutes.map((t) => t.minutes)),
    semanas,
  };
}
