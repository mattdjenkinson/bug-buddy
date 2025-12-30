import { serverEnv } from "@/env";
import { auth } from "@/lib/auth";
import { requireAuth } from "@/lib/auth/helpers";
import { prisma } from "@/lib/prisma";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest, NextResponse } from "next/server";

const { GET: betterAuthGET } = toNextJsHandler(auth);

/**
 * Unified GitHub OAuth callback handler
 * - If state starts with "link_account:", handles account linking (doesn't create new session)
 * - Otherwise, delegates to better-auth for authentication
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const state = searchParams.get("state");

  // Check if this is an account linking flow by checking the state parameter
  // State format for linking: "link_account:stateToken:userId"
  // State format for auth: better-auth's own format
  const isAccountLinking = state?.startsWith("link_account:");

  // If this is for account linking, handle it separately
  if (isAccountLinking) {
    try {
      // Get the current session to ensure user is logged in
      const session = await requireAuth();

      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const error = searchParams.get("error");

      // Extract redirect URL from state if available, otherwise default
      // State format: "link_account:stateToken:userId|redirectUrl" or "link_account:stateToken:userId" (legacy)
      const stateParts = state?.split("|") || [];
      const redirectUrl = stateParts[1]
        ? decodeURIComponent(stateParts[1])
        : "/dashboard";

      // Check for OAuth errors first
      if (error) {
        return NextResponse.redirect(
          new URL(
            `${redirectUrl}?error=${encodeURIComponent(error)}`,
            request.url,
          ),
        );
      }

      if (!code || !state) {
        return NextResponse.redirect(
          new URL(`${redirectUrl}?error=missing_parameters`, request.url),
        );
      }

      // Verify state contains the user ID
      const statePrefix = stateParts[0];
      const [, , userId] = statePrefix.split(":");
      if (userId !== session.user.id) {
        return NextResponse.redirect(
          new URL(`${redirectUrl}?error=invalid_state`, request.url),
        );
      }

      // Exchange code for access token
      const tokenResponse = await fetch(
        "https://github.com/login/oauth/access_token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            client_id: serverEnv.GITHUB_CLIENT_ID,
            client_secret: serverEnv.GITHUB_CLIENT_SECRET,
            code,
          }),
        },
      );

      if (!tokenResponse.ok) {
        return NextResponse.redirect(
          new URL(`${redirectUrl}?error=token_exchange_failed`, request.url),
        );
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      if (!accessToken) {
        return NextResponse.redirect(
          new URL(`${redirectUrl}?error=no_access_token`, request.url),
        );
      }

      // Get user info from GitHub
      const userResponse = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (!userResponse.ok) {
        return NextResponse.redirect(
          new URL(`${redirectUrl}?error=failed_to_fetch_user`, request.url),
        );
      }

      const githubUser = await userResponse.json();

      // Check if account already exists
      const existingAccount = await prisma.account.findFirst({
        where: {
          userId: session.user.id,
          providerId: "github",
        },
      });

      if (existingAccount) {
        // Update existing account
        await prisma.account.update({
          where: { id: existingAccount.id },
          data: {
            accountId: githubUser.id.toString(),
            accessToken,
            scope: tokenData.scope || "read:user,user:email,repo,read:org",
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new account linked to current user
        await prisma.account.create({
          data: {
            id: `github_${githubUser.id}_${session.user.id}`,
            accountId: githubUser.id.toString(),
            providerId: "github",
            userId: session.user.id,
            accessToken,
            scope: tokenData.scope || "read:user,user:email,repo,read:org",
          },
        });
      }

      // Redirect back with success (redirectUrl already extracted above)
      return NextResponse.redirect(
        new URL(`${redirectUrl}?github_connected=true`, request.url),
      );
    } catch (error) {
      console.error("Error in GitHub account linking callback:", error);

      // Try to extract redirect URL from state for error redirect
      const stateParts = state?.split("|") || [];
      const redirectUrl = stateParts[1]
        ? decodeURIComponent(stateParts[1])
        : "/dashboard";

      return NextResponse.redirect(
        new URL(
          `${redirectUrl}?error=${encodeURIComponent("connection_failed")}`,
          request.url,
        ),
      );
    }
  }

  // Otherwise, delegate to better-auth for normal authentication
  // Pass the original request as-is
  return betterAuthGET(request);
}
