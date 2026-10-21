"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Provider, Session, SupabaseClient } from "@supabase/supabase-js";
import { createClient, hasSupabaseConfig } from "@/lib/supabase/client";
import { createSeedState } from "@/lib/aurea/seed";
import { toAureaCategoryColor, toAureaHabitColor } from "@/lib/aurea/theme";
import { deepEqual, merge3 } from "@/lib/aurea/merge";
import { currentPushSubscription, pushSupport, subscribeToPush, unsubscribeFromPush, type PushSupport } from "@/lib/push";
import { addDays, dateKey, minutesFromTime, taskIsCompletedOn, taskOccursOn, zonedNow } from "@/lib/aurea/date";
import type {
  Category,
  ExternalCalendarEvent,
  Habit,
  AureaSettings,
  AureaState,
  Project,
  Task,
  TaskStatus,
} from "@/lib/aurea/types";

const STORAGE_KEY = "aurea-planner-state-v2";
/** Last planner copy this device and the cloud agreed on, used to merge changes from other devices. */
const SYNC_BASE_KEY = "aurea-sync-base-v1";
const GOOGLE_CALENDAR_TOKEN_KEY = "aurea-google-calendar-token";
const GOOGLE_OAUTH_INTENT_KEY = "aurea-google-oauth-intent";
// The app was called NOVA before; carry existing device data over to the new keys.
const LEGACY_STORAGE_KEYS: Array<[string, string]> = [
  ["nova-planner-state-v2", STORAGE_KEY],
  ["nova-google-calendar-token", GOOGLE_CALENDAR_TOKEN_KEY],
  ["nova-google-oauth-intent", GOOGLE_OAUTH_INTENT_KEY],
];
const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

type CloudStatus = "local" | "connecting" | "synced" | "error";

type Result = { ok: boolean; message: string };

type AureaContextValue = {
  state: AureaState;
  hydrated: boolean;
  addTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => string;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  reorderTask: (draggedId: string, targetId: string) => void;
  toggleTask: (id: string, onDate?: string) => void;
  toggleTaskSubtask: (taskId: string, subtaskId: string, onDate?: string) => void;
  setTaskStatus: (id: string, status: TaskStatus) => void;
  addProject: (project: Omit<Project, "id" | "createdAt">) => string;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  addCategory: (category: Omit<Category, "id">) => string;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  reorderCategory: (draggedId: string, targetId: string) => void;
  addHabit: (habit: Omit<Habit, "id" | "createdAt">) => string;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  toggleHabit: (id: string, onDate?: string) => void;
  toggleHabitSubtask: (habitId: string, subtaskId: string, onDate?: string) => void;
  importExternalEvents: (events: ExternalCalendarEvent[]) => void;
  clearImportedEvents: (source?: ExternalCalendarEvent["source"]) => void;
  updateSettings: (patch: Partial<AureaSettings>) => void;
  importState: (next: AureaState) => void;
  resetState: () => void;
  cloudConfigured: boolean;
  cloudStatus: CloudStatus;
  cloudEmail: string | null;
  sendMagicLink: (email: string) => Promise<Result>;
  verifyEmailOtp: (email: string, token: string) => Promise<Result>;
  signInWithProvider: (provider: "google") => Promise<Result>;
  signOutCloud: () => Promise<void>;
  deleteAccount: () => Promise<Result>;
  syncNow: () => Promise<void>;
  googleCalendarConnected: boolean;
  connectGoogleCalendar: () => Promise<Result>;
  syncGoogleCalendar: () => Promise<Result>;
  disconnectGoogleCalendar: () => void;
  pushSupport: PushSupport;
  pushEnabled: boolean;
  enablePush: () => Promise<Result>;
  disablePush: () => Promise<Result>;
};

const AureaContext = createContext<AureaContextValue | null>(null);

/**
 * When a project task changes column, place it where people expect on the board:
 * newly completed tasks stack on top of Completed, and tasks moved back to To do or
 * In progress join the bottom of that column (like newly added tasks).
 */
function placeProjectTasksOnStatusChange(previous: AureaState, next: AureaState): AureaState {
  const previousStatus = new Map(previous.tasks.map((task) => [task.id, task.status]));
  const moved = next.tasks.filter((task) => task.projectId && previousStatus.has(task.id) && previousStatus.get(task.id) !== task.status);
  if (!moved.length) return next;
  const orders = next.tasks.map((task) => task.order ?? 0);
  let top = Math.min(...orders);
  let bottom = Math.max(...orders);
  const placed = new Map(moved.map((task) => [task.id, task.status === "completed" ? --top : ++bottom]));
  return { ...next, tasks: next.tasks.map((task) => placed.has(task.id) ? { ...task, order: placed.get(task.id) } : task) };
}

function stamp(state: AureaState): AureaState {
  return { ...state, lastUpdatedAt: new Date().toISOString() };
}

