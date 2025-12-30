"use client";

import { authClient } from "@/lib/auth/client";
import posthog from "posthog-js";
import * as React from "react";

type User = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: Date | null;
};

type SessionContextType = {
  user: User | undefined;
  isLoading: boolean;
};

const SessionContext = React.createContext<SessionContextType | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { data, isPending } = authClient.useSession();
  const previousUserIdRef = React.useRef<string | null>(null);

  const value = React.useMemo(
    () => ({
      user: data?.user as User | undefined,
      isLoading: isPending,
    }),
    [data?.user, isPending],
  );

  // Identify user in PostHog when session changes
  const userId = data?.user?.id;
  const userName = data?.user?.name;
  const userEmail = data?.user?.email;

  // Use useLayoutEffect to identify users synchronously after render
  // This is the appropriate pattern for PostHog identify per their docs
  React.useLayoutEffect(() => {
    if (userId && userId !== previousUserIdRef.current) {
      previousUserIdRef.current = userId;
      posthog.identify(userId, {
        name: userName,
        email: userEmail,
      });
    } else if (!userId && previousUserIdRef.current) {
      previousUserIdRef.current = null;
      posthog.reset();
    }
  }, [userId, userName, userEmail]);

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const context = React.useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
