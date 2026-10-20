import { addDays, habitOccursOn, minutesFromTime, taskIsCompletedOn, taskOccursOn } from "./date";
import type { AureaState } from "./types";

const DAY = 24 * 60;

export type DueReminder = {
  /** Stable per occurrence and reminder, so the same reminder is never sent twice. */
  key: string;
  title: string;
  body: string;
};

/** Reminder choices offered in the task and routine editors, in minutes before the start. */
export const REMINDER_OPTIONS: { minutes: number; label: string }[] = [
  { minutes: 0, label: "At start" },
  { minutes: 5, label: "5 min before" },
  { minutes: 10, label: "10 min before" },
  { minutes: 15, label: "15 min before" },
  { minutes: 30, label: "30 min before" },
  { minutes: 60, label: "1 hour before" },
  { minutes: 120, label: "2 hours before" },
  { minutes: DAY, label: "1 day before" },
  { minutes: 2 * DAY, label: "2 days before" },
  { minutes: 7 * DAY, label: "1 week before" },
];

/** All reminder offsets for a task or routine. Older saves only have reminderMinutes. */
export function reminderOffsets(item: { reminders?: number[]; reminderMinutes?: number }): number[] {
  const list = item.reminders ?? (item.reminderMinutes != null ? [item.reminderMinutes] : []);
  return [...new Set(list.filter((value) => Number.isFinite(value) && value >= 0))].sort((a, b) => a - b);
}

/** Fields to save for a chosen set of reminders; reminderMinutes stays filled for older app versions. */
export function reminderFields(offsets: number[]) {
  const reminders = [...new Set(offsets)].sort((a, b) => a - b);
  return { reminders: reminders.length ? reminders : undefined, reminderMinutes: reminders[0] };
}

function leadLabel(minutes: number, startTime: string) {
  if (minutes === 0) return "Starting now";
  if (minutes < 60) return `Starts in ${minutes} minutes`;
  if (minutes < DAY) {
    const hours = minutes / 60;
    return `Starts in ${Number.isInteger(hours) ? hours : hours.toFixed(1)} hour${hours === 1 ? "" : "s"}`;
  }
  const days = Math.round(minutes / DAY);
  if (days === 1) return `Tomorrow at ${startTime}`;
  if (days === 7) return `In 1 week at ${startTime}`;
  return `In ${days} days at ${startTime}`;
}

/**
 * Reminders whose trigger falls within [nowMinutes - lookbackMinutes, nowMinutes] on `today`,
 * including "days before" reminders for upcoming occurrences. Shared by the in-app watcher
 * and the server push dispatcher.
 */
export function dueReminders(state: AureaState, today: string, nowMinutes: number, lookbackMinutes = 1): DueReminder[] {
  const due: DueReminder[] = [];
  const inWindow = (trigger: number) => trigger <= nowMinutes && trigger >= nowMinutes - lookbackMinutes;

  // Trigger time is measured in minutes from the start of `today`, so it can point at an
  // occurrence several days ahead (for "1 day before") or cross midnight.
  function check(startTime: string | undefined, offsets: number[], extraLead: number, visit: (occurrenceDate: string, offset: number, trigger: number) => void) {
    const start = minutesFromTime(startTime);
    if (start == null || !offsets.length) return;
    const maxDaysAhead = Math.ceil((Math.max(...offsets) + extraLead + lookbackMinutes) / DAY) + 1;
    for (let daysAhead = 0; daysAhead <= maxDaysAhead; daysAhead += 1) {
      for (const offset of offsets) {
        const trigger = daysAhead * DAY + start - offset - extraLead;
        if (inWindow(trigger)) visit(addDays(today, daysAhead), offset, trigger);
      }
    }
  }

  for (const task of state.tasks) {
    if (!task.scheduledTime) continue;
    const travel = task.travelTimeMinutes ?? 0;
    check(task.scheduledTime, reminderOffsets(task), travel, (occurrenceDate, offset) => {
      if (!taskOccursOn(task, occurrenceDate) || taskIsCompletedOn(task, occurrenceDate)) return;
      const body = travel && offset < DAY
        ? `${offset > 0 ? `Leave in ${offset} minutes` : "Time to leave"} · ${travel} min travel${task.location ? ` · ${task.location}` : ""}`
        : `${leadLabel(offset, task.scheduledTime!)}${offset < DAY ? ` · ${task.scheduledTime}` : ""}`;
      due.push({ key: `task-${task.id}-${occurrenceDate}-${offset}`, title: task.title, body });
    });
  }

  for (const habit of state.habits) {
    if (!habit.scheduledTime || habit.active === false) continue;
    check(habit.scheduledTime, reminderOffsets(habit), 0, (occurrenceDate, offset) => {
      if (!habitOccursOn(habit, occurrenceDate) || (state.habitCompletions[habit.id] ?? []).includes(occurrenceDate)) return;
      const body = offset === 0 ? "Aurea routine reminder" : `${leadLabel(offset, habit.scheduledTime!)} · routine`;
      due.push({ key: `habit-${habit.id}-${occurrenceDate}-${offset}`, title: habit.name, body });
    });
  }

  return due;
}
