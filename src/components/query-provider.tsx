"use client";

import { queryClient } from "@/lib/get-query-client";
import { QueryClientProvider } from "@tanstack/react-query";
import type * as React from "react";

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
