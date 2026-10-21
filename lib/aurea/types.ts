export type TaskStatus = "todo" | "in_progress" | "completed";
export type Recurrence = "none" | "daily" | "weekdays" | "weekends" | "weekly" | "monthly" | "yearly";
/** Aurea has a single look; kept so saved settings stay readable. */
export type ThemeId = "aurea";

export type Category = {
  id: string;
  name: string;
  color: string;
};

export type ProjectUpdate = {
  id: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
};

export type Project = {
  id: string;
  name: string;
  description?: string;
  /** Legacy freeform notes. Migrated to updates when possible. */
  notes?: string;
  updates?: ProjectUpdate[];
  color: string;
  status: "active" | "archived";
  createdAt: string;
};

export type TaskSubtask = {
  id: string;
  title: string;
};

export type Task = {
  id: string;
  title: string;
  notes?: string;
  subtasks?: TaskSubtask[];
  categoryId?: string;
  projectId?: string;
  status: TaskStatus;
  dueDate?: string;
  scheduledTime?: string;
  durationMinutes?: number;
  recurrence: Recurrence;
  recurrenceDays?: number[];
  recurrenceEndDate?: string;
  excludedDates?: string[];
  location?: string;
  travelTimeMinutes?: number;
  /** Legacy single reminder; kept in sync with the first entry of `reminders`. */
  reminderMinutes?: number;
  /** Minutes before the start for each reminder (0 = at start). */
  reminders?: number[];
  order?: number;
  completedAt?: string;
  completedDates?: string[];
  createdAt: string;
  updatedAt: string;
};

export type HabitSubtask = {
  id: string;
  title: string;
};

/**
 * A Aurea habit is a repeatable routine. The routine can contain a checklist of
 * subtasks (for example "Morning Routine" → water, skincare, vitamins).
 */
export type Habit = {
  id: string;
  name: string;
  /** Legacy field retained so older cloud states remain readable. */
  categoryId?: string;
  /** Legacy frequency retained for backwards compatibility. New routines use weekdays. */
  frequency: "daily" | "weekdays" | "weekly" | "custom";
  weekdays?: number[];
  scheduledTime?: string;
  durationMinutes?: number;
  /** Legacy single reminder; kept in sync with the first entry of `reminders`. */
  reminderMinutes?: number;
  /** Minutes before the start for each reminder (0 = at start). */
  reminders?: number[];
  color?: string;
  subtasks?: HabitSubtask[];
  recurrenceEndDate?: string;
  excludedDates?: string[];
  active: boolean;
  createdAt: string;
};

export type ExternalCalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  isAllDay?: boolean;
  calendarName?: string;
  location?: string;
  notes?: string;
  source: "apple" | "google" | "ics" | "sample";
};

export type AureaSettings = {
  displayName: string;
  profileImage?: string;
  profileSetupComplete: boolean;
  theme: ThemeId;
  eveningReviewTime: string;
  notificationsEnabled: boolean;
  dayStartHour: number;
  dayEndHour: number;
  weekStartsMonday: boolean;
  /** "auto" uses the device time zone. Otherwise this is an IANA zone. */
  timeZone: string;
};

export type WeeklyReviewNotes = {
  wins?: string;
  focus?: string;
  updatedAt?: string;
};

export type AureaState = {
  version: 6;
  categories: Category[];
  projects: Project[];
  tasks: Task[];
  habits: Habit[];
  habitCompletions: Record<string, string[]>;
  /** habit id -> date key -> completed subtask ids */
  habitSubtaskCompletions: Record<string, Record<string, string[]>>;
  /** task id -> occurrence key -> completed subtask ids. Non-recurring tasks use __task. */
  taskSubtaskCompletions: Record<string, Record<string, string[]>>;
  externalEvents: ExternalCalendarEvent[];
  settings: AureaSettings;
  /** Weekly review notes, keyed by the week's first day (YYYY-MM-DD). */
  weeklyReviews?: Record<string, WeeklyReviewNotes>;
  lastUpdatedAt: string;
};
