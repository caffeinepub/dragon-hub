import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { UserAvatar } from "../components/UserAvatar";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useReplyToThread, useThreadWithReplies } from "../hooks/useQueries";

function formatDate(ts: bigint): string {
  return new Date(Number(ts) / 1_000_000).toLocaleString();
}

export function ThreadPage() {
  const { categoryId, threadId } = useParams({ strict: false });
  const tId = BigInt(threadId ?? "0");
  const { identity } = useInternetIdentity();
  const { data, isLoading } = useThreadWithReplies(tId);
  const replyToThread = useReplyToThread();
  const [replyText, setReplyText] = useState("");

  const handleReply = async () => {
    if (!replyText.trim()) return;
    try {
      await replyToThread.mutateAsync({ threadId: tId, text: replyText });
      setReplyText("");
      toast.success("Reply posted!");
    } catch {
      toast.error("Failed to post reply");
    }
  };

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-10 max-w-3xl">
        <Skeleton className="h-8 w-32 mb-6" />
        <Skeleton className="h-10 w-2/3 mb-4" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="container mx-auto px-4 py-10">
        <p className="text-muted-foreground">Thread not found.</p>
        <Link
          to="/forums/$categoryId"
          params={{ categoryId: categoryId ?? "0" }}
        >
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </main>
    );
  }

  const { thread, replies } = data;

  return (
    <main className="container mx-auto px-4 py-10 max-w-3xl">
      <Link
        to="/forums/$categoryId"
        params={{ categoryId: categoryId ?? "0" }}
        data-ocid="thread.back.link"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Category
      </Link>

      {/* Thread OP */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <h1 className="font-display text-2xl font-bold mb-4">{thread.title}</h1>
        <div className="flex items-center gap-3 mb-4">
          <UserAvatar principal={thread.author} size="md" />
          <p className="text-xs text-muted-foreground">
            {formatDate(thread.timestamp)}
          </p>
        </div>
        <p className="text-foreground leading-relaxed whitespace-pre-wrap">
          {thread.body}
        </p>
      </div>

      {/* Replies */}
      <div className="mb-6">
        <h2 className="font-display text-lg font-semibold mb-4">
          {replies.length} {replies.length === 1 ? "Reply" : "Replies"}
        </h2>
        {replies.length === 0 ? (
          <p
            className="text-muted-foreground text-sm py-6 text-center"
            data-ocid="thread.replies.empty_state"
          >
            No replies yet. Be the first to respond!
          </p>
        ) : (
          <div className="space-y-4">
            {replies.map((r, i) => (
              <div
                key={r.id.toString()}
                className="flex gap-3"
                data-ocid={`thread.reply.item.${i + 1}`}
              >
                <div className="flex-shrink-0 pt-1">
                  <UserAvatar principal={r.author} size="sm" showName={false} />
                </div>
                <div className="flex-1 bg-card border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <UserAvatar principal={r.author} size="sm" />
                    <span className="text-xs text-muted-foreground/60">
                      {formatDate(r.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{r.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reply form */}
      {identity ? (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold mb-3">Post a Reply</h3>
          <Separator className="mb-4" />
          <div className="flex gap-3">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write your reply..."
              rows={4}
              className="flex-1"
              data-ocid="thread.reply.textarea"
            />
            <Button
              onClick={handleReply}
              disabled={replyToThread.isPending || !replyText.trim()}
              className="bg-primary text-primary-foreground self-end"
              data-ocid="thread.reply.submit_button"
            >
              {replyToThread.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-6 bg-muted/30 rounded-xl">
          <p className="text-muted-foreground text-sm">
            Sign in to join the discussion.
          </p>
        </div>
      )}
    </main>
  );
}
