import { formatShortDate, taskIsCompletedOn } from "./date";
import type { AureaState, Habit, Project, Task } from "./types";

export type SearchResult =
  | { kind: "task"; id: string; title: string; detail: string; snippet?: string; done: boolean; item: Task; score: number }
  | { kind: "routine"; id: string; title: string; detail: string; snippet?: string; done: false; item: Habit; score: number }
  | { kind: "project"; id: string; title: string; detail: string; snippet?: string; done: false; item: Project; score: number };

/** Lowercase and strip accents so "cafe" finds "Café". */
export function normalize(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

type Field = { text?: string; weight: number; label?: string };

/**
 * Every word of the query must appear somewhere in the item. Matches in the title count
 * most, and a word at the start of the title more still. Returns null when not all words match.
 */
function scoreFields(words: string[], fields: Field[]) {
  const prepared = fields.filter((field) => field.text?.trim()).map((field) => ({ ...field, norm: normalize(field.text!) }));
  let score = 0;
  let snippetField: (typeof prepared)[number] | undefined;
  for (const word of words) {
    const hits = prepared.filter((field) => field.norm.includes(word));
    if (!hits.length) return null;
    for (const hit of hits) {
      score += hit.weight;
      if (hit.norm.startsWith(word) || hit.norm.includes(` ${word}`)) score += hit.weight / 2;
    }
    if (!snippetField) snippetField = hits.find((hit) => hit.label);
  }
  return { score, snippet: snippetField ? snippetAround(snippetField.text!, snippetField.norm, words, snippetField.label!) : undefined };
}

/** A short excerpt around the first match, e.g. "Notes: …bring the passport and…". */
function snippetAround(text: string, norm: string, words: string[], label: string) {
  const index = Math.min(...words.map((word) => norm.indexOf(word)).filter((position) => position >= 0));
  const start = Math.max(0, index - 30);
  const end = Math.min(text.length, index + 70);
  const excerpt = text.slice(start, end).replace(/\s+/g, " ").trim();
  return `${label}: ${start > 0 ? "…" : ""}${excerpt}${end < text.length ? "…" : ""}`;
}

export function searchPlanner(state: AureaState, query: string, today: string): SearchResult[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const categories = new Map(state.categories.map((category) => [category.id, category.name]));
  const projects = new Map(state.projects.map((project) => [project.id, project.name]));
  const results: SearchResult[] = [];

  for (const task of state.tasks) {
    const match = scoreFields(words, [
      { text: task.title, weight: 10 },
      { text: task.notes, weight: 4, label: "Notes" },
      { text: (task.subtasks ?? []).map((subtask) => subtask.title).join(" · "), weight: 4, label: "Checklist" },
      { text: task.location, weight: 3, label: "Location" },
      { text: task.projectId ? projects.get(task.projectId) : undefined, weight: 2 },
      { text: task.categoryId ? categories.get(task.categoryId) : undefined, weight: 2 },
    ]);
    if (!match) continue;
    const done = task.recurrence === "none" ? task.status === "completed" : taskIsCompletedOn(task, today);
    const detail = [
      task.projectId ? projects.get(task.projectId) : task.categoryId ? categories.get(task.categoryId) : undefined,
      task.dueDate ? formatShortDate(task.dueDate) : task.projectId ? "Undated" : undefined,
      task.scheduledTime,
      task.recurrence !== "none" ? "Repeats" : undefined,
      done ? "Done" : undefined,
    ].filter(Boolean).join(" · ");
    // Open tasks rank above finished ones.
    results.push({ kind: "task", id: task.id, title: task.title, detail, snippet: match.snippet, done, item: task, score: match.score - (done ? 3 : 0) });
  }

  for (const habit of state.habits) {
    const match = scoreFields(words, [
      { text: habit.name, weight: 10 },
      { text: (habit.subtasks ?? []).map((subtask) => subtask.title).join(" · "), weight: 4, label: "Checklist" },
    ]);
    if (!match) continue;
    results.push({ kind: "routine", id: habit.id, title: habit.name, detail: ["Routine", habit.scheduledTime].filter(Boolean).join(" · "), snippet: match.snippet, done: false, item: habit, score: match.score });
  }

  for (const project of state.projects) {
    const match = scoreFields(words, [
      { text: project.name, weight: 10 },
      { text: project.description, weight: 4, label: "Description" },
      { text: (project.updates ?? []).map((update) => update.text).join(" · "), weight: 3, label: "Update" },
    ]);
    if (!match) continue;
    const openTasks = state.tasks.filter((task) => task.projectId === project.id && task.status !== "completed").length;
    results.push({ kind: "project", id: project.id, title: project.name, detail: [project.status === "archived" ? "Archived project" : "Project", `${openTasks} open`].join(" · "), snippet: match.snippet, done: false, item: project, score: match.score });
  }

  return results.sort((a, b) => b.score - a.score);
}
