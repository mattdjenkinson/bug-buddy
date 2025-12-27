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

export function SignInCard() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-3xl">Bug Buddy</CardTitle>
        <CardDescription>
          Collect feedback from your website and automatically create GitHub
          issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Get started by signing in with your GitHub account to manage feedback
          and create issues.
        </p>
        <Button
          className="w-full"
          onClick={() => authClient.signIn.social({ provider: "github" })}
        >
          Sign in with GitHub
        </Button>
      </CardContent>
    </Card>
  );
}
