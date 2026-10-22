import type { AureaState } from "./types";

/** Saved planners carry this so the database can refuse saves from outdated app versions (see supabase/sync-guard.sql). */
export const SYNC_PROTOCOL = 2;

type WithId = { id: string };

function appendMissing<T extends WithId>(remote: T[], local: T[], skip: (item: T) => boolean = () => false) {
  const known = new Set(remote.map((item) => item.id));
  return [...remote, ...local.filter((item) => !known.has(item.id) && !skip(item))];
}

/**
 * First sync of this device with an account that already has cloud data, when the device's
 * planner hasn't belonged to another account. The cloud copy wins for everything both sides
 * have; anything that only exists on this device (projects, tasks, routines, categories,
 * imported events, review notes and their check-ins) is added, so nothing made before
 * signing in is lost.
 */
export function firstSyncMerge(local: AureaState, remote: AureaState, untouched: AureaState): AureaState {
  const sameAsStarter = (collection: "categories") => (item: WithId) =>
    untouched[collection].some((starter) => starter.id === item.id);
  const localOnly = (ids: string[], existing: Set<string>) => ids.filter((id) => !existing.has(id));

  const tasks = appendMissing(remote.tasks, local.tasks);
  const habits = appendMissing(remote.habits, local.habits);
  const addedTaskIds = localOnly(local.tasks.map((task) => task.id), new Set(remote.tasks.map((task) => task.id)));
  const addedHabitIds = localOnly(local.habits.map((habit) => habit.id), new Set(remote.habits.map((habit) => habit.id)));
  const pick = <V>(source: Record<string, V>, keys: string[]) => Object.fromEntries(keys.filter((key) => key in source).map((key) => [key, source[key]]));

  return {
    ...remote,
    projects: appendMissing(remote.projects, local.projects),
    tasks,
    habits,
    // Starter categories ("Personal", "Work"…) are left out so they don't appear twice.
    categories: appendMissing(remote.categories, local.categories, sameAsStarter("categories")),
    externalEvents: appendMissing(remote.externalEvents, local.externalEvents),
    habitCompletions: { ...pick(local.habitCompletions, addedHabitIds), ...remote.habitCompletions },
    habitSubtaskCompletions: { ...pick(local.habitSubtaskCompletions, addedHabitIds), ...remote.habitSubtaskCompletions },
    taskSubtaskCompletions: { ...pick(local.taskSubtaskCompletions, addedTaskIds), ...remote.taskSubtaskCompletions },
    weeklyReviews: { ...(local.weeklyReviews ?? {}), ...(remote.weeklyReviews ?? {}) },
  };
}

/**
 * Tasks whose project no longer exists (deleted on another device, for example) are
 * unlinked from it, and undated ones get `today` so they show up on Today instead of
 * disappearing from every view.
 */
export function rehomeOrphanedTasks(state: AureaState, today: string): AureaState {
  const projectIds = new Set(state.projects.map((project) => project.id));
  if (state.tasks.every((task) => !task.projectId || projectIds.has(task.projectId))) return state;
  return {
    ...state,
    tasks: state.tasks.map((task) => task.projectId && !projectIds.has(task.projectId)
      ? { ...task, projectId: undefined, status: task.status === "in_progress" ? "todo" : task.status, dueDate: task.dueDate ?? today }
      : task),
  };
}
