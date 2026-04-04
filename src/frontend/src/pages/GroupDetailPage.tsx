import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useParams } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  File as FileIcon,
  Hash,
  Link as LinkIcon,
  Loader2,
  Lock,
  Paperclip,
  Pencil,
  Plus,
  Send,
  ShieldBan,
  SmilePlus,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useBanUserFromGroup,
  useCreateGroupChannel,
  useDeleteGroupMessage,
  useGroup,
  useGroupBans,
  useGroupChannels,
  useGroupMembers,
  useGroupMessages,
  useIsUserBannedFromGroup,
  useJoinGroup,
  useLeaveGroup,
  usePostGroupMessage,
  usePublicUserProfile,
  useSetChannelPermissions,
  useUnbanUserFromGroup,
  useUpdateGroup,
} from "../hooks/useQueries";

const COMMON_EMOJIS = [
  "😀",
  "😂",
  "😍",
  "🥰",
  "😎",
  "🤔",
  "😅",
  "🤣",
  "😊",
  "😇",
  "🥳",
  "😏",
  "😒",
  "😞",
  "😔",
  "😢",
  "😭",
  "😤",
  "😠",
  "🤬",
  "🤯",
  "😱",
  "😨",
  "😰",
  "😴",
  "🤤",
  "😋",
  "😛",
  "😝",
  "🤪",
  "🤑",
  "🤗",
  "👍",
  "👎",
  "👏",
  "🙌",
  "🤝",
  "🫶",
  "❤️",
  "🔥",
  "⭐",
  "✨",
  "💯",
  "🎉",
  "🎊",
  "🎁",
  "🏆",
  "🥇",
  "🐉",
  "🦄",
  "🐺",
  "🦊",
  "🐸",
  "🐼",
  "🦁",
  "🐯",
  "🍕",
  "🍔",
  "🌮",
  "🍜",
  "🍣",
  "🍰",
  "🎂",
  "☕",
  "🎮",
  "🎵",
  "🎶",
  "🎸",
  "🎨",
  "✏️",
  "📚",
  "💻",
  "🚀",
  "⚡",
  "💎",
  "🌈",
  "🌊",
  "🌙",
  "☀️",
  "🌺",
];

function shortPrincipal(p: string) {
  return `${p.slice(0, 5)}...${p.slice(-3)}`;
}

