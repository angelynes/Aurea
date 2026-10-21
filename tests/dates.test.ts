import { describe, expect, it } from "vitest";
import { addDays, habitOccursOn, taskIsCompletedOn, taskOccursOn, zonedNow } from "@/lib/aurea/date";
import { makeHabit, makeTask } from "./factories";

// 2026-10-19 is a Monday.
const week = ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25"];
const onDays = (task: Parameters<typeof taskOccursOn>[0]) => week.filter((date) => taskOccursOn(task, date)).map((date) => date.slice(8));

describe("taskOccursOn (which days a task shows up)", () => {
  it("one-off tasks show only on their date", () => {
    expect(onDays(makeTask("t", { dueDate: "2026-10-21" }))).toEqual(["21"]);
  });

  it("undated project tasks never show on a day", () => {
    expect(onDays(makeTask("t", { projectId: "p" }))).toEqual([]);
  });

  it("repeats daily, on weekdays and on weekends from the start date", () => {
    expect(onDays(makeTask("t", { dueDate: "2026-10-21", recurrence: "daily" }))).toEqual(["21", "22", "23", "24", "25"]);
    expect(onDays(makeTask("t", { dueDate: "2026-10-01", recurrence: "weekdays" }))).toEqual(["19", "20", "21", "22", "23"]);
    expect(onDays(makeTask("t", { dueDate: "2026-10-01", recurrence: "weekends" }))).toEqual(["24", "25"]);
  });

  it("repeats weekly on chosen days, or on the start date's weekday", () => {
    expect(onDays(makeTask("t", { dueDate: "2026-10-01", recurrence: "weekly", recurrenceDays: [1, 4] }))).toEqual(["19", "22"]);
    expect(onDays(makeTask("t", { dueDate: "2026-10-07", recurrence: "weekly" }))).toEqual(["21"]);
  });

  it("repeats monthly and yearly on the same date", () => {
    expect(taskOccursOn(makeTask("t", { dueDate: "2026-09-21", recurrence: "monthly" }), "2026-10-21")).toBe(true);
    expect(taskOccursOn(makeTask("t", { dueDate: "2025-10-21", recurrence: "yearly" }), "2026-10-21")).toBe(true);
    expect(taskOccursOn(makeTask("t", { dueDate: "2025-10-21", recurrence: "yearly" }), "2026-10-22")).toBe(false);
  });

  it("respects skipped dates and end dates", () => {
    const task = makeTask("t", { dueDate: "2026-10-19", recurrence: "daily", excludedDates: ["2026-10-20"], recurrenceEndDate: "2026-10-22" });
    expect(onDays(task)).toEqual(["19", "21", "22"]);
  });
});

describe("completion", () => {
  it("tracks repeating tasks per day and one-off tasks overall", () => {
    const repeating = makeTask("t", { recurrence: "daily", dueDate: "2026-10-01", completedDates: ["2026-10-20"] });
    expect(taskIsCompletedOn(repeating, "2026-10-20")).toBe(true);
    expect(taskIsCompletedOn(repeating, "2026-10-21")).toBe(false);
    expect(taskIsCompletedOn(makeTask("t", { status: "completed" }), "2026-10-21")).toBe(true);
  });
});

describe("habitOccursOn", () => {
  it("follows the chosen weekdays and ignores inactive routines", () => {
    const mwf = makeHabit("h", { weekdays: [1, 3, 5] });
    expect(week.filter((date) => habitOccursOn(mwf, date)).map((date) => date.slice(8))).toEqual(["19", "21", "23"]);
    expect(habitOccursOn(makeHabit("h", { active: false }), "2026-10-21")).toBe(false);
  });
});

describe("time zones and dates", () => {
  it("reads the local date in the planner's time zone", () => {
    const lateEveningInLA = new Date("2026-10-21T05:30:00Z");
    expect(zonedNow("America/Los_Angeles", lateEveningInLA)).toMatchObject({ dateKey: "2026-10-20", minutes: 22 * 60 + 30 });
    expect(zonedNow("Asia/Jakarta", lateEveningInLA)).toMatchObject({ dateKey: "2026-10-21", minutes: 12 * 60 + 30 });
  });

  it("adds days across month and year ends", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});
