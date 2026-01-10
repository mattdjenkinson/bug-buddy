import { SessionProvider } from "@/components/auth/session-provider";
import * as React from "react";

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}
