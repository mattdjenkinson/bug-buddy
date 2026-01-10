"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataPagination } from "@/components/ui/data-pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { authClient } from "@/lib/auth/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  CheckCircle2,
  Github,
  Unlock,
  Users,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type User = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string | null;
  banned: boolean | null;
  banReason: string | null;
  banExpires: string | null;
  createdAt: string;
  accounts?: Array<{
    id: string;
    providerId: string;
    accountId: string;
    createdAt: string;
  }>;
};

type UsersResponse = {
  users: User[];
  total: number;
  limit?: number;
  offset?: number;
};

export function AdminUsersTable() {
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [searchValue, setSearchValue] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAccountsDialogOpen, setIsAccountsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: usersData,
    isLoading,
    error,
  } = useQuery<UsersResponse>({
    queryKey: ["admin-users", limit, offset, searchValue],
    queryFn: async () => {
      const response = await authClient.admin.listUsers({
        query: {
          limit,
          offset,
          searchValue: searchValue || undefined,
          sortBy: "createdAt",
          sortDirection: "desc",
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data as UsersResponse;
    },
  });

  // Fetch GitHub status for all users
  const { data: githubStatusData } = useQuery({
    queryKey: ["admin-users-github-status", usersData?.users.map((u) => u.id)],
    queryFn: async () => {
      if (!usersData?.users || usersData.users.length === 0) return {};
      const { getUsersGitHubStatus } =
        await import("@/server/actions/admin.actions");
      return getUsersGitHubStatus(usersData.users.map((u) => u.id));
    },
    enabled: !!usersData?.users && usersData.users.length > 0,
  });

  const banUserMutation = useMutation({
    mutationFn: async ({ userId, ban }: { userId: string; ban: boolean }) => {
      if (ban) {
        const response = await authClient.admin.banUser({
          userId,
          banReason: "Banned by admin",
        });
        if (response.error) throw new Error(response.error.message);
        return response.data;
      } else {
        const response = await authClient.admin.updateUser({
          userId,
          data: {
            banned: false,
            banReason: null,
            banExpires: null,
          },
        });
        if (response.error) throw new Error(response.error.message);
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User status updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update ban status: " + error.message);
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const response = await authClient.admin.updateUser({
        userId,
        data: {
          role,
        },
      });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Role updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update role: " + error.message);
    },
  });

  const { data: userAccountsData } = useQuery({
    queryKey: ["admin-user-accounts", selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser) return null;
      const { getUserAccounts } =
        await import("@/server/actions/admin.actions");
      const accounts = await getUserAccounts(selectedUser.id);
      return {
        ...selectedUser,
        accounts,
      } as User;
    },
    enabled: !!selectedUser && isAccountsDialogOpen,
  });

  const handleSearch = (value: string) => {
    setSearchValue(value);
    setOffset(0);
  };

  const handleBan = (userId: string, ban: boolean) => {
    banUserMutation.mutate({ userId, ban });
  };

  const handleRoleChange = (userId: string, role: string) => {
    updateRoleMutation.mutate({ userId, role });
  };

  const handleViewAccounts = (user: User) => {
    setSelectedUser(user);
    setIsAccountsDialogOpen(true);
  };

  const users = usersData?.users || [];
  const total = usersData?.total || 0;
  const displayedUser = userAccountsData || selectedUser;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search users by email or name..."
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-[300px]"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          Total: {total} users
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>GitHub</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-destructive"
                >
                  Error: {error.message}
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const githubStatus = githubStatusData?.[user.id];
                const hasGitHub = githubStatus?.hasGitHub ?? false;

                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.image || undefined} />
                          <AvatarFallback>
                            {user.name?.[0]?.toUpperCase() ||
                              user.email[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">
                          {user.name || "No name"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Select
                        value={user.role || "user"}
                        onValueChange={(value) =>
                          handleRoleChange(user.id, value)
                        }
                        disabled={updateRoleMutation.isPending}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {user.banned ? (
                        <Badge variant="destructive">Banned</Badge>
                      ) : (
                        <Badge variant="secondary">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {hasGitHub ? (
                          <>
                            <Github className="h-4 w-4 text-green-600" />
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                          </>
                        ) : (
                          <>
                            <Github className="h-4 w-4 text-muted-foreground" />
                            <XCircle className="h-3 w-3 text-muted-foreground" />
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewAccounts(user)}
                        >
                          <Users className="h-4 w-4 mr-1" />
                          Accounts
                        </Button>
                        {user.banned ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleBan(user.id, false)}
                            disabled={banUserMutation.isPending}
                          >
                            <Unlock className="h-4 w-4 mr-1" />
                            Unban
                          </Button>
                        ) : (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleBan(user.id, true)}
                            disabled={banUserMutation.isPending}
                          >
                            <Ban className="h-4 w-4 mr-1" />
                            Ban
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {total > 0 && (
        <DataPagination
          total={total}
          limit={limit}
          offset={offset}
          onLimitChange={setLimit}
          onOffsetChange={setOffset}
        />
      )}

      <Dialog
        open={isAccountsDialogOpen}
        onOpenChange={setIsAccountsDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Linked Accounts</DialogTitle>
            <DialogDescription>
              Accounts linked to {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {displayedUser?.accounts && displayedUser.accounts.length > 0 ? (
              displayedUser.accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-3 border rounded-md"
                >
                  <div>
                    <div className="font-medium capitalize">
                      {account.providerId}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Account ID: {account.accountId}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Linked: {new Date(account.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No linked accounts found
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
