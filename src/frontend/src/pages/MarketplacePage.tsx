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
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@tanstack/react-router";
import { Loader2, Plus, ShoppingBag } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useAllListings, useCreateListing } from "../hooks/useQueries";

const SKELETON_IDS = ["a", "b", "c", "d", "e", "f", "g", "h"];

function formatPrice(price: bigint): string {
  return `${(Number(price) / 1e8).toFixed(2)} ICP`;
}

export function MarketplacePage() {
  const { identity } = useInternetIdentity();
  const { data: listings, isLoading } = useAllListings();
  const createListing = useCreateListing();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceIcp, setPriceIcp] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleSubmit = async () => {
    if (!title.trim() || !imageFile || !priceIcp) {
      toast.error("Please fill all fields");
      return;
    }
    const priceE8s = BigInt(Math.round(Number.parseFloat(priceIcp) * 1e8));
    try {
      await createListing.mutateAsync({
        title,
        description,
        price: priceE8s,
        imageFile,
      });
      toast.success("Listing created!");
      setOpen(false);
      setTitle("");
      setDescription("");
      setPriceIcp("");
      setImageFile(null);
    } catch {
      toast.error("Failed to create listing");
    }
  };

  return (
    <main className="container mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-4xl font-bold">Marketplace</h1>
          <p className="text-muted-foreground mt-1">
            Buy and sell unique dragon-crafted goods
          </p>
        </div>
        {identity && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-accent text-accent-foreground hover:bg-accent/90 gold-glow"
                data-ocid="marketplace.create.open_modal_button"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Listing
              </Button>
            </DialogTrigger>
            <DialogContent
              className="sm:max-w-md"
              data-ocid="marketplace.create.dialog"
            >
              <DialogHeader>
                <DialogTitle className="font-display text-xl">
                  New Listing
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label htmlFor="list-title">Title</Label>
                  <Input
                    id="list-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Item name"
                    data-ocid="marketplace.create.input"
                  />
                </div>
                <div>
                  <Label htmlFor="list-desc">Description</Label>
                  <Textarea
                    id="list-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your item"
                    data-ocid="marketplace.create.textarea"
                  />
                </div>
                <div>
                  <Label htmlFor="list-price">Price (ICP)</Label>
                  <Input
                    id="list-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={priceIcp}
                    onChange={(e) => setPriceIcp(e.target.value)}
                    placeholder="e.g. 1.5"
                    data-ocid="marketplace.price.input"
                  />
                </div>
                <div>
                  <Label htmlFor="list-img">Item Image</Label>
                  <Input
                    id="list-img"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                    data-ocid="marketplace.create.upload_button"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  data-ocid="marketplace.create.cancel_button"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createListing.isPending}
                  className="bg-accent text-accent-foreground"
                  data-ocid="marketplace.create.submit_button"
                >
                  {createListing.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  {createListing.isPending ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
          data-ocid="marketplace.loading_state"
        >
          {SKELETON_IDS.map((id) => (
            <Card key={id} className="bg-card border-border overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : listings?.length === 0 ? (
        <div className="text-center py-20" data-ocid="marketplace.empty_state">
          <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-muted-foreground/40" />
          <h3 className="font-display text-xl font-semibold mb-2">
            No listings yet
          </h3>
          <p className="text-muted-foreground mb-6">
            Start selling your dragon crafts!
          </p>
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
          {listings?.map((l, i) => (
            <motion.div
              key={l.id.toString()}
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0 },
              }}
              data-ocid={`marketplace.item.${i + 1}`}
            >
              <Link to="/marketplace/$id" params={{ id: l.id.toString() }}>
                <Card className="bg-card border-border overflow-hidden card-hover group cursor-pointer h-full">
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={l.image.getDirectURL()}
                      alt={l.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {l.isSold && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Badge className="bg-destructive text-destructive-foreground text-sm">
                          Sold
                        </Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-foreground line-clamp-1">
                      {l.title}
                    </h3>
                    <p className="text-accent font-medium mt-1">
                      {formatPrice(l.price)}
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
