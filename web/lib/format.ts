import type { ActionItem, Client, Meeting } from "./types";

// Datas do Postgres (colunas `date`) chegam como "YYYY-MM-DD" — passar isso direto
// pra `new Date()` interpreta como meia-noite UTC, que em fusos atrás de UTC pode
// exibir o dia (ou até o mês, no dia 1) anterior. Parseia como data local.
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("T")[0].split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

// Inverso de parseLocalDate: formata um Date local como "YYYY-MM-DD" sem passar
// por UTC (`.toISOString()` faria isso e podia virar o dia em fusos negativos).
export function toLocalDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const AVATAR_COLORS = [
  { bg: "#EDE9F6", txt: "#3D2B69" },
  { bg: "#D8F3DC", txt: "#2D6A4F" },
  { bg: "#FFF3B0", txt: "#7B5E00" },
  { bg: "#E3EEF9", txt: "#1A3A5C" },
  { bg: "#FFE5E5", txt: "#8B1A1A" },
  { bg: "#FDE8D8", txt: "#7A3D1A" },
];

export function initials(n: string) {
  return n.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export function colorFor(i: number) {
  return AVATAR_COLORS[i % AVATAR_COLORS.length];
}

export function parseMoney(s: string | null | undefined) {
  return parseInt(String(s || "0").replace(/\D/g, "")) || 0;
}

export function fmtMoney(n: number) {
  if (n >= 1000000) return "R$" + (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return "R$" + Math.round(n / 1000) + "k";
  return "R$" + n;
}

export function calcMRR(cl: Pick<Client, "mrr_bruto" | "comissao_valor" | "comissao_tipo" | "custo_mensal">) {
  const bruto = parseMoney(cl.mrr_bruto);
  let comissao = 0;
  if (cl.comissao_valor) {
    const v = parseFloat(String(cl.comissao_valor).replace(",", ".")) || 0;
    comissao = cl.comissao_tipo === "pct" ? Math.round((bruto * v) / 100) : Math.round(v);
  }
  const custo = parseMoney(cl.custo_mensal || "0");
  return { bruto, comissao, custo, deducao: comissao + custo, liquido: bruto - comissao - custo };
}

export function churnBadgeClass(c: string) {
  if (c === "alto") return { cls: "churn-high", label: "Risco alto" };
  if (c === "médio") return { cls: "churn-med", label: "Risco médio" };
  return { cls: "churn-low", label: "Risco baixo" };
}

export function progressPct(cl: Client) {
  const cps = cl.client_checkpoints || [];
  if (!cps.length) return 0;
  const done = cps.filter((c) => c.done).length;
  return Math.round((done / cps.length) * 100);
}

export function ownerTagClass(r: string) {
  if (r === "Leo") return "owner-leo";
  if (r === "João Pedro") return "owner-joao";
  return "owner-client";
}

export function docIcon(tipo: string) {
  return (
    ({ briefing: "📋", contrato: "📑", qbr: "📊", apresentacao: "🖥", gravacao: "🎥", outro: "📄" } as Record<string, string>)[
      tipo
    ] || "📄"
  );
}

export function docTipoLabel(tipo: string) {
  return (
    ({
      briefing: "Briefings",
      contrato: "Contratos",
      qbr: "QBR / Relatórios",
      apresentacao: "Apresentações",
      gravacao: "Gravações",
      outro: "Outros",
    } as Record<string, string>)[tipo] || "Outros"
  );
}

export function formatBytes(n: number | null | undefined) {
  if (!n) return "";
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return Math.round(n / 1024) + " KB";
  return (n / (1024 * 1024)).toFixed(1) + " MB";
}

export function calcMesAtual(dataInicio: string | null) {
  if (!dataInicio) return 1;
  const inicio = parseLocalDate(dataInicio);
  const hoje = new Date();
  const meses = (hoje.getFullYear() - inicio.getFullYear()) * 12 + (hoje.getMonth() - inicio.getMonth()) + 1;
  return Math.min(Math.max(meses, 1), 12);
}

export function fmtTempo(dataInicio: string | null) {
  if (!dataInicio) return "";
  const inicio = parseLocalDate(dataInicio);
  const hoje = new Date();
  const meses = (hoje.getFullYear() - inicio.getFullYear()) * 12 + (hoje.getMonth() - inicio.getMonth());
  if (meses === 0) return "menos de 1 mês";
  if (meses === 1) return "1 mês";
  if (meses < 12) return meses + " meses";
  const anos = Math.floor(meses / 12);
  const m = meses % 12;
  return anos + "a" + (m > 0 ? " " + m + "m" : "");
}

export function calcHealthScore(cl: Client, meetings: Meeting[], actionItems: ActionItem[]) {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const clReunioes = meetings.filter((r) => r.client_id === cl.id);
  let meetScore = 100;
  if (clReunioes.length === 0) {
    const daysSinceStart = cl.data_inicio
      ? Math.floor((now.getTime() - parseLocalDate(cl.data_inicio).getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    meetScore = daysSinceStart > 15 ? 0 : 100;
  } else {
    const latest = clReunioes.reduce((mx, r) => (parseLocalDate(r.data) > parseLocalDate(mx.data) ? r : mx));
    const days = Math.floor((now.getTime() - parseLocalDate(latest.data).getTime()) / (1000 * 60 * 60 * 24));
    meetScore = days <= 30 ? 100 : days <= 60 ? 50 : 0;
  }

  const cps = cl.client_checkpoints || [];
  const totalCp = cps.length;
  const doneCp = cps.filter((c) => c.done).length;
  const cpScore = totalCp > 0 ? Math.round((doneCp / totalCp) * 100) : 100;

  const overdue = actionItems.filter(
    (a) => a.client_id === cl.id && !a.concluido && a.data_prazo && parseLocalDate(a.data_prazo) < today
  ).length;
  const aiScore = overdue === 0 ? 100 : overdue <= 2 ? 60 : 0;

  const churnScore = cl.churn === "baixo" ? 100 : cl.churn === "médio" ? 50 : 0;

  return Math.round(meetScore * 0.3 + cpScore * 0.25 + aiScore * 0.25 + churnScore * 0.2);
}

export function healthLabel(score: number) {
  if (score >= 71) return { cls: "health-green", label: "Saudável" };
  if (score >= 31) return { cls: "health-amber", label: "Atenção" };
  return { cls: "health-red", label: "Risco" };
}

export function activeClients(clients: Client[]) {
  return clients.filter((c) => (c.status || "ativo") === "ativo");
}
