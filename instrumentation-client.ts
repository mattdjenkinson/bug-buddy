import { clientEnv } from "@/env";
import posthog from "posthog-js";

// Don't send PostHog data in local development
if (process.env.NODE_ENV !== "development") {
  posthog.init(clientEnv.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: "/ingest",
    ui_host: clientEnv.NEXT_PUBLIC_POSTHOG_HOST,
    defaults: "2025-05-24",
    capture_exceptions: true,
    debug: false,
  });
} else {
  // In development, initialize with opt-out to prevent any data from being sent
  // This ensures posthog methods are available but no data is sent
  posthog.init(clientEnv.NEXT_PUBLIC_POSTHOG_KEY || "dev-key", {
    api_host: "/ingest",
    ui_host: clientEnv.NEXT_PUBLIC_POSTHOG_HOST,
    defaults: "2025-05-24",
    capture_exceptions: false,
    opt_out_capturing_by_default: true,
    debug: false,
  });
  // Explicitly opt out to ensure no data is sent
  posthog.opt_out_capturing();
}

// IMPORTANT: Never combine this approach with other client-side PostHog initialization approaches,
// especially components like a PostHogProvider. instrumentation-client.ts is the correct solution
// for initializing client-side PostHog in Next.js 15.3+ apps.
