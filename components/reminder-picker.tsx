"use client";

import { useState } from "react";
import { REMINDER_OPTIONS } from "@/lib/aurea/reminders";

/**
 * Multi-select reminder chips. Submits each chosen offset as a hidden "reminders"
 * form value; read them with formData.getAll("reminders").
 */
export function ReminderPicker({ initial }: { initial: number[] }) {
  const [selected, setSelected] = useState<number[]>(initial);
  const extra = initial.filter((value) => !REMINDER_OPTIONS.some((option) => option.minutes === value));

  function toggle(minutes: number) {
    setSelected((current) => current.includes(minutes) ? current.filter((value) => value !== minutes) : [...current, minutes]);
  }

  return <div className="field full-field reminder-picker">
    <span>Reminders{selected.length ? ` · ${selected.length}` : ""}</span>
    <div className="reminder-chips" role="group" aria-label="Reminders">
      {[...REMINDER_OPTIONS, ...extra.map((minutes) => ({ minutes, label: `${minutes} min before` }))].map((option) => {
        const on = selected.includes(option.minutes);
        return <button key={option.minutes} type="button" className={on ? "reminder-chip on" : "reminder-chip"} aria-pressed={on} onClick={() => toggle(option.minutes)}>{on ? "✓ " : ""}{option.label}</button>;
      })}
    </div>
    <small className="reminder-hint">Pick as many as you like. Reminders go off for items with a time.</small>
    {selected.map((minutes) => <input key={minutes} type="hidden" name="reminders" value={minutes} />)}
  </div>;
}
