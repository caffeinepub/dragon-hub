import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Principal } from "@icp-sdk/core/principal";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Info, Loader2, Shield, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { UserRole } from "../backend";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export function AdminPage() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const [principalId, setPrincipalId] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);

  const { data: isAdmin, isLoading: checkingAdmin } = useQuery({
    queryKey: ["isAdmin", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching && !!identity,
  });

  const handleAssignRole = async () => {
    if (!actor || !principalId || !selectedRole) return;
    setIsAssigning(true);
    try {
      let principal: Principal;
      try {
        principal = Principal.fromText(principalId);
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
    } catch (_err) {
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
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
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
              You don't have permission to view this page. Admin privileges are
              required.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="container mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-10 flex items-center gap-4">
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

        {/* Info Banner */}
        <div
          className="mb-8 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4"
          data-ocid="admin.panel"
        >
          <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground font-body leading-relaxed">
            <span className="font-semibold text-foreground">
              How to grant admin access:
            </span>{" "}
            Enter a user's Principal ID and select the{" "}
            <span className="text-primary font-medium">Admin</span> role, then
            click Assign Role. Use{" "}
            <span className="text-primary font-medium">User</span> or{" "}
            <span className="text-primary font-medium">Guest</span> to downgrade
            permissions.
          </div>
        </div>

        {/* User Management Card */}
        <Card
          className="border-border bg-card shadow-lg"
          data-ocid="admin.card"
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display text-lg text-foreground">
                  User Management
                </CardTitle>
                <CardDescription className="font-body text-xs">
                  Assign roles to Dragon Hub members
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <Separator className="mb-6" />

          <CardContent className="space-y-6">
            {/* Principal ID input */}
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

            {/* Role select */}
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
                  <SelectItem value="admin" data-ocid="admin.role.item.1">
                    <span className="flex items-center gap-2">
                      <Shield className="h-3.5 w-3.5 text-primary" />
                      Admin
                    </span>
                  </SelectItem>
                  <SelectItem value="user" data-ocid="admin.role.item.2">
                    <span className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      User
                    </span>
                  </SelectItem>
                  <SelectItem value="guest" data-ocid="admin.role.item.3">
                    <span className="flex items-center gap-2">
                      <span className="h-3.5 w-3.5 rounded-full border border-muted-foreground/50 inline-block" />
                      Guest
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Submit */}
            <Button
              data-ocid="admin.submit_button"
              onClick={handleAssignRole}
              disabled={!principalId || !selectedRole || isAssigning}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 fire-glow font-body font-semibold"
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

        {/* Special note for Unity and Syndelious */}
        <Card
          className="mt-6 border-primary/20 bg-primary/5"
          data-ocid="admin.secondary_card"
        >
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
    </main>
  );
}
