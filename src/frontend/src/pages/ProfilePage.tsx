import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Check, Copy, Loader2, Save, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useCallerProfile, useSaveProfile } from "../hooks/useQueries";

export function ProfilePage() {
  const { identity, login } = useInternetIdentity();
  const { data: profile, isLoading } = useCallerProfile();
  const saveProfile = useSaveProfile();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [copied, setCopied] = useState(false);
  const [picFile, setPicFile] = useState<File | null>(null);
  const [picPreview, setPicPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setBio(profile.bio);
    }
  }, [profile]);

  // Cleanup object URL on unmount or when preview changes
  useEffect(() => {
    return () => {
      if (picPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(picPreview);
      }
    };
  }, [picPreview]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    // Revoke previous preview
    if (picPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(picPreview);
    }
    setPicFile(file);
    setPicPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    try {
      let profilePicBlob: ExternalBlob | undefined = profile?.profilePicBlob;
      if (picFile) {
        const bytes = new Uint8Array(await picFile.arrayBuffer());
        profilePicBlob = ExternalBlob.fromBytes(bytes);
      }
      await saveProfile.mutateAsync({ displayName, bio, profilePicBlob });
      toast.success("Profile saved!");
      setPicFile(null);
    } catch {
      toast.error("Failed to save profile");
    }
  };

  const principal = identity?.getPrincipal().toString();

  const copyPrincipal = async () => {
    if (!principal) return;
    try {
      await navigator.clipboard.writeText(principal);
      setCopied(true);
      toast.success("Principal ID copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the text in the input
      const el = document.getElementById("principal-input") as HTMLInputElement;
      if (el) {
        el.select();
        el.setSelectionRange(0, 99999);
        document.execCommand("copy");
        setCopied(true);
        toast.success("Principal ID copied!");
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const avatarSrc = picPreview ?? profile?.profilePicBlob?.getDirectURL();

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
          {/* Clickable avatar with camera overlay */}
          <button
            type="button"
            className="relative group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
            onClick={handleAvatarClick}
            title="Change profile picture"
            data-ocid="profile.avatar.upload_button"
          >
            <Avatar className="h-16 w-16 ring-2 ring-primary/30 group-hover:ring-primary/70 transition-all">
              {avatarSrc && (
                <AvatarImage src={avatarSrc} alt="Profile picture" />
              )}
              <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">
                {principal?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {/* Camera icon overlay */}
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-5 w-5 text-white" />
            </span>
          </button>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleFileChange}
            data-ocid="profile.pfp.dropzone"
          />

          <div className="min-w-0 flex-1">
            <p className="font-semibold text-lg">
              {profile?.displayName || "Dragon"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Click avatar to change picture
            </p>
          </div>
        </div>

        {picFile && (
          <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
            <Camera className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>
              New photo selected:{" "}
              <span className="text-foreground font-medium">
                {picFile.name}
              </span>{" "}
              — save to apply
            </span>
          </div>
        )}

        {/* Principal ID section */}
        <div className="mb-6">
          <Label className="mb-1.5 block">Your Principal ID</Label>
          <div className="flex gap-2">
            <Input
              id="principal-input"
              readOnly
              value={principal ?? ""}
              className="font-mono text-xs"
              onFocus={(e) => e.target.select()}
              data-ocid="profile.principal.input"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={copyPrincipal}
              title="Copy Principal ID"
              data-ocid="profile.copy_principal.button"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Share this with an admin to receive elevated permissions.
          </p>
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
