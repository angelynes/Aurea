import { addDays, habitOccursOn, parseDateKey, taskOccursOn, zonedNow } from "./date";
import type { AureaState, Habit, Project, Task } from "./types";

export type WeekDay = { date: string; done: Task[]; doneCount: number };

export type WeeklyReview = {
  start: string;
  end: string;
  days: WeekDay[];
  doneCount: number;
  /** Dated one-off tasks in this week (up to today) that were not finished. */
  slipped: Task[];
  routines: { habit: Habit; days: { date: string; scheduled: boolean; done: boolean; future: boolean }[]; done: number; scheduled: number }[];
  routineDone: number;
  routineScheduled: number;
  projects: { project: Project; doneThisWeek: number; open: number; total: number }[];
  nextWeek: { date: string; tasks: Task[] }[];
  bestDay?: WeekDay;
};

/** First day of the week containing `date`: Monday or Sunday per the setting. */
export function weekStart(date: string, startsMonday: boolean) {
  const day = parseDateKey(date).getDay();
  const back = startsMonday ? (day + 6) % 7 : day;
  return addDays(date, -back);
}

/** The day a one-off task was finished, in the planner's time zone. */
function completedOn(task: Task, timeZone: string) {
  if (task.completedAt) return zonedNow(timeZone, new Date(task.completedAt)).dateKey;
  return task.status === "completed" ? task.dueDate : undefined;
}

export function buildWeeklyReview(state: AureaState, start: string, today: string): WeeklyReview {
  const timeZone = state.settings.timeZone;
  const dates = Array.from({ length: 7 }, (_, index) => addDays(start, index));
  const end = dates[6];
  const inWeek = (date?: string) => Boolean(date && date >= start && date <= end);

  const days: WeekDay[] = dates.map((date) => ({ date, done: [], doneCount: 0 }));
  const byDate = new Map(days.map((day) => [day.date, day]));
  for (const task of state.tasks) {
    if (task.recurrence === "none") {
      const date = completedOn(task, timeZone);
      if (date && inWeek(date)) byDate.get(date)!.done.push(task);
    } else {
      for (const date of task.completedDates ?? []) if (inWeek(date)) byDate.get(date)!.done.push(task);
    }
  }
  for (const day of days) day.doneCount = day.done.length;
  const doneCount = days.reduce((sum, day) => sum + day.doneCount, 0);

  const slipped = state.tasks
    .filter((task) => task.recurrence === "none" && task.status !== "completed" && !task.completedAt && inWeek(task.dueDate) && task.dueDate! < today)
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? "") || (a.scheduledTime ?? "").localeCompare(b.scheduledTime ?? ""));

  const routines = state.habits.filter((habit) => habit.active).map((habit) => {
    // Days before the routine existed don't count as missed.
    const createdOn = habit.createdAt ? zonedNow(timeZone, new Date(habit.createdAt)).dateKey : start;
    const completions = new Set(state.habitCompletions[habit.id] ?? []);
    const routineDays = dates.map((date) => ({ date, scheduled: date >= createdOn && habitOccursOn(habit, date), done: completions.has(date), future: date > today || (date === today && !completions.has(date)) }));
    const counted = routineDays.filter((day) => day.scheduled && !day.future);
    return { habit, days: routineDays, done: counted.filter((day) => day.done).length, scheduled: counted.length };
  }).filter((routine) => routine.days.some((day) => day.scheduled));
  const routineDone = routines.reduce((sum, routine) => sum + routine.done, 0);
  const routineScheduled = routines.reduce((sum, routine) => sum + routine.scheduled, 0);

  const projects = state.projects.filter((project) => project.status === "active").map((project) => {
    const tasks = state.tasks.filter((task) => task.projectId === project.id);
    const doneThisWeek = tasks.filter((task) => task.recurrence === "none" && inWeek(completedOn(task, timeZone))).length;
    return { project, doneThisWeek, open: tasks.filter((task) => task.status !== "completed").length, total: tasks.length };
  }).filter((item) => item.total > 0).sort((a, b) => b.doneThisWeek - a.doneThisWeek);

  const nextWeek = Array.from({ length: 7 }, (_, index) => addDays(end, index + 1)).map((date) => ({
    date,
    tasks: state.tasks
      .filter((task) => taskOccursOn(task, date) && !(task.recurrence === "none" && task.status === "completed"))
      .sort((a, b) => (a.scheduledTime ?? "99").localeCompare(b.scheduledTime ?? "99")),
  }));

  const bestDay = doneCount ? [...days].sort((a, b) => b.doneCount - a.doneCount)[0] : undefined;
  return { start, end, days, doneCount, slipped, routines, routineDone, routineScheduled, projects, nextWeek, bestDay };
}
