import { addDays, parseDateKey } from "./date";
import { normalize } from "./search";
import type { Category, Project, Recurrence } from "./types";

/**
 * Turns "dentist tomorrow 3pm for 1h remind 1 day before #health" into task fields.
 * Recognized phrases are removed from the title; everything else stays as written.
 */
export type QuickAddResult = {
  title: string;
  dueDate?: string;
  scheduledTime?: string;
  durationMinutes?: number;
  reminders?: number[];
  recurrence: Recurrence;
  recurrenceDays?: number[];
  categoryId?: string;
  projectId?: string;
  /** What was understood, for the preview under the input. */
  chips: { kind: "date" | "time" | "duration" | "reminder" | "repeat" | "category" | "project" | "warning"; label: string }[];
};

const DAY = 24 * 60;
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const WEEKDAY_PATTERN = "(sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?)";
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH_PATTERN = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const UNIT_PATTERN = "(m|mins?|minutes?|h|hrs?|hours?|d|days?|w|wks?|weeks?)";
const PART_OF_DAY: Record<string, string> = { morning: "09:00", afternoon: "14:00", evening: "18:00", night: "20:00", tonight: "20:00" };

function weekdayIndex(word: string) {
  return WEEKDAYS.findIndex((day) => day.startsWith(word.toLowerCase().slice(0, 3)));
}

