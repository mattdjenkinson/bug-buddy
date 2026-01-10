"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { usePathname } from "next/navigation";
import * as React from "react";
import { useProject } from "./project-context";

const sectionLabels: Record<string, string> = {
  feedback: "Feedback",
  analytics: "Analytics",
  settings: "Settings",
  projects: "Projects",
  account: "Account",
  admin: "Admin",
};

export function DashboardBreadcrumb() {
  const pathname = usePathname();
  const { currentProject } = useProject();

  // Build breadcrumb items based on the current path
  const buildBreadcrumbs = () => {
    const items: Array<{ label: string; href?: string }> = [];

    const segments = pathname.split("/").filter(Boolean);
    if (segments[0] !== "dashboard") {
      return items;
    }

    const second = segments[1];
    const isGlobalSection =
      second === undefined ||
      second === "projects" ||
      second === "account" ||
      second === "admin";

    // Always start with the global dashboard entrypoint.
    // (This route redirects to the last-selected project.)
    items.push({ label: "Dashboard", href: "/dashboard" });

    // If we're on the root dashboard, we're done
    if (pathname === "/dashboard") {
      return items;
    }

    // Project-scoped routes look like /dashboard/<projectSlug>/...
    if (!isGlobalSection && second) {
      items.push({
        label: currentProject?.name || second,
        href: `/dashboard/${second}`,
      });

      // Remaining segments after project slug
      for (let i = 2; i < segments.length; i++) {
        const segment = segments[i]!;

        const isLast = i === segments.length - 1;
        const label =
          sectionLabels[segment] ||
          (/^[a-zA-Z0-9_-]+$/.test(segment) && segment.length > 20
            ? `${segment.substring(0, 20)}...`
            : segment
                .split("-")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" "));

        const href = (() => {
          // Link sections, not IDs.
          if (segment === "feedback") return `/dashboard/${second}/feedback`;
          if (segment === "analytics") return `/dashboard/${second}/analytics`;
          if (segment === "settings") return `/dashboard/${second}/settings`;
          return undefined;
        })();

        items.push({ label, href: !isLast ? href : undefined });
      }

      return items;
    }

    // Global dashboard routes: /dashboard/new, /dashboard/account, /dashboard/admin, ...
    for (let i = 1; i < segments.length; i++) {
      const segment = segments[i]!;
      const isLast = i === segments.length - 1;
      const label = sectionLabels[segment] || segment;
      const href = !isLast
        ? `/${segments.slice(0, i + 1).join("/")}`
        : undefined;
      items.push({ label, href });
    }

    return items;
  };

  const breadcrumbs = buildBreadcrumbs();

  return (
    <Breadcrumb className="hidden md:block w-full">
      <BreadcrumbList>
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <React.Fragment key={item.href || item.label}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem className={index === 0 ? "hidden md:block" : ""}>
                {isLast ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={item.href || "#"}>
                    {item.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
