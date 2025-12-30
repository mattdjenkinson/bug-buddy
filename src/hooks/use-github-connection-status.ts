import { useQueryState } from "nuqs";
import posthog from "posthog-js";
import * as React from "react";
import { toast } from "sonner";

/**
 * Hook to handle GitHub connection status from URL query parameters
 * Displays success/error toasts and cleans up URL params
 * @param onSuccess - Optional callback when connection succeeds (e.g., to reload data)
 */
export function useGitHubConnectionStatus(onSuccess?: () => void) {
  const [error, setError] = useQueryState("error");
  const [githubConnected, setGithubConnected] =
    useQueryState("github_connected");

  React.useEffect(() => {
    if (githubConnected === "true") {
      toast.success("GitHub account connected successfully!");

      // Track GitHub account link
      posthog.capture("github_account_linked");

      // Remove query param from URL
      setGithubConnected(null);

      // Call success callback if provided
      onSuccess?.();
    } else if (error) {
      const errorMessages: Record<string, string> = {
        missing_parameters: "Missing required parameters. Please try again.",
        invalid_state: "Invalid request. Please try again.",
        token_exchange_failed:
          "Failed to exchange authorization code. Please try again.",
        no_access_token: "Failed to get access token. Please try again.",
        failed_to_fetch_user:
          "Failed to fetch GitHub user information. Please try again.",
        connection_failed:
          "Failed to connect GitHub account. Please try again.",
      };
      toast.error(
        errorMessages[error] || "An error occurred. Please try again.",
      );
      // Remove query param from URL
      setError(null);
    }
  }, [githubConnected, error, setGithubConnected, setError, onSuccess]);
}
