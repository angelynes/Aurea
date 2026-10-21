import { describe, expect, it } from "vitest";
import { buildWeeklyReview, weekStart } from "@/lib/aurea/review";
import { makeHabit, makeProject, makeState, makeTask } from "./factories";

describe("weekStart", () => {
  it("starts on Monday or Sunday per the setting", () => {
    expect(weekStart("2026-10-21", true)).toBe("2026-10-19");
    expect(weekStart("2026-10-21", false)).toBe("2026-10-18");
    expect(weekStart("2026-10-19", true)).toBe("2026-10-19");
    expect(weekStart("2026-10-25", true)).toBe("2026-10-19");
  });
});

describe("buildWeeklyReview", () => {
  const state = makeState({
    projects: [makeProject("launch")],
    tasks: [
      makeTask("mon", { status: "completed", completedAt: "2026-10-19T18:00:00Z", dueDate: "2026-10-19", projectId: "launch" }),
      // 10:30pm Tuesday in Los Angeles (already Wednesday in UTC) counts on Tuesday.
      makeTask("tue-late", { status: "completed", completedAt: "2026-10-21T05:30:00Z", dueDate: "2026-10-20" }),
      makeTask("slipped", { dueDate: "2026-10-19", scheduledTime: "09:00" }),
      makeTask("tomorrow", { dueDate: "2026-10-22" }),
      makeTask("gym", { recurrence: "daily", dueDate: "2026-10-01", completedDates: ["2026-10-19", "2026-10-20", "2026-10-12"] }),
      makeTask("next-week", { dueDate: "2026-10-27", projectId: "launch" }),
      makeTask("last-week", { status: "completed", completedAt: "2026-10-14T18:00:00Z", dueDate: "2026-10-14" }),
    ],
    habits: [makeHabit("vitamins", { createdAt: "2026-10-20T15:00:00Z" })],
    habitCompletions: { vitamins: ["2026-10-20"] },
  });
  const review = buildWeeklyReview(state, "2026-10-19", "2026-10-21");

  it("counts finished tasks on the right day in the planner's time zone", () => {
    expect(review.doneCount).toBe(4);
    expect(review.days[0].done.map((t) => t.id)).toEqual(["mon", "gym"]);
    expect(review.days[1].done.map((t) => t.id)).toEqual(["tue-late", "gym"]);
    expect(review.bestDay?.date).toBe("2026-10-19");
  });

  it("lists only past, unfinished, dated tasks as slipped", () => {
    expect(review.slipped.map((t) => t.id)).toEqual(["slipped"]);
  });

  it("doesn't count days before a routine existed, or today before it's done", () => {
    const vitamins = review.routines[0];
    expect(vitamins.scheduled).toBe(1);
    expect(vitamins.done).toBe(1);
    expect(vitamins.days.find((d) => d.date === "2026-10-21")?.future).toBe(true);
  });

  it("summarizes project progress for the week", () => {
    expect(review.projects).toEqual([expect.objectContaining({ doneThisWeek: 1, open: 1, total: 2 })]);
  });

  it("previews next week", () => {
    expect(review.nextWeek[1].tasks.map((t) => t.id)).toEqual(["gym", "next-week"]);
  });
});
