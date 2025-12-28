"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth/client";
import { Github } from "lucide-react";
import { HexagonIconNegative } from "../icon";

export function SignInCard() {
  const wasGithubLastUsed = authClient.isLastUsedLoginMethod("github");
  return (
    <div className="w-full max-w-md space-y-8">
      <div className="flex flex-col items-center space-y-3 text-center">
        <div className="bg-sidebar-primary text-sidebar-primary-foreground flex rounded-full size-12 items-center justify-center ">
          <HexagonIconNegative className="w-9 h-9" />
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Bug Buddy</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Collect feedback and create GitHub issues seamlessly
          </p>
        </div>
      </div>

      <Card className="border-2 shadow-lg">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-2xl font-semibold text-center">
            {wasGithubLastUsed ? "Welcome back" : "Welcome"}
          </CardTitle>
          <CardDescription className="text-base text-center">
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full h-11 text-base font-medium"
            size="lg"
            onClick={() => authClient.signIn.social({ provider: "github" })}
          >
            <Github className="h-5 w-5" />
            Continue with GitHub
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            By signing in, you agree to our terms of service and privacy policy
          </p>
        </CardContent>
      </Card>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Need help?{" "}
          <a
            href="mailto:support@bugbuddy.com"
            className="font-medium text-primary hover:underline"
          >
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
