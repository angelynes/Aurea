"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAurea } from "./aurea-provider";
import { AureaLogo } from "@/components/aurea-logo";
import { LegalLinks } from "@/components/legal-page";
import { SearchPalette } from "@/components/search-palette";
import { CalendarIcon, ProjectsIcon, ReviewIcon, SearchIcon, SidebarIcon, TodayIcon } from "@/components/nav-icons";

const SIDEBAR_KEY = "aurea-sidebar-collapsed";

const items = [
  { key: "today", label: "Today", href: "/today", Icon: TodayIcon },
  { key: "projects", label: "Projects", href: "/projects", Icon: ProjectsIcon },
  { key: "calendar", label: "Calendar", href: "/calendar", Icon: CalendarIcon },
  { key: "review", label: "Week", href: "/review", Icon: ReviewIcon },
] as const;

export function AureaShell({ active, children }: { active: "today" | "calendar" | "projects" | "review" | "settings"; children: React.ReactNode }) {
  const { state, hydrated, updateSettings } = useAurea();
  const [profileName, setProfileName] = useState("");
  const initials = state.settings.displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "P";
  const [searchOpen, setSearchOpen] = useState(false);
  // Collapsed sidebar is a per-device preference (it depends on the screen), so it isn't synced.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try { setCollapsed(window.localStorage.getItem(SIDEBAR_KEY) === "1"); } catch { /* storage unavailable */ }
  }, []);
  const toggleSidebar = useCallback(() => setCollapsed((current) => {
    try { window.localStorage.setItem(SIDEBAR_KEY, current ? "0" : "1"); } catch { /* storage unavailable */ }
    return !current;
  }), []);
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && (event.key === "\\" || event.code === "Backslash")) { event.preventDefault(); toggleSidebar(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleSidebar]);
  useEffect(() => {
    const open = () => setSearchOpen(true);
    window.addEventListener("aurea:open-search", open);
    return () => window.removeEventListener("aurea:open-search", open);
  }, []);
  const showProfileSetup = hydrated && !state.settings.profileSetupComplete;

  useEffect(() => {
    if (showProfileSetup) {
      setProfileName(state.settings.displayName === "Profile" ? "" : state.settings.displayName);
    }
  }, [showProfileSetup, state.settings.displayName]);

  function finishProfileSetup(event?: FormEvent) {
    event?.preventDefault();
    updateSettings({ displayName: profileName.trim() || "Profile", profileSetupComplete: true });
  }

  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="desktop-sidebar">
        <div className="sidebar-top">
          <Link className="brand" href="/today" aria-label="Aurea home" title="Aurea"><AureaLogo size={34} /><span className="sidebar-label">Aurea</span></Link>
          <button type="button" className="sidebar-toggle" onClick={toggleSidebar} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} title={`${collapsed ? "Expand" : "Collapse"} sidebar (⌘\\)`}><SidebarIcon /></button>
        </div>
        <button type="button" className="sidebar-search" onClick={() => setSearchOpen(true)} title="Search (⌘K)"><SearchIcon /><span className="sidebar-label">Search</span><kbd className="sidebar-label">⌘K</kbd></button>
        <nav className="sidebar-nav" aria-label="Main navigation">{items.map((item) => <Link key={item.key} className={`nav-item ${active === item.key ? "active" : ""}`} href={item.href} title={item.label} aria-label={collapsed ? item.label : undefined}><span className="nav-icon"><item.Icon /></span><span className="sidebar-label">{item.label}</span></Link>)}</nav>
        <div className="sidebar-spacer" />
        <Link className="sidebar-new" href="/today?compose=task" title="New task"><span className="sidebar-new-plus" aria-hidden="true">＋</span><span className="sidebar-label">New task</span></Link>
        <Link className={`profile-row ${active === "settings" ? "active" : ""}`} href="/settings" title="Settings">
          <span className={`avatar ${state.settings.profileImage ? "has-image" : ""}`}>{state.settings.profileImage ? <img src={state.settings.profileImage} alt="Profile" /> : initials}</span>
          <span className="sidebar-label"><strong>{state.settings.displayName || "Aurea"}</strong><small>Settings</small></span><span className="profile-arrow sidebar-label">›</span>
        </Link>
      </aside>

      <button type="button" className="mobile-search-button" onClick={() => setSearchOpen(true)} aria-label="Search"><SearchIcon /></button>
      <Link className={`mobile-settings-link ${active === "settings" ? "active" : ""}`} href="/settings" aria-label="Settings">⚙</Link>
      <main className="main-content">{children}</main>
      <SearchPalette open={searchOpen} onOpenChange={setSearchOpen} />
      <nav className="mobile-nav" aria-label="Mobile navigation">{items.map((item) => <Link key={item.key} className={active === item.key ? "active" : ""} href={item.href}><span><item.Icon /></span><small>{item.label}</small></Link>)}</nav>

      {showProfileSetup && <div className="modal-backdrop" role="presentation"><form className="modal-card profile-setup-card onboarding-expanded" onSubmit={finishProfileSetup} role="dialog" aria-modal="true" aria-labelledby="profile-setup-title"><div className="profile-setup-mark">Aurea</div><div className="modal-heading profile-setup-heading"><div><span className="eyebrow">WELCOME</span><h2 id="profile-setup-title">Make Aurea yours</h2><p className="subtitle">What should we call you? You can change this later in Settings.</p></div></div><label className="field"><span>Name</span><input autoFocus value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder="Profile" maxLength={60} /></label><div className="modal-actions profile-setup-actions"><button className="ghost-button" type="button" onClick={() => { setProfileName(""); updateSettings({ displayName: "Profile", profileSetupComplete: true }); }}>Use Profile</button><button className="primary-button" type="submit">Continue</button></div><LegalLinks /></form></div>}
    </div>
  );
}
