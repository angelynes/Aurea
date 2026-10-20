import { habitOccursOn, minutesFromTime, taskIsCompletedOn, taskOccursOn } from "./date";
import type { AureaState } from "./types";

export type DueReminder = {
  /** Stable per occurrence, so the same reminder is never sent twice. */
  key: string;
  title: string;
  body: string;
};

/**
 * Reminders whose trigger minute falls within [nowMinutes - lookbackMinutes, nowMinutes]
 * on `today`. Shared by the in-app watcher and the server push dispatcher.
 */
export function dueReminders(state: AureaState, today: string, nowMinutes: number, lookbackMinutes = 1): DueReminder[] {
  const due: DueReminder[] = [];
  const inWindow = (trigger: number) => trigger <= nowMinutes && trigger >= nowMinutes - lookbackMinutes;

  state.tasks.filter((task) => task.scheduledTime && task.reminderMinutes != null && taskOccursOn(task, today) && !taskIsCompletedOn(task, today)).forEach((task) => {
    const start = minutesFromTime(task.scheduledTime);
    if (start == null) return;
    const trigger = start - (task.reminderMinutes ?? 0) - (task.travelTimeMinutes ?? 0);
    if (!inWindow(trigger)) return;
    const reminder = task.reminderMinutes ?? 0;
    const body = task.travelTimeMinutes
      ? `${reminder > 0 ? `Leave in ${reminder} minutes` : "Time to leave"} · ${task.travelTimeMinutes} min travel${task.location ? ` · ${task.location}` : ""}`
      : `${reminder > 0 ? `Starts in ${reminder} minutes` : "Starting now"} · ${task.scheduledTime}`;
    due.push({ key: `task-${task.id}-${today}-${trigger}`, title: task.title, body });
  });

  state.habits.filter((habit) => habit.scheduledTime && habit.reminderMinutes != null && habitOccursOn(habit, today) && !(state.habitCompletions[habit.id] ?? []).includes(today)).forEach((habit) => {
    const start = minutesFromTime(habit.scheduledTime);
    if (start == null) return;
    const trigger = start - (habit.reminderMinutes ?? 0);
    if (!inWindow(trigger)) return;
    due.push({ key: `habit-${habit.id}-${today}-${trigger}`, title: habit.name, body: "Aurea routine reminder" });
  });

  return due;
}