const LEGACY_DEMO_TASK_IDS = new Set(["task-1", "task-2", "task-3", "task-4", "task-5", "task-6", "task-7"]);
const LEGACY_DEMO_PROJECT_IDS = new Set(["project-nova", "project-thesis", "project-trip"]);
const LEGACY_DEMO_HABIT_IDS = new Set(["habit-1", "habit-2", "habit-3"]);
const LEGACY_PROJECT_DESCRIPTIONS = new Set([
  "an all-in-one planner, with day-to-day tasks and project manager",
  "an all-in-one planner with day-to-day tasks and project manager",
]);
const CATEGORY_COLOR_MIGRATION: Record<string, string> = {
  "#d7c8ed": "#EEE8F7", "#b29ce4": "#E5DCF5", "#e8cfe5": "#F5E5F1", "#c9d8ee": "#E6EEF9",
  "#e6d7b8": "#F7EEDC", "#bfd8ce": "#E2F0E9", "#d9c7ef": "#ECE5F8", "#f0d6e4": "#F8E8EF",
  "#d8dcdd": "#ECEEEF", "#bfc7c9": "#E5E9EA", "#d9d4cb": "#EFECE7", "#c8d1cb": "#E4ECE7",
  "#d4d0dc": "#ECE9F0", "#e2d5cf": "#F1E9E5", "#c7d3db": "#E4EBF0", "#dfdece": "#F0EFE5",
  "#f2c9d9": "#F9E4EC", "#e8b8cc": "#F6DCE7", "#f7d9e5": "#FCEBF2", "#e6cbd6": "#F4E3EA",
  "#f0cdbf": "#F8E5DD", "#d9cedf": "#EDE5F1", "#f4d6d0": "#FAE8E4", "#e7bfd0": "#F5DFE8",
  "#bfe6e3": "#DDF3F1", "#8ed6d2": "#D2EEEB", "#c7dfec": "#E1EFF7", "#bbd8d2": "#DCEEEA",
  "#d7e8c8": "#E8F3DD", "#c9d4e8": "#E3EAF6", "#a9ddd7": "#D5F2EF", "#d5e9e7": "#E8F5F3",
};

function removeLegacyDemoData(state: AureaState): AureaState {
  const categories = state.categories.filter((category) => category.id !== "cat-project");
  const projects = state.projects.filter((project) => !LEGACY_DEMO_PROJECT_IDS.has(project.id));
  const tasks = state.tasks
    .filter((task) => !LEGACY_DEMO_TASK_IDS.has(task.id))
    .map((task) => ({
      ...task,
      categoryId: task.categoryId === "cat-project" ? undefined : task.categoryId,
      projectId: task.projectId && LEGACY_DEMO_PROJECT_IDS.has(task.projectId) ? undefined : task.projectId,
    }));
  const habits = state.habits.filter((habit) => !LEGACY_DEMO_HABIT_IDS.has(habit.id));
  const habitCompletions = Object.fromEntries(Object.entries(state.habitCompletions).filter(([habitId]) => !LEGACY_DEMO_HABIT_IDS.has(habitId)));
  const habitSubtaskCompletions = Object.fromEntries(Object.entries(state.habitSubtaskCompletions).filter(([habitId]) => !LEGACY_DEMO_HABIT_IDS.has(habitId)));
  const taskSubtaskCompletions = Object.fromEntries(Object.entries(state.taskSubtaskCompletions ?? {}).filter(([taskId]) => !LEGACY_DEMO_TASK_IDS.has(taskId)));
  const externalEvents = state.externalEvents.filter((event) => event.source !== "sample");

  return { ...state, version: 6, categories, projects, tasks, habits, habitCompletions, habitSubtaskCompletions, taskSubtaskCompletions, externalEvents };
}

function normalizeState(input: unknown): AureaState | null {
  if (!input || typeof input !== "object") return null;
  const state = input as Partial<AureaState>;
  if (!Array.isArray(state.tasks) || !Array.isArray(state.projects) || !Array.isArray(state.categories)) return null;

  const base = createSeedState();
  const settings = { ...base.settings, ...(state.settings ?? {}) };
  const incomingName = (state.settings?.displayName ?? "").trim();
  const hadCustomName = Boolean(incomingName) && !["darren", "profile"].includes(incomingName.toLowerCase());
  if (!settings.displayName || settings.displayName.trim().toLowerCase() === "darren") settings.displayName = "Profile";
  settings.profileSetupComplete = state.settings?.profileSetupComplete ?? hadCustomName;
  // Aurea has a single look; older saves may name a retired theme.
  settings.theme = "aurea";
  if (!settings.timeZone) settings.timeZone = "auto";
  settings.dayStartHour = Math.max(0, Math.min(23, Number(settings.dayStartHour ?? 7)));
  settings.dayEndHour = Math.max(settings.dayStartHour + 1, Math.min(47, Number(settings.dayEndHour ?? 22)));

  const normalized: AureaState = {
    ...base,
    ...state,
    version: 6,
    tasks: state.tasks.map((task, index) => ({
      ...task,
      subtasks: task.subtasks ?? [],
      recurrence: task.recurrence ?? "none",
      order: typeof task.order === "number" ? task.order : index,
      excludedDates: task.excludedDates ?? [],
    })),
    projects: state.projects.map((project) => {
      const existingUpdates = project.updates ?? [];
      const migratedUpdate = !existingUpdates.length && project.notes?.trim()
        ? [{ id: crypto.randomUUID(), text: project.notes.trim(), createdAt: project.createdAt ?? new Date().toISOString() }]
        : [];
      const description = project.description?.trim();
      const cleanedDescription = description && !LEGACY_PROJECT_DESCRIPTIONS.has(description.toLowerCase()) ? description : undefined;
      return { ...project, description: cleanedDescription, updates: existingUpdates.length ? existingUpdates : migratedUpdate };
    }),
    categories: state.categories.map((category) => ({
      ...category,
      color: toAureaCategoryColor(CATEGORY_COLOR_MIGRATION[category.color?.toLowerCase?.() ?? ""] ?? category.color ?? ""),
    })),
    habits: Array.isArray(state.habits)
      ? state.habits.map((habit) => ({
          ...habit,
          frequency: habit.frequency ?? "custom",
          excludedDates: habit.excludedDates ?? [],
          subtasks: habit.subtasks ?? [],
          color: toAureaHabitColor(habit.color),
        }))
      : [],
    habitCompletions: state.habitCompletions ?? {},
    habitSubtaskCompletions: state.habitSubtaskCompletions ?? {},
    taskSubtaskCompletions: state.taskSubtaskCompletions ?? {},
    externalEvents: Array.isArray(state.externalEvents) ? state.externalEvents : [],
    settings,
    lastUpdatedAt: state.lastUpdatedAt ?? new Date().toISOString(),
  };

  return removeLegacyDemoData(normalized);
}

