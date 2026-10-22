// Thin line icons for the main navigation. They use currentColor so they follow the theme.
const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

export function TodayIcon() {
  return <svg {...common}><circle cx="12" cy="12" r="3.6" /><path d="M12 3v1.8M12 19.2V21M3 12h1.8M19.2 12H21M5.6 5.6l1.3 1.3M17.1 17.1l1.3 1.3M5.6 18.4l1.3-1.3M17.1 6.9l1.3-1.3" /></svg>;
}

export function ProjectsIcon() {
  return <svg {...common}><path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h4.2l1.8 2H19a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z" /></svg>;
}

export function CalendarIcon() {
  return <svg {...common}><rect x="4" y="5.5" width="16" height="14.5" rx="2" /><path d="M8 3.5v4M16 3.5v4M4 10h16" /><path d="M11.2 14h1.3v3.2" /></svg>;
}

export function SearchIcon() {
  return <svg {...common}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>;
}

export function ReviewIcon() {
  return <svg {...common}><path d="M4 19.5V9M10 19.5V5M16 19.5v-7M21 19.5H3" /></svg>;
}

export function SidebarIcon() {
  return <svg {...common}><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><path d="M9.5 4.5v15" /></svg>;
}
