import { describe, expect, it } from "vitest";
import { merge3 } from "@/lib/aurea/merge";
import { firstSyncMerge, rehomeOrphanedTasks } from "@/lib/aurea/sync";
import type { AureaState } from "@/lib/aurea/types";
import { makeHabit, makeProject, makeState, makeTask } from "./factories";

/**
 * Real-world sync situations, replayed the way the app's sync engine handles a pull
 * (components/aurea-provider.tsx → pullAndMerge).
 */
const starter = makeState();
const ids = (items: { id: string }[]) => items.map((item) => item.id).sort();
const pull = (base: AureaState, device: AureaState, cloud: AureaState) => rehomeOrphanedTasks(merge3(base, device, cloud) as AureaState, "2026-10-22");

describe("project sync scenarios", () => {
  it("A. a project made on the phone shows up on the laptop", () => {
    const shared = makeState({ projects: [makeProject("thesis")] });
    const phone = { ...shared, projects: [...shared.projects, makeProject("trip")] };
    expect(ids(pull(shared, shared, phone).projects)).toEqual(["thesis", "trip"]);
  });

  it("B. first sign-in keeps projects made on this device before signing in", () => {
    const cloudFromPhone = makeState({ projects: [makeProject("phone-project")], tasks: [makeTask("phone-task")] });
    const laptopLocalOnly = makeState({
      projects: [makeProject("laptop-project")],
      tasks: [makeTask("laptop-task", { projectId: "laptop-project", subtasks: [{ id: "s", title: "Step" }] })],
      taskSubtaskCompletions: { "laptop-task": { __task: ["s"] } },
      habits: [makeHabit("laptop-habit")],
      habitCompletions: { "laptop-habit": ["2026-10-21"] },
    });
    const merged = firstSyncMerge(laptopLocalOnly, cloudFromPhone, starter);
    expect(ids(merged.projects)).toEqual(["laptop-project", "phone-project"]);
    expect(ids(merged.tasks)).toEqual(["laptop-task", "phone-task"]);
    expect(merged.taskSubtaskCompletions["laptop-task"]).toEqual({ __task: ["s"] });
    expect(merged.habitCompletions["laptop-habit"]).toEqual(["2026-10-21"]);
  });

  it("B. first sign-in prefers the cloud copy for things both sides have, and doesn't duplicate starter categories", () => {
    const cloud = makeState({ tasks: [makeTask("t", { title: "From cloud" })], settings: { ...starter.settings, displayName: "Angel" } });
    const device = makeState({ tasks: [makeTask("t", { title: "Old local" })], settings: { ...starter.settings, displayName: "Profile" } });
    const merged = firstSyncMerge(device, cloud, starter);
    expect(merged.tasks).toHaveLength(1);
    expect(merged.tasks[0].title).toBe("From cloud");
    expect(merged.settings.displayName).toBe("Angel");
    expect(ids(merged.categories)).toEqual(ids(cloud.categories));
  });

  it("B. a fresh device signing in simply gets the cloud planner", () => {
    const cloud = makeState({ projects: [makeProject("p")], tasks: [makeTask("t", { projectId: "p" })] });
    const merged = firstSyncMerge(starter, cloud, starter);
    expect(ids(merged.projects)).toEqual(["p"]);
    expect(ids(merged.tasks)).toEqual(["t"]);
  });

  it("D. a task added to a project survives the project being deleted on the other device", () => {
    const shared = makeState({ projects: [makeProject("p")] });
    const phoneDeletes = { ...shared, projects: [] };
    const laptopAdds = { ...shared, tasks: [makeTask("new-task", { projectId: "p" })] };
    const task = pull(shared, laptopAdds, phoneDeletes).tasks.find((item) => item.id === "new-task");
    expect(task).toMatchObject({ projectId: undefined, dueDate: "2026-10-22" });
  });

  it("D. deleting a project moves its undated tasks to Today and keeps dated ones as they are", () => {
    const state = makeState({ projects: [], tasks: [
      makeTask("undated", { projectId: "gone", status: "in_progress" }),
      makeTask("dated", { projectId: "gone", dueDate: "2026-11-01" }),
      makeTask("other", { projectId: "kept" }),
    ] });
    const fixed = rehomeOrphanedTasks({ ...state, projects: [makeProject("kept")] }, "2026-10-22");
    expect(fixed.tasks.find((t) => t.id === "undated")).toMatchObject({ projectId: undefined, dueDate: "2026-10-22", status: "todo" });
    expect(fixed.tasks.find((t) => t.id === "dated")).toMatchObject({ projectId: undefined, dueDate: "2026-11-01" });
    expect(fixed.tasks.find((t) => t.id === "other")?.projectId).toBe("kept");
  });

  it("leaves planners without orphaned tasks untouched", () => {
    const state = makeState({ projects: [makeProject("p")], tasks: [makeTask("t", { projectId: "p" })] });
    expect(rehomeOrphanedTasks(state, "2026-10-22")).toBe(state);
  });
});
