import type { AureaState } from "./types";

/**
 * When a project task changes column, place it where people expect on the board:
 * newly completed tasks stack on top of Completed, and tasks moved back to To do or
 * In progress join the bottom of that column (like newly added tasks).
 */
export function placeProjectTasksOnStatusChange(previous: AureaState, next: AureaState): AureaState {
  const previousStatus = new Map(previous.tasks.map((task) => [task.id, task.status]));
  const moved = next.tasks.filter((task) => task.projectId && previousStatus.has(task.id) && previousStatus.get(task.id) !== task.status);
  if (!moved.length) return next;
  const orders = next.tasks.map((task) => task.order ?? 0);
  let top = Math.min(...orders);
  let bottom = Math.max(...orders);
  const placed = new Map(moved.map((task) => [task.id, task.status === "completed" ? --top : ++bottom]));
  return { ...next, tasks: next.tasks.map((task) => placed.has(task.id) ? { ...task, order: placed.get(task.id) } : task) };
}
