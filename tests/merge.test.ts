import { describe, expect, it } from "vitest";
import { deepEqual, merge3 } from "@/lib/aurea/merge";
import { makeState, makeTask } from "./factories";

// Sync safety: changes made on two devices are combined, never silently dropped.
const base = makeState({ tasks: [makeTask("a"), makeTask("b"), makeTask("c")], habitCompletions: { h: ["2026-10-19"] } });
const merge = (local: unknown, remote: unknown) => merge3(base, local, remote) as typeof base;

describe("merge3 (syncing two devices)", () => {
  it("keeps different edits from each device", () => {
    const local = { ...base, tasks: [makeTask("a"), makeTask("b", { title: "Renamed" }), makeTask("c")] };
    const remote = { ...base, tasks: [makeTask("a", { status: "completed" }), makeTask("b"), makeTask("c")] };
    const merged = merge(local, remote);
    expect(merged.tasks.find((t) => t.id === "a")?.status).toBe("completed");
    expect(merged.tasks.find((t) => t.id === "b")?.title).toBe("Renamed");
  });

  it("keeps tasks added on both devices", () => {
    const merged = merge({ ...base, tasks: [...base.tasks, makeTask("phone")] }, { ...base, tasks: [...base.tasks, makeTask("laptop")] });
    expect(merged.tasks.map((t) => t.id).sort()).toEqual(["a", "b", "c", "laptop", "phone"]);
  });

  it("keeps a deletion when the other device didn't touch the task", () => {
    expect(merge({ ...base, tasks: [makeTask("a"), makeTask("c")] }, base).tasks.map((t) => t.id)).toEqual(["a", "c"]);
    expect(merge(base, { ...base, tasks: [makeTask("a"), makeTask("c")] }).tasks.map((t) => t.id)).toEqual(["a", "c"]);
  });

  it("keeps a task that was deleted on one device but edited on the other", () => {
    const merged = merge({ ...base, tasks: [makeTask("a"), makeTask("c")] }, { ...base, tasks: [makeTask("a"), makeTask("b", { title: "Edited" }), makeTask("c")] });
    expect(merged.tasks.find((t) => t.id === "b")?.title).toBe("Edited");
  });

  it("merges routine check-ins from both devices as a set", () => {
    const merged = merge({ ...base, habitCompletions: { h: ["2026-10-19", "2026-10-20"] } }, { ...base, habitCompletions: { h: ["2026-10-19", "2026-10-21"] } });
    expect([...merged.habitCompletions.h].sort()).toEqual(["2026-10-19", "2026-10-20", "2026-10-21"]);
  });

  it("keeps an un-check from one device", () => {
    const merged = merge({ ...base, habitCompletions: { h: [] } }, { ...base, habitCompletions: { h: ["2026-10-19", "2026-10-21"] } });
    expect(merged.habitCompletions.h).toEqual(["2026-10-21"]);
  });

  it("lets this device win when both changed the same field", () => {
    const local = { ...base, settings: { ...base.settings, displayName: "Phone" } };
    const remote = { ...base, settings: { ...base.settings, displayName: "Laptop" } };
    expect(merge(local, remote).settings.displayName).toBe("Phone");
  });

  it("keeps a field cleared on one device (e.g. a removed reminder)", () => {
    const withReminder = { ...base, tasks: [makeTask("a", { reminders: [15] })] };
    const merged = merge3(withReminder, { ...withReminder, tasks: [makeTask("a")] }, withReminder) as typeof base;
    expect(merged.tasks[0].reminders).toBeUndefined();
  });

  it("keeps a field added only on the other device", () => {
    const remote = { ...base, settings: { ...base.settings, profileImage: "data:image/png;base64,x" } };
    expect(merge(base, remote).settings.profileImage).toBe("data:image/png;base64,x");
  });

  it("keeps a local reorder together with a remote rename", () => {
    const b = { categories: [{ id: "x", name: "Work" }, { id: "y", name: "Home" }] };
    const merged = merge3(b, { categories: [b.categories[1], b.categories[0]] }, { categories: [{ id: "x", name: "Job" }, b.categories[1]] });
    expect(merged).toEqual({ categories: [{ id: "y", name: "Home" }, { id: "x", name: "Job" }] });
  });

  it("returns the remote copy unchanged when this device has no edits", () => {
    const remote = { ...base, tasks: [...base.tasks, makeTask("new")] };
    expect(deepEqual(merge(base, remote), remote)).toBe(true);
  });
});
