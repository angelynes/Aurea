import type { Metadata } from "next";
import { AureaShell } from "@/components/aurea-shell";
import { ProjectsBoard } from "@/components/projects-board";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return <AureaShell active="projects"><ProjectsBoard /></AureaShell>;
}
