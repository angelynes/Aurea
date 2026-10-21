import { describe, expect, it } from "vitest";
import { placeProjectTasksOnStatusChange } from "@/lib/aurea/ordering";
import { normalize, searchPlanner } from "@/lib/aurea/search";
import { CATEGORY_COLORS, HABIT_COLOR, toAureaCategoryColor, toAureaHabitColor } from "@/lib/aurea/theme";
import { makeHabit, makeProject, makeState, makeTask } from "./factories";

describe("searchPlanner", () => {
  const state = makeState({
    projects: [makeProject("p1", { name: "Aurea launch", description: "Ship the planner", updates: [{ id: "u", text: "Passport photo booked", createdAt: "2026-10-01T00:00:00Z" }] })],
    tasks: [
      makeTask("dentist", { title: "Book dentist", notes: "Ask about the passport photo", dueDate: "2026-10-22" }),
      makeTask("renew", { title: "Renew passport", categoryId: "work", status: "completed" }),
      makeTask("pack", { title: "Pack bag", subtasks: [{ id: "s", title: "Passport" }], projectId: "p1" }),
      makeTask("cafe", { title: "Café meeting", location: "Blue Bottle Café" }),
    ],
    habits: [makeHabit("morning", { name: "Morning routine", subtasks: [{ id: "x", title: "Vitamins" }] })],
  });
  const find = (query: string) => searchPlanner(state, query, "2026-10-21").map((r) => r.id);

  it("finds matches in titles, notes, checklists and project updates", () => {
    expect(find("passport").sort()).toEqual(["dentist", "p1", "pack", "renew"]);
  });

  it("requires every word to match", () => {
    expect(find("passport photo").sort()).toEqual(["dentist", "p1"]);
  });

  it("ignores accents and case", () => {
    expect(normalize("Café")).toBe("cafe");
    expect(find("CAFE")).toEqual(["cafe"]);
  });

  it("searches routines and returns nothing for no match", () => {
    expect(find("vitamins")).toEqual(["morning"]);
    expect(find("zzz")).toEqual([]);
  });

  it("ranks open title matches above finished ones", () => {
    const fresh = makeState({ tasks: [makeTask("old", { title: "Passport", status: "completed" }), makeTask("new", { title: "Passport" })] });
    expect(searchPlanner(fresh, "passport", "2026-10-21").map((r) => r.id)).toEqual(["new", "old"]);
  });
});

describe("project board ordering", () => {
  const board = (tasks: ReturnType<typeof makeTask>[], status: string) => tasks.filter((t) => t.status === status).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((t) => t.id);
  const start = makeState({ tasks: [makeTask("a", { projectId: "p", order: 0 }), makeTask("b", { projectId: "p", order: 1 }), makeTask("c", { projectId: "p", order: 2 }), makeTask("x", { projectId: "p", order: 3, status: "completed" }), makeTask("loose", { order: 4 })] });
  const change = (state: typeof start, id: string, status: "todo" | "completed") => placeProjectTasksOnStatusChange(state, { ...state, tasks: state.tasks.map((t) => t.id === id ? { ...t, status } : t) });

  it("stacks newly completed tasks on top of Completed", () => {
    const afterB = change(start, "b", "completed");
    const afterA = change(afterB, "a", "completed");
    expect(board(afterA.tasks, "completed")).toEqual(["a", "b", "x"]);
  });

  it("puts reopened tasks at the bottom of To do", () => {
    const reopened = change(change(start, "a", "completed"), "a", "todo");
    expect(board(reopened.tasks, "todo")).toEqual(["b", "c", "loose", "a"]);
  });

  it("leaves tasks outside projects alone", () => {
    const next = change(start, "b", "completed");
    expect(next.tasks.find((t) => t.id === "loose")?.order).toBe(4);
  });
});

describe("retired theme colors", () => {
  it("moves built-in colors of old themes to the matching Aurea color", () => {
    expect(toAureaCategoryColor("#EEE8F7")).toBe(CATEGORY_COLORS[0]);
    expect(toAureaCategoryColor("#d2eeeb")).toBe(CATEGORY_COLORS[1]);
  });

  it("keeps Aurea and custom colors", () => {
    expect(toAureaCategoryColor(CATEGORY_COLORS[3])).toBe(CATEGORY_COLORS[3]);
    expect(toAureaCategoryColor("#123456")).toBe("#123456");
    expect(toAureaHabitColor("#C9B7F1")).toBe(HABIT_COLOR);
    expect(toAureaHabitColor(undefined)).toBe(HABIT_COLOR);
    expect(toAureaHabitColor("#ff00aa")).toBe("#ff00aa");
  });
});
