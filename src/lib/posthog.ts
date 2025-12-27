import { clientEnv } from "@/env";
import posthog from "posthog-js";

if (typeof window !== "undefined") {
  if (clientEnv.NEXT_PUBLIC_POSTHOG_KEY && clientEnv.NEXT_PUBLIC_POSTHOG_HOST) {
    posthog.init(clientEnv.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: clientEnv.NEXT_PUBLIC_POSTHOG_HOST,
      loaded: (posthog) => {
        if (process.env.NODE_ENV === "development") {
          posthog.debug();
        }
      },
    });
  }
}

export { posthog };
