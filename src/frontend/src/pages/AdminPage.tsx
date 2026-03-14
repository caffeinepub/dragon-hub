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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { Principal } from "@icp-sdk/core/principal";
import { Principal as PrincipalClass } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  KeyRound,
  Loader2,
  Shield,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { UserRole, type UserWithRole } from "../backend";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

function roleBadge(role: UserRole) {
  if (role === UserRole.admin)
    return (
      <Badge className="bg-primary/20 text-primary border-primary/30 font-body text-xs">
        <Shield className="h-3 w-3 mr-1" />
        Admin
      </Badge>
    );
  if (role === UserRole.user)
    return (
      <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 font-body text-xs">
        <Users className="h-3 w-3 mr-1" />
        User
      </Badge>
    );
  return (
    <Badge
      variant="outline"
      className="text-muted-foreground font-body text-xs"
    >
      Guest
    </Badge>
  );
}

function truncatePrincipal(p: Principal): string {
  const s = p.toString();
  if (s.length <= 20) return s;
  return `${s.slice(0, 10)}...${s.slice(-6)}`;
}

function UserRow({
  user,
  index,
  onRoleChange,
  onRemove,
}: {
  user: UserWithRole;
  index: number;
  onRoleChange: (principal: Principal, role: UserRole) => Promise<void>;
  onRemove: (principal: Principal) => void;
}) {
  const [selectedRole, setSelectedRole] = useState<string>(user.role as string);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const roleMap: Record<string, UserRole> = {
        admin: UserRole.admin,
        user: UserRole.user,
        guest: UserRole.guest,
      };
      await onRoleChange(user.principal, roleMap[selectedRole]);
    } finally {
      setSaving(false);
    }
  };

  const displayName =
    user.profile.displayName.trim() || truncatePrincipal(user.principal);

  return (
    <div
      data-ocid={`admin.users.item.${index}`}
      className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border border-border/50 bg-background/40 hover:bg-background/70 transition-colors"
    >
      {/* Avatar + info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-display text-sm font-bold">
          {displayName.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-body text-sm font-medium text-foreground truncate">
            {displayName}
          </p>
          <p className="font-mono text-xs text-muted-foreground truncate">
            {truncatePrincipal(user.principal)}
          </p>
        </div>
        <div className="hidden sm:block">{roleBadge(user.role)}</div>
      </div>

      {/* Role selector + actions */}
      <div className="flex items-center gap-2 shrink-0">
        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger
            data-ocid={`admin.users.role_select.${index}`}
            className="w-28 h-8 text-xs bg-background border-border focus:ring-primary"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="admin">
              <span className="flex items-center gap-1.5 text-xs">
                <Shield className="h-3 w-3 text-primary" /> Admin
              </span>
            </SelectItem>
            <SelectItem value="user">
              <span className="flex items-center gap-1.5 text-xs">
                <Users className="h-3 w-3 text-blue-400" /> User
              </span>
            </SelectItem>
            <SelectItem value="guest">
              <span className="text-xs">Guest</span>
            </SelectItem>
          </SelectContent>
        </Select>

        <Button
          data-ocid={`admin.users.save_button.${index}`}
          size="sm"
          onClick={handleSave}
          disabled={saving || selectedRole === (user.role as string)}
          className="h-8 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-body"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
        </Button>

        <Button
          data-ocid={`admin.users.delete_button.${index}`}
          size="sm"
          variant="ghost"
          onClick={() => onRemove(user.principal)}
          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function ClaimAdminSection({
  actor,
  onSuccess,
}: { actor: any; onSuccess: () => void }) {
  const [isClaiming, setIsClaiming] = useState(false);

  const handleClaim = async () => {
    setIsClaiming(true);
    try {
      await actor._initializeAccessControlWithSecret("init");
      toast.success("Admin access granted!");
      setTimeout(() => {
        onSuccess();
        window.location.reload();
      }, 1200);
    } catch {
      toast.error("Failed to claim admin access. Please try again.");
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <Card
      className="max-w-md w-full border-primary/30 bg-card mt-6"
      data-ocid="admin.claim.card"
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="font-display text-lg text-foreground">
              Initialize Admin Access
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Sign in and click below to set yourself as admin.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-5">
        <Button
          data-ocid="admin.claim.submit_button"
          onClick={handleClaim}
          disabled={isClaiming}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-body font-semibold"
        >
          {isClaiming ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Claiming...
            </>
          ) : (
            <>
              <Shield className="mr-2 h-4 w-4" />
              Claim Admin Access
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

export function AdminPage() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const [principalId, setPrincipalId] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Principal | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const {
    data: isAdmin,
    isLoading: checkingAdmin,
    refetch: refetchAdmin,
  } = useQuery({
    queryKey: ["isAdmin", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching && !!identity,
  });

  const {
    data: users,
    isLoading: usersLoading,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ["allUsers"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllUsers();
    },
    enabled: !!actor && !isFetching && !!isAdmin,
  });

  const handleRoleChange = async (principal: Principal, role: UserRole) => {
    if (!actor) return;
    try {
      await actor.assignCallerUserRole(principal, role);
      toast.success("Role updated successfully");
      await refetchUsers();
      queryClient.invalidateQueries({ queryKey: ["isAdmin"] });
    } catch {
      toast.error("Failed to update role");
    }
  };

  const handleRemoveConfirm = async () => {
    if (!actor || !removeTarget) return;
    setIsRemoving(true);
    try {
      await actor.removeUser(removeTarget);
      toast.success("User removed");
      setRemoveTarget(null);
      await refetchUsers();
    } catch {
      toast.error("Failed to remove user");
    } finally {
      setIsRemoving(false);
    }
  };

  const handleAssignRole = async () => {
    if (!actor || !principalId || !selectedRole) return;
    setIsAssigning(true);
    try {
      let principal: Principal;
      try {
        principal = PrincipalClass.fromText(principalId);
      } catch {
        toast.error("Invalid Principal ID format");
        setIsAssigning(false);
        return;
      }
      const roleMap: Record<string, UserRole> = {
        admin: UserRole.admin,
        user: UserRole.user,
        guest: UserRole.guest,
      };
      await actor.assignCallerUserRole(principal, roleMap[selectedRole]);
      toast.success(`Role "${selectedRole}" assigned successfully`);
      setPrincipalId("");
      setSelectedRole("");
      await refetchUsers();
    } catch {
      toast.error("Failed to assign role. Check permissions.");
    } finally {
      setIsAssigning(false);
    }
  };

  if (!identity) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card
          className="max-w-md w-full border-border bg-card"
          data-ocid="admin.error_state"
        >
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="font-display text-2xl text-foreground">
              Sign In Required
            </CardTitle>
            <CardDescription>
              You must be signed in to access the admin panel.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  if (checkingAdmin || isFetching) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div
          className="flex flex-col items-center gap-4"
          data-ocid="admin.loading_state"
        >
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground font-body">Verifying access...</p>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-10">
        <Card
          className="max-w-md w-full border-destructive/40 bg-card"
          data-ocid="admin.error_state"
        >
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <Shield className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="font-display text-2xl text-foreground">
              Access Denied
            </CardTitle>
            <CardDescription>
              You don&apos;t have permission to view this page. Admin privileges
              are required.
            </CardDescription>
          </CardHeader>
        </Card>
        {actor && (
          <ClaimAdminSection actor={actor} onSuccess={() => refetchAdmin()} />
        )}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="container mx-auto max-w-3xl space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Admin Panel
            </h1>
            <p className="text-muted-foreground font-body text-sm mt-0.5">
              Dragon Hub Control Center
            </p>
          </div>
        </div>

        {/* ── ALL USERS ── */}
        <Card className="border-border bg-card shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <UserCog className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display text-lg text-foreground">
                  All Users
                </CardTitle>
                <CardDescription className="font-body text-xs">
                  Manage roles and access for every registered member
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-5">
            {usersLoading ? (
              <div className="space-y-3" data-ocid="admin.users.loading_state">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : !users || users.length === 0 ? (
              <div
                data-ocid="admin.users.empty_state"
                className="flex flex-col items-center gap-3 py-12 text-muted-foreground"
              >
                <Users className="h-10 w-10 opacity-30" />
                <p className="font-body text-sm">No users registered yet.</p>
              </div>
            ) : (
              <div className="space-y-2" data-ocid="admin.users.list">
                {(users as UserWithRole[]).map((user, i) => (
                  <UserRow
                    key={user.principal.toString()}
                    user={user}
                    index={i + 1}
                    onRoleChange={handleRoleChange}
                    onRemove={setRemoveTarget}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── ASSIGN BY PRINCIPAL (fallback) ── */}
        <Card className="border-border bg-card shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display text-lg text-foreground">
                  Assign by Principal ID
                </CardTitle>
                <CardDescription className="font-body text-xs">
                  Grant or change a role for any user by pasting their Principal
                  ID
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <Separator className="mb-6" />
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label
                htmlFor="principal-input"
                className="font-body text-sm font-medium text-foreground"
              >
                Principal ID
              </Label>
              <Input
                id="principal-input"
                data-ocid="admin.input"
                placeholder="e.g. rdmx6-jaaaa-aaaaa-aaadq-cai"
                value={principalId}
                onChange={(e) => setPrincipalId(e.target.value)}
                className="bg-background border-border font-mono text-sm focus-visible:ring-primary"
              />
              <p className="text-xs text-muted-foreground font-body">
                The unique identifier of the user you want to modify.
              </p>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="role-select"
                className="font-body text-sm font-medium text-foreground"
              >
                Assign Role
              </Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger
                  id="role-select"
                  data-ocid="admin.select"
                  className="bg-background border-border focus:ring-primary"
                >
                  <SelectValue placeholder="Select a role..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="admin">
                    <span className="flex items-center gap-2">
                      <Shield className="h-3.5 w-3.5 text-primary" /> Admin
                    </span>
                  </SelectItem>
                  <SelectItem value="user">
                    <span className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />{" "}
                      User
                    </span>
                  </SelectItem>
                  <SelectItem value="guest">
                    <span className="flex items-center gap-2">
                      <span className="h-3.5 w-3.5 rounded-full border border-muted-foreground/50 inline-block" />
                      Guest
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              data-ocid="admin.submit_button"
              onClick={handleAssignRole}
              disabled={!principalId || !selectedRole || isAssigning}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-body font-semibold"
            >
              {isAssigning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Assign Role
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Designated admins note */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="font-display text-base text-foreground flex items-center gap-2">
              <span className="text-primary">★</span> Designated Admins
            </CardTitle>
          </CardHeader>
          <CardContent className="font-body text-sm text-muted-foreground space-y-1">
            <p>
              The following users have been designated as Dragon Hub
              administrators:
            </p>
            <ul className="mt-2 space-y-1 list-disc list-inside text-foreground">
              <li>
                <span className="text-primary font-medium">Username Unity</span>
              </li>
              <li>
                <span className="text-primary font-medium">
                  Username Syndelious
                </span>
              </li>
            </ul>
            <p className="mt-3 text-xs">
              Enter their Principal IDs above and assign the Admin role to grant
              full access.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── REMOVE CONFIRMATION DIALOG ── */}
      <Dialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <DialogContent
          data-ocid="admin.remove_user.dialog"
          className="bg-card border-border"
        >
          <DialogHeader>
            <DialogTitle className="font-display text-foreground flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Remove User
            </DialogTitle>
            <DialogDescription className="font-body">
              Are you sure you want to remove this user? This action cannot be
              undone.
              {removeTarget && (
                <span className="block mt-2 font-mono text-xs text-muted-foreground break-all">
                  {removeTarget.toString()}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              data-ocid="admin.remove_user.cancel_button"
              variant="outline"
              onClick={() => setRemoveTarget(null)}
              disabled={isRemoving}
              className="font-body border-border"
            >
              Cancel
            </Button>
            <Button
              data-ocid="admin.remove_user.confirm_button"
              variant="destructive"
              onClick={handleRemoveConfirm}
              disabled={isRemoving}
              className="font-body"
            >
              {isRemoving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