function unitMinutes(unit: string) {
  const u = unit.toLowerCase();
  if (u.startsWith("w")) return 7 * DAY;
  if (u.startsWith("d")) return DAY;
  if (u.startsWith("h")) return 60;
  return 1;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/** Soonest date on or after `today` that falls on `weekday` (0 = Sunday). */
function upcoming(today: string, weekday: number, strictlyAfter = false) {
  const current = parseDateKey(today).getDay();
  let ahead = (weekday - current + 7) % 7;
  if (strictlyAfter && ahead === 0) ahead = 7;
  return addDays(today, ahead);
}

function monthDay(today: string, month: number, day: number) {
  const year = parseDateKey(today).getFullYear();
  if (month < 0 || month > 11 || day < 1 || day > 31) return undefined;
  const candidate = `${year}-${pad(month + 1)}-${pad(day)}`;
  // A date that has already passed this year means next year.
  return candidate < today ? `${year + 1}-${pad(month + 1)}-${pad(day)}` : candidate;
}

function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${pad(m)} ${h < 12 ? "AM" : "PM"}`;
}

function formatDate(key: string, today: string) {
  if (key === today) return "Today";
  if (key === addDays(today, 1)) return "Tomorrow";
  return new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(parseDateKey(key));
}

function formatDuration(minutes: number) {
  if (minutes % 60 === 0) return `${minutes / 60} h`;
  return minutes > 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;
}

function formatReminder(minutes: number) {
  if (minutes === 0) return "At start";
  const unit = (["weeks", "days", "hours"] as const).find((name) => minutes % ({ weeks: 7 * DAY, days: DAY, hours: 60 })[name] === 0);
  const amount = unit ? minutes / ({ weeks: 7 * DAY, days: DAY, hours: 60 })[unit] : minutes;
  const label = unit ?? "minutes";
  return `${amount} ${amount === 1 ? label.slice(0, -1) : label} before`;
}

export function parseQuickAdd(input: string, today: string, categories: Category[], projects: Project[]): QuickAddResult {
  let text = ` ${input.trim()} `;
  const chips: QuickAddResult["chips"] = [];
  const result: QuickAddResult = { title: "", recurrence: "none", chips };

  /** Find the first match, remove it from the text and hand back its groups. */
  function take(pattern: RegExp): RegExpExecArray | null {
    const match = pattern.exec(text);
    if (!match) return null;
    text = `${text.slice(0, match.index)} ${text.slice(match.index + match[0].length)}`;
    return match;
  }

  // Reminders: "remind me 1 day and 2 hours before", "remind at start", or just "remind".
  const amount = `(?:at\\s+(?:the\\s+)?start|on\\s+time|\\d+(?:\\.\\d+)?\\s*${UNIT_PATTERN})`;
  const remind = take(new RegExp(`\\sremind(?:\\s+me)?((?:\\s+${amount})(?:\\s*(?:,|and|&)\\s*${amount})*)?(?:\\s+(?:before|early|earlier|ahead))?(?=\\s)`, "i"));
  if (remind) {
    const parts = remind[1] ? remind[1].split(/\s*(?:,|\band\b|&)\s*/i).map((part) => part.trim()).filter(Boolean) : ["at start"];
    result.reminders = [...new Set(parts.map((part) => {
      const number = /(\d+(?:\.\d+)?)\s*([a-z]+)/i.exec(part);
      return number ? Math.round(Number(number[1]) * unitMinutes(number[2])) : 0;
    }))].sort((a, b) => a - b);
  }

  // Duration: "for 30 min", "for 1.5h", "for 2 hours".
  const duration = take(/\sfor\s+(\d+(?:\.\d+)?)\s*(m|mins?|minutes?|h|hrs?|hours?)(?=\s)/i);
  if (duration) result.durationMinutes = Math.round(Number(duration[1]) * unitMinutes(duration[2]));

  // Repeats: "every day", "weekdays", "every monday and thursday", "monthly"…
  const everyDays = take(new RegExp(`\\severy\\s+(${WEEKDAY_PATTERN}(?:\\s*(?:,|and|&)\\s*${WEEKDAY_PATTERN})*)(?=\\s)`, "i"));
  if (everyDays) {
    result.recurrence = "weekly";
    result.recurrenceDays = [...new Set(everyDays[1].split(/\s*(?:,|\band\b|&)\s*/i).map(weekdayIndex).filter((day) => day >= 0))].sort();
  } else {
    const repeat = take(/\s(every\s+day|daily|every\s+weekday|weekdays|every\s+weekend|weekends|every\s+week|weekly|every\s+month|monthly|every\s+year|yearly|annually)(?=\s)/i);
    if (repeat) {
      const word = repeat[1].toLowerCase();
      result.recurrence = word.includes("weekday") ? "weekdays" : word.includes("weekend") ? "weekends" : /day|daily/.test(word) ? "daily" : /week/.test(word) ? "weekly" : /month/.test(word) ? "monthly" : "yearly";
    }
  }

  // Dates.
  let partOfDay: string | undefined;
  const dateRules: [RegExp, (match: RegExpExecArray) => string | undefined][] = [
    [/\s(?:the\s+)?day\s+after\s+tomorrow(?=\s)/i, () => addDays(today, 2)],
    [/\s(today|tonight)(?=\s)/i, (m) => { if (m[1].toLowerCase() === "tonight") partOfDay = "tonight"; return today; }],
    [/\s(?:tomorrow|tmrw?|tmr)(?=\s)/i, () => addDays(today, 1)],
    [/\snext\s+week(?=\s)/i, () => upcoming(today, 1, true)],
    [/\sin\s+(\d+)\s+(days?|weeks?)(?=\s)/i, (m) => addDays(today, Number(m[1]) * (m[2].toLowerCase().startsWith("w") ? 7 : 1))],
    [new RegExp(`\\snext\\s+${WEEKDAY_PATTERN}(?=\\s)`, "i"), (m) => {
      // The one in next week, not later this week.
      const soonest = upcoming(today, weekdayIndex(m[1]), true);
      const startOfNextWeek = upcoming(today, 1, true);
      return soonest < startOfNextWeek ? addDays(soonest, 7) : soonest;
    }],
    [new RegExp(`\\s(?:on\\s+|this\\s+)?${WEEKDAY_PATTERN}(?=\\s)`, "i"), (m) => upcoming(today, weekdayIndex(m[1]))],
    [new RegExp(`\\s(?:on\\s+)?${MONTH_PATTERN}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?=\\s)`, "i"), (m) => monthDay(today, MONTHS.indexOf(m[1].toLowerCase().slice(0, 3)), Number(m[2]))],
    [new RegExp(`\\s(?:on\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTH_PATTERN}(?=\\s)`, "i"), (m) => monthDay(today, MONTHS.indexOf(m[2].toLowerCase().slice(0, 3)), Number(m[1]))],
    // 10/24 is October 24; 24/10 (first number above 12) is read day-first.
    [/\s(?:on\s+)?(\d{1,2})\/(\d{1,2})(?=\s)/i, (m) => Number(m[1]) > 12 ? monthDay(today, Number(m[2]) - 1, Number(m[1])) : monthDay(today, Number(m[1]) - 1, Number(m[2]))],
  ];
  for (const [pattern, toDate] of dateRules) {
    const match = take(pattern);
    if (!match) continue;
    const date = toDate(match);
    if (date) {
      result.dueDate = date;
      // "tomorrow morning": a part of day right where the date was.
      const after = /^\s*(morning|afternoon|evening|night)(?=\s)/i.exec(text.slice(match.index));
      if (after) {
        partOfDay = after[1].toLowerCase();
        text = `${text.slice(0, match.index)} ${text.slice(match.index + after[0].length)}`;
      }
    }
    break;
  }
  if (!partOfDay) {
    const part = take(/\s(?:this|in\s+the)\s+(morning|afternoon|evening)(?=\s)/i);
    if (part) partOfDay = part[1].toLowerCase();
  }

  // Times: "3pm", "3:30 pm", "15:00", "at 3", "noon", "midnight".
  const twelveHour = take(/\s(?:at\s+|@\s*)?(\d{1,2})(?::([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?|a|p)(?=\s)/i);
  if (twelveHour) {
    let hour = Number(twelveHour[1]) % 12;
    if (twelveHour[3].toLowerCase().startsWith("p")) hour += 12;
    if (Number(twelveHour[1]) <= 12) result.scheduledTime = `${pad(hour)}:${twelveHour[2] ?? "00"}`;
  } else {
    const clock = take(/\s(?:at\s+|@\s*)?([01]?\d|2[0-3]):([0-5]\d)(?=\s)/i);
    if (clock) result.scheduledTime = `${pad(Number(clock[1]))}:${clock[2]}`;
    else {
      const named = take(/\s(?:at\s+)?(noon|midday|midnight)(?=\s)/i);
      if (named) result.scheduledTime = named[1].toLowerCase() === "midnight" ? "00:00" : "12:00";
      else {
        // "at 3": 1–7 means afternoon/evening, 8–11 morning, 12 noon.
        const bare = take(/\sat\s+(\d{1,2})(?=\s)/i);
        if (bare && Number(bare[1]) >= 1 && Number(bare[1]) <= 12) {
          const hour = Number(bare[1]);
          result.scheduledTime = `${pad(hour === 12 ? 12 : hour <= 7 ? hour + 12 : hour)}:00`;
        }
      }
    }
  }
  if (!result.scheduledTime && partOfDay) result.scheduledTime = PART_OF_DAY[partOfDay];

  // #category and +project (matched by the start of the name, ignoring case and accents).
  const tag = /\s#([\p{L}\p{N}_-]+)(?=\s)/u.exec(text);
  if (tag) {
    const wanted = normalize(tag[1]);
    const category = categories.find((item) => normalize(item.name).replace(/\s+/g, "") === wanted) ?? categories.find((item) => normalize(item.name).replace(/\s+/g, "").startsWith(wanted));
    if (category) { result.categoryId = category.id; take(/\s#[\p{L}\p{N}_-]+(?=\s)/u); }
    else chips.push({ kind: "warning", label: `No category “${tag[1]}”` });
  }
  const plus = /\s\+([\p{L}\p{N}_-]+)(?=\s)/u.exec(text);
  if (plus) {
    const wanted = normalize(plus[1]);
    const active = projects.filter((project) => project.status === "active");
    const project = active.find((item) => normalize(item.name).replace(/\s+/g, "").startsWith(wanted)) ?? active.find((item) => normalize(item.name).split(/\s+/).some((word) => word.startsWith(wanted)));
    if (project) { result.projectId = project.id; take(/\s\+[\p{L}\p{N}_-]+(?=\s)/u); }
    else chips.push({ kind: "warning", label: `No project “${plus[1]}”` });
  }

  // Weekly repeats without a date start on the first matching day.
  if (!result.dueDate && result.recurrence === "weekly" && result.recurrenceDays?.length) {
    result.dueDate = result.recurrenceDays.map((day) => upcoming(today, day)).sort()[0];
  }

  result.title = text.replace(/\s+/g, " ").trim().replace(/\s+(?:at|on|by|and|for|in|@)$/i, "").replace(/^(?:at|on)\s+/i, "").trim();

  if (result.dueDate) chips.unshift({ kind: "date", label: formatDate(result.dueDate, today) });
  if (result.scheduledTime) chips.push({ kind: "time", label: formatTime(result.scheduledTime) });
  if (result.durationMinutes) chips.push({ kind: "duration", label: formatDuration(result.durationMinutes) });
  if (result.recurrence !== "none") chips.push({ kind: "repeat", label: result.recurrence === "weekly" && result.recurrenceDays?.length ? `Every ${result.recurrenceDays.map((day) => WEEKDAYS[day].slice(0, 3).replace(/^./, (c) => c.toUpperCase())).join(", ")}` : `Repeats ${result.recurrence}` });
  for (const minutes of result.reminders ?? []) chips.push({ kind: "reminder", label: formatReminder(minutes) });
  if (result.categoryId) chips.push({ kind: "category", label: categories.find((item) => item.id === result.categoryId)!.name });
  if (result.projectId) chips.push({ kind: "project", label: projects.find((item) => item.id === result.projectId)!.name });
  return result;
}
