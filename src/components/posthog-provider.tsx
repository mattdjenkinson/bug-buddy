"use client";

import * as React from "react";
import { posthog } from "@/lib/posthog";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    // PostHog is initialized in lib/posthog.ts
    // Track page views
    if (typeof window !== "undefined" && posthog.__loaded) {
      posthog.capture("$pageview");
    }
  }, []);

  return <>{children}</>;
}
