"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { zonedNow } from "@/lib/aurea/date";
import { searchPlanner, type SearchResult } from "@/lib/aurea/search";
import type { Habit, Task } from "@/lib/aurea/types";
import { useAurea } from "./aurea-provider";
import { HabitModal } from "./habit-modal";
import { TaskModal } from "./task-modal";

const GROUPS: { kind: SearchResult["kind"]; label: string }[] = [
  { kind: "task", label: "Tasks" },
  { kind: "project", label: "Projects" },
  { kind: "routine", label: "Routines" },
];
const PER_GROUP = 8;

/** Search everything in the planner. Open with the Search button, ⌘K / Ctrl+K, or "/". */
export function SearchPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { state } = useAurea();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [taskModal, setTaskModal] = useState<Task | null>(null);
  const [habitModal, setHabitModal] = useState<Habit | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); onOpenChange(!open); }
      else if (event.key === "/" && !typing && !open) { event.preventDefault(); onOpenChange(true); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (open) { setActiveIndex(0); window.setTimeout(() => inputRef.current?.focus(), 0); }
  }, [open]);

  const today = zonedNow(state.settings.timeZone).dateKey;
  const groups = useMemo(() => {
    const results = searchPlanner(state, query, today);
    return GROUPS.map((group) => ({ ...group, items: results.filter((result) => result.kind === group.kind).slice(0, PER_GROUP) })).filter((group) => group.items.length);
  }, [state, query, today]);
  const flat = groups.flatMap((group) => group.items);

  function choose(result: SearchResult) {
    onOpenChange(false);
    if (result.kind === "task") setTaskModal(result.item);
    else if (result.kind === "routine") setHabitModal(result.item);
    else if (window.location.pathname === "/projects") window.dispatchEvent(new CustomEvent("aurea:open-project", { detail: result.id }));
    else router.push(`/projects?project=${encodeURIComponent(result.id)}`);
  }

  function onInputKey(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((index) => Math.min(index + 1, flat.length - 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)); }
    else if (event.key === "Enter" && flat[activeIndex]) { event.preventDefault(); choose(flat[activeIndex]); }
    else if (event.key === "Escape") { event.preventDefault(); onOpenChange(false); }
  }

  let position = -1;
  return <>
    {open && <div className="modal-backdrop search-backdrop" role="presentation" onMouseDown={() => onOpenChange(false)}>
      <div className="search-palette" role="dialog" aria-modal="true" aria-label="Search Aurea" onMouseDown={(event) => event.stopPropagation()}>
        <div className="search-input-row">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>
          <input ref={inputRef} value={query} onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }} onKeyDown={onInputKey} placeholder="Search tasks, notes, projects and routines" aria-label="Search" role="combobox" aria-expanded={flat.length > 0} aria-controls="search-results" aria-activedescendant={flat[activeIndex] ? `search-${flat[activeIndex].kind}-${flat[activeIndex].id}` : undefined} />
          <button type="button" className="search-close" onClick={() => onOpenChange(false)} aria-label="Close search">Esc</button>
        </div>
        <div className="search-results" id="search-results" role="listbox">
          {!query.trim() && <p className="search-empty">Type to search titles, notes, checklists, locations, project updates and routines.</p>}
          {query.trim() && !flat.length && <p className="search-empty">Nothing matches “{query.trim()}”.</p>}
          {groups.map((group) => <div key={group.kind} className="search-group">
            <div className="search-group-label">{group.label}</div>
            {group.items.map((result) => {
              position += 1;
              const index = position;
              return <button key={result.id} id={`search-${result.kind}-${result.id}`} type="button" role="option" aria-selected={index === activeIndex} className={`search-result ${index === activeIndex ? "active" : ""}`} onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(result)}>
                <span className={`search-title ${result.done ? "done" : ""}`}>{result.title}</span>
                <span className="search-detail">{result.detail}</span>
                {result.snippet && <span className="search-snippet">{result.snippet}</span>}
              </button>;
            })}
          </div>)}
        </div>
        <div className="search-footer"><span>↑↓ to move</span><span>Enter to open</span><span>⌘K or / to search anywhere</span></div>
      </div>
    </div>}
    <TaskModal open={Boolean(taskModal)} task={taskModal} onClose={() => setTaskModal(null)} />
    <HabitModal open={Boolean(habitModal)} habit={habitModal} onClose={() => setHabitModal(null)} />
  </>;
}
