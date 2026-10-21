"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, formatShortDate, formatTime, parseDateKey, zonedNow } from "@/lib/aurea/date";
import { buildWeeklyReview, weekStart } from "@/lib/aurea/review";
import type { Task } from "@/lib/aurea/types";
import { AureaLogo } from "./aurea-logo";
import { useAurea } from "./aurea-provider";
import { TaskModal } from "./task-modal";

const weekdayShort = (date: string) => new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(parseDateKey(date));
const weekdayLong = (date: string) => new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(parseDateKey(date));

export function WeeklyReview() {
  const { state, hydrated, updateTask, setTaskStatus, saveWeeklyReview } = useAurea();
  const today = zonedNow(state.settings.timeZone).dateKey;
  const currentStart = weekStart(today, state.settings.weekStartsMonday);
  // Weeks away from the current one, so the page follows the week-start setting once it loads.
  const [offset, setOffset] = useState(0);
  const start = addDays(currentStart, offset * 7);
  const [editing, setEditing] = useState<Task | null>(null);
  const review = useMemo(() => buildWeeklyReview(state, start, today), [state, start, today]);
  const notes = state.weeklyReviews?.[start];
  const [wins, setWins] = useState(notes?.wins ?? "");
  const [focus, setFocus] = useState(notes?.focus ?? "");

  // Load the notes when the week changes (or arrive from another device).
  useEffect(() => { setWins(notes?.wins ?? ""); setFocus(notes?.focus ?? ""); }, [start, notes?.wins, notes?.focus]);

  if (!hydrated) return <div className="loading-screen"><span className="brand-mark"><AureaLogo size={36} />Aurea</span><p>Opening your week…</p></div>;

  const isCurrent = start === currentStart;
  const routineRate = review.routineScheduled ? Math.round((review.routineDone / review.routineScheduled) * 100) : null;
  const maxDone = Math.max(1, ...review.days.map((day) => day.doneCount));
  const title = isCurrent ? "This week" : start === addDays(currentStart, -7) ? "Last week" : start === addDays(currentStart, 7) ? "Next week" : `Week of ${formatShortDate(start)}`;

  function moveToNextWeek(task: Task) {
    updateTask(task.id, { dueDate: addDays(task.dueDate ?? today, 7) });
  }

  return <>
    <header className="page-header">
      <div><p className="mobile-brand"><AureaLogo size={24} />Aurea</p><span className="eyebrow">WEEKLY REVIEW</span><h1>{title}</h1><p className="subtitle">{formatShortDate(review.start)} – {formatShortDate(review.end)}</p></div>
      <div className="header-actions week-switcher">
        <button className="soft-button" onClick={() => setOffset(offset - 1)} aria-label="Previous week">‹</button>
        {!isCurrent && <button className="soft-button" onClick={() => setOffset(0)}>This week</button>}
        <button className="soft-button" onClick={() => setOffset(offset + 1)} aria-label="Next week">›</button>
      </div>
    </header>

    <section className="week-stats">
      <div className="week-stat"><strong>{review.doneCount}</strong><span>{review.doneCount === 1 ? "task done" : "tasks done"}</span></div>
      <div className="week-stat"><strong>{routineRate == null ? "—" : `${routineRate}%`}</strong><span>routines kept{review.routineScheduled ? ` · ${review.routineDone} of ${review.routineScheduled}` : ""}</span></div>
      <div className="week-stat"><strong>{review.slipped.length}</strong><span>{review.slipped.length === 1 ? "task slipped" : "tasks slipped"}</span></div>
      <div className="week-stat"><strong>{review.bestDay ? weekdayShort(review.bestDay.date) : "—"}</strong><span>{review.bestDay ? `best day · ${review.bestDay.doneCount} done` : "best day"}</span></div>
    </section>

    <div className="week-grid">
      <section className="panel week-card">
        <div className="panel-heading"><div><h2>Done</h2><span className="count-pill">{review.doneCount}</span></div></div>
        <div className="week-bars" aria-hidden="true">{review.days.map((day) => <div key={day.date} className={`week-bar ${day.date === today ? "today" : ""}`}><i style={{ height: `${(day.doneCount / maxDone) * 100}%` }} /><span>{weekdayShort(day.date).slice(0, 2)}</span></div>)}</div>
        {review.doneCount === 0 ? <p className="empty-state compact">{start > today ? "This week hasn’t started yet." : "Nothing checked off this week yet."}</p> : <div className="week-days">
          {review.days.filter((day) => day.done.length).map((day) => <div key={day.date} className="week-day">
            <div className="week-day-label">{weekdayLong(day.date)} <small>{formatShortDate(day.date)}</small></div>
            {day.done.map((task, index) => <button key={`${task.id}-${index}`} className="week-item done" onClick={() => setEditing(task)}><span className="week-check">✓</span>{task.title}</button>)}
          </div>)}
        </div>}
      </section>

      <section className="panel week-card">
        <div className="panel-heading"><div><h2>Slipped</h2><span className="count-pill">{review.slipped.length}</span></div></div>
        {review.slipped.length === 0 ? <p className="empty-state compact">{start > today ? "Nothing can slip yet." : "Nothing slipped. Nice work. ✦"}</p> : <div className="week-list">
          {review.slipped.map((task) => <div key={task.id} className="week-slipped">
            <button className="week-item" onClick={() => setEditing(task)}><span>{task.title}</span><small>{weekdayShort(task.dueDate!)}{task.scheduledTime ? ` · ${formatTime(task.scheduledTime)}` : ""}</small></button>
            <div className="week-actions"><button className="tiny-button" onClick={() => moveToNextWeek(task)}>Move to next {weekdayShort(task.dueDate!)}</button><button className="tiny-button" onClick={() => setTaskStatus(task.id, "completed")}>Mark done</button></div>
          </div>)}
        </div>}
      </section>

      <section className="panel week-card">
        <div className="panel-heading"><div><h2>Routines</h2><span className="count-pill">{review.routines.length}</span></div></div>
        {review.routines.length === 0 ? <p className="empty-state compact">No routines this week.</p> : <div className="week-list">
          {review.routines.map(({ habit, days, done, scheduled }) => <div key={habit.id} className="week-routine">
            <div className="week-routine-name"><span>{habit.name}</span><small>{scheduled ? `${done} of ${scheduled}` : "Not started"}</small></div>
            <div className="week-dots">{days.map((day) => <span key={day.date} title={`${weekdayLong(day.date)}: ${!day.scheduled ? "not scheduled" : day.done ? "done" : day.future ? "upcoming" : "missed"}`} className={`week-dot ${!day.scheduled ? "off" : day.done ? "done" : day.future ? "future" : "missed"}`} style={{ "--habit-color": habit.color } as React.CSSProperties}>{weekdayShort(day.date).slice(0, 1)}</span>)}</div>
          </div>)}
        </div>}
      </section>

      <section className="panel week-card">
        <div className="panel-heading"><div><h2>Projects</h2><span className="count-pill">{review.projects.length}</span></div></div>
        {review.projects.length === 0 ? <p className="empty-state compact">No active projects with tasks.</p> : <div className="week-list">
          {review.projects.map(({ project, doneThisWeek, open, total }) => <div key={project.id} className="week-project">
            <span className="project-color" style={{ background: project.color }} />
            <div><strong>{project.name}</strong><small>{doneThisWeek ? `${doneThisWeek} done this week · ` : "No progress this week · "}{open} open</small></div>
            <div className="week-progress" aria-label={`${total - open} of ${total} done`}><i style={{ width: `${((total - open) / total) * 100}%` }} /></div>
          </div>)}
        </div>}
      </section>

      <section className="panel week-card week-wide">
        <div className="panel-heading"><div><h2>Coming up next week</h2></div></div>
        <div className="week-next">{review.nextWeek.map(({ date, tasks }) => {
          const oneOff = tasks.filter((task) => task.recurrence === "none");
          const repeating = tasks.length - oneOff.length;
          return <div key={date} className="week-next-day">
            <div className="week-day-label">{weekdayShort(date)} <small>{formatShortDate(date)}</small></div>
            {oneOff.slice(0, 3).map((task) => <button key={task.id} className="week-item" onClick={() => setEditing(task)}><span>{task.title}</span>{task.scheduledTime && <small>{formatTime(task.scheduledTime)}</small>}</button>)}
            {oneOff.length > 3 && <small className="week-more">+{oneOff.length - 3} more</small>}
            {repeating > 0 && <small className="week-more">+{repeating} repeating</small>}
            {!tasks.length && <small className="week-more">Free</small>}
          </div>;
        })}</div>
      </section>

      <section className="panel week-card week-notes week-wide">
        <div className="panel-heading"><div><h2>Reflect</h2></div></div>
        <label className="field"><span>What went well?</span><textarea rows={3} value={wins} onChange={(event) => setWins(event.target.value)} onBlur={() => wins !== (notes?.wins ?? "") && saveWeeklyReview(start, { wins })} placeholder="A win, big or small" /></label>
        <label className="field"><span>Focus for next week</span><textarea rows={3} value={focus} onChange={(event) => setFocus(event.target.value)} onBlur={() => focus !== (notes?.focus ?? "") && saveWeeklyReview(start, { focus })} placeholder="One or two things that matter most" /></label>
        <p className="settings-note">Saved with your planner when you click away.</p>
      </section>
    </div>

    <TaskModal open={Boolean(editing)} task={editing} onClose={() => setEditing(null)} />
  </>;
}
