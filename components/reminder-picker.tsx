"use client";

import { useState } from "react";
import { formatReminder, REMINDER_UNIT_MINUTES, type ReminderUnit } from "@/lib/aurea/reminders";

/**
 * Add any number of reminders as "amount + unit before". Submits each chosen offset
 * (in minutes) as a hidden "reminders" form value; read them with formData.getAll("reminders").
 */
export function ReminderPicker({ initial }: { initial: number[] }) {
  const [selected, setSelected] = useState<number[]>(initial);
  const [amount, setAmount] = useState("15");
  const [unit, setUnit] = useState<ReminderUnit>("minutes");

  const parsed = Number(amount);
  const minutes = amount.trim() !== "" && Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * REMINDER_UNIT_MINUTES[unit]) : null;

  function add(value: number | null) {
    if (value == null) return;
    setSelected((current) => current.includes(value) ? current : [...current, value].sort((a, b) => a - b));
  }

  return <div className="field full-field reminder-picker">
    <span>Reminders</span>
    {selected.length > 0 && <div className="reminder-chips">
      {selected.map((value) => <span key={value} className="reminder-chip on">{formatReminder(value)}<button type="button" aria-label={`Remove ${formatReminder(value)}`} onClick={() => setSelected((current) => current.filter((item) => item !== value))}>×</button></span>)}
    </div>}
    <div className="reminder-add-row">
      <input type="number" min="0" step="1" inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} aria-label="Reminder amount" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); add(minutes); } }} />
      <select value={unit} onChange={(event) => setUnit(event.target.value as ReminderUnit)} aria-label="Reminder unit">
        <option value="minutes">minutes</option>
        <option value="hours">hours</option>
        <option value="days">days</option>
        <option value="weeks">weeks</option>
      </select>
      <span className="reminder-before">before</span>
      <button type="button" className="soft-button" onClick={() => add(minutes)} disabled={minutes == null}>Add</button>
      {!selected.includes(0) && <button type="button" className="text-button" onClick={() => add(0)}>+ At start</button>}
    </div>
    <small className="reminder-hint">{selected.length ? "Reminders go off for items with a time." : "No reminders yet. Reminders go off for items with a time."}</small>
    {selected.map((value) => <input key={value} type="hidden" name="reminders" value={value} />)}
  </div>;
}
