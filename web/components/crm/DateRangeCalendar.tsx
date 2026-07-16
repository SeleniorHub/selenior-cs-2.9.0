"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";

const WEEKDAYS = ["S", "T", "Q", "Q", "S", "S", "D"];
const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function toKey(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function buildMonthGrid(year: number, month: number): { key: string; day: number; inMonth: boolean }[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // 0 = segunda
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: { key: string; day: number; inMonth: boolean }[] = [];
  for (let i = offset - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    cells.push({ key: toKey(y, m, d), day: d, inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) cells.push({ key: toKey(year, month, d), day: d, inMonth: true });
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const last = cells[cells.length - 1];
    const [y, m, d] = last.key.split("-").map(Number);
    const next = new Date(y, m - 1, d + 1);
    cells.push({ key: toKey(next.getFullYear(), next.getMonth(), next.getDate()), day: next.getDate(), inMonth: false });
    if (cells.length >= 42) break;
  }
  return cells;
}

export function DateRangeCalendar({
  open,
  onClose,
  onApply,
  initialStart,
  initialEnd,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (start: string, end: string) => void;
  initialStart?: string | null;
  initialEnd?: string | null;
}) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [rangeStart, setRangeStart] = useState<string | null>(initialStart ?? null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(initialEnd ?? null);

  const cells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  function goPrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function handleDayClick(key: string) {
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(key);
      setRangeEnd(null);
      return;
    }
    if (key < rangeStart) {
      setRangeEnd(rangeStart);
      setRangeStart(key);
    } else {
      setRangeEnd(key);
    }
  }

  function isInRange(key: string): boolean {
    if (!rangeStart || !rangeEnd) return false;
    return key >= rangeStart && key <= rangeEnd;
  }

  function handleApply() {
    if (!rangeStart || !rangeEnd) return;
    onApply(rangeStart, rangeEnd);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} width={340}>
      <h3>Período personalizado</h3>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "12px 0" }}>
        <button className="btn-cancel" style={{ padding: "4px 10px" }} onClick={goPrevMonth}>
          ‹
        </button>
        <div style={{ fontWeight: 600, fontSize: 14 }}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </div>
        <button className="btn-cancel" style={{ padding: "4px 10px" }} onClick={goNextMonth}>
          ›
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
        {WEEKDAYS.map((w, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 11, color: "var(--text-2)", padding: "4px 0" }}>
            {w}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {cells.map((c) => {
          const selected = c.key === rangeStart || c.key === rangeEnd;
          const inRange = isInRange(c.key);
          return (
            <button
              key={c.key}
              onClick={() => handleDayClick(c.key)}
              style={{
                aspectRatio: "1",
                border: "none",
                borderRadius: 8,
                fontSize: 12.5,
                fontFamily: "var(--font)",
                cursor: "pointer",
                color: !c.inMonth ? "var(--text-2)" : selected ? "#fff" : "var(--text)",
                background: selected ? "var(--primary)" : inRange ? "var(--surface2)" : "transparent",
                opacity: c.inMonth ? 1 : 0.4,
                fontWeight: selected ? 700 : 400,
              }}
            >
              {c.day}
            </button>
          );
        })}
      </div>

      <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 12 }}>
        {rangeStart && rangeEnd
          ? `${rangeStart.split("-").reverse().join("/")} até ${rangeEnd.split("-").reverse().join("/")}`
          : rangeStart
            ? "Escolha a data final"
            : "Escolha a data inicial"}
      </div>

      <div className="modal-actions">
        <button className="btn-cancel" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn-save" disabled={!rangeStart || !rangeEnd} onClick={handleApply}>
          Filtrar
        </button>
      </div>
    </Modal>
  );
}
