"use client";

import { useSession } from "@/components/auth/session-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { useGitHubConnectionStatus } from "@/hooks/use-github-connection-status";
import { authClient } from "@/lib/auth/client";
import { getAccounts } from "@/server/actions/account/get-accounts";
import { unlinkAccount } from "@/server/actions/account/unlink-account";
import { initiateGitHubConnection } from "@/server/actions/github/connect-github";
import { Github, LogOut, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import * as React from "react";
import { toast } from "sonner";

export function AccountSettingsClient() {
  const { user } = useSession();
  const router = useRouter();
  const [accounts, setAccounts] = React.useState<
    Array<{
      id: string;
      providerId: string;
      accountId: string;
      createdAt: Date;
    }>
  >([]);
  const [sessions, setSessions] = React.useState<
    Array<{
      id: string;
      token: string;
      expiresAt: Date | string;
      ipAddress: string | null;
      userAgent: string | null;
      createdAt: Date | string;
      isActive?: boolean;
    }>
  >([]);
  const [loading, setLoading] = React.useState(true);
  const [unlinking, setUnlinking] = React.useState<string | null>(null);
  const [revoking, setRevoking] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const { data: currentSession } = authClient.useSession();

  // Load accounts and sessions
  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [accountsResult, sessionsResponse] = await Promise.all([
        getAccounts(),
        authClient.listSessions(),
      ]);

      if (accountsResult.success) {
        setAccounts(accountsResult.accounts);
      }

      if (sessionsResponse.data && Array.isArray(sessionsResponse.data)) {
        // Get current session to identify active session
        // Try to match by session ID first, then by token
        const currentSessionId = currentSession?.session?.id || null;
        const currentSessionToken = currentSession?.session?.token || null;

        const sessionsWithActiveFlag = sessionsResponse.data.map(
          (s: {
            id: string;
            token: string;
            expiresAt: Date | string;
            ipAddress?: string | null;
            userAgent?: string | null;
            createdAt: Date | string;
          }) => ({
            id: s.id,
            token: s.token,
            expiresAt: s.expiresAt,
            ipAddress: s.ipAddress || null,
            userAgent: s.userAgent || null,
            createdAt: s.createdAt,
            isActive: Boolean(
              (currentSessionId && s.id === currentSessionId) ||
              (currentSessionToken && s.token === currentSessionToken),
            ),
          }),
        );

        setSessions(sessionsWithActiveFlag);
      }
    } catch (error) {
      console.error("Error loading account data:", error);
      toast.error("Failed to load account data");
    } finally {
      setLoading(false);
    }
  }, [currentSession]);

  // Load data on mount
  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle GitHub connection success/error from query params
  useGitHubConnectionStatus(loadData);

  const handleUnlinkAccount = async (accountId: string) => {
    setUnlinking(accountId);
    try {
      const result = await unlinkAccount({ accountId });

      if (!result.success) {
        throw new Error(result.error || "Failed to unlink account");
      }

      toast.success("Account unlinked successfully");
      // Remove from local state
      setAccounts((prev) => prev.filter((acc) => acc.id !== accountId));
      router.refresh();
    } catch (error) {
      console.error("Error unlinking account:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to unlink account",
      );
    } finally {
      setUnlinking(null);
    }
  };

  const handleRevokeSession = async (token: string) => {
    setRevoking(token);
    try {
      await authClient.revokeSession({ token });

      toast.success("Session revoked successfully");

      // Track session revocation
      posthog.capture("session_revoked");

      // Remove from local state
      setSessions((prev) => prev.filter((s) => s.token !== token));

      router.refresh();
    } catch (error) {
      console.error("Error revoking session:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to revoke session",
      );
    } finally {
      setRevoking(null);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      // Track account deletion - churn event (capture before deleting)
      posthog.capture("account_deleted");

      await authClient.deleteUser();
      toast.success("Account deleted successfully");
      posthog.reset();
      router.push("/");
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete account",
      );
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const getProviderName = (providerId: string) => {
    const providerMap: Record<string, string> = {
      github: "GitHub",
      google: "Google",
      discord: "Discord",
    };
    return providerMap[providerId] || providerId;
  };

  const formatUserAgent = (userAgent: string | null) => {
    if (!userAgent) return "Unknown";
    // Simple user agent parsing
    if (userAgent.includes("Chrome")) return "Chrome";
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("Safari")) return "Safari";
    if (userAgent.includes("Edge")) return "Edge";
    return "Unknown Browser";
  };

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(date));
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Account Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account settings, linked providers, and active sessions
          </p>
        </div>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              Your account details and profile information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel>Name</FieldLabel>
                {loading ? (
                  <Skeleton className="h-5 w-48" />
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {user?.name || "Not set"}
                  </div>
                )}
              </Field>
              <Field>
                <FieldLabel>Email</FieldLabel>
                {loading ? (
                  <Skeleton className="h-5 w-64" />
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {user?.email}
                  </div>
                )}
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        {/* Linked Providers */}
        <Card>
          <CardHeader>
            <CardTitle>Linked Providers</CardTitle>
            <CardDescription>
              Manage your connected authentication providers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <Skeleton className="h-6 w-24 mb-2" />
                      <Skeleton className="h-5 w-40" />
                    </div>
                    <Skeleton className="h-9 w-20" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {accounts.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No linked providers found
                  </div>
                ) : (
                  accounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {getProviderName(account.providerId)}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Linked on {formatDate(account.createdAt)}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnlinkAccount(account.id)}
                        disabled={
                          unlinking === account.id ||
                          (accounts.length === 1 && unlinking !== account.id)
                        }
                        loading={unlinking === account.id}
                      >
                        {unlinking === account.id ? (
                          <RefreshCw className="h-4 w-4" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                        Unlink
                      </Button>
                    </div>
                  ))
                )}
                {accounts.length === 1 && (
                  <div className="text-sm text-amber-600 dark:text-amber-500">
                    You cannot unlink your last provider. Please link another
                    account first or delete your account.
                  </div>
                )}
                {accounts.length < 2 && (
                  <CardContent className="pt-2 border-t px-0">
                    <div className="text-sm font-medium mb-3">
                      Link Additional Account
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!accounts.some((acc) => acc.providerId === "github") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            await initiateGitHubConnection();
                          }}
                        >
                          <Github className="h-4 w-4 mr-2" />
                          Link GitHub
                        </Button>
                      )}
                      {!accounts.some((acc) => acc.providerId === "google") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            authClient.signIn.social({ provider: "google" })
                          }
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Link Google
                        </Button>
                      )}
                    </div>
                  </CardContent>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Sessions */}
        <Card>
          <CardHeader>
            <CardTitle>Active Sessions</CardTitle>
            <CardDescription>
              Manage your active sessions across different devices
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-5 w-24" />
                      </div>
                      <div className="space-y-1">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-5 w-48" />
                      </div>
                    </div>
                    <Skeleton className="h-9 w-20" />
                  </div>
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No active sessions found
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.map((session) => (
                  <div
                    key={session.token}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {formatUserAgent(session.userAgent)}
                        </span>
                        {session.isActive && (
                          <Badge
                            variant="secondary"
                            className="w-fit text-[10px]"
                          >
                            Current Session
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1 space-y-1">
                        {session.ipAddress && (
                          <div>IP: {session.ipAddress}</div>
                        )}
                        <div>Created: {formatDate(session.createdAt)}</div>
                        <div>Expires: {formatDate(session.expiresAt)}</div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevokeSession(session.token)}
                      disabled={revoking === session.token || session.isActive}
                      loading={revoking === session.token}
                    >
                      {!session.isActive && <LogOut className="h-4 w-4" />}
                      {session.isActive ? "Current" : "Revoke"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card>
          <CardHeader>
            <CardTitle>Danger Zone</CardTitle>
            <CardDescription>
              Irreversible and destructive actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel>Delete Account</FieldLabel>
                <FieldDescription>
                  Once you delete your account, there is no going back. Please
                  be certain. This will permanently delete all your projects,
                  feedback, and associated data.
                </FieldDescription>
                <div className="mt-4">
                  <Button
                    variant="destructive"
                    type="button"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={deleting}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Account
                  </Button>
                </div>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
      </div>

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you absolutely sure? This action cannot be undone. This will
              permanently delete your account and remove all of your data from
              our servers. All your projects, feedback, and integrations will be
              permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleting}
              loading={deleting}
            >
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
