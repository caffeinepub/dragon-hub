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
import { useParams } from "@tanstack/react-router";
import { Loader2, Package, Plus, Store, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAddShopProduct,
  useDeleteShopProduct,
  useShop,
  useShopProducts,
} from "../hooks/useQueries";

function formatPrice(price: bigint): string {
  return `${(Number(price) / 1e8).toFixed(2)} ICP`;
}

export function ShopDetailPage() {
  const { id } = useParams({ from: "/shops/$id" });
  const shopId = BigInt(id);
  const { identity } = useInternetIdentity();
  const { data: shop, isLoading: shopLoading } = useShop(shopId);
  const { data: products, isLoading: productsLoading } =
    useShopProducts(shopId);
  const addProduct = useAddShopProduct();
  const deleteProduct = useDeleteShopProduct();

  const [productOpen, setProductOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceIcp, setPriceIcp] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const callerPrincipal = identity?.getPrincipal().toString();
  const isOwner = shop && callerPrincipal === shop.owner.toString();

  const handleAddProduct = async () => {
    if (!title.trim() || !priceIcp) {
      toast.error("Title and price are required");
      return;
    }
    const price = BigInt(Math.round(Number.parseFloat(priceIcp) * 1e8));
    try {
      await addProduct.mutateAsync({
        shopId,
        title,
        description,
        price,
        imageFile,
      });
      toast.success("Product added!");
      setProductOpen(false);
      setTitle("");
      setDescription("");
      setPriceIcp("");
      setImageFile(null);
    } catch {
      toast.error("Failed to add product");
    }
  };

  const handleDelete = async (productId: bigint) => {
    try {
      await deleteProduct.mutateAsync({ productId, shopId });
      toast.success("Product removed");
    } catch {
      toast.error("Failed to remove product");
    }
  };

  if (shopLoading) {
    return (
      <main
        className="container mx-auto px-4 py-10"
        data-ocid="shop.loading_state"
      >
        <Skeleton className="h-48 w-full rounded-xl mb-6" />
        <Skeleton className="h-8 w-64 mb-3" />
        <Skeleton className="h-4 w-full max-w-md" />
      </main>
    );
  }

  if (!shop) {
    return (
      <main
        className="container mx-auto px-4 py-20 text-center"
        data-ocid="shop.error_state"
      >
        <Store className="h-16 w-16 mx-auto mb-4 text-muted-foreground/40" />
        <h2 className="font-display text-2xl font-bold">Shop not found</h2>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-10">
      {/* Banner */}
      <div className="relative h-48 rounded-xl overflow-hidden mb-6 border border-border">
        {shop.bannerBlob ? (
          <img
            src={shop.bannerBlob.getDirectURL()}
            alt={shop.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/40 to-accent/20 flex items-center justify-center">
            <Store className="h-16 w-16 text-accent/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        <div className="absolute bottom-4 left-6">
          <h1 className="font-display text-3xl font-bold text-foreground">
            {shop.name}
          </h1>
          {isOwner && (
            <Badge className="mt-1 bg-accent/20 text-accent border-accent/30">
              Your Shop
            </Badge>
          )}
        </div>
      </div>

      {shop.description && (
        <p className="text-muted-foreground mb-8 max-w-2xl">
          {shop.description}
        </p>
      )}

      {/* Products header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-2xl font-semibold">Products</h2>
        {isOwner && (
          <Dialog open={productOpen} onOpenChange={setProductOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                data-ocid="shop.add_product.open_modal_button"
              >
                <Plus className="h-4 w-4 mr-2" /> Add Product
              </Button>
            </DialogTrigger>
            <DialogContent
              className="sm:max-w-md"
              data-ocid="shop.add_product.dialog"
            >
              <DialogHeader>
                <DialogTitle className="font-display text-xl">
                  Add Product
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label htmlFor="prod-title">Title</Label>
                  <Input
                    id="prod-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Product name"
                    data-ocid="shop.product.input"
                  />
                </div>
                <div>
                  <Label htmlFor="prod-desc">Description</Label>
                  <Textarea
                    id="prod-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your product"
                    data-ocid="shop.product.textarea"
                  />
                </div>
                <div>
                  <Label htmlFor="prod-price">Price (ICP)</Label>
                  <Input
                    id="prod-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={priceIcp}
                    onChange={(e) => setPriceIcp(e.target.value)}
                    placeholder="e.g. 2.5"
                    data-ocid="shop.product.price.input"
                  />
                </div>
                <div>
                  <Label htmlFor="prod-img">Image (optional)</Label>
                  <Input
                    id="prod-img"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                    data-ocid="shop.product.upload_button"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setProductOpen(false)}
                  data-ocid="shop.product.cancel_button"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddProduct}
                  disabled={addProduct.isPending}
                  className="bg-accent text-accent-foreground"
                  data-ocid="shop.product.submit_button"
                >
                  {addProduct.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  {addProduct.isPending ? "Adding..." : "Add"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {productsLoading ? (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          data-ocid="shop.products.loading_state"
        >
          {["a", "b", "c"].map((k) => (
            <Card key={k} className="overflow-hidden bg-card border-border">
              <Skeleton className="h-44 w-full" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : products?.length === 0 ? (
        <div
          className="text-center py-16"
          data-ocid="shop.products.empty_state"
        >
          <Package className="h-14 w-14 mx-auto mb-4 text-muted-foreground/40" />
          <p className="text-muted-foreground">
            No products yet{isOwner ? " — add your first one!" : "."}
          </p>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.06 } },
            hidden: {},
          }}
        >
          {products?.map((p, i) => (
            <motion.div
              key={p.id.toString()}
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0 },
              }}
              data-ocid={`shop.product.item.${i + 1}`}
            >
              <Card className="bg-card border-border overflow-hidden relative group">
                <div className="h-44 overflow-hidden">
                  {p.imageBlob ? (
                    <img
                      src={p.imageBlob.getDirectURL()}
                      alt={p.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-muted/50 to-muted/20 flex items-center justify-center">
                      <Package className="h-10 w-10 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-foreground">{p.title}</h3>
                  {p.description && (
                    <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                      {p.description}
                    </p>
                  )}
                  <p className="text-accent font-semibold mt-2">
                    {formatPrice(p.price)}
                  </p>
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(p.id)}
                      disabled={deleteProduct.isPending}
                      data-ocid={`shop.product.delete_button.${i + 1}`}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Remove
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </main>
  );
}