function AuthorAvatar({ principal }: { principal: string }) {
  const { data: profile } = usePublicUserProfile(principal);
  const picUrl =
    profile && (profile as any).profilePicBlob
      ? (profile as any).profilePicBlob.getDirectURL()
      : null;
  return (
    <Avatar className="h-8 w-8 flex-shrink-0">
      {picUrl && <AvatarImage src={picUrl} alt={shortPrincipal(principal)} />}
      <AvatarFallback className="bg-primary/20 text-primary text-xs">
        {principal.slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

function MessageBubble({
  msg,
  isMine,
  isOwner,
  onDelete,
}: {
  msg: any;
  isMine: boolean;
  isOwner: boolean;
  onDelete: (id: bigint) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const time = new Date(Number(msg.timestamp) / 1_000_000).toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  );

  const mediaType =
    msg.mediaType && Array.isArray(msg.mediaType) && msg.mediaType.length > 0
      ? msg.mediaType[0]
      : null;
  const mediaUrl =
    msg.mediaUrl && Array.isArray(msg.mediaUrl) && msg.mediaUrl.length > 0
      ? msg.mediaUrl[0]
      : null;
  const mediaBlob =
    msg.mediaBlob && Array.isArray(msg.mediaBlob) && msg.mediaBlob.length > 0
      ? msg.mediaBlob[0]
      : null;

  const mediaSrc = mediaBlob ? mediaBlob.getDirectURL() : mediaUrl;

  return (
    <div
      className={`flex items-start gap-3 mb-4 group/msg ${
        isMine ? "flex-row-reverse" : ""
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <AuthorAvatar principal={msg.author.toString()} />
      <div
        className={`max-w-[70%] ${
          isMine ? "items-end" : "items-start"
        } flex flex-col`}
      >
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-xs font-medium text-muted-foreground">
            {shortPrincipal(msg.author.toString())}
          </span>
          <span className="text-xs text-muted-foreground/50">{time}</span>
          {isOwner && hovered && (
            <button
              type="button"
              className="ml-1 text-destructive/60 hover:text-destructive transition-colors"
              onClick={() => onDelete(msg.id)}
              title="Delete message"
              data-ocid="group.message.delete_button"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
        <div
          className={`rounded-2xl px-4 py-2 text-sm ${
            isMine
              ? "bg-accent text-accent-foreground rounded-tr-sm"
              : "bg-card border border-border rounded-tl-sm"
          }`}
        >
          {msg.text && <p>{msg.text}</p>}
          {mediaType === "image" && mediaSrc && (
            <img
              src={mediaSrc}
              alt="shared media"
              className="mt-2 max-w-xs rounded-lg max-h-60 object-cover"
            />
          )}
          {mediaType === "gif" && mediaSrc && (
            <img
              src={mediaSrc}
              alt="gif"
              className="mt-2 max-w-xs rounded-lg max-h-60"
            />
          )}
          {mediaType === "video" && mediaSrc && (
            <video
              controls
              src={mediaSrc}
              className="mt-2 max-w-xs rounded-lg max-h-60"
            >
              <track kind="captions" />
            </video>
          )}
          {mediaType === "audio" && mediaSrc && (
            <audio controls src={mediaSrc} className="mt-2 max-w-[240px]">
              <track kind="captions" />
            </audio>
          )}
          {mediaType === "file" && mediaSrc && (
            <a
              href={mediaSrc}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center gap-2 text-xs underline text-accent"
            >
              <FileIcon className="h-4 w-4" />
              Download File
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function ChannelPermissionsDialog({
  channel,
}: {
  channel: any;
}) {
  const [open, setOpen] = useState(false);
  const [restricted, setRestricted] = useState(false);
  const [allowed, setAllowed] = useState<string[]>([]);
  const [newPrincipal, setNewPrincipal] = useState("");
  const setPerms = useSetChannelPermissions();

  const handleOpen = () => {
    setRestricted(channel.restricted ?? false);
    const existing = (channel.allowedMembers ?? []).map((p: any) =>
      p.toString(),
    );
    setAllowed(existing);
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      await setPerms.mutateAsync({
        channelId: channel.id,
        restricted,
        allowedMembers: allowed,
      });
      toast.success("Channel permissions updated");
      setOpen(false);
    } catch {
      toast.error("Failed to update permissions");
    }
  };

  const addPrincipal = () => {
    const trimmed = newPrincipal.trim();
    if (!trimmed || allowed.includes(trimmed)) return;
    setAllowed((prev) => [...prev, trimmed]);
    setNewPrincipal("");
  };

  return (
    <>
      <button
        type="button"
        className="ml-auto opacity-60 hover:opacity-100 transition-opacity"
        onClick={handleOpen}
        title="Channel permissions"
        data-ocid="group.channel.permissions_button"
      >
        <Lock
          className={`h-3 w-3 ${channel.restricted ? "text-yellow-400" : "text-muted-foreground"}`}
        />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-sm"
          data-ocid="group.channel.permissions.dialog"
        >
          <DialogHeader>
            <DialogTitle>Channel Permissions — #{channel.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
              <Switch
                id="ch-restricted"
                checked={restricted}
                onCheckedChange={setRestricted}
                data-ocid="group.channel.restricted.switch"
              />
              <div>
                <Label
                  htmlFor="ch-restricted"
                  className="font-medium cursor-pointer"
                >
                  Restricted
                </Label>
                <p className="text-xs text-muted-foreground">
                  Only allowed members can see this channel
                </p>
              </div>
            </div>
            {restricted && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Allowed Members</Label>
                <div className="flex gap-2">
                  <Input
                    value={newPrincipal}
                    onChange={(e) => setNewPrincipal(e.target.value)}
                    placeholder="Principal ID"
                    className="text-xs h-8"
                    data-ocid="group.channel.allowedmember.input"
                  />
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-accent text-accent-foreground"
                    onClick={addPrincipal}
                    data-ocid="group.channel.allowedmember.add_button"
                  >
                    Add
                  </Button>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {allowed.length === 0 ? (
                    <p className="text-xs text-muted-foreground/60">
                      No members added yet
                    </p>
                  ) : (
                    allowed.map((p, i) => (
                      <div
                        key={p}
                        className="flex items-center justify-between bg-muted/40 px-2 py-1 rounded text-xs"
                      >
                        <span className="font-mono truncate" title={p}>
                          {shortPrincipal(p)}
                        </span>
                        <button
                          type="button"
                          className="text-destructive/70 hover:text-destructive ml-2"
                          onClick={() =>
                            setAllowed((prev) => prev.filter((_, j) => j !== i))
                          }
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              data-ocid="group.channel.permissions.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={setPerms.isPending}
              className="bg-accent text-accent-foreground"
              data-ocid="group.channel.permissions.save_button"
            >
              {setPerms.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function GroupDetailPage() {
  const { id } = useParams({ from: "/groups/$id" });
  const groupId = BigInt(id);
  const { identity } = useInternetIdentity();
  const { data: group, isLoading: groupLoading } = useGroup(groupId);
  const { data: members } = useGroupMembers(groupId);
  const { data: channels } = useGroupChannels(groupId);
  const joinGroup = useJoinGroup();
  const leaveGroup = useLeaveGroup();
  const createChannel = useCreateGroupChannel();
  const postMessage = usePostGroupMessage();
  const updateGroup = useUpdateGroup();
  const banUser = useBanUserFromGroup();
  const unbanUser = useUnbanUserFromGroup();
  const deleteMessage = useDeleteGroupMessage();

  const callerPrincipal = identity?.getPrincipal().toString();
  const isOwner = !!(group && callerPrincipal === group.owner.toString());

  const { data: bans } = useGroupBans(groupId, isOwner);
  const { data: isBannedFromGroup } = useIsUserBannedFromGroup(
    groupId,
    identity ? { toString: () => callerPrincipal! } : null,
  );

  const [selectedChannelId, setSelectedChannelId] = useState<bigint | null>(
    null,
  );
  const { data: messages } = useGroupMessages(selectedChannelId ?? BigInt(0));

  const [msgText, setMsgText] = useState("");
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState("channels");

  // Media state
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const [gifUrl, setGifUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachPending, setAttachPending] = useState(false);

  // Channel create dialog
  const [channelDialogOpen, setChannelDialogOpen] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [channelDesc, setChannelDesc] = useState("");

  // Edit group dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editNsfw, setEditNsfw] = useState(false);
  const [editCategory, setEditCategory] = useState("");
  const [editIconFile, setEditIconFile] = useState<File | null>(null);
  const [editBannerFile, setEditBannerFile] = useState<File | null>(null);

  // Ban management
  const [banInput, setBanInput] = useState("");

  // Delete message confirmation
  const [deleteMsgId, setDeleteMsgId] = useState<bigint | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isMember = members?.some((m: any) => m.toString() === callerPrincipal);
  // membersLoaded: true once we have a definitive answer (members array loaded, group loaded)
  const membersLoaded = members !== undefined && group !== undefined;
  // canSendMessages: show input optimistically while loading; hide only if we know for sure they're not a member
  const canSendMessages =
    !isBannedFromGroup &&
    (!identity
      ? false
      : !membersLoaded
        ? true
        : // still loading, show input optimistically
          !!(isMember || isOwner));

  const bannedSet = useMemo(
    () => new Set((bans ?? []).map((p: any) => p.toString())),
    [bans],
  );

  // Active (non-banned) members for Members tab
  const activeMembers = useMemo(
    () => (members ?? []).filter((m: any) => !bannedSet.has(m.toString())),
    [members, bannedSet],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: selectedChannelId checked inside
  useEffect(() => {
    if (channels && channels.length > 0 && !selectedChannelId) {
      setSelectedChannelId(channels[0].id);
    }
  }, [channels]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scrollRef is stable
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const openEditDialog = () => {
    if (!group) return;
    setEditName(group.name);
    setEditDesc(group.description ?? "");
    setEditNsfw((group as any).isNsfw ?? false);
    setEditCategory((group as any).category ?? "");
    setEditIconFile(null);
    setEditBannerFile(null);
    setEditOpen(true);
  };

  const handleSend = async () => {
    if (!msgText.trim() || !selectedChannelId) return;
    try {
      await postMessage.mutateAsync({
        channelId: selectedChannelId,
        text: msgText.trim(),
      });
      setMsgText("");
    } catch {
      toast.error("Failed to send message");
    }
  };

  const handleEmojiInsert = (emoji: string) => {
    setMsgText((prev) => prev + emoji);
    setEmojiOpen(false);
  };

  const handleSendGif = async () => {
    if (!gifUrl.trim() || !selectedChannelId) return;
    try {
      await postMessage.mutateAsync({
        channelId: selectedChannelId,
        text: "",
        mediaUrl: gifUrl.trim(),
        mediaType: "gif",
      });
      setGifUrl("");
      setGifOpen(false);
    } catch {
      toast.error("Failed to send GIF");
    }
  };

  const handleAttachFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChannelId) return;
    setAttachPending(true);
    try {
      let mediaType = "file";
      if (file.type.startsWith("image/")) mediaType = "image";
      else if (file.type.startsWith("video/")) mediaType = "video";
      else if (file.type.startsWith("audio/")) mediaType = "audio";
      await postMessage.mutateAsync({
        channelId: selectedChannelId,
        text: "",
        mediaFile: file,
        mediaType,
      });
      toast.success("File sent!");
    } catch {
      toast.error("Failed to send file");
    } finally {
      setAttachPending(false);
      e.target.value = "";
    }
  };

  const handleJoin = async () => {
    try {
      await joinGroup.mutateAsync(groupId);
      toast.success("Joined group!");
    } catch {
      toast.error("Failed to join group");
    }
  };

  const handleLeave = async () => {
    try {
      await leaveGroup.mutateAsync(groupId);
      toast.success("Left group");
    } catch {
      toast.error("Failed to leave group");
    }
  };

  const handleCreateChannel = async () => {
    if (!channelName.trim()) {
      toast.error("Channel name required");
      return;
    }
    try {
      await createChannel.mutateAsync({
        groupId,
        name: channelName,
        description: channelDesc,
      });
      toast.success("Channel created!");
      setChannelDialogOpen(false);
      setChannelName("");
      setChannelDesc("");
    } catch {
      toast.error("Failed to create channel");
    }
  };

  const handleUpdateGroup = async () => {
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
      setEditOpen(false);
    } catch {
      toast.error("Failed to update group");
    }
  };

  const handleBan = async (principal?: string) => {
    const target = principal ?? banInput.trim();
    if (!target) return;
    try {
      await banUser.mutateAsync({ groupId, user: target });
      toast.success("User banned");
      if (!principal) setBanInput("");
    } catch {
      toast.error("Failed to ban user — check the principal ID");
    }
  };

  const handleUnban = async (principal: string) => {
    try {
      await unbanUser.mutateAsync({ groupId, user: principal });
      toast.success("User unbanned");
    } catch {
      toast.error("Failed to unban user");
    }
  };

  const handleDeleteMessage = async (msgId: bigint) => {
    setDeleteMsgId(msgId);
  };

  const confirmDeleteMessage = async () => {
    if (!deleteMsgId) return;
    try {
      await deleteMessage.mutateAsync({ messageId: deleteMsgId });
      toast.success("Message deleted");
    } catch {
      toast.error("Failed to delete message");
    } finally {
      setDeleteMsgId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const bannerUrl = group?.bannerBlob
    ? (group.bannerBlob as any).getDirectURL()
    : null;
  const iconUrl = group?.iconBlob ? group.iconBlob.getDirectURL() : null;

  if (groupLoading) {
    return (
      <main
        className="flex h-[calc(100vh-4rem)]"
        data-ocid="group.loading_state"
      >
        <div className="w-64 border-r border-border p-4 space-y-3">
          <Skeleton className="h-16 w-16 rounded-full mx-auto" />
          <Skeleton className="h-4 w-3/4 mx-auto" />
          <Skeleton className="h-3 w-full" />
        </div>
        <div className="flex-1 p-6 space-y-4">
          {["a", "b", "c"].map((k) => (
            <Skeleton key={k} className="h-12 w-3/4" />
          ))}
        </div>
      </main>
    );
  }

  if (!group) {
    return (
      <main
        className="container mx-auto px-4 py-20 text-center"
        data-ocid="group.error_state"
      >
        <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground/40" />
        <h2 className="font-display text-2xl font-bold">Group not found</h2>
      </main>
    );
  }

  const selectedChannel = channels?.find((c) => c.id === selectedChannelId);

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Collapsible Sidebar */}
      <aside
        className={`border-r border-border flex flex-col bg-card/50 transition-all duration-300 ${
          channelsOpen ? "w-64" : "w-12"
        }`}
      >
        {channelsOpen ? (
          <>
            {/* Group header with banner */}
            <div className="border-b border-border flex-shrink-0">
              {bannerUrl && (
                <div className="relative h-20 overflow-hidden">
                  <img
                    src={bannerUrl}
                    alt="Group banner"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30" />
                  {iconUrl && (
                    <div className="absolute bottom-2 left-3 h-10 w-10 rounded-full overflow-hidden border-2 border-background">
                      <img
                        src={iconUrl}
                        alt={group.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              )}
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  {!bannerUrl && (
                    <div className="h-12 w-12 rounded-full overflow-hidden flex-shrink-0">
                      {iconUrl ? (
                        <img
                          src={iconUrl}
                          alt={group.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/40 to-accent/20 flex items-center justify-center">
                          <Users className="h-5 w-5 text-accent/60" />
                        </div>
                      )}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h2 className="font-display font-bold text-sm truncate">
                        {group.name}
                      </h2>
                      {(group as any).isNsfw && (
                        <Badge className="text-[10px] px-1 py-0 bg-red-500/20 text-red-400 border-red-500/30">
                          NSFW
                        </Badge>
                      )}
                    </div>
                    {(group as any).category && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1 py-0 mt-0.5"
                      >
                        {(group as any).category}
                      </Badge>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {members?.length ?? 0} members
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0"
                    onClick={() => setChannelsOpen(false)}
                    data-ocid="group.sidebar.toggle"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
                {group.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {group.description}
                  </p>
                )}
                <div className="mt-3 flex gap-2 flex-wrap">
                  {identity && !isMember && (
                    <Button
                      size="sm"
                      className="flex-1 bg-accent text-accent-foreground"
                      onClick={handleJoin}
                      disabled={joinGroup.isPending}
                      data-ocid="group.join.button"
                    >
                      {joinGroup.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Join"
                      )}
                    </Button>
                  )}
                  {identity && isMember && !isOwner && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={handleLeave}
                      disabled={leaveGroup.isPending}
                      data-ocid="group.leave.button"
                    >
                      Leave
                    </Button>
                  )}
                  {isOwner && (
                    <div className="flex items-center gap-2 w-full">
                      <Badge className="text-xs bg-accent/20 text-accent border-accent/30">
                        Owner
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs ml-auto"
                        onClick={openEditDialog}
                        data-ocid="group.edit.open_modal_button"
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs: Channels / Members / Banned */}
            <Tabs
              value={sidebarTab}
              onValueChange={setSidebarTab}
              className="flex-1 flex flex-col min-h-0"
            >
              <TabsList
                className={`w-full rounded-none border-b border-border bg-transparent h-8 px-2 ${
                  isOwner ? "grid grid-cols-3" : "grid grid-cols-2"
                }`}
              >
                <TabsTrigger
                  value="channels"
                  className="text-xs h-7"
                  data-ocid="group.sidebar.channels_tab"
                >
                  Channels
                </TabsTrigger>
                <TabsTrigger
                  value="members"
                  className="text-xs h-7"
                  data-ocid="group.sidebar.members_tab"
                >
                  Members
                </TabsTrigger>
                {isOwner && (
                  <TabsTrigger
                    value="banned"
                    className="text-xs h-7"
                    data-ocid="group.sidebar.banned_tab"
                  >
                    Banned
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Channels tab */}
              <TabsContent
                value="channels"
                className="flex-1 overflow-y-auto mt-0 p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Channels
                  </span>
                  {isOwner && (
                    <Dialog
                      open={channelDialogOpen}
                      onOpenChange={setChannelDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          data-ocid="group.channel.open_modal_button"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent
                        className="sm:max-w-sm"
                        data-ocid="group.channel.dialog"
                      >
                        <DialogHeader>
                          <DialogTitle>Create Channel</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                          <div>
                            <Label htmlFor="ch-name">Channel Name</Label>
                            <Input
                              id="ch-name"
                              value={channelName}
                              onChange={(e) => setChannelName(e.target.value)}
                              placeholder="general"
                              data-ocid="group.channel.input"
                            />
                          </div>
                          <div>
                            <Label htmlFor="ch-desc">Description</Label>
                            <Input
                              id="ch-desc"
                              value={channelDesc}
                              onChange={(e) => setChannelDesc(e.target.value)}
                              placeholder="Optional description"
                              data-ocid="group.channel.desc.input"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setChannelDialogOpen(false)}
                            data-ocid="group.channel.cancel_button"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleCreateChannel}
                            disabled={createChannel.isPending}
                            className="bg-accent text-accent-foreground"
                            data-ocid="group.channel.submit_button"
                          >
                            {createChannel.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Create"
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
                {channels?.length === 0 ? (
                  <p
                    className="text-xs text-muted-foreground/60 px-2"
                    data-ocid="group.channels.empty_state"
                  >
                    {isOwner
                      ? "Add a channel to start chatting"
                      : "No channels yet"}
                  </p>
                ) : (
                  channels?.map((ch) => (
                    <div
                      key={ch.id.toString()}
                      className={`w-full flex items-center gap-1 rounded text-sm transition-colors ${
                        selectedChannelId === ch.id
                          ? "bg-accent/20 text-accent"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedChannelId(ch.id)}
                        className="flex-1 text-left px-2 py-1.5 flex items-center gap-2"
                        data-ocid="group.channel.tab"
                      >
                        <Hash className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{ch.name}</span>
                        {ch.restricted && (
                          <Lock className="h-3 w-3 text-yellow-400 flex-shrink-0 ml-auto" />
                        )}
                      </button>
                      {isOwner && <ChannelPermissionsDialog channel={ch} />}
                    </div>
                  ))
                )}
              </TabsContent>

              {/* Members tab — active (non-banned) members */}
              <TabsContent
                value="members"
                className="flex-1 overflow-y-auto mt-0 p-3"
              >
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Members ({activeMembers.length})
                  </p>
                  {/* Manual ban by principal (owner only) */}
                  {isOwner && (
                    <div className="mb-3 space-y-1.5">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <ShieldBan className="h-3 w-3" /> Ban by Principal ID
                      </p>
                      <div className="flex gap-1.5">
                        <Input
                          value={banInput}
                          onChange={(e) => setBanInput(e.target.value)}
                          placeholder="Principal ID"
                          className="text-xs h-7"
                          data-ocid="group.ban.input"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-xs px-2"
                          onClick={() => handleBan()}
                          disabled={banUser.isPending || !banInput.trim()}
                          data-ocid="group.ban.submit_button"
                        >
                          Ban
                        </Button>
                      </div>
                    </div>
                  )}
                  {activeMembers.length === 0 ? (
                    <p
                      className="text-xs text-muted-foreground/60"
                      data-ocid="group.members.empty_state"
                    >
                      No members yet
                    </p>
                  ) : (
                    activeMembers.map((m: any, i: number) => {
                      const p = m.toString();
                      const isMe = p === callerPrincipal;
                      return (
                        <div
                          key={p}
                          className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/40 transition-colors"
                          data-ocid={`group.member.item.${i + 1}`}
                        >
                          <MemberAvatar principal={p} />
                          <span
                            className="text-xs text-muted-foreground flex-1 truncate"
                            title={p}
                          >
                            {shortPrincipal(p)}
                            {isMe && (
                              <span className="ml-1 text-accent">(you)</span>
                            )}
                            {group && p === group.owner.toString() && (
                              <span className="ml-1 text-accent/70">
                                (owner)
                              </span>
                            )}
                          </span>
                          {isOwner && !isMe && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 text-xs px-1.5 text-destructive hover:text-destructive/80"
                              onClick={() => handleBan(p)}
                              disabled={banUser.isPending}
                              data-ocid={`group.ban.member_button.${i + 1}`}
                            >
                              Ban
                            </Button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </TabsContent>

              {/* Banned tab — only visible to owner */}
              {isOwner && (
                <TabsContent
                  value="banned"
                  className="flex-1 overflow-y-auto mt-0 p-3"
                >
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Banned ({(bans ?? []).length})
                    </p>
                    {(bans ?? []).length === 0 ? (
                      <p
                        className="text-xs text-muted-foreground/60"
                        data-ocid="group.banned.empty_state"
                      >
                        No banned members
                      </p>
                    ) : (
                      (bans ?? []).map((p: any, i: number) => {
                        const ps = p.toString();
                        return (
                          <div
                            key={ps}
                            className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/40 transition-colors"
                            data-ocid={`group.banned.item.${i + 1}`}
                          >
                            <Avatar className="h-6 w-6 flex-shrink-0">
                              <AvatarFallback className="bg-red-500/20 text-red-400 text-[10px]">
                                {ps.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span
                              className="text-xs text-muted-foreground flex-1 truncate"
                              title={ps}
                            >
                              {shortPrincipal(ps)}
                            </span>
                            <Badge className="text-[10px] px-1 py-0 bg-red-500/20 text-red-400 border-red-500/30">
                              banned
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 text-xs px-1.5 text-green-500 hover:text-green-400"
                              onClick={() => handleUnban(ps)}
                              disabled={unbanUser.isPending}
                              data-ocid={`group.unban.button.${i + 1}`}
                            >
                              Unban
                            </Button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </>
        ) : (
          // Collapsed sidebar
          <div className="flex flex-col items-center pt-3 gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setChannelsOpen(true)}
              data-ocid="group.sidebar.expand"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="h-8 w-8 rounded-full overflow-hidden border border-border">
              {iconUrl ? (
                <img
                  src={iconUrl}
                  alt={group.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/40 to-accent/20 flex items-center justify-center">
                  <Users className="h-4 w-4 text-accent/60" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1.5 mt-1">
              {channels?.map((ch) => (
                <button
                  type="button"
                  key={ch.id.toString()}
                  title={ch.name}
                  onClick={() => {
                    setSelectedChannelId(ch.id);
                    setChannelsOpen(true);
                  }}
                  className={`h-7 w-7 rounded flex items-center justify-center transition-colors ${
                    selectedChannelId === ch.id
                      ? "bg-accent/20 text-accent"
                      : "text-muted-foreground hover:bg-muted/50"
                  }`}
                  data-ocid="group.channel.icon_tab"
                >
                  <Hash className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedChannel ? (
          <>
            {/* Banner strip at top of chat area */}
            {bannerUrl && (
              <div className="relative h-16 overflow-hidden flex-shrink-0">
                <img
                  src={bannerUrl}
                  alt="Group banner"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50" />
                <div className="absolute inset-0 flex items-center px-4 gap-3">
                  {iconUrl && (
                    <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-white/30 flex-shrink-0">
                      <img
                        src={iconUrl}
                        alt={group.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <span className="font-display font-bold text-white text-lg">
                    {group.name}
                  </span>
                </div>
              </div>
            )}

            {/* Channel header */}
            <div className="h-12 border-b border-border flex items-center px-4 gap-2 flex-shrink-0">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-sm">
                {selectedChannel.name}
              </span>
              {selectedChannel.restricted && (
                <Lock className="h-3.5 w-3.5 text-yellow-400" />
              )}
              {selectedChannel.description && (
                <>
                  <Separator orientation="vertical" className="h-4" />
                  <span className="text-xs text-muted-foreground">
                    {selectedChannel.description}
                  </span>
                </>
              )}
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {!messages || messages.length === 0 ? (
                <div
                  className="text-center py-16"
                  data-ocid="group.messages.empty_state"
                >
                  <Hash className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground text-sm">
                    No messages yet. Say hello!
                  </p>
                </div>
              ) : (
                messages.map((msg: any) => (
                  <MessageBubble
                    key={msg.id.toString()}
                    msg={msg}
                    isMine={msg.author.toString() === callerPrincipal}
                    isOwner={!!isOwner}
                    onDelete={handleDeleteMessage}
                  />
                ))
              )}
            </ScrollArea>

            {/* Message input */}
            {identity && canSendMessages ? (
              <div className="p-4 border-t border-border">
                <div className="flex items-end gap-2">
                  {/* Emoji picker */}
                  <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 flex-shrink-0 text-muted-foreground hover:text-foreground"
                        title="Emoji"
                        data-ocid="group.message.emoji_button"
                      >
                        <SmilePlus className="h-5 w-5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-64 p-2"
                      side="top"
                      align="start"
                      data-ocid="group.message.emoji.popover"
                    >
                      <div className="grid grid-cols-8 gap-1">
                        {COMMON_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted text-lg transition-colors"
                            onClick={() => handleEmojiInsert(emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* GIF button */}
                  <Popover open={gifOpen} onOpenChange={setGifOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-2 flex-shrink-0 text-muted-foreground hover:text-foreground text-xs font-bold"
                        title="GIF"
                        data-ocid="group.message.gif_button"
                      >
                        GIF
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-64 p-3"
                      side="top"
                      align="start"
                      data-ocid="group.message.gif.popover"
                    >
                      <p className="text-xs text-muted-foreground mb-2">
                        Paste a GIF URL
                      </p>
                      <div className="flex gap-2">
                        <Input
                          value={gifUrl}
                          onChange={(e) => setGifUrl(e.target.value)}
                          placeholder="https://media.giphy.com/..."
                          className="text-xs h-8"
                          data-ocid="group.message.gif.input"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSendGif();
                          }}
                        />
                        <Button
                          size="sm"
                          className="h-8 bg-accent text-accent-foreground"
                          onClick={handleSendGif}
                          disabled={!gifUrl.trim()}
                          data-ocid="group.message.gif.submit_button"
                        >
                          Send
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Attachment button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 flex-shrink-0 text-muted-foreground hover:text-foreground"
                    title="Attach file"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={attachPending}
                    data-ocid="group.message.upload_button"
                  >
                    {attachPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Paperclip className="h-5 w-5" />
                    )}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip"
                    onChange={handleAttachFile}
                    data-ocid="group.message.dropzone"
                  />

                  {/* Link in message */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 flex-shrink-0 text-muted-foreground hover:text-foreground"
                    title="Insert link"
                    onClick={() => setMsgText((prev) => `${prev} https://`)}
                    data-ocid="group.message.link_button"
                  >
                    <LinkIcon className="h-4 w-4" />
                  </Button>

                  <Textarea
                    value={msgText}
                    onChange={(e) => setMsgText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message #${selectedChannel.name}`}
                    className="flex-1 min-h-[2.5rem] max-h-32 resize-none"
                    rows={1}
                    data-ocid="group.message.textarea"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={postMessage.isPending || !msgText.trim()}
                    size="icon"
                    className="bg-accent text-accent-foreground"
                    data-ocid="group.message.submit_button"
                  >
                    {postMessage.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ) : identity && !canSendMessages ? (
              <div className="p-4 border-t border-border text-center">
                <p className="text-sm text-muted-foreground">
                  Join this group to send messages
                </p>
              </div>
            ) : (
              <div className="p-4 border-t border-border text-center">
                <p className="text-sm text-muted-foreground">
                  Sign in to participate
                </p>
              </div>
            )}
          </>
        ) : (
          <div
            className="flex-1 flex items-center justify-center"
            data-ocid="group.channel.empty_state"
          >
            <div className="text-center">
              <Hash className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">
                {channels?.length === 0
                  ? "No channels yet"
                  : "Select a channel"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Edit Group Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md" data-ocid="group.edit.dialog">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              Edit Group
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="edit-grp-name">Group Name</Label>
              <Input
                id="edit-grp-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                data-ocid="group.edit.input"
              />
            </div>
            <div>
              <Label htmlFor="edit-grp-desc">Description</Label>
              <Textarea
                id="edit-grp-desc"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                data-ocid="group.edit.textarea"
              />
            </div>
            <div>
              <Label htmlFor="edit-grp-category">Category</Label>
              <Input
                id="edit-grp-category"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                placeholder="e.g. Gaming, Art..."
                data-ocid="group.edit.category.input"
              />
            </div>
            <div>
              <Label htmlFor="edit-grp-icon">New Icon (optional)</Label>
              <Input
                id="edit-grp-icon"
                type="file"
                accept="image/*"
                onChange={(e) => setEditIconFile(e.target.files?.[0] ?? null)}
                data-ocid="group.edit.upload_button"
              />
            </div>
            <div>
              <Label htmlFor="edit-grp-banner">Banner Image (optional)</Label>
              <Input
                id="edit-grp-banner"
                type="file"
                accept="image/*"
                onChange={(e) => setEditBannerFile(e.target.files?.[0] ?? null)}
                data-ocid="group.edit.banner.upload_button"
              />
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
              <Switch
                id="edit-grp-nsfw"
                checked={editNsfw}
                onCheckedChange={setEditNsfw}
                data-ocid="group.edit.nsfw.switch"
              />
              <div>
                <Label
                  htmlFor="edit-grp-nsfw"
                  className="font-medium cursor-pointer"
                >
                  NSFW (18+ content)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Enable for groups with adult content
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              data-ocid="group.edit.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateGroup}
              disabled={updateGroup.isPending}
              className="bg-accent text-accent-foreground"
              data-ocid="group.edit.save_button"
            >
              {updateGroup.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {updateGroup.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete message confirmation */}
      <Dialog
        open={!!deleteMsgId}
        onOpenChange={(open) => !open && setDeleteMsgId(null)}
      >
        <DialogContent
          className="sm:max-w-sm"
          data-ocid="group.delete_message.dialog"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Message
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete this message? This action will be logged and visible to site
            admins.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteMsgId(null)}
              data-ocid="group.delete_message.cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteMessage}
              disabled={deleteMessage.isPending}
              data-ocid="group.delete_message.confirm_button"
            >
              {deleteMessage.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MemberAvatar({ principal }: { principal: string }) {
  const { data: profile } = usePublicUserProfile(principal);
  const picUrl =
    profile && (profile as any).profilePicBlob
      ? (profile as any).profilePicBlob.getDirectURL()
      : null;
  return (
    <Avatar className="h-6 w-6 flex-shrink-0">
      {picUrl && <AvatarImage src={picUrl} alt={shortPrincipal(principal)} />}
      <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
        {principal.slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
