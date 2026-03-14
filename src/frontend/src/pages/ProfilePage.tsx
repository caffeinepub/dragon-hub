import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useCallerProfile, useSaveProfile } from "../hooks/useQueries";

export function ProfilePage() {
  const { identity, login } = useInternetIdentity();
  const { data: profile, isLoading } = useCallerProfile();
  const saveProfile = useSaveProfile();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setBio(profile.bio);
    }
  }, [profile]);

  const handleSave = async () => {
    try {
      await saveProfile.mutateAsync({ displayName, bio });
      toast.success("Profile saved!");
    } catch {
      toast.error("Failed to save profile");
    }
  };

  const principal = identity?.getPrincipal().toString();

  if (!identity) {
    return (
      <main className="container mx-auto px-4 py-20 max-w-md text-center">
        <div className="bg-card border border-border rounded-xl p-8">
          <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground/40" />
          <h2 className="font-display text-2xl font-bold mb-2">
            Sign In Required
          </h2>
          <p className="text-muted-foreground mb-6">
            Sign in to view and edit your profile.
          </p>
          <Button
            onClick={login}
            className="bg-primary text-primary-foreground fire-glow"
            data-ocid="profile.signin.button"
          >
            Sign In
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-10 max-w-xl">
      <h1 className="font-display text-4xl font-bold mb-8">Your Profile</h1>

      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">
              {principal?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-lg">
              {profile?.displayName || "Dragon"}
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              {principal?.slice(0, 20)}...
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3" data-ocid="profile.loading_state">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="display-name">Display Name</Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
                data-ocid="profile.name.input"
              />
            </div>
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell the community about yourself..."
                rows={4}
                data-ocid="profile.bio.textarea"
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={saveProfile.isPending}
              className="w-full bg-primary text-primary-foreground fire-glow"
              data-ocid="profile.save.button"
            >
              {saveProfile.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {saveProfile.isPending ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
