"use client";

import { useSession } from "@/components/auth/session-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAccounts } from "@/server/actions/account/get-accounts";
import { initiateGitHubConnection } from "@/server/actions/github/connect-github";
import { Github, X } from "lucide-react";
import * as React from "react";

export function GitHubAuthPrompt() {
  const { user } = useSession();
  const [hasGitHubAccount, setHasGitHubAccount] = React.useState<
    boolean | null
  >(null);
  const [dismissed, setDismissed] = React.useState(false);
  const [checking, setChecking] = React.useState(true);

  React.useEffect(() => {
    async function checkGitHubAccount() {
      if (!user) {
        setChecking(false);
        return;
      }

      try {
        const result = await getAccounts();
        if (result.success) {
          const hasGitHub = result.accounts.some(
            (account) => account.providerId === "github",
          );
          setHasGitHubAccount(hasGitHub);
          // Clear dismissal if GitHub is now linked
          if (hasGitHub && typeof window !== "undefined") {
            localStorage.removeItem("github-auth-prompt-dismissed");
          }
        }
      } catch (error) {
        console.error("Error checking GitHub account:", error);
      } finally {
        setChecking(false);
      }
    }

    checkGitHubAccount();
    // Re-check periodically in case user links GitHub in another tab
    const interval = setInterval(checkGitHubAccount, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const handleConnectGitHub = async () => {
    // Use custom GitHub connection flow that links account without changing login method
    await initiateGitHubConnection();
  };

  const handleDismiss = () => {
    setDismissed(true);
    // Store dismissal in localStorage so it doesn't show again for this session
    if (typeof window !== "undefined") {
      localStorage.setItem("github-auth-prompt-dismissed", "true");
    }
  };

  // Check if user previously dismissed the prompt
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const wasDismissed = localStorage.getItem("github-auth-prompt-dismissed");
      if (wasDismissed === "true") {
        setDismissed(true);
      }
    }
  }, []);

  // Don't show if checking, dismissed, or user has GitHub account
  if (
    checking ||
    dismissed ||
    hasGitHubAccount === true ||
    hasGitHubAccount === null
  ) {
    return null;
  }

  return (
    <Card className="border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Github className="h-5 w-5" />
              Connect GitHub for Integration
            </CardTitle>
            <CardDescription className="mt-2">
              To enable GitHub integration features like creating issues from
              feedback, please connect your GitHub account. This will only grant
              repository access and won&apos;t change your login method.
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Button onClick={handleConnectGitHub} className="" size="lg">
          <Github className="h-4 w-4" />
          Connect GitHub Account
        </Button>
      </CardContent>
    </Card>
  );
}
