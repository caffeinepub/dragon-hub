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
import { Loader2, Plus, Store } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAllShops,
  useCreateShop,
  useShopByOwner,
} from "../hooks/useQueries";

export function ShopsPage() {
  const { identity } = useInternetIdentity();
  const { data: shops, isLoading } = useAllShops();
  const principal = identity?.getPrincipal();
  const { data: myShop } = useShopByOwner(principal);
  const createShop = useCreateShop();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Shop name is required");
      return;
    }
    try {
      await createShop.mutateAsync({ name, description, bannerFile });
      toast.success("Shop created!");
      setOpen(false);
      setName("");
      setDescription("");
      setBannerFile(null);
    } catch {
      toast.error("Failed to create shop");
    }
  };

  return (
    <main className="container mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-4xl font-bold">Shops</h1>
          <p className="text-muted-foreground mt-1">
            Discover unique dragon crafted stores
          </p>
        </div>
        {identity &&
          (myShop ? (
            <Link to="/shops/$id" params={{ id: myShop.id.toString() }}>
              <Button
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                data-ocid="shops.my_shop.button"
              >
                <Store className="h-4 w-4 mr-2" />
                My Shop
              </Button>
            </Link>
          ) : (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button
                  className="bg-accent text-accent-foreground hover:bg-accent/90 gold-glow"
                  data-ocid="shops.create.open_modal_button"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Shop
                </Button>
              </DialogTrigger>
              <DialogContent
                className="sm:max-w-md"
                data-ocid="shops.create.dialog"
              >
                <DialogHeader>
                  <DialogTitle className="font-display text-xl">
                    Create Your Shop
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <Label htmlFor="shop-name">Shop Name</Label>
                    <Input
                      id="shop-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your shop name"
                      data-ocid="shops.create.input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="shop-desc">Description</Label>
                    <Textarea
                      id="shop-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe your shop"
                      data-ocid="shops.create.textarea"
                    />
                  </div>
                  <div>
                    <Label htmlFor="shop-banner">Banner Image (optional)</Label>
                    <Input
                      id="shop-banner"
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setBannerFile(e.target.files?.[0] ?? null)
                      }
                      data-ocid="shops.create.upload_button"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setOpen(false)}
                    data-ocid="shops.create.cancel_button"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={createShop.isPending}
                    className="bg-accent text-accent-foreground"
                    data-ocid="shops.create.submit_button"
                  >
                    {createShop.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    {createShop.isPending ? "Creating..." : "Create"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ))}
      </div>

      {isLoading ? (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          data-ocid="shops.loading_state"
        >
          {["a", "b", "c", "d", "e", "f"].map((k) => (
            <Card key={k} className="overflow-hidden bg-card border-border">
              <Skeleton className="h-36 w-full" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : shops?.length === 0 ? (
        <div className="text-center py-20" data-ocid="shops.empty_state">
          <Store className="h-16 w-16 mx-auto mb-4 text-muted-foreground/40" />
          <h3 className="font-display text-xl font-semibold mb-2">
            No shops yet
          </h3>
          <p className="text-muted-foreground">
            Be the first to open a shop on Dragon Hub!
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
          {shops?.map((shop, i) => (
            <motion.div
              key={shop.id.toString()}
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0 },
              }}
              data-ocid={`shops.item.${i + 1}`}
            >
              <Link to="/shops/$id" params={{ id: shop.id.toString() }}>
                <Card className="bg-card border-border overflow-hidden card-hover group cursor-pointer">
                  <div className="h-36 overflow-hidden relative">
                    {shop.bannerBlob ? (
                      <img
                        src={shop.bannerBlob.getDirectURL()}
                        alt={shop.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center">
                        <Store className="h-10 w-10 text-accent/60" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-display font-semibold text-lg text-foreground">
                      {shop.name}
                    </h3>
                    {shop.description && (
                      <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                        {shop.description}
                      </p>
                    )}
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
