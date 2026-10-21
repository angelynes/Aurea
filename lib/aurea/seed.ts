import type { AureaState } from "./types";

const nowIso = () => new Date().toISOString();

export function createSeedState(): AureaState {
  const now = nowIso();

  return {
    version: 6,
    categories: [
      { id: "cat-personal", name: "Personal", color: "#EFE4CC" },
      { id: "cat-work", name: "Work", color: "#E3DEEC" },
      { id: "cat-errands", name: "Errands", color: "#E1E9DD" },
    ],
    projects: [],
    tasks: [],
    habits: [],
    habitCompletions: {},
    habitSubtaskCompletions: {},
    taskSubtaskCompletions: {},
    externalEvents: [],
    settings: {
      displayName: "Profile",
      profileSetupComplete: false,
      theme: "aurea",
      eveningReviewTime: "20:30",
      notificationsEnabled: false,
      dayStartHour: 7,
      dayEndHour: 22,
      weekStartsMonday: false,
      timeZone: "auto",
    },
    lastUpdatedAt: now,
  };
}
