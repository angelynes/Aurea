import { describe, expect, it } from "vitest";
import { dueReminders, formatReminder, reminderFields, reminderOffsets } from "@/lib/aurea/reminders";
import { makeHabit, makeState, makeTask } from "./factories";

const at = (hour: number, minute = 0) => hour * 60 + minute;

describe("dueReminders", () => {
  const state = makeState({
    tasks: [
      makeTask("dentist", { title: "Dentist", dueDate: "2026-10-22", scheduledTime: "10:00", reminders: [0, 60, 1440] }),
      makeTask("legacy", { title: "Old task", dueDate: "2026-10-21", scheduledTime: "10:00", reminderMinutes: 15 }),
      makeTask("flight", { title: "Flight", dueDate: "2026-10-21", scheduledTime: "11:00", reminders: [10], travelTimeMinutes: 35, location: "LAX" }),
      makeTask("late", { title: "Late call", dueDate: "2026-10-22", scheduledTime: "00:05", reminders: [10] }),
      makeTask("done", { title: "Done", dueDate: "2026-10-22", scheduledTime: "10:00", reminders: [1440], status: "completed", completedAt: "2026-10-20T10:00:00Z" }),
      makeTask("no-time", { title: "No time", dueDate: "2026-10-21", reminders: [0] }),
    ],
    habits: [makeHabit("gym", { name: "Gym", scheduledTime: "07:00", reminders: [0, 1440] })],
  });
  const titles = (today: string, minutes: number, lookback?: number) => dueReminders(state, today, minutes, lookback).map((r) => `${r.title}: ${r.body}`);

  it("fires a day-before reminder on the previous day", () => {
    expect(titles("2026-10-21", at(10))).toContain("Dentist: Tomorrow at 10:00");
  });

  it("fires hour-before and at-start reminders on the day", () => {
    expect(titles("2026-10-22", at(9))).toContain("Dentist: Starts in 1 hour · 10:00");
    expect(titles("2026-10-22", at(10))).toContain("Dentist: Starting now · 10:00");
  });

  it("still supports the old single-reminder field", () => {
    expect(titles("2026-10-21", at(9, 45))).toContain("Old task: Starts in 15 minutes · 10:00");
  });

  it("adds travel time before the reminder", () => {
    expect(titles("2026-10-21", at(10, 15))).toContain("Flight: Leave in 10 minutes · 35 min travel · LAX");
  });

  it("handles reminders that fall before midnight for an early-morning task", () => {
    expect(titles("2026-10-21", at(23, 55))).toContain("Late call: Starts in 10 minutes · 00:05");
  });

  it("skips completed tasks and tasks without a time", () => {
    const all = titles("2026-10-21", at(10)).join(" | ");
    expect(all).not.toContain("Done");
    expect(all).not.toContain("No time");
  });

  it("only fires within the lookback window", () => {
    expect(titles("2026-10-21", at(9, 47))).not.toContain("Old task: Starts in 15 minutes · 10:00");
    expect(titles("2026-10-21", at(9, 47), 2)).toContain("Old task: Starts in 15 minutes · 10:00");
  });

  it("covers routines, including days-before reminders", () => {
    expect(titles("2026-10-21", at(7))).toEqual(expect.arrayContaining(["Gym: Aurea routine reminder", "Gym: Tomorrow at 07:00 · routine"]));
  });

  it("does not remind about a routine already checked off", () => {
    const checked = { ...state, habitCompletions: { gym: ["2026-10-21"] } };
    expect(dueReminders(checked, "2026-10-21", at(7)).map((r) => r.body)).not.toContain("Aurea routine reminder");
  });

  it("gives every occurrence and offset a distinct key", () => {
    const keys = dueReminders(state, "2026-10-21", at(7)).map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("reminder helpers", () => {
  it("reads old and new reminder fields", () => {
    expect(reminderOffsets({ reminderMinutes: 15 })).toEqual([15]);
    expect(reminderOffsets({ reminders: [1440, 0, 0] })).toEqual([0, 1440]);
    expect(reminderOffsets({})).toEqual([]);
  });

  it("keeps the old field filled for older app versions", () => {
    expect(reminderFields([1440, 0])).toEqual({ reminders: [0, 1440], reminderMinutes: 0 });
    expect(reminderFields([])).toEqual({ reminders: undefined, reminderMinutes: undefined });
  });

  it("labels reminders in the largest whole unit", () => {
    expect([0, 1, 15, 60, 90, 1440, 2160, 10080, 20160].map(formatReminder)).toEqual([
      "At start", "1 minute before", "15 minutes before", "1 hour before", "90 minutes before",
      "1 day before", "36 hours before", "1 week before", "2 weeks before",
    ]);
  });
});
