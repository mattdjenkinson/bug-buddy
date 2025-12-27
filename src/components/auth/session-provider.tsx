"use client";

import { authClient } from "@/lib/auth/client";
import * as React from "react";

type User = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

type SessionContextType = {
  user: User | undefined;
  isLoading: boolean;
};

const SessionContext = React.createContext<SessionContextType | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { data, isPending } = authClient.useSession();

  const value = React.useMemo(
    () => ({
      user: data?.user as User | undefined,
      isLoading: isPending,
    }),
    [data?.user, isPending],
  );

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
