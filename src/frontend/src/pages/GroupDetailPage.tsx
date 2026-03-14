import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useParams } from "@tanstack/react-router";
import { Hash, Loader2, Plus, Send, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useCreateGroupChannel,
  useGroup,
  useGroupChannels,
  useGroupMembers,
  useGroupMessages,
  useJoinGroup,
  useLeaveGroup,
  usePostGroupMessage,
} from "../hooks/useQueries";

function shortPrincipal(p: string) {
  return `${p.slice(0, 5)}...${p.slice(-3)}`;
}

function MessageBubble({
  text,
  author,
  timestamp,
  isMine,
}: { text: string; author: string; timestamp: bigint; isMine: boolean }) {
  const time = new Date(Number(timestamp) / 1_000_000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div
      className={`flex items-start gap-3 mb-4 ${isMine ? "flex-row-reverse" : ""}`}
    >
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback className="bg-primary/20 text-primary text-xs">
          {author.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div
        className={`max-w-[70%] ${isMine ? "items-end" : "items-start"} flex flex-col`}
      >
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-xs font-medium text-muted-foreground">
            {shortPrincipal(author)}
          </span>
          <span className="text-xs text-muted-foreground/50">{time}</span>
        </div>
        <div
          className={`rounded-2xl px-4 py-2 text-sm ${isMine ? "bg-accent text-accent-foreground rounded-tr-sm" : "bg-card border border-border rounded-tl-sm"}`}
        >
          {text}
        </div>
      </div>
    </div>
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

  const [selectedChannelId, setSelectedChannelId] = useState<bigint | null>(
    null,
  );
  const { data: messages } = useGroupMessages(selectedChannelId ?? BigInt(0));

  const [msgText, setMsgText] = useState("");
  const [channelDialogOpen, setChannelDialogOpen] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [channelDesc, setChannelDesc] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);

  const callerPrincipal = identity?.getPrincipal().toString();
  const isOwner = group && callerPrincipal === group.owner.toString();
  const isMember = members?.some((m) => m.toString() === callerPrincipal);

  // biome-ignore lint/correctness/useExhaustiveDependencies: selectedChannelId checked inside to avoid reset
  useEffect(() => {
    if (channels && channels.length > 0 && !selectedChannelId) {
      setSelectedChannelId(channels[0].id);
    }
  }, [channels]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scrollRef is a ref, stable across renders
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

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
      {/* Sidebar */}
      <aside className="w-64 border-r border-border flex flex-col bg-card/50">
        {/* Group header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-full overflow-hidden flex-shrink-0">
              {group.iconBlob ? (
                <img
                  src={group.iconBlob.getDirectURL()}
                  alt={group.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/40 to-accent/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-accent/60" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="font-display font-bold text-sm truncate">
                {group.name}
              </h2>
              <p className="text-xs text-muted-foreground">
                {members?.length ?? 0} members
              </p>
            </div>
          </div>
          {group.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {group.description}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            {identity && !isMember && (
              <Button
                size="sm"
                className="w-full bg-accent text-accent-foreground"
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
                className="w-full"
                onClick={handleLeave}
                disabled={leaveGroup.isPending}
                data-ocid="group.leave.button"
              >
                Leave
              </Button>
            )}
            {isOwner && (
              <Badge className="text-xs bg-accent/20 text-accent border-accent/30">
                Owner
              </Badge>
            )}
          </div>
        </div>

        {/* Channels */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-3">
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
                <button
                  type="button"
                  key={ch.id.toString()}
                  onClick={() => setSelectedChannelId(ch.id)}
                  className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 transition-colors ${
                    selectedChannelId === ch.id
                      ? "bg-accent/20 text-accent"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                  data-ocid="group.channel.tab"
                >
                  <Hash className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{ch.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedChannel ? (
          <>
            {/* Channel header */}
            <div className="h-12 border-b border-border flex items-center px-4 gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-sm">
                {selectedChannel.name}
              </span>
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
                messages.map((msg) => (
                  <MessageBubble
                    key={msg.id.toString()}
                    text={msg.text}
                    author={msg.author.toString()}
                    timestamp={msg.timestamp}
                    isMine={msg.author.toString() === callerPrincipal}
                  />
                ))
              )}
            </ScrollArea>

            {/* Message input */}
            {identity && isMember ? (
              <div className="p-4 border-t border-border flex items-end gap-2">
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
            ) : identity && !isMember ? (
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
    </div>
  );
}
