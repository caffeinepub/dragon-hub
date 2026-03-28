import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  EyeOff,
  Loader2,
  Search,
  Store,
  Tag,
  Trash2,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Shop } from "../backend";
import { useAllShops, useDeleteShop, useIsAdmin } from "../hooks/useQueries";

function ShopCard({
  shop,
  index,
  isAdmin,
  onDelete,
  deleting,
}: {
  shop: Shop;
  index: number;
  isAdmin: boolean;
  onDelete: (id: bigint, name: string) => void;
  deleting: boolean;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0 },
      }}
      data-ocid={`shops.item.${index + 1}`}
      className="relative"
    >
      {isAdmin && (
        <button
          type="button"
          className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-destructive/80 hover:bg-destructive text-white transition-colors"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(shop.id, shop.name);
          }}
          disabled={deleting}
          aria-label="Delete shop"
          data-ocid={`shops.delete_button.${index + 1}`}
        >
          {deleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </button>
      )}
      {shop.isNsfw && (
        <div className="absolute top-2 left-2 z-10">
          <Badge className="bg-destructive/90 text-white border-0 text-xs font-bold">
            NSFW 18+
          </Badge>
        </div>
      )}
      <Link to="/shops/$id" params={{ id: shop.id.toString() }}>
        <Card className="bg-card border-border overflow-hidden card-hover group cursor-pointer h-full">
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
            {shop.logoBlob && (
              <div className="absolute bottom-2 left-3">
                <img
                  src={shop.logoBlob.getDirectURL()}
                  alt={`${shop.name} logo`}
                  className="h-10 w-10 rounded-full object-cover border-2 border-background shadow"
                />
              </div>
            )}
          </div>
          <CardContent className="p-4">
            <h3 className="font-display font-semibold text-lg text-foreground leading-tight">
              {shop.name}
            </h3>
            {shop.description && (
              <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                {shop.description}
              </p>
            )}
            {shop.categories.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {shop.categories.slice(0, 3).map((cat) => (
                  <Badge key={cat} variant="secondary" className="text-xs">
                    <Tag className="h-2.5 w-2.5 mr-0.5" />
                    {cat}
                  </Badge>
                ))}
                {shop.categories.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{shop.categories.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

const NSFW_CONSENT_KEY = "dragonhub_nsfw_consent";

export function ShopsPage() {
  const { data: shops, isLoading } = useAllShops();
  const { data: isAdmin } = useIsAdmin();
  const deleteShop = useDeleteShop();

  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<bigint | null>(null);
  const [nsfwConsent, setNsfwConsent] = useState(
    () => sessionStorage.getItem(NSFW_CONSENT_KEY) === "true",
  );
  const [showAgeGate, setShowAgeGate] = useState(false);
  const [showNsfw, setShowNsfw] = useState(false);

  const { safeShops, nsfwShops } = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = (shops ?? []).filter(
      (s) =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.categories.some((c) => c.toLowerCase().includes(q)),
    );
    return {
      safeShops: filtered.filter((s) => !s.isNsfw),
      nsfwShops: filtered.filter((s) => s.isNsfw),
    };
  }, [shops, search]);

  const visibleShops =
    showNsfw && nsfwConsent ? [...safeShops, ...nsfwShops] : safeShops;

  const handleDeleteShop = async (shopId: bigint, shopName: string) => {
    if (!confirm(`Delete "${shopName}"? This cannot be undone.`)) return;
    setDeletingId(shopId);
    try {
      await deleteShop.mutateAsync(shopId);
      toast.success("Shop deleted");
    } catch {
      toast.error("Failed to delete shop");
    } finally {
      setDeletingId(null);
    }
  };

  const handleNsfwProceed = () => {
    sessionStorage.setItem(NSFW_CONSENT_KEY, "true");
    setNsfwConsent(true);
    setShowNsfw(true);
    setShowAgeGate(false);
  };

  const handleNsfwToggle = (checked: boolean) => {
    if (checked) {
      if (nsfwConsent) {
        setShowNsfw(true);
      } else {
        setShowAgeGate(true);
      }
    } else {
      setShowNsfw(false);
    }
  };

  return (
    <main className="container mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-4xl font-bold">Shops</h1>
          <p className="text-muted-foreground mt-1">
            Discover unique dragon-crafted stores
          </p>
        </div>
        <Link to="/sellers" data-ocid="shops.sellers.link">
          <Button variant="outline" size="sm">
            <Store className="h-4 w-4 mr-2" />
            Manage My Shop
          </Button>
        </Link>
      </div>

      {/* Search + NSFW toggle row */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search shops by name, description or category..."
            className="pl-10"
            data-ocid="shops.search.input"
          />
        </div>
        {nsfwShops.length > 0 && (
          <div
            className="flex items-center gap-3 px-4 py-2 rounded-lg border border-destructive/30 bg-destructive/5 flex-shrink-0"
            data-ocid="shops.nsfw.panel"
          >
            <EyeOff className="h-4 w-4 text-destructive flex-shrink-0" />
            <Label
              htmlFor="nsfw-toggle"
              className="text-sm font-medium text-destructive cursor-pointer select-none whitespace-nowrap"
            >
              Show NSFW Shops
            </Label>
            <Switch
              id="nsfw-toggle"
              checked={showNsfw && nsfwConsent}
              onCheckedChange={handleNsfwToggle}
              data-ocid="shops.nsfw.toggle"
            />
          </div>
        )}
      </div>

      {showNsfw && nsfwConsent && nsfwShops.length > 0 && (
        <div className="flex items-center gap-2 mb-4 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive font-medium">
            Showing adult content — confirmed 18+
          </span>
        </div>
      )}

      {/* Loading */}
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
      ) : visibleShops.length === 0 && safeShops.length === 0 ? (
        <div className="text-center py-20" data-ocid="shops.empty_state">
          <Store className="h-16 w-16 mx-auto mb-4 text-muted-foreground/40" />
          <h3 className="font-display text-xl font-semibold mb-2">
            {search ? "No shops found" : "No shops yet"}
          </h3>
          <p className="text-muted-foreground">
            {search
              ? "Try a different search term."
              : "Be the first to open a shop on Dragon Hub!"}
          </p>
        </div>
      ) : visibleShops.length === 0 ? (
        <div className="text-center py-20" data-ocid="shops.empty_state">
          <Store className="h-16 w-16 mx-auto mb-4 text-muted-foreground/40" />
          <h3 className="font-display text-xl font-semibold mb-2">
            No matching shops
          </h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filters.
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
          {visibleShops.map((shop, i) => (
            <ShopCard
              key={shop.id.toString()}
              shop={shop}
              index={i}
              isAdmin={!!isAdmin}
              onDelete={handleDeleteShop}
              deleting={deletingId === shop.id}
            />
          ))}
        </motion.div>
      )}

      {/* Age gate dialog */}
      <Dialog open={showAgeGate} onOpenChange={setShowAgeGate}>
        <DialogContent
          className="sm:max-w-md"
          data-ocid="shops.age_gate.dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Age Verification Required
            </DialogTitle>
            <DialogDescription>
              This section contains adult content intended for mature audiences.
              You must be <strong>18 years or older</strong> to proceed.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground">
            By clicking &quot;I am 18+ &mdash; Proceed&quot;, you confirm that
            you are at least 18 years old and consent to viewing adult content.
          </div>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAgeGate(false)}
              className="flex-1"
              data-ocid="shops.age_gate.cancel_button"
            >
              Go Back
            </Button>
            <Button
              onClick={handleNsfwProceed}
              className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="shops.age_gate.confirm_button"
            >
              I am 18+ &mdash; Proceed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