export function AureaProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AureaState>(() => createSeedState());
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>("local");
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupportState, setPushSupportState] = useState<PushSupport>("unsupported");
  const sessionRef = useRef<Session | null>(null);
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const cloudReadyRef = useRef(false);
  const cloudVersionRef = useRef<number | null>(null);
  const cloudBaseRef = useRef<AureaState | null>(null);
  const dirtyRef = useRef(false);
  const syncingRef = useRef(false);
  const pendingSyncRef = useRef<"pull" | "push" | null>(null);
  const runSyncRef = useRef<(mode: "pull" | "push") => Promise<void>>(async () => undefined);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef<AureaState>(state);

  const cloudConfigured = hasSupabaseConfig();

  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    try {
      for (const [legacyKey, key] of LEGACY_STORAGE_KEYS) {
        const legacy = window.localStorage.getItem(legacyKey);
        if (legacy !== null && window.localStorage.getItem(key) === null) window.localStorage.setItem(key, legacy);
      }
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = normalizeState(JSON.parse(stored));
        if (parsed) setState(parsed);
      }
      setGoogleCalendarConnected(Boolean(window.localStorage.getItem(GOOGLE_CALENDAR_TOKEN_KEY)));
    } catch {
      // Keep seed state.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const rememberCloud = useCallback((userId: string | null, version: number | null, base: AureaState | null) => {
    cloudVersionRef.current = version;
    cloudBaseRef.current = base;
    try {
      if (userId && base && version != null) window.localStorage.setItem(SYNC_BASE_KEY, JSON.stringify({ userId, version, base }));
      else window.localStorage.removeItem(SYNC_BASE_KEY);
    } catch {
      // Storage full: merging still works for this session.
    }
  }, []);

  /**
   * Fetch the cloud copy and fold in this device's unsaved changes (three-way merge against
   * the last copy both agreed on). Returns true when the merged result still needs saving.
   */
  const pullAndMerge = useCallback(async (client: SupabaseClient, userId: string): Promise<boolean> => {
    const startSnapshot = stateRef.current;
    const { data, error } = await client.from("app_state").select("data, version").eq("user_id", userId).maybeSingle();
    if (error) throw error;
    if (!data?.data) { rememberCloud(userId, null, null); return true; }
    const remote = normalizeState(data.data);
    if (!remote) return false;
    // First sync on this device: the cloud copy wins, plus anything edited while it loaded.
    const base = cloudBaseRef.current ?? startSnapshot;
    const merged = normalizeState(merge3(base, stateRef.current, remote)) ?? remote;
    const needsSave = !deepEqual(merged, remote);
    rememberCloud(userId, Number(data.version ?? 0), remote);
    stateRef.current = merged;
    setState(merged);
    dirtyRef.current = needsSave;
    return needsSave;
  }, [rememberCloud]);

  /** Save only if nobody else saved since the version we last saw; otherwise merge and retry. */
  const pushToCloud = useCallback(async (client: SupabaseClient, userId: string) => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const snapshot = stateRef.current;
      const version = cloudVersionRef.current;
      const updatedAt = new Date().toISOString();
      if (version == null) {
        const { data, error } = await client.from("app_state").insert({ user_id: userId, data: snapshot, updated_at: updatedAt }).select("version").single();
        if (!error && data) {
          rememberCloud(userId, Number(data.version ?? 0), snapshot);
          if (stateRef.current === snapshot) dirtyRef.current = false;
          return;
        }
        if (error && error.code !== "23505") throw error;
      } else {
        const { data, error } = await client.from("app_state").update({ data: snapshot, updated_at: updatedAt }).eq("user_id", userId).eq("version", version).select("version");
        if (error) throw error;
        if (data?.length) {
          rememberCloud(userId, Number(data[0].version ?? 0), snapshot);
          if (stateRef.current === snapshot) dirtyRef.current = false;
          return;
        }
      }
      // Another device saved first: merge its changes in and try again.
      if (!(await pullAndMerge(client, userId))) return;
    }
    throw new Error("Could not save after several attempts.");
  }, [pullAndMerge, rememberCloud]);

  /** One sync at a time; requests made meanwhile run right after. "pull" also saves when needed. */
  const runSync = useCallback(async (mode: "pull" | "push") => {
    const client = supabaseRef.current;
    const userId = sessionRef.current?.user.id;
    if (!client || !userId) return;
    if (syncingRef.current) {
      pendingSyncRef.current = pendingSyncRef.current === "pull" || mode === "pull" ? "pull" : "push";
      return;
    }
    syncingRef.current = true;
    setCloudStatus("connecting");
    try {
      if (!cloudReadyRef.current && !cloudBaseRef.current) {
        try {
          const saved = JSON.parse(window.localStorage.getItem(SYNC_BASE_KEY) ?? "null");
          if (saved?.userId === userId && saved.base) { cloudBaseRef.current = normalizeState(saved.base); cloudVersionRef.current = Number(saved.version); }
        } catch {
          // No usable saved base: the first pull treats the cloud copy as the starting point.
        }
      }
      if (mode === "pull" || !cloudReadyRef.current) {
        const needsSave = await pullAndMerge(client, userId);
        cloudReadyRef.current = true;
        if (needsSave) await pushToCloud(client, userId);
      } else if (dirtyRef.current) {
        await pushToCloud(client, userId);
      }
      setCloudStatus("synced");
    } catch {
      setCloudStatus("error");
    } finally {
      syncingRef.current = false;
      const pending = pendingSyncRef.current;
      pendingSyncRef.current = null;
      if (pending) void runSyncRef.current(pending);
    }
  }, [pullAndMerge, pushToCloud]);

  useEffect(() => { runSyncRef.current = runSync; }, [runSync]);

  const captureProviderToken = useCallback((nextSession: Session | null) => {
    if (!nextSession?.provider_token || typeof window === "undefined") return;
    const intent = window.localStorage.getItem(GOOGLE_OAUTH_INTENT_KEY);
    if (intent === "calendar") {
      window.localStorage.setItem(GOOGLE_CALENDAR_TOKEN_KEY, nextSession.provider_token);
      window.localStorage.removeItem(GOOGLE_OAUTH_INTENT_KEY);
      setGoogleCalendarConnected(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated || !cloudConfigured) return;
    const client = createClient();
    if (!client) return;
    supabaseRef.current = client;

    client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      sessionRef.current = data.session;
      captureProviderToken(data.session);
      if (data.session) void runSyncRef.current("pull");
    });

    const { data: subscription } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      sessionRef.current = nextSession;
      captureProviderToken(nextSession);
      if (nextSession) window.setTimeout(() => void runSyncRef.current("pull"), 0);
      else {
        cloudReadyRef.current = false;
        cloudVersionRef.current = null;
        cloudBaseRef.current = null;
        setCloudStatus("local");
      }
    });

    // Pick up other devices' changes when Aurea comes back into view, and every 30 seconds while open.
    const onVisible = () => { if (sessionRef.current && document.visibilityState === "visible") void runSyncRef.current("pull"); };
    const checkVersion = async () => {
      const userId = sessionRef.current?.user.id;
      if (!userId || document.visibilityState !== "visible" || syncingRef.current || !cloudReadyRef.current) return;
      const { data } = await (client as SupabaseClient).from("app_state").select("version").eq("user_id", userId).maybeSingle();
      if (data && Number(data.version) !== cloudVersionRef.current) void runSyncRef.current("pull");
    };
    const poll = window.setInterval(checkVersion, 30_000);
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      subscription.subscription.unsubscribe();
      window.clearInterval(poll);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [hydrated, cloudConfigured, captureProviderToken]);

  useEffect(() => {
    if (!hydrated || !session || !cloudReadyRef.current || !dirtyRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setCloudStatus("connecting");
    saveTimerRef.current = setTimeout(() => { void runSyncRef.current("push"); }, 350);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [state, session, hydrated]);

  const mutate = useCallback((recipe: (current: AureaState) => AureaState) => {
    const next = stamp(placeProjectTasksOnStatusChange(stateRef.current, recipe(stateRef.current)));
    dirtyRef.current = true;
    stateRef.current = next;
    setState(next);
  }, []);

  // Scheduled tasks complete automatically once their scheduled end time has passed.
  // Durations may cross midnight or span multiple days. Habits/routines are intentionally
  // excluded: they always require a manual check.
  useEffect(() => {
    if (!hydrated) return;

    const occurrenceHasEnded = (occurrenceDate: string, startMinutes: number, durationMinutes: number, nowDate: string, nowMinutes: number) => {
      const totalEnd = startMinutes + Math.max(0, durationMinutes);
      const endDate = addDays(occurrenceDate, Math.floor(totalEnd / (24 * 60)));
      const endMinutes = totalEnd % (24 * 60);
      return nowDate > endDate || (nowDate === endDate && nowMinutes >= endMinutes);
    };

    const completePassedTasks = () => {
      const now = zonedNow(stateRef.current.settings.timeZone);
      const completedAt = new Date().toISOString();
      let changed = false;
      const autoCompletedSubtasks: Array<{ taskId: string; key: string; ids: string[] }> = [];

      const tasks = stateRef.current.tasks.map((task) => {
        if (!task.scheduledTime) return task;
        const start = minutesFromTime(task.scheduledTime);
        if (start == null) return task;
        const duration = task.durationMinutes ?? 0;

        if (task.recurrence !== "none") {
          const completedDates = new Set(task.completedDates ?? []);
          const lookbackDays = Math.max(1, Math.ceil(duration / (24 * 60)) + 1);
          let taskChanged = false;
          for (let offset = lookbackDays; offset >= 0; offset -= 1) {
            const occurrenceDate = addDays(now.dateKey, -offset);
            if (!taskOccursOn(task, occurrenceDate) || completedDates.has(occurrenceDate)) continue;
            if (occurrenceHasEnded(occurrenceDate, start, duration, now.dateKey, now.minutes)) {
              completedDates.add(occurrenceDate);
              autoCompletedSubtasks.push({ taskId: task.id, key: occurrenceDate, ids: (task.subtasks ?? []).map((subtask) => subtask.id) });
              taskChanged = true;
            }
          }
          if (!taskChanged) return task;
          changed = true;
          return { ...task, completedDates: [...completedDates], updatedAt: completedAt };
        }

        if (taskIsCompletedOn(task, task.dueDate ?? now.dateKey)) return task;
        const occurrenceDate = task.dueDate ?? now.dateKey;
        if (!occurrenceHasEnded(occurrenceDate, start, duration, now.dateKey, now.minutes)) return task;
        autoCompletedSubtasks.push({ taskId: task.id, key: "__task", ids: (task.subtasks ?? []).map((subtask) => subtask.id) });
        changed = true;
        return { ...task, status: "completed" as const, completedAt, updatedAt: completedAt };
      });

      if (changed) mutate((current) => {
        const taskSubtaskCompletions = { ...current.taskSubtaskCompletions };
        autoCompletedSubtasks.forEach(({ taskId, key, ids }) => {
          taskSubtaskCompletions[taskId] = { ...(taskSubtaskCompletions[taskId] ?? {}), [key]: ids };
        });
        return { ...current, tasks, taskSubtaskCompletions };
      });
    };

    completePassedTasks();
    const timer = window.setInterval(completePassedTasks, 30_000);
    return () => window.clearInterval(timer);
  }, [hydrated, mutate]);

  const addTask = useCallback((task: Omit<Task, "id" | "createdAt" | "updatedAt">) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    mutate((current) => {
      const maxOrder = current.tasks.reduce((max, item) => Math.max(max, item.order ?? -1), -1);
      return { ...current, tasks: [...current.tasks, { ...task, id, order: task.order ?? maxOrder + 1, createdAt: now, updatedAt: now }] };
    });
    return id;
  }, [mutate]);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    mutate((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === id ? { ...task, ...patch, updatedAt: new Date().toISOString() } : task) }));
  }, [mutate]);

  const deleteTask = useCallback((id: string) => {
    mutate((current) => {
      const { [id]: _subtasks, ...taskSubtaskCompletions } = current.taskSubtaskCompletions;
      return { ...current, tasks: current.tasks.filter((task) => task.id !== id), taskSubtaskCompletions };
    });
  }, [mutate]);

  const reorderTask = useCallback((draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    mutate((current) => {
      const ordered = [...current.tasks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const from = ordered.findIndex((task) => task.id === draggedId);
      const to = ordered.findIndex((task) => task.id === targetId);
      if (from < 0 || to < 0) return current;
      const [moved] = ordered.splice(from, 1);
      ordered.splice(to, 0, moved);
      const orderById = new Map(ordered.map((task, index) => [task.id, index]));
      return { ...current, tasks: current.tasks.map((task) => ({ ...task, order: orderById.get(task.id) ?? task.order })) };
    });
  }, [mutate]);

  const toggleTask = useCallback((id: string, onDate = dateKey()) => {
    mutate((current) => {
      const task = current.tasks.find((item) => item.id === id);
      if (!task) return current;
      const updatedAt = new Date().toISOString();
      const taskMap = { ...(current.taskSubtaskCompletions[id] ?? {}) };

      if (task.recurrence !== "none") {
        const completedDates = new Set(task.completedDates ?? []);
        const complete = !completedDates.has(onDate);
        if (complete) completedDates.add(onDate); else completedDates.delete(onDate);
        taskMap[onDate] = complete ? (task.subtasks ?? []).map((subtask) => subtask.id) : [];
        return {
          ...current,
          tasks: current.tasks.map((item) => item.id === id ? { ...item, completedDates: [...completedDates], updatedAt } : item),
          taskSubtaskCompletions: { ...current.taskSubtaskCompletions, [id]: taskMap },
        };
      }

      const complete = !taskIsCompletedOn(task, onDate);
      taskMap.__task = complete ? (task.subtasks ?? []).map((subtask) => subtask.id) : [];
      return {
        ...current,
        tasks: current.tasks.map((item) => item.id === id ? { ...item, status: complete ? "completed" as const : "todo" as const, completedAt: complete ? updatedAt : undefined, updatedAt } : item),
        taskSubtaskCompletions: { ...current.taskSubtaskCompletions, [id]: taskMap },
      };
    });
  }, [mutate]);

  const toggleTaskSubtask = useCallback((taskId: string, subtaskId: string, onDate = dateKey()) => {
    mutate((current) => {
      const task = current.tasks.find((item) => item.id === taskId);
      if (!task) return current;
      const subtasks = task.subtasks ?? [];
      const key = task.recurrence === "none" ? "__task" : onDate;
      const taskMap = { ...(current.taskSubtaskCompletions[taskId] ?? {}) };
      const done = new Set(taskMap[key] ?? []);
      if (done.has(subtaskId)) done.delete(subtaskId); else done.add(subtaskId);
      taskMap[key] = [...done];
      const allDone = subtasks.length > 0 && subtasks.every((subtask) => done.has(subtask.id));
      const updatedAt = new Date().toISOString();
      const tasks = current.tasks.map((item) => {
        if (item.id !== taskId) return item;
        if (item.recurrence !== "none") {
          const completedDates = new Set(item.completedDates ?? []);
          if (allDone) completedDates.add(onDate); else completedDates.delete(onDate);
          return { ...item, completedDates: [...completedDates], updatedAt };
        }
        return { ...item, status: allDone ? "completed" as const : (item.status === "completed" ? "todo" as const : item.status), completedAt: allDone ? updatedAt : undefined, updatedAt };
      });
      return { ...current, tasks, taskSubtaskCompletions: { ...current.taskSubtaskCompletions, [taskId]: taskMap } };
    });
  }, [mutate]);

  const setTaskStatus = useCallback((id: string, status: TaskStatus) => {
    mutate((current) => {
      const task = current.tasks.find((item) => item.id === id);
      if (!task) return current;
      const updatedAt = new Date().toISOString();
      const taskMap = { ...(current.taskSubtaskCompletions[id] ?? {}) };
      if (status === "completed" && task.recurrence === "none") taskMap.__task = (task.subtasks ?? []).map((subtask) => subtask.id);
      return {
        ...current,
        tasks: current.tasks.map((item) => item.id === id ? { ...item, status, completedAt: status === "completed" ? updatedAt : undefined, updatedAt } : item),
        taskSubtaskCompletions: { ...current.taskSubtaskCompletions, [id]: taskMap },
      };
    });
  }, [mutate]);

  const addProject = useCallback((project: Omit<Project, "id" | "createdAt">) => {
    const id = crypto.randomUUID();
    mutate((current) => ({ ...current, projects: [...current.projects, { ...project, updates: project.updates ?? [], id, createdAt: new Date().toISOString() }] }));
    return id;
  }, [mutate]);
  const updateProject = useCallback((id: string, patch: Partial<Project>) => { mutate((current) => ({ ...current, projects: current.projects.map((project) => project.id === id ? { ...project, ...patch } : project) })); }, [mutate]);
  const deleteProject = useCallback((id: string) => { mutate((current) => ({ ...current, projects: current.projects.filter((project) => project.id !== id), tasks: current.tasks.map((task) => task.projectId === id ? { ...task, projectId: undefined, status: task.status === "in_progress" ? "todo" : task.status } : task) })); }, [mutate]);

  const addCategory = useCallback((category: Omit<Category, "id">) => { const id = crypto.randomUUID(); mutate((current) => ({ ...current, categories: [...current.categories, { ...category, id }] })); return id; }, [mutate]);
  const updateCategory = useCallback((id: string, patch: Partial<Category>) => { mutate((current) => ({ ...current, categories: current.categories.map((category) => category.id === id ? { ...category, ...patch } : category) })); }, [mutate]);
  const deleteCategory = useCallback((id: string) => { mutate((current) => ({ ...current, categories: current.categories.filter((category) => category.id !== id), tasks: current.tasks.map((task) => task.categoryId === id ? { ...task, categoryId: undefined } : task) })); }, [mutate]);
  const reorderCategory = useCallback((draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    mutate((current) => {
      const categories = [...current.categories];
      const from = categories.findIndex((category) => category.id === draggedId);
      const to = categories.findIndex((category) => category.id === targetId);
      if (from < 0 || to < 0) return current;
      const [moved] = categories.splice(from, 1);
      categories.splice(to, 0, moved);
      return { ...current, categories };
    });
  }, [mutate]);

  const addHabit = useCallback((habit: Omit<Habit, "id" | "createdAt">) => { const id = crypto.randomUUID(); mutate((current) => ({ ...current, habits: [...current.habits, { ...habit, id, createdAt: new Date().toISOString() }] })); return id; }, [mutate]);
  const updateHabit = useCallback((id: string, patch: Partial<Habit>) => { mutate((current) => ({ ...current, habits: current.habits.map((habit) => habit.id === id ? { ...habit, ...patch } : habit) })); }, [mutate]);
  const deleteHabit = useCallback((id: string) => {
    mutate((current) => {
      const { [id]: _completed, ...habitCompletions } = current.habitCompletions;
      const { [id]: _subtasks, ...habitSubtaskCompletions } = current.habitSubtaskCompletions;
      return { ...current, habits: current.habits.filter((habit) => habit.id !== id), habitCompletions, habitSubtaskCompletions };
    });
  }, [mutate]);

  const toggleHabit = useCallback((id: string, onDate = dateKey()) => {
    mutate((current) => {
      const habit = current.habits.find((item) => item.id === id);
      if (!habit) return current;
      const dates = new Set(current.habitCompletions[id] ?? []);
      const wasComplete = dates.has(onDate);
      if (wasComplete) dates.delete(onDate); else dates.add(onDate);
      const subtaskMap = { ...(current.habitSubtaskCompletions[id] ?? {}) };
      subtaskMap[onDate] = wasComplete ? [] : (habit.subtasks ?? []).map((subtask) => subtask.id);
      return {
        ...current,
        habitCompletions: { ...current.habitCompletions, [id]: [...dates] },
        habitSubtaskCompletions: { ...current.habitSubtaskCompletions, [id]: subtaskMap },
      };
    });
  }, [mutate]);

  const toggleHabitSubtask = useCallback((habitId: string, subtaskId: string, onDate = dateKey()) => {
    mutate((current) => {
      const habit = current.habits.find((item) => item.id === habitId);
      if (!habit) return current;
      const allSubtasks = habit.subtasks ?? [];
      const habitMap = { ...(current.habitSubtaskCompletions[habitId] ?? {}) };
      const done = new Set(habitMap[onDate] ?? []);
      if (done.has(subtaskId)) done.delete(subtaskId); else done.add(subtaskId);
      habitMap[onDate] = [...done];

      const completedDates = new Set(current.habitCompletions[habitId] ?? []);
      const allDone = allSubtasks.length > 0 && allSubtasks.every((subtask) => done.has(subtask.id));
      if (allDone) completedDates.add(onDate); else completedDates.delete(onDate);

      return {
        ...current,
        habitSubtaskCompletions: { ...current.habitSubtaskCompletions, [habitId]: habitMap },
        habitCompletions: { ...current.habitCompletions, [habitId]: [...completedDates] },
      };
    });
  }, [mutate]);

  const importExternalEvents = useCallback((events: ExternalCalendarEvent[]) => {
    mutate((current) => {
      const map = new Map(current.externalEvents.map((event) => [event.id, event]));
      events.forEach((event) => map.set(event.id, event));
      return { ...current, externalEvents: [...map.values()] };
    });
  }, [mutate]);

  const clearImportedEvents = useCallback((source?: ExternalCalendarEvent["source"]) => { mutate((current) => ({ ...current, externalEvents: source ? current.externalEvents.filter((event) => event.source !== source) : [] })); }, [mutate]);
  const updateSettings = useCallback((patch: Partial<AureaSettings>) => { mutate((current) => ({ ...current, settings: { ...current.settings, ...patch } })); }, [mutate]);
  const importState = useCallback((next: AureaState) => { const normalized = normalizeState(next); if (normalized) { const stamped = stamp(normalized); dirtyRef.current = true; stateRef.current = stamped; setState(stamped); } }, []);
  const resetState = useCallback(() => { const next = createSeedState(); dirtyRef.current = true; stateRef.current = next; setState(next); }, []);

  const sendMagicLink = useCallback(async (email: string) => {
    const client = supabaseRef.current ?? createClient();
    if (!client) return { ok: false, message: "Supabase is not configured yet." };
    supabaseRef.current = client;
    setCloudStatus("connecting");
    const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/settings` } });
    if (error) { setCloudStatus("error"); return { ok: false, message: error.message }; }
    return { ok: true, message: "Check your email for Aurea's sign-in link or code." };
  }, []);

  const verifyEmailOtp = useCallback(async (email: string, token: string) => {
    const client = supabaseRef.current ?? createClient();
    if (!client) return { ok: false, message: "Supabase is not configured yet." };
    supabaseRef.current = client;
    const { data, error } = await client.auth.verifyOtp({ email, token, type: "email" });
    if (error) return { ok: false, message: error.message };
    if (data.session) {
      setSession(data.session);
      sessionRef.current = data.session;
      await runSyncRef.current("pull");
    }
    return { ok: true, message: "Signed in. This device will stay signed in." };
  }, []);

  const signInWithProvider = useCallback(async (provider: "google") => {
    const client = supabaseRef.current ?? createClient();
    if (!client) return { ok: false, message: "Supabase is not configured yet." };
    supabaseRef.current = client;
    const { error } = await client.auth.signInWithOAuth({ provider: provider as Provider, options: { redirectTo: `${window.location.origin}/settings` } });
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: "Opening Google sign in…" };
  }, []);

  const signOutCloud = useCallback(async () => {
    await unsubscribeFromPush(supabaseRef.current).catch(() => undefined);
    setPushEnabled(false);
    await supabaseRef.current?.auth.signOut();
    setSession(null);
    sessionRef.current = null;
    cloudReadyRef.current = false;
    rememberCloud(null, null, null);
    window.localStorage.removeItem(GOOGLE_CALENDAR_TOKEN_KEY);
    setGoogleCalendarConnected(false);
    setCloudStatus("local");
  }, [rememberCloud]);

  const deleteAccount = useCallback(async (): Promise<Result> => {
    const client = supabaseRef.current;
    const token = sessionRef.current?.access_token;
    if (!client || !token) return { ok: false, message: "Sign in first to delete your account." };
    await unsubscribeFromPush(client).catch(() => undefined);
    const response = await fetch("/api/account/delete", { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
    const body = await response?.json().catch(() => null) as { error?: string } | null;
    if (!response?.ok) return { ok: false, message: body?.error ?? "Could not delete your account. Check your connection and try again." };
    // The account is gone on the server; clear everything this device kept too.
    await client.auth.signOut({ scope: "local" }).catch(() => undefined);
    setSession(null);
    sessionRef.current = null;
    cloudReadyRef.current = false;
    rememberCloud(null, null, null);
    setPushEnabled(false);
    [STORAGE_KEY, GOOGLE_CALENDAR_TOKEN_KEY, GOOGLE_OAUTH_INTENT_KEY].forEach((key) => window.localStorage.removeItem(key));
    setGoogleCalendarConnected(false);
    const fresh = createSeedState();
    dirtyRef.current = false;
    stateRef.current = fresh;
    setState(fresh);
    setCloudStatus("local");
    return { ok: true, message: "Your account and planner data have been deleted." };
  }, [rememberCloud]);

  const syncNow = useCallback(async () => { await runSyncRef.current("pull"); }, []);

  const connectGoogleCalendar = useCallback(async () => {
    const client = supabaseRef.current ?? createClient();
    if (!client) return { ok: false, message: "Supabase is not configured yet." };
    supabaseRef.current = client;
    window.localStorage.setItem(GOOGLE_OAUTH_INTENT_KEY, "calendar");
    const { error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/settings?calendar=google`,
        scopes: GOOGLE_CALENDAR_SCOPE,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) {
      window.localStorage.removeItem(GOOGLE_OAUTH_INTENT_KEY);
      return { ok: false, message: error.message };
    }
    return { ok: true, message: "Opening Google Calendar permission…" };
  }, []);

  const syncGoogleCalendar = useCallback(async () => {
    const token = window.localStorage.getItem(GOOGLE_CALENDAR_TOKEN_KEY);
    if (!token) return { ok: false, message: "Connect Google Calendar first." };
    const now = new Date();
    const timeMin = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const timeMax = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const params = new URLSearchParams({ timeMin, timeMax, singleEvents: "true", orderBy: "startTime", maxResults: "2500" });
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
    if (response.status === 401 || response.status === 403) {
      window.localStorage.removeItem(GOOGLE_CALENDAR_TOKEN_KEY);
      setGoogleCalendarConnected(false);
      return { ok: false, message: "Google permission expired. Reconnect Google Calendar and try again." };
    }
    if (!response.ok) return { ok: false, message: `Google Calendar sync failed (${response.status}).` };
    const payload = await response.json() as { items?: Array<any> };
    const events: ExternalCalendarEvent[] = (payload.items ?? []).filter((item) => item.status !== "cancelled" && (item.start?.dateTime || item.start?.date)).map((item) => {
      const allDay = Boolean(item.start?.date && !item.start?.dateTime);
      const startRaw = item.start?.dateTime ?? `${item.start.date}T00:00:00`;
      const endRaw = item.end?.dateTime ?? `${item.end?.date ?? item.start.date}T23:59:00`;
      return {
        id: `google-${item.id}`,
        title: item.summary || "Untitled event",
        start: new Date(startRaw).toISOString(),
        end: new Date(endRaw).toISOString(),
        isAllDay: allDay,
        calendarName: "Google Calendar",
        location: item.location || undefined,
        notes: item.description || undefined,
        source: "google" as const,
      };
    });
    mutate((current) => ({ ...current, externalEvents: [...current.externalEvents.filter((event) => event.source !== "google"), ...events] }));
    return { ok: true, message: `Synced ${events.length} Google Calendar event${events.length === 1 ? "" : "s"}.` };
  }, [mutate]);

  const disconnectGoogleCalendar = useCallback(() => {
    window.localStorage.removeItem(GOOGLE_CALENDAR_TOKEN_KEY);
    window.localStorage.removeItem(GOOGLE_OAUTH_INTENT_KEY);
    setGoogleCalendarConnected(false);
    clearImportedEvents("google");
  }, [clearImportedEvents]);

  useEffect(() => { setPushSupportState(pushSupport()); }, []);

  // Keep this device's subscription (and its time zone) current whenever the account loads.
  useEffect(() => {
    const client = supabaseRef.current;
    if (!session || !client) { setPushEnabled(false); return; }
    currentPushSubscription().then(async (subscription) => {
      if (!subscription) { setPushEnabled(false); return; }
      await subscribeToPush(client, session.user.id, stateRef.current.settings.timeZone).catch(() => undefined);
      setPushEnabled(true);
    }).catch(() => setPushEnabled(false));
  }, [session, state.settings.timeZone]);

  const enablePush = useCallback(async (): Promise<Result> => {
    const client = supabaseRef.current;
    if (!client || !session) return { ok: false, message: "Sign in first so Aurea can remind you when it is closed." };
    try {
      await subscribeToPush(client, session.user.id, stateRef.current.settings.timeZone);
      setPushEnabled(true);
      mutate((current) => ({ ...current, settings: { ...current.settings, notificationsEnabled: true } }));
      return { ok: true, message: "Reminders are on for this device, even when Aurea is closed." };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Could not turn on reminders." };
    }
  }, [session, mutate]);

  const disablePush = useCallback(async (): Promise<Result> => {
    try {
      await unsubscribeFromPush(supabaseRef.current);
      setPushEnabled(false);
      return { ok: true, message: "Closed-app reminders are off for this device." };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Could not turn off reminders." };
    }
  }, []);

  const value = useMemo<AureaContextValue>(() => ({
    state, hydrated, addTask, updateTask, deleteTask, reorderTask, toggleTask, toggleTaskSubtask, setTaskStatus,
    addProject, updateProject, deleteProject, addCategory, updateCategory, deleteCategory, reorderCategory,
    addHabit, updateHabit, deleteHabit, toggleHabit, toggleHabitSubtask, importExternalEvents, clearImportedEvents,
    updateSettings, importState, resetState, cloudConfigured, cloudStatus, cloudEmail: session?.user.email ?? null,
    sendMagicLink, verifyEmailOtp, signInWithProvider, signOutCloud, deleteAccount, syncNow,
    googleCalendarConnected, connectGoogleCalendar, syncGoogleCalendar, disconnectGoogleCalendar,
    pushSupport: pushSupportState, pushEnabled, enablePush, disablePush,
  }), [
    state, hydrated, addTask, updateTask, deleteTask, reorderTask, toggleTask, toggleTaskSubtask, setTaskStatus,
    addProject, updateProject, deleteProject, addCategory, updateCategory, deleteCategory, reorderCategory,
    addHabit, updateHabit, deleteHabit, toggleHabit, toggleHabitSubtask, importExternalEvents, clearImportedEvents,
    updateSettings, importState, resetState, cloudConfigured, cloudStatus, session,
    sendMagicLink, verifyEmailOtp, signInWithProvider, signOutCloud, deleteAccount, syncNow,
    googleCalendarConnected, connectGoogleCalendar, syncGoogleCalendar, disconnectGoogleCalendar,
    pushSupportState, pushEnabled, enablePush, disablePush,
  ]);

  return <AureaContext.Provider value={value}>{children}</AureaContext.Provider>;
}

export function useAurea() {
  const context = useContext(AureaContext);
  if (!context) throw new Error("useAurea must be used inside AureaProvider");
  return context;
}
