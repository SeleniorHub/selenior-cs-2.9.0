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
