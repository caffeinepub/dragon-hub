import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Loader2, MessageSquare, Plus } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { UserAvatar } from "../components/UserAvatar";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAllCategories,
  useCreateThread,
  useThreadsInCategory,
} from "../hooks/useQueries";

const SKELETON_IDS = ["a", "b", "c", "d", "e"];

function formatDate(ts: bigint): string {
  return new Date(Number(ts) / 1_000_000).toLocaleDateString();
}

export function CategoryPage() {
  const { categoryId } = useParams({ strict: false });
  const catId = BigInt(categoryId ?? "0");
  const { identity } = useInternetIdentity();
  const { data: categories } = useAllCategories();
  const { data: threads, isLoading } = useThreadsInCategory(catId);
  const createThread = useCreateThread();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const category = categories?.find((c) => c.id === catId);

  const handleCreate = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body required");
      return;
    }
    try {
      await createThread.mutateAsync({ categoryId: catId, title, body });
      toast.success("Thread created!");
      setOpen(false);
      setTitle("");
      setBody("");
    } catch {
      toast.error("Failed to create thread");
    }
  };

  return (
    <main className="container mx-auto px-4 py-10">
      <Link
        to="/forums"
        data-ocid="category.back.link"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Forums
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">
            {category?.name ?? "Category"}
          </h1>
          {category?.description && (
            <p className="text-muted-foreground mt-1">{category.description}</p>
          )}
        </div>
        {identity && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-primary text-primary-foreground fire-glow"
                data-ocid="category.thread.open_modal_button"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Thread
              </Button>
            </DialogTrigger>
            <DialogContent data-ocid="category.thread.dialog">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">
                  Start a Thread
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label htmlFor="thr-title">Title</Label>
                  <Input
                    id="thr-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Thread title"
                    data-ocid="category.thread.input"
                  />
                </div>
                <div>
                  <Label htmlFor="thr-body">Body</Label>
                  <Textarea
                    id="thr-body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="What do you want to discuss?"
                    rows={5}
                    data-ocid="category.thread.textarea"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  data-ocid="category.thread.cancel_button"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={createThread.isPending}
                  className="bg-primary text-primary-foreground"
                  data-ocid="category.thread.submit_button"
                >
                  {createThread.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Post Thread
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3" data-ocid="category.threads.loading_state">
          {SKELETON_IDS.map((sid) => (
            <Skeleton key={sid} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : threads?.length === 0 ? (
        <div
          className="text-center py-20"
          data-ocid="category.threads.empty_state"
        >
          <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground/40" />
          <h3 className="font-display text-xl font-semibold mb-2">
            No threads yet
          </h3>
          <p className="text-muted-foreground mb-6">
            Start the first discussion!
          </p>
        </div>
      ) : (
        <motion.div
          className="space-y-3"
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.05 } },
            hidden: {},
          }}
        >
          {threads?.map((t, i) => (
            <motion.div
              key={t.id.toString()}
              variants={{
                hidden: { opacity: 0, x: -10 },
                visible: { opacity: 1, x: 0 },
              }}
              data-ocid={`category.thread.item.${i + 1}`}
            >
              <Link
                to="/forums/$categoryId/$threadId"
                params={{
                  categoryId: categoryId ?? "0",
                  threadId: t.id.toString(),
                }}
              >
                <Card className="bg-card border-border p-5 card-hover cursor-pointer group">
                  <div className="flex items-start gap-4">
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {t.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <UserAvatar principal={t.author} size="sm" />
                        <span className="text-xs text-muted-foreground/60">
                          &middot; {formatDate(t.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </main>
  );
}
