import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@tanstack/react-router";
import {
  Ban,
  Hash,
  Loader2,
  Lock,
  LockOpen,
  Plus,
  Save,
  Shield,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAllGroups,
  useBanUserFromGroup,
  useCreateGroup,
  useCreateGroupChannel,
  useGroupBans,
  useGroupChannels,
  useGroupMembers,
  useIsCreatorOrAdmin,
  useSetChannelPermissions,
  useUnbanUserFromGroup,
  useUpdateGroup,
} from "../hooks/useQueries";

function shortPrincipal(p: string) {
  if (!p) return "";
  return `${p.slice(0, 6)}...${p.slice(-4)}`;
}

// ─── Channel Permissions Editor ────────────────────────────────────────────

function ChannelPermissionsEditor({
  channel,
}: {
  channel: any;
}) {
  const setPerms = useSetChannelPermissions();
  const [restricted, setRestricted] = useState(
    (channel as any).restricted ?? false,
  );
  const [allowedInput, setAllowedInput] = useState("");
  const [allowed, setAllowed] = useState<string[]>(
    ((channel as any).allowedMembers ?? []).map((p: any) => p.toString()),
  );

  const addAllowed = () => {
    const trimmed = allowedInput.trim();
    if (trimmed && !allowed.includes(trimmed)) {
      setAllowed((prev) => [...prev, trimmed]);
    }
    setAllowedInput("");
  };

  const removeAllowed = (p: string) =>
    setAllowed((prev) => prev.filter((x) => x !== p));

  const handleSave = async () => {
    try {
      await setPerms.mutateAsync({
        channelId: channel.id,
        restricted,
        allowedMembers: restricted ? allowed : [],
      });
      toast.success("Channel permissions saved");
    } catch {
      toast.error("Failed to save permissions");
    }
  };

  return (
    <div className="space-y-3 p-3 bg-muted/20 rounded-lg border border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hash className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">{channel.name}</span>
          {channel.description && (
            <span className="text-xs text-muted-foreground">
              — {channel.description}
            </span>
          )}
        </div>
        {restricted ? (
          <Badge variant="secondary" className="text-xs">
            <Lock className="h-3 w-3 mr-1" /> Restricted
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs">
            <LockOpen className="h-3 w-3 mr-1" /> Open
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={restricted}
          onCheckedChange={setRestricted}
          id={`restricted-${channel.id}`}
          data-ocid="groups_manage.channel.switch"
        />
        <Label htmlFor={`restricted-${channel.id}`} className="text-sm">
          Restrict to allowed members only
        </Label>
      </div>

      {restricted && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Allowed members (Principal IDs)
          </Label>
          <div className="flex gap-2">
            <Input
              value={allowedInput}
              onChange={(e) => setAllowedInput(e.target.value)}
              placeholder="Principal ID..."
              className="flex-1 text-xs h-8"
              data-ocid="groups_manage.channel.allowed.input"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addAllowed();
                }
              }}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={addAllowed}
              className="h-8"
              data-ocid="groups_manage.channel.allowed.button"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {allowed.map((p) => (
              <Badge
                key={p}
                variant="secondary"
                className="flex items-center gap-1 text-xs"
              >
                {shortPrincipal(p)}
                <button
                  type="button"
                  onClick={() => removeAllowed(p)}
                  className="ml-0.5 hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Button
        size="sm"
        onClick={handleSave}
        disabled={setPerms.isPending}
        className="bg-accent text-accent-foreground text-xs"
        data-ocid="groups_manage.channel.save_button"
      >
        {setPerms.isPending ? (
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        ) : (
          <Save className="h-3 w-3 mr-1" />
        )}
        Save Permissions
      </Button>
    </div>
  );
}

// ─── Group Editor ──────────────────────────────────────────────────────────

function GroupEditor({ group }: { group: any }) {
  const groupId = group.id as bigint;

  const updateGroup = useUpdateGroup();
  const createChannel = useCreateGroupChannel();
  const banUser = useBanUserFromGroup();
  const unbanUser = useUnbanUserFromGroup();

  const { data: channels, isLoading: channelsLoading } =
    useGroupChannels(groupId);
  const { data: members, isLoading: membersLoading } = useGroupMembers(groupId);
  const { data: bans, isLoading: bansLoading } = useGroupBans(groupId);

  // Edit fields
  const [editName, setEditName] = useState(group.name ?? "");
  const [editDesc, setEditDesc] = useState(group.description ?? "");
  const [editCategory, setEditCategory] = useState(group.category ?? "");
  const [editNsfw, setEditNsfw] = useState(group.isNsfw ?? false);
  const [editIconFile, setEditIconFile] = useState<File | null>(null);
  const [editBannerFile, setEditBannerFile] = useState<File | null>(null);

  // New channel
  const [newChName, setNewChName] = useState("");
  const [newChDesc, setNewChDesc] = useState("");
  const [newChOpen, setNewChOpen] = useState(false);

  // Ban controls
  const [banInput, setBanInput] = useState("");

  const handleSaveGroup = async () => {
    try {
      await updateGroup.mutateAsync({
        groupId,
        name: editName,
        description: editDesc,
        iconFile: editIconFile,
        bannerFile: editBannerFile,
        isNsfw: editNsfw,
        category: editCategory,
      });
      toast.success("Group updated!");
    } catch {
      toast.error("Failed to update group");
    }
  };

  const handleCreateChannel = async () => {
    if (!newChName.trim()) {
      toast.error("Channel name is required");
      return;
    }
    try {
      await createChannel.mutateAsync({
        groupId,
        name: newChName.trim(),
        description: newChDesc.trim(),
      });
      toast.success("Channel created!");
      setNewChName("");
      setNewChDesc("");
      setNewChOpen(false);
    } catch {
      toast.error("Failed to create channel");
    }
  };

  const handleBan = async (user: string) => {
    if (!user.trim()) return;
    try {
      await banUser.mutateAsync({ groupId, user: user.trim() });
      toast.success("User banned");
      setBanInput("");
    } catch {
      toast.error("Failed to ban user");
    }
  };

  const handleUnban = async (user: string) => {
    try {
      await unbanUser.mutateAsync({ groupId, user });
      toast.success("User unbanned");
    } catch {
      toast.error("Failed to unban user");
    }
  };

  return (
    <Card
      className="border-border bg-card shadow-md"
      data-ocid="groups_manage.group.card"
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {group.iconBlob ? (
              <img
                src={group.iconBlob.getDirectURL()}
                alt={group.name}
                className="h-10 w-10 rounded-full object-cover border border-border"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-bold text-sm">
                  {(group.name ?? "G").slice(0, 1).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <CardTitle className="font-display text-lg text-foreground">
                {group.name}
              </CardTitle>
              <div className="flex items-center gap-1.5 mt-0.5">
                {group.isNsfw && (
                  <Badge
                    variant="destructive"
                    className="text-xs font-body px-1.5 py-0"
                  >
                    NSFW 18+
                  </Badge>
                )}
                {group.category && (
                  <Badge
                    variant="secondary"
                    className="text-xs font-body px-1.5 py-0"
                  >
                    {group.category}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Link to="/groups/$id" params={{ id: groupId.toString() }}>
            <Button variant="outline" size="sm">
              View Group
            </Button>
          </Link>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">
        <Tabs defaultValue="edit">
          <TabsList className="mb-4">
            <TabsTrigger value="edit" data-ocid="groups_manage.edit.tab">
              Edit Group
            </TabsTrigger>
            <TabsTrigger
              value="channels"
              data-ocid="groups_manage.channels.tab"
            >
              Channels
            </TabsTrigger>
            <TabsTrigger value="members" data-ocid="groups_manage.members.tab">
              Members
            </TabsTrigger>
            <TabsTrigger value="banned" data-ocid="groups_manage.banned.tab">
              Banned
            </TabsTrigger>
          </TabsList>

          {/* ── Edit Tab ── */}
          <TabsContent value="edit" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`edit-name-${groupId}`}>Group Name</Label>
                <Input
                  id={`edit-name-${groupId}`}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  data-ocid="groups_manage.edit.input"
                />
              </div>
              <div>
                <Label htmlFor={`edit-cat-${groupId}`}>Category</Label>
                <Input
                  id={`edit-cat-${groupId}`}
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  placeholder="e.g. Gaming, Art..."
                  data-ocid="groups_manage.edit.category.input"
                />
              </div>
            </div>
            <div>
              <Label htmlFor={`edit-desc-${groupId}`}>Description</Label>
              <Textarea
                id={`edit-desc-${groupId}`}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={3}
                data-ocid="groups_manage.edit.textarea"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`edit-icon-${groupId}`}>
                  New Icon (optional)
                </Label>
                <Input
                  id={`edit-icon-${groupId}`}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setEditIconFile(e.target.files?.[0] ?? null)}
                  data-ocid="groups_manage.edit.icon.upload_button"
                />
              </div>
              <div>
                <Label htmlFor={`edit-banner-${groupId}`}>
                  New Banner (optional)
                </Label>
                <Input
                  id={`edit-banner-${groupId}`}
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setEditBannerFile(e.target.files?.[0] ?? null)
                  }
                  data-ocid="groups_manage.edit.banner.upload_button"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
              <Switch
                id={`edit-nsfw-${groupId}`}
                checked={editNsfw}
                onCheckedChange={setEditNsfw}
                data-ocid="groups_manage.edit.nsfw.switch"
              />
              <div>
                <Label
                  htmlFor={`edit-nsfw-${groupId}`}
                  className="font-medium cursor-pointer"
                >
                  NSFW (18+ content)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Enable for groups with adult content
                </p>
              </div>
            </div>
            <Button
              onClick={handleSaveGroup}
              disabled={updateGroup.isPending}
              className="bg-accent text-accent-foreground"
              data-ocid="groups_manage.edit.save_button"
            >
              {updateGroup.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {updateGroup.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </TabsContent>

          {/* ── Channels Tab ── */}
          <TabsContent value="channels" className="space-y-4">
            {channelsLoading ? (
              <div
                className="space-y-2"
                data-ocid="groups_manage.channels.loading_state"
              >
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            ) : !channels || channels.length === 0 ? (
              <div
                className="text-center py-8 text-muted-foreground"
                data-ocid="groups_manage.channels.empty_state"
              >
                <Hash className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No channels yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(channels as any[]).map((ch) => (
                  <ChannelPermissionsEditor
                    key={ch.id?.toString()}
                    channel={ch}
                  />
                ))}
              </div>
            )}

            {/* Create Channel */}
            <div className="border-t border-border pt-4">
              <Dialog open={newChOpen} onOpenChange={setNewChOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    data-ocid="groups_manage.create_channel.open_modal_button"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Channel
                  </Button>
                </DialogTrigger>
                <DialogContent data-ocid="groups_manage.create_channel.dialog">
                  <DialogHeader>
                    <DialogTitle>Create Channel</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Channel Name *</Label>
                      <Input
                        value={newChName}
                        onChange={(e) => setNewChName(e.target.value)}
                        placeholder="e.g. general"
                        data-ocid="groups_manage.create_channel.input"
                      />
                    </div>
                    <div>
                      <Label>Description (optional)</Label>
                      <Input
                        value={newChDesc}
                        onChange={(e) => setNewChDesc(e.target.value)}
                        placeholder="What's this channel for?"
                        data-ocid="groups_manage.create_channel.textarea"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setNewChOpen(false)}
                      data-ocid="groups_manage.create_channel.cancel_button"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateChannel}
                      disabled={createChannel.isPending}
                      className="bg-accent text-accent-foreground"
                      data-ocid="groups_manage.create_channel.submit_button"
                    >
                      {createChannel.isPending ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : null}
                      Create
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </TabsContent>

          {/* ── Members Tab ── */}
          <TabsContent value="members">
            {membersLoading ? (
              <div
                className="space-y-2"
                data-ocid="groups_manage.members.loading_state"
              >
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full rounded" />
                ))}
              </div>
            ) : !members || (members as any[]).length === 0 ? (
              <div
                className="text-center py-8 text-muted-foreground"
                data-ocid="groups_manage.members.empty_state"
              >
                <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No members yet</p>
              </div>
            ) : (
              <ScrollArea className="h-64">
                <div className="space-y-1 pr-3">
                  {(members as any[]).map((m, i) => {
                    const pid = m.toString();
                    return (
                      <div
                        key={pid}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-muted/40 transition-colors"
                        data-ocid={`groups_manage.members.item.${i + 1}`}
                      >
                        <span className="font-mono text-xs text-muted-foreground">
                          {shortPrincipal(pid)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleBan(pid)}
                          disabled={banUser.isPending}
                          data-ocid={`groups_manage.members.delete_button.${i + 1}`}
                        >
                          <Ban className="h-3 w-3 mr-1" />
                          Ban
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}

            {/* Ban by ID */}
            <div className="border-t border-border pt-3 mt-3">
              <Label className="text-xs text-muted-foreground">
                Ban by Principal ID
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={banInput}
                  onChange={(e) => setBanInput(e.target.value)}
                  placeholder="Principal ID..."
                  className="flex-1 text-xs h-8"
                  data-ocid="groups_manage.ban.input"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => handleBan(banInput)}
                  disabled={banUser.isPending || !banInput.trim()}
                  data-ocid="groups_manage.ban.delete_button"
                >
                  <Ban className="h-3 w-3 mr-1" />
                  Ban
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ── Banned Tab ── */}
          <TabsContent value="banned">
            {bansLoading ? (
              <div
                className="space-y-2"
                data-ocid="groups_manage.banned.loading_state"
              >
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-10 w-full rounded" />
                ))}
              </div>
            ) : !bans || (bans as any[]).length === 0 ? (
              <div
                className="text-center py-8 text-muted-foreground"
                data-ocid="groups_manage.banned.empty_state"
              >
                <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No banned users</p>
              </div>
            ) : (
              <ScrollArea className="h-64">
                <div className="space-y-1 pr-3">
                  {(bans as any[]).map((b, i) => {
                    const pid = b.toString();
                    return (
                      <div
                        key={pid}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-muted/40 transition-colors"
                        data-ocid={`groups_manage.banned.item.${i + 1}`}
                      >
                        <span className="font-mono text-xs text-muted-foreground">
                          {shortPrincipal(pid)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-green-500 hover:text-green-400 hover:bg-green-500/10"
                          onClick={() => handleUnban(pid)}
                          disabled={unbanUser.isPending}
                          data-ocid={`groups_manage.banned.button.${i + 1}`}
                        >
                          Unban
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// ─── Create Group Dialog ──────────────────────────────────────────────────

function CreateGroupDialog({ onCreated }: { onCreated?: () => void }) {
  const createGroup = useCreateGroup();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [isNsfw, setIsNsfw] = useState(false);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Group name is required");
      return;
    }
    try {
      await createGroup.mutateAsync({
        name: name.trim(),
        description: description.trim(),
        iconFile,
        bannerFile,
        isNsfw,
        category: category.trim(),
      });
      toast.success("Group created!");
      setOpen(false);
      setName("");
      setDescription("");
      setCategory("");
      setIsNsfw(false);
      setIconFile(null);
      setBannerFile(null);
      onCreated?.();
    } catch {
      toast.error("Failed to create group");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="bg-primary text-primary-foreground"
          data-ocid="groups_manage.create_group.open_modal_button"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-md"
        data-ocid="groups_manage.create_group.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-xl">New Group</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Group Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Group"
              data-ocid="groups_manage.create_group.input"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this group about?"
              rows={3}
              data-ocid="groups_manage.create_group.textarea"
            />
          </div>
          <div>
            <Label>Category</Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Gaming, Art..."
              data-ocid="groups_manage.create_group.category.input"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Icon (optional)</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setIconFile(e.target.files?.[0] ?? null)}
                data-ocid="groups_manage.create_group.icon.upload_button"
              />
            </div>
            <div>
              <Label>Banner (optional)</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setBannerFile(e.target.files?.[0] ?? null)}
                data-ocid="groups_manage.create_group.banner.upload_button"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
            <Switch
              id="create-nsfw"
              checked={isNsfw}
              onCheckedChange={setIsNsfw}
              data-ocid="groups_manage.create_group.nsfw.switch"
            />
            <Label htmlFor="create-nsfw" className="cursor-pointer">
              NSFW (18+ content)
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            data-ocid="groups_manage.create_group.cancel_button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={createGroup.isPending}
            className="bg-accent text-accent-foreground"
            data-ocid="groups_manage.create_group.submit_button"
          >
            {createGroup.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            {createGroup.isPending ? "Creating..." : "Create Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────

export function GroupsManagePage() {
  const { identity } = useInternetIdentity();
  const { data: isCreatorOrAdmin, isLoading: roleLoading } =
    useIsCreatorOrAdmin();
  const { data: allGroups, isLoading: groupsLoading } = useAllGroups();

  const callerPrincipal = identity?.getPrincipal().toString();

  const myGroups =
    (allGroups as any[] | undefined)?.filter(
      (g) => g.owner?.toString() === callerPrincipal,
    ) ?? [];

  if (!identity) {
    return (
      <main className="container mx-auto px-4 py-16 text-center">
        <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
        <h1 className="font-display text-2xl font-bold mb-2">
          Sign In Required
        </h1>
        <p className="text-muted-foreground">Sign in to manage your groups.</p>
      </main>
    );
  }

  if (roleLoading) {
    return (
      <main className="container mx-auto px-4 py-16">
        <div className="space-y-4" data-ocid="groups_manage.page.loading_state">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </main>
    );
  }

  if (!isCreatorOrAdmin) {
    return (
      <main className="container mx-auto px-4 py-16 text-center">
        <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
        <h1 className="font-display text-2xl font-bold mb-2">
          Creator or Admin Required
        </h1>
        <p className="text-muted-foreground">
          Only Admins and Creators can manage groups.
        </p>
      </main>
    );
  }

  return (
    <main
      className="container mx-auto px-4 py-8"
      data-ocid="groups_manage.page"
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Groups Dashboard
            </h1>
            <p className="text-muted-foreground mt-1 font-body text-sm">
              Manage your groups, channels, and members
            </p>
          </div>
          <CreateGroupDialog />
        </div>

        {/* Groups List */}
        {groupsLoading ? (
          <div
            className="space-y-4"
            data-ocid="groups_manage.groups.loading_state"
          >
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-48 w-full rounded-xl" />
            ))}
          </div>
        ) : myGroups.length === 0 ? (
          <div
            className="text-center py-20"
            data-ocid="groups_manage.groups.empty_state"
          >
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-muted/50 mb-4">
              <Hash className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h2 className="font-display text-xl font-semibold mb-2">
              No groups yet
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              Create your first group to start building your community
            </p>
            <CreateGroupDialog />
          </div>
        ) : (
          <div className="space-y-6">
            {myGroups.map((group: any, i: number) => (
              <motion.div
                key={group.id?.toString() ?? i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <GroupEditor group={group} />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </main>
  );
}
