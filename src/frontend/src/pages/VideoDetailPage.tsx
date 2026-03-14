import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Heart, Loader2, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAddComment,
  useComments,
  useLikeVideo,
  useVideo,
} from "../hooks/useQueries";

const COMMENT_SKELETON_IDS = ["a", "b", "c"];

function formatDate(ts: bigint): string {
  return new Date(Number(ts) / 1_000_000).toLocaleString();
}

export function VideoDetailPage() {
  const { id } = useParams({ strict: false });
  const videoId = BigInt(id ?? "0");
  const { identity } = useInternetIdentity();
  const { data: video, isLoading } = useVideo(videoId);
  const { data: comments, isLoading: commentsLoading } = useComments(videoId);
  const likeVideo = useLikeVideo();
  const addComment = useAddComment();
  const [commentText, setCommentText] = useState("");

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-10">
        <Skeleton className="h-8 w-32 mb-6" />
        <Skeleton className="w-full aspect-video rounded-xl" />
        <div className="mt-4 space-y-2">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-full" />
        </div>
      </main>
    );
  }

  if (!video) {
    return (
      <main className="container mx-auto px-4 py-10">
        <p className="text-muted-foreground">Video not found.</p>
        <Link to="/videos">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </main>
    );
  }

  const handleLike = async () => {
    try {
      await likeVideo.mutateAsync(videoId);
      toast.success("Liked!");
    } catch {
      toast.error("Could not like video");
    }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    try {
      await addComment.mutateAsync({ videoId, text: commentText });
      setCommentText("");
      toast.success("Comment added!");
    } catch {
      toast.error("Could not post comment");
    }
  };

  return (
    <main className="container mx-auto px-4 py-10">
      <Link
        to="/videos"
        data-ocid="video.back.link"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Videos
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="rounded-xl overflow-hidden bg-black aspect-video">
            {/* biome-ignore lint/a11y/useMediaCaption: user-uploaded content */}
            <video
              src={video.videoBlob.getDirectURL()}
              controls
              className="w-full h-full"
              data-ocid="video.canvas_target"
            />
          </div>

          <div className="mt-4">
            <div className="flex items-start justify-between gap-4">
              <h1 className="font-display text-2xl font-bold">{video.title}</h1>
              <Button
                onClick={handleLike}
                disabled={likeVideo.isPending || !identity}
                variant="outline"
                className="flex items-center gap-2 border-primary/40 hover:border-primary hover:bg-primary/10 flex-shrink-0"
                data-ocid="video.like.button"
              >
                {likeVideo.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Heart className="h-4 w-4 text-primary" />
                )}
                <span>{video.likes.toString()}</span>
              </Button>
            </div>
            {video.description && (
              <p className="text-muted-foreground mt-2 leading-relaxed">
                {video.description}
              </p>
            )}
          </div>

          {/* Comments */}
          <div className="mt-8">
            <h2 className="font-display text-xl font-semibold mb-4">
              Comments
            </h2>
            {identity && (
              <div className="flex gap-3 mb-6">
                <Textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 min-h-[80px]"
                  data-ocid="video.comment.textarea"
                />
                <Button
                  onClick={handleComment}
                  disabled={addComment.isPending || !commentText.trim()}
                  className="bg-primary text-primary-foreground self-end"
                  data-ocid="video.comment.submit_button"
                >
                  {addComment.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}
            {commentsLoading ? (
              <div
                className="space-y-3"
                data-ocid="video.comments.loading_state"
              >
                {COMMENT_SKELETON_IDS.map((id) => (
                  <div key={id} className="flex gap-3">
                    <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-1/4" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : comments?.length === 0 ? (
              <p
                className="text-muted-foreground text-sm"
                data-ocid="video.comments.empty_state"
              >
                No comments yet. Start the conversation!
              </p>
            ) : (
              <div className="space-y-4">
                {comments?.map((c, i) => (
                  <div
                    key={c.id.toString()}
                    className="flex gap-3"
                    data-ocid={`video.comment.item.${i + 1}`}
                  >
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="bg-muted text-xs">
                        {c.author.toString().slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-muted-foreground">
                          {c.author.toString().slice(0, 8)}...
                        </span>
                        <span className="text-xs text-muted-foreground/60">
                          {formatDate(c.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
