import type { AureaState, Habit, Project, Task } from "@/lib/aurea/types";

const NOW = "2026-10-21T12:00:00.000Z";

export function makeTask(id: string, extra: Partial<Task> = {}): Task {
  return { id, title: id, status: "todo", recurrence: "none", subtasks: [], excludedDates: [], completedDates: [], createdAt: NOW, updatedAt: NOW, ...extra };
}

export function makeHabit(id: string, extra: Partial<Habit> = {}): Habit {
  return { id, name: id, frequency: "custom", weekdays: [0, 1, 2, 3, 4, 5, 6], subtasks: [], excludedDates: [], active: true, createdAt: "2026-01-01T12:00:00.000Z", ...extra };
}

export function makeProject(id: string, extra: Partial<Project> = {}): Project {
  return { id, name: id, color: "#D9A441", status: "active", createdAt: NOW, updates: [], ...extra };
}

export function makeState(extra: Partial<AureaState> = {}): AureaState {
  return {
    version: 6,
    categories: [{ id: "work", name: "Work", color: "#E3DEEC" }, { id: "home", name: "Home & Family", color: "#EFE4CC" }],
    projects: [],
    tasks: [],
    habits: [],
    habitCompletions: {},
    habitSubtaskCompletions: {},
    taskSubtaskCompletions: {},
    externalEvents: [],
    settings: {
      displayName: "Test", profileSetupComplete: true, theme: "aurea", eveningReviewTime: "20:00", notificationsEnabled: true,
      dayStartHour: 7, dayEndHour: 22, weekStartsMonday: true, timeZone: "America/Los_Angeles",
    },
    lastUpdatedAt: NOW,
    ...extra,
  };
}
