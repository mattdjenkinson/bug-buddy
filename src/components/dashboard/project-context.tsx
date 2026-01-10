"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import * as React from "react";

export const LAST_PROJECT_SLUG_KEY = "bugbuddy:lastProjectSlug";

export type ProjectForSwitcher = {
  id: string;
  name: string;
  slug: string;
};

type ProjectContextValue = {
  projects: ProjectForSwitcher[];
  currentProject: ProjectForSwitcher | null;
  currentProjectSlug: string | null;
  setCurrentProjectSlug: (nextSlug: string) => void;
  upsertProject: (project: ProjectForSwitcher) => void;
};

const ProjectContext = React.createContext<ProjectContextValue | null>(null);

export function ProjectProvider({
  projects,
  children,
}: {
  projects: ProjectForSwitcher[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ projectSlug?: string }>();

  const [projectsState, setProjectsState] =
    React.useState<ProjectForSwitcher[]>(projects);

  React.useEffect(() => {
    setProjectsState(projects);
  }, [projects]);

  const routeSlug =
    typeof params.projectSlug === "string" ? params.projectSlug : null;

  const [storedSlug, setStoredSlug] = React.useState<string | null>(null);

  // Load last-selected slug from localStorage.
  React.useEffect(() => {
    try {
      setStoredSlug(window.localStorage.getItem(LAST_PROJECT_SLUG_KEY));
    } catch {
      setStoredSlug(null);
    }
  }, []);

  // Persist whenever route slug changes (project-scoped routes).
  React.useEffect(() => {
    if (!routeSlug) return;
    try {
      window.localStorage.setItem(LAST_PROJECT_SLUG_KEY, routeSlug);
      setStoredSlug(routeSlug);
    } catch {
      // ignore
    }
  }, [routeSlug]);

  const hasSlug = (slug: string | null) =>
    !!slug && projectsState.some((p) => p.slug === slug);

  const effectiveSlug =
    (hasSlug(routeSlug) ? routeSlug : null) ||
    (hasSlug(storedSlug) ? storedSlug : null) ||
    projectsState[0]?.slug ||
    null;

  const currentProject =
    (effectiveSlug && projectsState.find((p) => p.slug === effectiveSlug)) ||
    null;

  const setCurrentProjectSlug = React.useCallback(
    (nextSlug: string) => {
      // Determine the current project-scoped suffix, if any, and keep it.
      const match = pathname.match(/^\/dashboard\/([^/]+)(\/.*)?$/);
      const first = match?.[1];
      const suffix = (() => {
        if (!match) return "";
        // If we're on a global dashboard page (e.g. /dashboard/new), jump to project root.
        if (first === "new" || first === "account" || first === "admin") {
          return "";
        }
        return match[2] || "";
      })();

      try {
        window.localStorage.setItem(LAST_PROJECT_SLUG_KEY, nextSlug);
        setStoredSlug(nextSlug);
      } catch {
        // ignore
      }

      router.push(`/dashboard/${nextSlug}${suffix}`);
    },
    [pathname, router],
  );

  const upsertProject = React.useCallback((project: ProjectForSwitcher) => {
    setProjectsState((prev) => {
      const existingIdx = prev.findIndex(
        (p) => p.id === project.id || p.slug === project.slug,
      );
      if (existingIdx === -1) return [project, ...prev];
      const next = [...prev];
      next.splice(existingIdx, 1);
      return [project, ...next];
    });
  }, []);

  const value: ProjectContextValue = React.useMemo(
    () => ({
      projects: projectsState,
      currentProject,
      currentProjectSlug: currentProject?.slug || null,
      setCurrentProjectSlug,
      upsertProject,
    }),
    [projectsState, currentProject, setCurrentProjectSlug, upsertProject],
  );

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = React.useContext(ProjectContext);
  if (!ctx) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return ctx;
}
