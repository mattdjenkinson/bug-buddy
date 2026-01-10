"use client";

import { HexagonIconNegative } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <div className="space-y-6 p-4 md:p-8 bg-muted">
      <div className="flex items-center justify-between">
        <div className="flex items-center justify-between gap-2 ">
          <h1>Bug Buddy</h1>
          <HexagonIconNegative className="w-6 h-6" />
        </div>

        <Button
          loading={isPending}
          variant="outline"
          onClick={() => {
            startTransition(() => {
              authClient.signOut();
              router.push("/");
            });
          }}
        >
          Log Out
        </Button>
      </div>
      {children}
    </div>
  );
}
