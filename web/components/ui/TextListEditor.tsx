"use client";

import { useState } from "react";

export function TextListEditor({
  items,
  onChange,
  placeholder,
  doneItems,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  doneItems?: string[];
}) {
  const [input, setInput] = useState("");
  const doneNorm = (doneItems ?? []).map((s) => s.trim().toLowerCase());

  function add() {
    const text = input.trim();
    if (!text) return;
    onChange([...items, text]);
    setInput("");
  }

  function remove(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <div className="cp-editor">
        {items.map((item, idx) => {
          const isDone = doneNorm.includes(item.trim().toLowerCase());
          return (
            <div key={idx} className={`cp-editor-item${isDone ? " cp-editor-item-done" : ""}`}>
              <span className="cp-editor-status">{isDone ? "✓" : "○"}</span>
              <span className="cp-editor-text">{item}</span>
              <button type="button" className="cp-editor-rm" title="Remover" onClick={() => remove(idx)}>
                ✕
              </button>
            </div>
          );
        })}
      </div>
      <div className="cp-add-row">
        <input
          className="cp-add-input"
          type="text"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="cp-add-btn" onClick={add}>
          +
        </button>
      </div>
    </div>
  );
}
