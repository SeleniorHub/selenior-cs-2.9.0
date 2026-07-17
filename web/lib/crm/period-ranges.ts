export type PeriodType = "dia" | "semana" | "mes" | "ult7" | "ult30" | "ult90" | "personalizado";

export const PERIOD_LABELS: Record<Exclude<PeriodType, "personalizado">, string> = {
  dia: "Ontem × Hoje",
  semana: "Semana passada × Esta semana",
  mes: "Mês passado × Este mês",
  ult7: "Últimos 7 dias × 7 anteriores",
  ult30: "Últimos 30 dias × 30 anteriores",
  ult90: "Últimos 3 meses × 3 meses anteriores",
};

export function toKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
}

export function todayBrasilia(): Date {
  return new Date(`${toKey(new Date())}T12:00:00`);
}

export function lastNDays(endExclusive: Date, n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(endExclusive);
    d.setDate(d.getDate() - i);
    days.push(toKey(d));
  }
  return days;
}

export function daysBetween(startKey: string, endKey: string): string[] {
  const days: string[] = [];
  const start = new Date(`${startKey}T12:00:00`);
  const end = new Date(`${endKey}T12:00:00`);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(toKey(d));
  }
  return days;
}

export function brLabel(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

export function getRanges(
  type: PeriodType,
  customRange: { start: string; end: string } | null
): { currentDays: string[]; previousDays: string[] } {
  const today = todayBrasilia();

  if (type === "personalizado" && customRange) {
    const currentDays = daysBetween(customRange.start, customRange.end);
    const prevEnd = new Date(`${customRange.start}T12:00:00`);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - (currentDays.length - 1));
    const previousDays = daysBetween(toKey(prevStart), toKey(prevEnd));
    return { currentDays, previousDays };
  }

  if (type === "dia") {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return { currentDays: [toKey(today)], previousDays: [toKey(yesterday)] };
  }

  if (type === "semana") {
    const dow = (today.getDay() + 6) % 7; // 0 = segunda
    const currentDays: string[] = [];
    for (let i = 0; i <= dow; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - (dow - i));
      currentDays.push(toKey(d));
    }
    const previousDays = currentDays.map((_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (dow - i) - 7);
      return toKey(d);
    });
    return { currentDays, previousDays };
  }

  if (type === "mes") {
    const dom = today.getDate();
    const currentDays: string[] = [];
    for (let i = 1; i <= dom; i++) currentDays.push(toKey(new Date(today.getFullYear(), today.getMonth(), i)));
    const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const daysInPrevMonth = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).getDate();
    const previousDays: string[] = [];
    for (let i = 1; i <= Math.min(dom, daysInPrevMonth); i++) {
      previousDays.push(toKey(new Date(prevMonth.getFullYear(), prevMonth.getMonth(), i)));
    }
    return { currentDays, previousDays };
  }

  const n = type === "ult7" ? 7 : type === "ult30" ? 30 : 90;
  const currentDays = lastNDays(today, n);
  const previousEnd = new Date(today);
  previousEnd.setDate(previousEnd.getDate() - n);
  const previousDays = lastNDays(previousEnd, n);
  return { currentDays, previousDays };
}
