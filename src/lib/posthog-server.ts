import { clientEnv } from "@/env";
import { PostHog } from "posthog-node";

let posthogClient: PostHog | null = null;

// No-op PostHog client for development
class NoOpPostHogClient {
  capture() {
    // No-op: don't send data in development
  }
  async shutdown() {
    // No-op
  }
}

export function getPostHogClient() {
  // Don't send PostHog data in local development
  if (process.env.NODE_ENV === "development") {
    return new NoOpPostHogClient() as unknown as PostHog;
  }

  if (!posthogClient) {
    posthogClient = new PostHog(clientEnv.NEXT_PUBLIC_POSTHOG_KEY!, {
      host: clientEnv.NEXT_PUBLIC_POSTHOG_HOST,
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return posthogClient;
}

export async function shutdownPostHog() {
  if (posthogClient) {
    await posthogClient.shutdown();
  }
}
