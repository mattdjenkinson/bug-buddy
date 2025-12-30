"use server";

import { serverEnv } from "@/env";
import { requireAuth } from "@/lib/auth/helpers";
import { getBaseUrl } from "@/lib/base-url";
import { redirect } from "next/navigation";

/**
 * Initiates GitHub OAuth flow for account linking (not authentication)
 * This allows users to connect GitHub for repository access without changing their login method
 * @param redirectUrl - Optional URL to redirect to after successful connection (defaults to /dashboard/account)
 */
export async function initiateGitHubConnection(redirectUrl?: string) {
  const session = await requireAuth();
  const baseUrl = await getBaseUrl();

  // Generate a state token to prevent CSRF attacks
  const state = crypto.randomUUID();

  // Default redirect to account settings if not provided
  const finalRedirectUrl = redirectUrl || "/dashboard/account";

  // Build GitHub OAuth URL
  // Use the same callback URL as better-auth, but include link_account in state
  // The callback handler will check for link_account in the state or detect existing session
  // State format: "link_account:stateToken:userId|redirectUrl"
  const stateParam = `link_account:${state}:${session.user.id}|${encodeURIComponent(finalRedirectUrl)}`;

  const params = new URLSearchParams({
    client_id: serverEnv.GITHUB_CLIENT_ID,
    redirect_uri: `${baseUrl}/api/auth/callback/github`,
    scope: "read:user user:email repo read:org admin:repo_hook",
    state: stateParam,
  });

  const githubAuthUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

  redirect(githubAuthUrl);
}
