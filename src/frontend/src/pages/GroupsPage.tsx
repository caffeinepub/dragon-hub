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
import { Loader2, Plus, Users } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAllGroups,
  useCreateGroup,
  useIsCreatorOrAdmin,
} from "../hooks/useQueries";

export function GroupsPage() {
  const { identity } = useInternetIdentity();
  const { data: groups, isLoading } = useAllGroups();
  const { data: isCreatorOrAdmin } = useIsCreatorOrAdmin();
  const createGroup = useCreateGroup();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [iconFile, setIconFile] = useState<File | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Group name is required");
      return;
    }
    try {
      await createGroup.mutateAsync({ name, description, iconFile });
      toast.success("Group created!");
      setOpen(false);
      setName("");
      setDescription("");
      setIconFile(null);
    } catch {
      toast.error("Failed to create group");
    }
  };

  return (
    <main className="container mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-4xl font-bold">Groups</h1>
          <p className="text-muted-foreground mt-1">
            Join communities of dragon enthusiasts
          </p>
        </div>
        {identity && isCreatorOrAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-accent text-accent-foreground hover:bg-accent/90 gold-glow"
                data-ocid="groups.create.open_modal_button"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent
              className="sm:max-w-md"
              data-ocid="groups.create.dialog"
            >
              <DialogHeader>
                <DialogTitle className="font-display text-xl">
                  Create Group
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label htmlFor="grp-name">Group Name</Label>
                  <Input
                    id="grp-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Group name"
                    data-ocid="groups.create.input"
                  />
                </div>
                <div>
                  <Label htmlFor="grp-desc">Description</Label>
                  <Textarea
                    id="grp-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What is this group about?"
                    data-ocid="groups.create.textarea"
                  />
                </div>
                <div>
                  <Label htmlFor="grp-icon">Icon (optional)</Label>
                  <Input
                    id="grp-icon"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setIconFile(e.target.files?.[0] ?? null)}
                    data-ocid="groups.create.upload_button"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  data-ocid="groups.create.cancel_button"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={createGroup.isPending}
                  className="bg-accent text-accent-foreground"
                  data-ocid="groups.create.submit_button"
                >
                  {createGroup.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  {createGroup.isPending ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          data-ocid="groups.loading_state"
        >
          {["a", "b", "c", "d", "e", "f"].map((k) => (
            <Card key={k} className="overflow-hidden bg-card border-border">
              <CardContent className="p-5 flex items-center gap-4">
                <Skeleton className="h-14 w-14 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : groups?.length === 0 ? (
        <div className="text-center py-20" data-ocid="groups.empty_state">
          <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground/40" />
          <h3 className="font-display text-xl font-semibold mb-2">
            No groups yet
          </h3>
          <p className="text-muted-foreground">
            Create the first community on Dragon Hub!
          </p>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.06 } },
            hidden: {},
          }}
        >
          {groups?.map((group, i) => (
            <motion.div
              key={group.id.toString()}
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0 },
              }}
              data-ocid={`groups.item.${i + 1}`}
            >
              <Link to="/groups/$id" params={{ id: group.id.toString() }}>
                <Card className="bg-card border-border overflow-hidden card-hover group cursor-pointer">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full overflow-hidden flex-shrink-0 border border-border">
                      {group.iconBlob ? (
                        <img
                          src={group.iconBlob.getDirectURL()}
                          alt={group.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/40 to-accent/20 flex items-center justify-center">
                          <Users className="h-6 w-6 text-accent/60" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display font-semibold text-lg text-foreground truncate">
                        {group.name}
                      </h3>
                      {group.description && (
                        <p className="text-muted-foreground text-sm line-clamp-2">
                          {group.description}
                        </p>
                      )}
                    </div>
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
