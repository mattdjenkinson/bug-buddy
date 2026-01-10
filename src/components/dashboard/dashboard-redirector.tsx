"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

const LAST_PROJECT_SLUG_KEY = "bugbuddy:lastProjectSlug";

interface DashboardRedirectorProps {
  fallbackSlug?: string | null;
  allowedSlugs?: string[];
  suffix?: string; // e.g. "" | "/settings" | "/feedback"
  fallbackUrl?: string; // e.g. "/dashboard/new"
}

export function DashboardRedirector({
  fallbackSlug,
  allowedSlugs = [],
  suffix = "",
  fallbackUrl = "/dashboard/new",
}: DashboardRedirectorProps) {
  const router = useRouter();

  React.useEffect(() => {
    const lastSlug = (() => {
      try {
        return window.localStorage.getItem(LAST_PROJECT_SLUG_KEY);
      } catch {
        return null;
      }
    })();

    const isValidLast = lastSlug ? allowedSlugs.includes(lastSlug) : false;
    const slug = (isValidLast ? lastSlug : null) || fallbackSlug;
    if (slug) {
      router.replace(`/dashboard/${slug}${suffix}`);
    } else {
      router.replace(fallbackUrl);
    }
  }, [router, allowedSlugs, fallbackSlug, suffix, fallbackUrl]);

  return null;
}
