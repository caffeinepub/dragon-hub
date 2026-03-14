import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Link } from "@tanstack/react-router";
import { Heart, Loader2, Play, Upload } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useAllVideos, useCreateVideo } from "../hooks/useQueries";

const SKELETON_IDS = ["a", "b", "c", "d", "e", "f", "g", "h"];

function formatDate(ts: bigint): string {
  return new Date(Number(ts) / 1_000_000).toLocaleDateString();
}

export function VideosPage() {
  const { identity } = useInternetIdentity();
  const { data: videos, isLoading } = useAllVideos();
  const createVideo = useCreateVideo();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleSubmit = async () => {
    if (!title.trim() || !videoFile || !thumbFile) {
      toast.error("Please fill all fields and select files");
      return;
    }
    try {
      await createVideo.mutateAsync({
        title,
        description,
        videoFile,
        thumbnailFile: thumbFile,
        onProgress: setUploadProgress,
      });
      toast.success("Video uploaded!");
      setOpen(false);
      setTitle("");
      setDescription("");
      setVideoFile(null);
      setThumbFile(null);
      setUploadProgress(0);
    } catch {
      toast.error("Upload failed. Try again.");
    }
  };

  return (
    <main className="container mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-4xl font-bold">Videos</h1>
          <p className="text-muted-foreground mt-1">
            Discover creator content from the Dragon community
          </p>
        </div>
        {identity && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-primary text-primary-foreground fire-glow"
                data-ocid="videos.upload.open_modal_button"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Video
              </Button>
            </DialogTrigger>
            <DialogContent
              className="sm:max-w-md"
              data-ocid="videos.upload.dialog"
            >
              <DialogHeader>
                <DialogTitle className="font-display text-xl">
                  Upload a Video
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label htmlFor="vid-title">Title</Label>
                  <Input
                    id="vid-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter video title"
                    data-ocid="videos.upload.input"
                  />
                </div>
                <div>
                  <Label htmlFor="vid-desc">Description</Label>
                  <Textarea
                    id="vid-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What's this video about?"
                    data-ocid="videos.upload.textarea"
                  />
                </div>
                <div>
                  <Label htmlFor="vid-file">Video File</Label>
                  <Input
                    id="vid-file"
                    type="file"
                    accept="video/*"
                    onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
                    data-ocid="videos.upload.upload_button"
                  />
                </div>
                <div>
                  <Label htmlFor="thumb-file">Thumbnail</Label>
                  <Input
                    id="thumb-file"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setThumbFile(e.target.files?.[0] ?? null)}
                    data-ocid="videos.thumbnail.upload_button"
                  />
                </div>
                {createVideo.isPending && uploadProgress > 0 && (
                  <div
                    className="space-y-1"
                    data-ocid="videos.upload.loading_state"
                  >
                    <div className="text-xs text-muted-foreground">
                      Uploading... {uploadProgress}%
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  data-ocid="videos.upload.cancel_button"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createVideo.isPending}
                  className="bg-primary text-primary-foreground"
                  data-ocid="videos.upload.submit_button"
                >
                  {createVideo.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  {createVideo.isPending ? "Uploading..." : "Upload"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
          data-ocid="videos.loading_state"
        >
          {SKELETON_IDS.map((id) => (
            <Card key={id} className="bg-card border-border overflow-hidden">
              <Skeleton className="h-40 w-full" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : videos?.length === 0 ? (
        <div className="text-center py-20" data-ocid="videos.empty_state">
          <Play className="h-16 w-16 mx-auto mb-4 text-muted-foreground/40" />
          <h3 className="font-display text-xl font-semibold mb-2">
            No videos yet
          </h3>
          <p className="text-muted-foreground mb-6">
            Be the first dragon to share your content!
          </p>
          {identity && (
            <Button
              onClick={() => setOpen(true)}
              className="bg-primary text-primary-foreground"
            >
              <Upload className="h-4 w-4 mr-2" /> Upload Now
            </Button>
          )}
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.05 } },
            hidden: {},
          }}
        >
          {videos?.map((v, i) => (
            <motion.div
              key={v.id.toString()}
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0 },
              }}
              data-ocid={`videos.item.${i + 1}`}
            >
              <Link to="/videos/$id" params={{ id: v.id.toString() }}>
                <Card className="bg-card border-border overflow-hidden card-hover group cursor-pointer h-full">
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={v.thumbnailBlob.getDirectURL()}
                      alt={v.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="h-12 w-12 text-white" />
                    </div>
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 rounded px-2 py-0.5">
                      <Heart className="h-3 w-3 text-primary" />
                      <span className="text-xs text-white">
                        {v.likes.toString()}
                      </span>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-foreground line-clamp-2 leading-snug">
                      {v.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {formatDate(v.timestamp)}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </main>
  );
}
