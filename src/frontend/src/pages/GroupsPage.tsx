import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@tanstack/react-router";
import { Loader2, Plus, Search, Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAllGroups,
  useCreateGroup,
  useIsCreatorOrAdmin,
} from "../hooks/useQueries";

const NSFW_SESSION_KEY = "groups_nsfw_consent";

export function GroupsPage() {
  const { identity } = useInternetIdentity();
  const { data: groups, isLoading } = useAllGroups();
  const { data: isCreatorOrAdmin } = useIsCreatorOrAdmin();
  const createGroup = useCreateGroup();

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showNsfw, setShowNsfw] = useState(false);
  const [nsfwGateOpen, setNsfwGateOpen] = useState(false);

  // Create dialog
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [isNsfw, setIsNsfw] = useState(false);
  const [category, setCategory] = useState("");

  const handleNsfwToggle = (checked: boolean) => {
    if (checked) {
      const consented = sessionStorage.getItem(NSFW_SESSION_KEY) === "true";
      if (consented) {
        setShowNsfw(true);
      } else {
        setNsfwGateOpen(true);
      }
    } else {
      setShowNsfw(false);
    }
  };

  const handleNsfwConsent = () => {
    sessionStorage.setItem(NSFW_SESSION_KEY, "true");
    setShowNsfw(true);
    setNsfwGateOpen(false);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Group name is required");
      return;
    }
    try {
      await createGroup.mutateAsync({
        name,
        description,
        iconFile,
        bannerFile,
        isNsfw,
        category,
      });
      toast.success("Group created!");
      setOpen(false);
      setName("");
      setDescription("");
      setIconFile(null);
      setBannerFile(null);
      setIsNsfw(false);
      setCategory("");
    } catch {
      toast.error("Failed to create group");
    }
  };

  const filtered = (groups ?? []).filter((g) => {
    if (!showNsfw && (g as any).isNsfw) return false;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      g.name.toLowerCase().includes(q) ||
      g.description?.toLowerCase().includes(q);
    const matchCategory =
      !categoryFilter.trim() ||
      ((g as any).category ?? "")
        .toLowerCase()
        .includes(categoryFilter.toLowerCase());
    return matchSearch && matchCategory;
  });

  return (
    <main className="container mx-auto px-4 py-10">
      {/* Page header */}
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
                  <Label htmlFor="grp-category">Category (optional)</Label>
                  <Input
                    id="grp-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Gaming, Art, Music..."
                    data-ocid="groups.create.category.input"
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
                <div>
                  <Label htmlFor="grp-banner">Banner Image (optional)</Label>
                  <Input
                    id="grp-banner"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setBannerFile(e.target.files?.[0] ?? null)}
                    data-ocid="groups.create.banner.upload_button"
                  />
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                  <Switch
                    id="grp-nsfw"
                    checked={isNsfw}
                    onCheckedChange={setIsNsfw}
                    data-ocid="groups.create.nsfw.switch"
                  />
                  <div>
                    <Label
                      htmlFor="grp-nsfw"
                      className="font-medium cursor-pointer"
                    >
                      NSFW (18+ content)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Enable for groups with any adult content
                    </p>
                  </div>
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

      {/* Search & filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search groups by name or description…"
            className="pl-9"
            data-ocid="groups.search_input"
          />
        </div>
        <Input
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          placeholder="Filter by category…"
          className="sm:w-48"
          data-ocid="groups.category.search_input"
        />
        <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card">
          <Switch
            id="nsfw-toggle"
            checked={showNsfw}
            onCheckedChange={handleNsfwToggle}
            data-ocid="groups.nsfw.switch"
          />
          <Label
            htmlFor="nsfw-toggle"
            className="text-sm cursor-pointer whitespace-nowrap"
          >
            Show NSFW
          </Label>
        </div>
      </div>

      {/* NSFW age gate dialog */}
      <Dialog open={nsfwGateOpen} onOpenChange={setNsfwGateOpen}>
        <DialogContent
          className="sm:max-w-sm"
          data-ocid="groups.nsfw_gate.dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-display">
              18+ Content
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            NSFW groups contain adult content. You must be 18 or older to view
            this content.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setNsfwGateOpen(false)}
              data-ocid="groups.nsfw_gate.cancel_button"
            >
              Go Back
            </Button>
            <Button
              className="bg-destructive text-destructive-foreground"
              onClick={handleNsfwConsent}
              data-ocid="groups.nsfw_gate.confirm_button"
            >
              I am 18+ — Proceed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group grid */}
      {isLoading ? (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          data-ocid="groups.loading_state"
        >
          {["a", "b", "c", "d", "e", "f"].map((k) => (
            <Card key={k} className="overflow-hidden bg-card border-border">
              <Skeleton className="h-28 w-full" />
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
      ) : filtered.length === 0 ? (
        <div className="text-center py-20" data-ocid="groups.empty_state">
          <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground/40" />
          <h3 className="font-display text-xl font-semibold mb-2">
            {groups?.length === 0
              ? "No groups yet"
              : "No groups match your search"}
          </h3>
          <p className="text-muted-foreground">
            {groups?.length === 0
              ? "Create the first community on Dragon Hub!"
              : "Try adjusting your filters."}
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
          <AnimatePresence>
            {filtered.map((group, i) => {
              const bannerUrl = (group as any).bannerBlob
                ? (group as any).bannerBlob.getDirectURL()
                : null;
              const iconUrl = group.iconBlob
                ? group.iconBlob.getDirectURL()
                : null;
              return (
                <motion.div
                  key={group.id.toString()}
                  variants={{
                    hidden: { opacity: 0, y: 16 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  data-ocid={`groups.item.${i + 1}`}
                >
                  <Link to="/groups/$id" params={{ id: group.id.toString() }}>
                    <Card className="bg-card border-border overflow-hidden card-hover group cursor-pointer h-full">
                      {/* Banner */}
                      {bannerUrl ? (
                        <div className="relative h-28 overflow-hidden">
                          <img
                            src={bannerUrl}
                            alt={`${group.name} banner`}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          {iconUrl && (
                            <div className="absolute bottom-3 left-4 h-12 w-12 rounded-full overflow-hidden border-2 border-background shadow-md">
                              <img
                                src={iconUrl}
                                alt={group.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                        </div>
                      ) : null}
                      <CardContent
                        className={`p-5 ${bannerUrl && iconUrl ? "pt-3" : ""} flex items-start gap-4`}
                      >
                        {!bannerUrl && (
                          <div className="h-14 w-14 rounded-full overflow-hidden flex-shrink-0 border border-border mt-0.5">
                            {iconUrl ? (
                              <img
                                src={iconUrl}
                                alt={group.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-primary/40 to-accent/20 flex items-center justify-center">
                                <Users className="h-6 w-6 text-accent/60" />
                              </div>
                            )}
                          </div>
                        )}
                        <div
                          className={`min-w-0 flex-1 ${bannerUrl && iconUrl ? "pl-14" : ""}`}
                        >
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <h3 className="font-display font-semibold text-lg text-foreground truncate">
                              {group.name}
                            </h3>
                            {(group as any).isNsfw && (
                              <Badge className="text-xs bg-red-500/20 text-red-400 border-red-500/30">
                                NSFW 18+
                              </Badge>
                            )}
                          </div>
                          {(group as any).category && (
                            <Badge variant="outline" className="text-xs mb-1">
                              {(group as any).category}
                            </Badge>
                          )}
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
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </main>
  );
}
