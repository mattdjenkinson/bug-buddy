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
import { AlertCircle, Github } from "lucide-react";
import Link from "next/link";
import { useQueryState } from "nuqs";
import posthog from "posthog-js";
import { useEffect, useState } from "react";
import { HexagonIconNegative } from "../icon";
import { Alert, AlertTitle } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Spinner } from "../ui/spinner";

// Google icon SVG component
function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function SignInCard() {
  const [loadingProvider, setLoadingProvider] = useState<
    "github" | "google" | null
  >(null);
  const [error] = useQueryState("error");
  const [errorDescription] = useQueryState("error_description");
  const errorMessage = error ? `${error}: ${errorDescription || ""}` : null;
  // Avoid hydration mismatch: last-used provider is stored client-side.
  const [wasGithubLastUsed, setWasGithubLastUsed] = useState(false);
  const [wasGoogleLastUsed, setWasGoogleLastUsed] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setWasGithubLastUsed(authClient.isLastUsedLoginMethod("github"));
    setWasGoogleLastUsed(authClient.isLastUsedLoginMethod("google"));
  }, []);
  const isLoading = loadingProvider !== null;

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

      <Card className=" shadow-lg bg-background">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-2xl font-semibold text-center">
            {wasGithubLastUsed || wasGoogleLastUsed
              ? "Welcome back"
              : "Welcome"}
          </CardTitle>
          <CardDescription className="text-base text-center">
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full h-11 text-base font-medium relative"
            size="lg"
            onClick={() => {
              setLoadingProvider("github");
              posthog.capture("user_signed_in", { provider: "github" });
              authClient.signIn.social({ provider: "github" });
            }}
            disabled={isLoading}
          >
            {wasGithubLastUsed && (
              <Badge variant="secondary" className="absolute -top-3 -right-2">
                Last Used
              </Badge>
            )}
            {loadingProvider === "github" ? (
              <Spinner className="h-5 w-5" />
            ) : (
              <Github className="h-5 w-5" />
            )}
            Continue with GitHub
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>
          <Button
            className="w-full h-11 text-base font-medium relative"
            size="lg"
            variant="outline"
            onClick={() => {
              setLoadingProvider("google");
              posthog.capture("user_signed_in", { provider: "google" });
              authClient.signIn.social({ provider: "google" });
            }}
            disabled={isLoading}
          >
            {wasGoogleLastUsed && (
              <Badge variant="secondary" className="absolute -top-3 -right-2">
                Last Used
              </Badge>
            )}
            {loadingProvider === "google" ? (
              <Spinner className="h-5 w-5" />
            ) : (
              <GoogleIcon />
            )}
            Continue with Google
          </Button>
          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>{errorMessage}</AlertTitle>
            </Alert>
          )}
          <p className="text-center text-xs text-muted-foreground">
            By signing in, you agree to our{" "}
            <Link href="/terms">terms of service</Link> and{" "}
            <Link href="/privacy">privacy policy</Link>
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
