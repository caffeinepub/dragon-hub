import { Badge } from "@/components/ui/badge";
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
import { Link } from "@tanstack/react-router";
import { Flame, Loader2, MessageSquare, Plus } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAllCategories,
  useCreateCategory,
  useIsCreatorOrAdmin,
} from "../hooks/useQueries";

const SKELETON_IDS = ["a", "b", "c", "d", "e", "f"];

export function ForumsPage() {
  const { identity } = useInternetIdentity();
  const { data: categories, isLoading } = useAllCategories();
  const { data: isCreatorOrAdmin } = useIsCreatorOrAdmin();
  const createCategory = useCreateCategory();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Category name required");
      return;
    }
    try {
      await createCategory.mutateAsync({ name, description });
      toast.success("Category created!");
      setOpen(false);
      setName("");
      setDescription("");
    } catch {
      toast.error("Failed to create category");
    }
  };

  return (
    <main className="container mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-4xl font-bold">Forums</h1>
          <p className="text-muted-foreground mt-1">
            Explore topics and join the dragon community discussions
          </p>
        </div>
        {identity && isCreatorOrAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="border-primary/40 text-primary hover:bg-primary/10"
                data-ocid="forums.create.open_modal_button"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Category
              </Button>
            </DialogTrigger>
            <DialogContent data-ocid="forums.create.dialog">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">
                  Create Category
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label htmlFor="cat-name">Name</Label>
                  <Input
                    id="cat-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Category name"
                    data-ocid="forums.create.input"
                  />
                </div>
                <div>
                  <Label htmlFor="cat-desc">Description</Label>
                  <Textarea
                    id="cat-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What is this category about?"
                    data-ocid="forums.create.textarea"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  data-ocid="forums.create.cancel_button"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={createCategory.isPending}
                  className="bg-primary text-primary-foreground"
                  data-ocid="forums.create.submit_button"
                >
                  {createCategory.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          data-ocid="forums.loading_state"
        >
          {SKELETON_IDS.map((id) => (
            <Skeleton key={id} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : categories?.length === 0 ? (
        <div className="text-center py-20" data-ocid="forums.empty_state">
          <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground/40" />
          <h3 className="font-display text-xl font-semibold mb-2">
            No categories yet
          </h3>
          <p className="text-muted-foreground">
            An admin or creator needs to create forum categories first.
          </p>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.07 } },
            hidden: {},
          }}
        >
          {categories?.map((cat, i) => (
            <motion.div
              key={cat.id.toString()}
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0 },
              }}
              data-ocid={`forums.item.${i + 1}`}
            >
              <Link
                to="/forums/$categoryId"
                params={{ categoryId: cat.id.toString() }}
              >
                <Card className="bg-card border-border p-6 card-hover cursor-pointer group h-full">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Flame className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-display font-semibold text-lg line-clamp-1">
                          {cat.name}
                        </h3>
                        {cat.isActive && (
                          <Badge
                            variant="outline"
                            className="border-primary/40 text-primary text-xs"
                          >
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {cat.description}
                      </p>
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
