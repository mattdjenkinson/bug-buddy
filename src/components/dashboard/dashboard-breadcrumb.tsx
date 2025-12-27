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

const routeMap: Record<string, { label: string; href: string }> = {
  "/dashboard": { label: "Dashboard", href: "/dashboard" },
  "/dashboard/projects": { label: "Projects", href: "/dashboard/projects" },
  "/dashboard/feedback": { label: "Feedback", href: "/dashboard/feedback" },
  "/dashboard/analytics": { label: "Analytics", href: "/dashboard/analytics" },
  "/dashboard/settings": { label: "Settings", href: "/dashboard/settings" },
};

export function DashboardBreadcrumb() {
  const pathname = usePathname();

  // Build breadcrumb items based on the current path
  const buildBreadcrumbs = () => {
    const items: Array<{ label: string; href?: string }> = [];

    // Always start with Dashboard
    items.push({ label: "Dashboard", href: "/dashboard" });

    // If we're on the root dashboard, we're done
    if (pathname === "/dashboard") {
      return items;
    }

    // Split the path and build breadcrumbs
    const segments = pathname.split("/").filter(Boolean);

    // Skip the first segment (dashboard) since we already added it
    for (let i = 1; i < segments.length; i++) {
      const segment = segments[i];
      const path = `/${segments.slice(0, i + 1).join("/")}`;

      // Check if this is a known route
      if (routeMap[path]) {
        items.push({ label: routeMap[path].label, href: routeMap[path].href });
      } else {
        // For dynamic routes like [id], check if parent route exists
        const parentPath = `/${segments.slice(0, i).join("/")}`;
        const parentRoute = routeMap[parentPath];

        // If parent exists and we haven't added it yet, add it
        if (
          parentRoute &&
          !items.some((item) => item.href === parentRoute.href)
        ) {
          items.push({ label: parentRoute.label, href: parentRoute.href });
        }

        // Add the current segment (ID or dynamic value)
        // Check if segment looks like an ID (long alphanumeric string)
        const isId = /^[a-zA-Z0-9_-]+$/.test(segment) && segment.length > 10;
        const label =
          isId && segment.length > 20
            ? `${segment.substring(0, 20)}...`
            : segment
                .split("-")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ");
        items.push({ label });
      }
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
