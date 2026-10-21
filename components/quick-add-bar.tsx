"use client";

import { useMemo, useState } from "react";
import { zonedNow } from "@/lib/aurea/date";
import { parseQuickAdd } from "@/lib/aurea/quick-add";
import { reminderFields } from "@/lib/aurea/reminders";
import type { Task } from "@/lib/aurea/types";
import { useAurea } from "./aurea-provider";
import { TaskModal } from "./task-modal";

const CHIP_ICONS: Record<string, string> = { date: "📅", time: "⏰", duration: "⏳", travel: "🚗", reminder: "🔔", repeat: "↻", category: "●", project: "▱", warning: "!" };

/**
 * One-line task entry: "dentist tomorrow 3pm remind 1 day before #health".
 * Shows what it understood while typing; Enter adds the task.
 */
export function QuickAddBar({ defaultDate, defaultProjectId, placeholder }: { defaultDate?: string; defaultProjectId?: string; placeholder?: string }) {
  const { state, addTask } = useAurea();
  const [text, setText] = useState("");
  const [added, setAdded] = useState<{ id: string; title: string } | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const today = zonedNow(state.settings.timeZone).dateKey;
  const parsed = useMemo(() => text.trim() ? parseQuickAdd(text, today, state.categories, state.projects) : null, [text, today, state.categories, state.projects]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!parsed?.title) return;
    const projectId = parsed.projectId ?? defaultProjectId;
    // Tasks outside a project need a day so they show up on Today; project tasks may stay undated.
    const dueDate = parsed.dueDate ?? (projectId && parsed.recurrence === "none" ? undefined : defaultDate ?? today);
    const id = addTask({
      title: parsed.title,
      status: "todo",
      recurrence: parsed.recurrence,
      recurrenceDays: parsed.recurrenceDays,
      dueDate,
      scheduledTime: parsed.scheduledTime,
      durationMinutes: parsed.durationMinutes,
      travelTimeMinutes: parsed.travelTimeMinutes,
      ...reminderFields(parsed.reminders ?? []),
      categoryId: parsed.categoryId ?? state.categories[0]?.id,
      projectId,
      subtasks: [],
      excludedDates: [],
      completedDates: [],
    });
    setAdded({ id, title: parsed.title });
    setText("");
  }

  const chips = parsed?.chips ?? [];
  return <div className="quick-add">
    <form className="quick-add-row" onSubmit={submit}>
      <span className="quick-add-plus" aria-hidden="true">＋</span>
      <input value={text} onChange={(event) => { setText(event.target.value); setAdded(null); }} placeholder={placeholder ?? "Add a task… e.g. dentist tomorrow 3pm remind 1 day before"} aria-label="Quick add a task" enterKeyHint="done" />
      {text.trim() && <button className="primary-button" type="submit" disabled={!parsed?.title}>Add</button>}
    </form>
    {chips.length > 0 && <div className="quick-add-chips" aria-live="polite">{chips.map((chip, index) => <span key={`${chip.kind}-${index}`} className={`quick-chip ${chip.kind}`}><span aria-hidden="true">{CHIP_ICONS[chip.kind]}</span>{chip.label}</span>)}</div>}
    {added && !text && <p className="quick-add-done">Added “{added.title}” <button type="button" className="text-button" onClick={() => setEditing(state.tasks.find((task) => task.id === added.id) ?? null)}>Edit details</button></p>}
    {!text && !added && <p className="quick-add-hint">Try: <em>tomorrow 3pm</em> · <em>every monday</em> · <em>for 1h</em> · <em>remind 1 day before</em> · <em>#category</em> · <em>+project</em></p>}
    <TaskModal open={Boolean(editing)} task={editing} onClose={() => setEditing(null)} />
  </div>;
}
