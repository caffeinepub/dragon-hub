import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@tanstack/react-router";
import {
  Ban,
  Bell,
  CheckCircle,
  Download,
  Edit2,
  Eye,
  Loader2,
  Package,
  Plus,
  Shield,
  ShoppingBag,
  Store,
  Tag,
  Trash2,
  UserX,
  X,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../backend";
import type { ShopProduct } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAddShopProduct,
  useAllListings,
  useAllShopCategories,
  useAllShops,
  useApproveDownload,
  useBanUser,
  useCreateShop,
  useDeleteShopProduct,
  useDismissAlert,
  useDownloadRequests,
  useIsCreatorOrAdmin,
  useMarkAlertRead,
  useMarkAllAlertsRead,
  useRejectDownload,
  useSellerAlerts,
  useShopBans,
  useShopProducts,
  useShopsByOwner,
  useUnbanUser,
  useUpdateShop,
  useUpdateShopProduct,
} from "../hooks/useQueries";

function formatPrice(price: bigint, currency: string): string {
  const amt = (Number(price) / 1e8).toFixed(2);
  return `${amt} ${currency || "ICP"}`;
}

function CategoryEditor({
  categories,
  onChange,
}: {
  categories: string[];
  onChange: (cats: string[]) => void;
}) {
  const [input, setInput] = useState("");

  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !categories.includes(trimmed)) {
      onChange([...categories, trimmed]);
    }
    setInput("");
  };

  const remove = (cat: string) => onChange(categories.filter((c) => c !== cat));

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add category..."
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          data-ocid="sellers.category.input"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={add}
          data-ocid="sellers.category.button"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => (
          <Badge
            key={cat}
            variant="secondary"
            className="flex items-center gap-1 pr-1"
          >
            <Tag className="h-3 w-3" />
            {cat}
            <button
              type="button"
              onClick={() => remove(cat)}
              className="ml-0.5 hover:text-destructive transition-colors"
              aria-label={`Remove ${cat}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}

function ListingForm({
  initial,
  shopId,
  onDone,
}: {
  initial?: ShopProduct;
  shopId: bigint;
  onDone: () => void;
}) {
  const addProduct = useAddShopProduct();
  const updateProduct = useUpdateShopProduct();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [priceVal, setPriceVal] = useState(
    initial ? (Number(initial.price) / 1e8).toFixed(2) : "",
  );
  const [currency, setCurrency] = useState(initial?.currency ?? "USD");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [stock, setStock] = useState(
    initial ? Number(initial.stock).toString() : "1",
  );
  const [isDigital, setIsDigital] = useState(initial?.isDigital ?? false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [paymentLink, setPaymentLink] = useState(initial?.paymentLink ?? "");
  const [digitalFile, setDigitalFile] = useState<File | null>(null);

  const isEditing = !!initial;
  const isPending = addProduct.isPending || updateProduct.isPending;

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    const price = BigInt(Math.round((Number.parseFloat(priceVal) || 0) * 1e8));
    const stockNum = BigInt(Math.max(0, Number.parseInt(stock) || 0));

    try {
      if (isEditing) {
        const existingBlobs =
          imageFiles.length === 0
            ? (initial.imageBlobs ?? [])
            : await Promise.all(
                imageFiles.map((f) =>
                  f
                    .arrayBuffer()
                    .then((b) => ExternalBlob.fromBytes(new Uint8Array(b))),
                ),
              );
        await updateProduct.mutateAsync({
          productId: initial.id,
          shopId,
          title,
          description,
          price,
          currency: currency || "USD",
          imageBlobs: existingBlobs,
          paymentLink,
          stock: stockNum,
          isDigital,
          category,
          digitalFileBlob: initial.digitalFileBlob ?? null,
        });
        toast.success("Listing updated!");
      } else {
        await addProduct.mutateAsync({
          shopId,
          title,
          description,
          price,
          currency: currency || "USD",
          imageFiles,
          paymentLink,
          stock: stockNum,
          isDigital,
          category,
          digitalFile: isDigital ? digitalFile : null,
        });
        toast.success("Listing added!");
      }
      onDone();
    } catch {
      toast.error(
        isEditing ? "Failed to update listing" : "Failed to add listing",
      );
    }
  };

  return (
    <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/20">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Title *</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Product name"
            data-ocid="sellers.listing.input"
          />
        </div>
        <div>
          <Label>Category</Label>
          <Input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Digital Art"
            data-ocid="sellers.listing.category.input"
          />
        </div>
      </div>
      <div>
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your product"
          rows={2}
          data-ocid="sellers.listing.textarea"
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="col-span-1">
          <Label>Price</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={priceVal}
            onChange={(e) => setPriceVal(e.target.value)}
            placeholder="0.00"
            data-ocid="sellers.listing.price.input"
          />
        </div>
        <div className="col-span-1">
          <Label>Currency</Label>
          <Input
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            placeholder="USD"
            data-ocid="sellers.listing.currency.input"
          />
        </div>
        <div className="col-span-1">
          <Label>Stock</Label>
          <Input
            type="number"
            min="0"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="1"
            data-ocid="sellers.listing.stock.input"
          />
        </div>
        <div className="col-span-1 flex flex-col justify-end">
          <Label className="mb-2">Digital Product</Label>
          <Switch
            checked={isDigital}
            onCheckedChange={setIsDigital}
            data-ocid="sellers.listing.digital.switch"
          />
        </div>
      </div>
      <div>
        <Label>Payment Link</Label>
        <Input
          value={paymentLink}
          onChange={(e) => setPaymentLink(e.target.value)}
          placeholder="https://paypal.me/... or Stripe link"
          data-ocid="sellers.listing.payment.input"
        />
      </div>
      {isDigital && (
        <div>
          <Label>
            Digital File {initial?.digitalFileBlob ? "(replace current)" : "*"}
          </Label>
          {initial?.digitalFileBlob && !digitalFile && (
            <p className="text-xs text-muted-foreground mb-1">
              Current file is set. Upload a new one to replace it.
            </p>
          )}
          <Input
            type="file"
            onChange={(e) => setDigitalFile(e.target.files?.[0] ?? null)}
            data-ocid="sellers.listing.digital_file.upload_button"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Only downloadable after payment approval.
          </p>
        </div>
      )}
      <div>
        <Label>
          Images (optional{isEditing ? " — leave blank to keep existing" : ""})
        </Label>
        <Input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setImageFiles(Array.from(e.target.files ?? []))}
          data-ocid="sellers.listing.upload_button"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={onDone}
          data-ocid="sellers.listing.cancel_button"
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isPending}
          className="bg-accent text-accent-foreground hover:bg-accent/90"
          data-ocid="sellers.listing.submit_button"
        >
          {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          {isPending ? "Saving..." : isEditing ? "Save Changes" : "Add Listing"}
        </Button>
      </div>
    </div>
  );
}

function ShopListings({ shopId }: { shopId: bigint }) {
  const { data: products, isLoading } = useShopProducts(shopId);
  const deleteProduct = useDeleteShopProduct();
  const [editingId, setEditingId] = useState<bigint | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const handleDelete = async (productId: bigint) => {
    if (!confirm("Delete this listing?")) return;
    try {
      await deleteProduct.mutateAsync({ productId, shopId });
      toast.success("Listing deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div data-ocid="sellers.listings.panel">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2">
          <Package className="h-5 w-5 text-accent" /> Listings
        </h3>
        {!showAdd && (
          <Button
            size="sm"
            onClick={() => setShowAdd(true)}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            data-ocid="sellers.listing.open_modal_button"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Listing
          </Button>
        )}
      </div>

      {showAdd && (
        <div className="mb-4">
          <ListingForm shopId={shopId} onDone={() => setShowAdd(false)} />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2" data-ocid="sellers.listings.loading_state">
          {[1, 2, 3].map((k) => (
            <Skeleton key={k} className="h-16 w-full" />
          ))}
        </div>
      ) : !products?.length ? (
        <div
          className="text-center py-10 border border-dashed border-border rounded-lg"
          data-ocid="sellers.listings.empty_state"
        >
          <Package className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">
            No listings yet. Add your first product!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((p, i) => (
            <div
              key={p.id.toString()}
              data-ocid={`sellers.listing.item.${i + 1}`}
            >
              {editingId === p.id ? (
                <ListingForm
                  initial={p}
                  shopId={shopId}
                  onDone={() => setEditingId(null)}
                />
              ) : (
                <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-card hover:border-accent/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground truncate">
                        {p.title}
                      </span>
                      {p.isDigital && (
                        <Badge
                          variant="outline"
                          className="text-xs border-accent/50 text-accent"
                        >
                          Digital
                        </Badge>
                      )}
                      {p.category && (
                        <Badge variant="secondary" className="text-xs">
                          {p.category}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-accent text-sm font-semibold">
                        {formatPrice(p.price, p.currency)}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {Number(p.stock) === 0 ? (
                          <span className="text-destructive">Out of stock</span>
                        ) : (
                          `${Number(p.stock)} in stock`
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingId(p.id)}
                      data-ocid={`sellers.listing.edit_button.${i + 1}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(p.id)}
                      disabled={deleteProduct.isPending}
                      data-ocid={`sellers.listing.delete_button.${i + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AlertsPanel({ shopId }: { shopId: bigint }) {
  const { data: alerts, isLoading } = useSellerAlerts(shopId);
  const markRead = useMarkAlertRead();
  const dismiss = useDismissAlert();
  const markAllRead = useMarkAllAlertsRead();

  const unreadCount = alerts?.filter((a) => !a.isRead).length ?? 0;

  const truncatePrincipal = (p: { toString(): string }) => {
    const s = p.toString();
    return s.length > 14 ? `${s.slice(0, 8)}...${s.slice(-5)}` : s;
  };

  const formatDate = (ts: bigint) =>
    new Date(Number(ts) / 1_000_000).toLocaleString();

  return (
    <div className="mt-6" data-ocid="sellers.alerts.panel">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="h-5 w-5 text-primary" />
        <h3 className="font-display text-lg font-semibold">Alerts</h3>
        {unreadCount > 0 && (
          <span className="ml-1 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
            {unreadCount}
          </span>
        )}
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-xs text-muted-foreground"
            onClick={() =>
              markAllRead
                .mutateAsync(shopId)
                .catch(() => toast.error("Failed to mark all read"))
            }
            disabled={markAllRead.isPending}
            data-ocid="sellers.alerts.button"
          >
            Mark All Read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2" data-ocid="sellers.alerts.loading_state">
          {[1, 2].map((k) => (
            <Skeleton key={k} className="h-14 w-full" />
          ))}
        </div>
      ) : !alerts?.length ? (
        <p
          className="text-sm text-muted-foreground"
          data-ocid="sellers.alerts.empty_state"
        >
          No alerts yet. You&apos;ll be notified here when buyers purchase or
          request downloads.
        </p>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert, i) => {
            const isPurchase = "purchase" in alert.alertType;
            return (
              <div
                key={alert.id.toString()}
                className={`flex items-start justify-between gap-3 p-3 rounded-lg border transition-colors ${
                  alert.isRead
                    ? "border-border/40 bg-muted/10 opacity-70"
                    : "border-primary/30 bg-primary/5"
                }`}
                data-ocid={`sellers.alerts.item.${i + 1}`}
              >
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  {isPurchase ? (
                    <ShoppingBag className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                  ) : (
                    <Download className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{alert.message}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {truncatePrincipal(alert.buyerPrincipal)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(alert.timestamp)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {!alert.isRead && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-primary hover:bg-primary/10"
                      onClick={() =>
                        markRead
                          .mutateAsync(alert.id)
                          .catch(() => toast.error("Failed"))
                      }
                      data-ocid={`sellers.alerts.confirm_button.${i + 1}`}
                    >
                      Mark Read
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                    onClick={() =>
                      dismiss
                        .mutateAsync(alert.id)
                        .catch(() => toast.error("Failed"))
                    }
                    data-ocid={`sellers.alerts.cancel_button.${i + 1}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BanManagementPanel({ shopId }: { shopId: bigint }) {
  const { data: bans, isLoading } = useShopBans(shopId);
  const banUser = useBanUser();
  const unbanUser = useUnbanUser();
  const [banInput, setBanInput] = useState("");

  const truncatePrincipal = (p: { toString(): string }) => {
    const s = p.toString();
    return s.length > 14 ? `${s.slice(0, 8)}...${s.slice(-5)}` : s;
  };

  const handleBan = async () => {
    const trimmed = banInput.trim();
    if (!trimmed) return;
    try {
      await banUser.mutateAsync({ shopId, principalStr: trimmed });
      setBanInput("");
      toast.success("User banned");
    } catch {
      toast.error("Failed to ban user — check the principal ID");
    }
  };

  return (
    <div className="mt-6" data-ocid="sellers.bans.panel">
      <div className="flex items-center gap-2 mb-3">
        <Ban className="h-5 w-5 text-destructive" />
        <h3 className="font-display text-lg font-semibold">Ban Management</h3>
        {bans && bans.length > 0 && (
          <Badge variant="destructive" className="ml-1">
            {bans.length}
          </Badge>
        )}
      </div>

      {/* Ban input */}
      <div className="flex gap-2 mb-4">
        <Input
          value={banInput}
          onChange={(e) => setBanInput(e.target.value)}
          placeholder="Paste user principal ID to ban..."
          className="flex-1 font-mono text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleBan();
          }}
          data-ocid="sellers.bans.input"
        />
        <Button
          variant="destructive"
          size="sm"
          onClick={handleBan}
          disabled={banUser.isPending || !banInput.trim()}
          data-ocid="sellers.bans.button"
        >
          {banUser.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserX className="h-4 w-4 mr-1" />
          )}
          Ban User
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2" data-ocid="sellers.bans.loading_state">
          {[1, 2].map((k) => (
            <Skeleton key={k} className="h-10 w-full" />
          ))}
        </div>
      ) : !bans?.length ? (
        <p
          className="text-sm text-muted-foreground"
          data-ocid="sellers.bans.empty_state"
        >
          No users are currently banned from this shop.
        </p>
      ) : (
        <div className="space-y-2">
          {bans.map((principal, i) => (
            <div
              key={principal.toString()}
              className="flex items-center justify-between p-2.5 border border-destructive/20 rounded-lg bg-destructive/5"
              data-ocid={`sellers.bans.item.${i + 1}`}
            >
              <span className="font-mono text-xs text-foreground">
                {truncatePrincipal(principal)}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={() =>
                  unbanUser
                    .mutateAsync({ shopId, principal })
                    .then(() => toast.success("User unbanned"))
                    .catch(() => toast.error("Failed to unban"))
                }
                disabled={unbanUser.isPending}
                data-ocid={`sellers.bans.delete_button.${i + 1}`}
              >
                Unban
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ShopEditor({ shopId }: { shopId: bigint }) {
  const { data: shops } = useAllShops();
  const updateShop = useUpdateShop();

  const shop = shops?.find((s) => s.id === shopId) ?? null;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [isNsfw, setIsNsfw] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (shop && !initialized) {
      setName(shop.name);
      setDescription(shop.description);
      setRules(shop.rules);
      setContactInfo(shop.contactInfo);
      setIsNsfw(shop.isNsfw);
      setCategories(shop.categories);
      setInitialized(true);
    }
  }, [shop, initialized]);

  const handleSave = async () => {
    if (!shop) return;
    try {
      let bannerBlob: ExternalBlob | null = null;
      let logoBlob: ExternalBlob | null = null;
      if (bannerFile) {
        bannerBlob = ExternalBlob.fromBytes(
          new Uint8Array(await bannerFile.arrayBuffer()),
        );
      } else if (shop.bannerBlob) {
        bannerBlob = shop.bannerBlob;
      }
      if (logoFile) {
        logoBlob = ExternalBlob.fromBytes(
          new Uint8Array(await logoFile.arrayBuffer()),
        );
      } else if (shop.logoBlob) {
        logoBlob = shop.logoBlob;
      }
      await updateShop.mutateAsync({
        shopId: shop.id,
        name,
        description,
        rules,
        contactInfo,
        bannerBlob,
        logoBlob,
        isNsfw,
        categories,
      });
      toast.success("Shop updated!");
    } catch {
      toast.error("Failed to update shop");
    }
  };

  if (!shop) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-ocid="sellers.shop_editor.panel">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold flex items-center gap-2">
          <Store className="h-5 w-5 text-accent" /> My Shop
        </h2>
        <Link
          to="/shops/$id"
          params={{ id: shopId.toString() }}
          data-ocid="sellers.shop.link"
        >
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-1" /> View Shop
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="seller-name">Shop Name</Label>
          <Input
            id="seller-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            data-ocid="sellers.shop.name.input"
          />
        </div>
        <div>
          <Label htmlFor="seller-contact">Contact / DM Link</Label>
          <Input
            id="seller-contact"
            value={contactInfo}
            onChange={(e) => setContactInfo(e.target.value)}
            placeholder="https://... or email"
            data-ocid="sellers.shop.contact.input"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="seller-desc">Description</Label>
        <Textarea
          id="seller-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          data-ocid="sellers.shop.textarea"
        />
      </div>

      <div>
        <Label htmlFor="seller-rules">Shop Rules</Label>
        <Textarea
          id="seller-rules"
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          rows={3}
          placeholder="Refund policy, shipping terms..."
          data-ocid="sellers.shop.rules.textarea"
        />
      </div>

      <div>
        <Label>Categories</Label>
        <CategoryEditor categories={categories} onChange={setCategories} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="seller-logo">Shop Logo</Label>
          {shop.logoBlob && !logoFile && (
            <div className="mb-2">
              <img
                src={shop.logoBlob.getDirectURL()}
                alt="Current logo"
                className="h-16 w-16 rounded-full object-cover border border-border"
              />
            </div>
          )}
          <Input
            id="seller-logo"
            type="file"
            accept="image/*"
            onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
            data-ocid="sellers.shop.logo.upload_button"
          />
        </div>
        <div>
          <Label htmlFor="seller-banner">Banner Image</Label>
          {shop.bannerBlob && !bannerFile && (
            <div className="mb-2">
              <img
                src={shop.bannerBlob.getDirectURL()}
                alt="Current banner"
                className="h-16 w-full rounded-md object-cover border border-border"
              />
            </div>
          )}
          <Input
            id="seller-banner"
            type="file"
            accept="image/*"
            onChange={(e) => setBannerFile(e.target.files?.[0] ?? null)}
            data-ocid="sellers.shop.banner.upload_button"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
        <Switch
          checked={isNsfw}
          onCheckedChange={setIsNsfw}
          id="seller-nsfw"
          data-ocid="sellers.shop.nsfw.switch"
        />
        <div>
          <Label htmlFor="seller-nsfw" className="cursor-pointer font-medium">
            Mark as NSFW
          </Label>
          <p className="text-xs text-muted-foreground">
            This shop contains adult content (18+ only)
          </p>
        </div>
        {isNsfw && (
          <Badge className="ml-auto bg-destructive/20 text-destructive border-destructive/30">
            NSFW
          </Badge>
        )}
      </div>

      <Button
        onClick={handleSave}
        disabled={updateShop.isPending}
        className="bg-accent text-accent-foreground hover:bg-accent/90 w-full sm:w-auto"
        data-ocid="sellers.shop.save_button"
      >
        {updateShop.isPending ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : null}
        {updateShop.isPending ? "Saving..." : "Save Shop"}
      </Button>

      <Separator />

      <ShopListings shopId={shopId} />
      <Separator className="mt-6" />
      <DownloadRequestsPanel shopId={shopId} />
      <Separator className="mt-6" />
      <AlertsPanel shopId={shopId} />
      <Separator className="mt-6" />
      <BanManagementPanel shopId={shopId} />
    </div>
  );
}

function CreateShopForm({ defaultNsfw = false }: { defaultNsfw?: boolean }) {
  const createShop = useCreateShop();
  const updateShop = useUpdateShop();
  const { refetch } = useAllShops();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [isNsfw, setIsNsfw] = useState(defaultNsfw);
  const [categories, setCategories] = useState<string[]>([]);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Shop name is required");
      return;
    }
    setIsPending(true);
    try {
      let bannerBlob: ExternalBlob | null = null;
      let logoBlob: ExternalBlob | null = null;
      if (bannerFile) {
        bannerBlob = ExternalBlob.fromBytes(
          new Uint8Array(await bannerFile.arrayBuffer()),
        );
      }
      if (logoFile) {
        logoBlob = ExternalBlob.fromBytes(
          new Uint8Array(await logoFile.arrayBuffer()),
        );
      }
      const shopId = await createShop.mutateAsync({
        name,
        description,
        rules,
        contactInfo,
        bannerFile,
        isNsfw,
        categories,
      });
      if (logoBlob || bannerBlob) {
        await updateShop.mutateAsync({
          shopId,
          name,
          description,
          rules,
          contactInfo,
          bannerBlob,
          logoBlob,
          isNsfw,
          categories,
        });
      }
      toast.success("Shop created!");
      await refetch();
    } catch {
      toast.error("Failed to create shop");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto" data-ocid="sellers.create_shop.panel">
      <CardHeader>
        <CardTitle className="font-display text-2xl flex items-center gap-2">
          <Store className="h-6 w-6 text-accent" /> Open Your Shop
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="create-name">Shop Name *</Label>
            <Input
              id="create-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your shop name"
              data-ocid="sellers.create.name.input"
            />
          </div>
          <div>
            <Label htmlFor="create-contact">Contact / DM Link</Label>
            <Input
              id="create-contact"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              placeholder="https://... or email"
              data-ocid="sellers.create.contact.input"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="create-desc">Description</Label>
          <Textarea
            id="create-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your shop"
            data-ocid="sellers.create.textarea"
          />
        </div>
        <div>
          <Label htmlFor="create-rules">Shop Rules</Label>
          <Textarea
            id="create-rules"
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            placeholder="Return policy, shipping info..."
            data-ocid="sellers.create.rules.textarea"
          />
        </div>
        <div>
          <Label>Categories</Label>
          <CategoryEditor categories={categories} onChange={setCategories} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="create-logo">Logo Image</Label>
            <Input
              id="create-logo"
              type="file"
              accept="image/*"
              onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
              data-ocid="sellers.create.logo.upload_button"
            />
          </div>
          <div>
            <Label htmlFor="create-banner">Banner Image</Label>
            <Input
              id="create-banner"
              type="file"
              accept="image/*"
              onChange={(e) => setBannerFile(e.target.files?.[0] ?? null)}
              data-ocid="sellers.create.banner.upload_button"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
          <Switch
            checked={isNsfw}
            onCheckedChange={setIsNsfw}
            id="create-nsfw"
            data-ocid="sellers.create.nsfw.switch"
          />
          <Label htmlFor="create-nsfw" className="cursor-pointer">
            This shop contains adult/NSFW content (18+)
          </Label>
        </div>
        <Button
          onClick={handleCreate}
          disabled={isPending}
          className="bg-accent text-accent-foreground hover:bg-accent/90 w-full"
          data-ocid="sellers.create.submit_button"
        >
          {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          {isPending ? "Creating..." : "Create Shop"}
        </Button>
      </CardContent>
    </Card>
  );
}

function DownloadRequestsPanel({ shopId }: { shopId: bigint }) {
  const { data: requests, isLoading } = useDownloadRequests(shopId);
  const approveDownload = useApproveDownload();
  const rejectDownload = useRejectDownload();

  const pending = requests?.filter((r) => r.status === "pending") ?? [];
  const resolved = requests?.filter((r) => r.status !== "pending") ?? [];

  const handleApprove = async (requestId: bigint) => {
    try {
      await approveDownload.mutateAsync({ requestId, shopId });
      toast.success("Download approved");
    } catch {
      toast.error("Failed to approve");
    }
  };

  const handleReject = async (requestId: bigint) => {
    try {
      await rejectDownload.mutateAsync({ requestId, shopId });
      toast.success("Request rejected");
    } catch {
      toast.error("Failed to reject");
    }
  };

  const truncatePrincipal = (p: any) => {
    const s = p.toString();
    return s.length > 14 ? `${s.slice(0, 8)}...${s.slice(-5)}` : s;
  };

  return (
    <div className="mt-6" data-ocid="sellers.download_requests.panel">
      <div className="flex items-center gap-2 mb-3">
        <Download className="h-5 w-5 text-accent" />
        <h3 className="font-display text-lg font-semibold">
          Download Requests
        </h3>
        {pending.length > 0 && (
          <span className="ml-1 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
            {pending.length}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((k) => (
            <Skeleton key={k} className="h-12 w-full" />
          ))}
        </div>
      ) : requests?.length === 0 ? (
        <p
          className="text-sm text-muted-foreground"
          data-ocid="sellers.download_requests.empty_state"
        >
          No download requests yet.
        </p>
      ) : (
        <div className="space-y-2">
          {pending.map((req, i) => (
            <div
              key={req.id.toString()}
              className="flex items-center justify-between p-3 border border-primary/30 rounded-lg bg-primary/5"
              data-ocid={`sellers.download_requests.item.${i + 1}`}
            >
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Requester</p>
                <p className="font-mono text-xs text-foreground">
                  {truncatePrincipal(req.requester)}
                </p>
              </div>
              <div className="flex gap-2 ml-3">
                <Button
                  size="sm"
                  className="h-7 px-2 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => handleApprove(req.id)}
                  disabled={approveDownload.isPending}
                  data-ocid={`sellers.download_requests.confirm_button.${i + 1}`}
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                  onClick={() => handleReject(req.id)}
                  disabled={rejectDownload.isPending}
                  data-ocid={`sellers.download_requests.cancel_button.${i + 1}`}
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                  Reject
                </Button>
              </div>
            </div>
          ))}
          {resolved.map((req) => (
            <div
              key={req.id.toString()}
              className="flex items-center justify-between p-3 border border-border/40 rounded-lg bg-muted/10 opacity-70"
            >
              <p className="font-mono text-xs text-muted-foreground">
                {truncatePrincipal(req.requester)}
              </p>
              <span
                className={`text-xs font-medium ${
                  req.status === "approved"
                    ? "text-green-500"
                    : "text-destructive"
                }`}
              >
                {req.status === "approved" ? "Approved" : "Rejected"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BuyersActivity() {
  const { data: listings, isLoading } = useAllListings();

  return (
    <section className="mt-10" data-ocid="sellers.activity.panel">
      <Separator className="mb-8" />
      <div className="flex items-center gap-2 mb-6">
        <ShoppingBag className="h-5 w-5 text-accent" />
        <h2 className="font-display text-xl font-bold">
          What Buyers Are Looking At
        </h2>
        <Badge variant="secondary" className="ml-2">
          {listings?.length ?? 0}
        </Badge>
      </div>
      {isLoading ? (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          data-ocid="sellers.activity.loading_state"
        >
          {[1, 2, 3].map((k) => (
            <Skeleton key={k} className="h-32 w-full" />
          ))}
        </div>
      ) : !listings?.length ? (
        <div
          className="text-center py-10"
          data-ocid="sellers.activity.empty_state"
        >
          <ShoppingBag className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">
            No active marketplace listings yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((listing, i) => (
            <Link
              key={listing.id.toString()}
              to="/marketplace/$id"
              params={{ id: listing.id.toString() }}
              data-ocid={`sellers.activity.item.${i + 1}`}
            >
              <Card className="bg-card border-border hover:border-accent/40 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {listing.image && (
                      <img
                        src={listing.image.getDirectURL()}
                        alt={listing.title}
                        className="h-14 w-14 rounded-md object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {listing.title}
                      </p>
                      <p className="text-accent text-sm font-semibold">
                        {(Number(listing.price) / 1e8).toFixed(2)} ICP
                      </p>
                      {listing.isSold && (
                        <Badge className="mt-1 bg-muted text-muted-foreground">
                          Sold
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export function SellersPage() {
  const { identity } = useInternetIdentity();
  const { data: canSell, isLoading: roleLoading } = useIsCreatorOrAdmin();
  const principal = identity?.getPrincipal();
  const { data: myShopsArr, isLoading: shopLoading } =
    useShopsByOwner(principal);

  const myShops = Array.isArray(myShopsArr) ? myShopsArr : [];
  const nsfwShop = myShops.find((s) => s.isNsfw) ?? null;
  const regularShop = myShops.find((s) => !s.isNsfw) ?? null;

  if (!identity) {
    return (
      <main
        className="container mx-auto px-4 py-20 text-center"
        data-ocid="sellers.page"
      >
        <Store className="h-16 w-16 mx-auto mb-4 text-muted-foreground/40" />
        <h1 className="font-display text-3xl font-bold mb-3">Sellers Area</h1>
        <p className="text-muted-foreground mb-6">
          Sign in to access your seller dashboard.
        </p>
        <p className="text-sm text-muted-foreground/60">
          Manage your shop, listings, and see what buyers are browsing.
        </p>
      </main>
    );
  }

  if (roleLoading || shopLoading) {
    return (
      <main
        className="container mx-auto px-4 py-10"
        data-ocid="sellers.loading_state"
      >
        <Skeleton className="h-10 w-48 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((k) => (
            <Skeleton key={k} className="h-24 w-full" />
          ))}
        </div>
      </main>
    );
  }

  if (!canSell) {
    return (
      <main
        className="container mx-auto px-4 py-20 text-center"
        data-ocid="sellers.no_role.panel"
      >
        <Store className="h-16 w-16 mx-auto mb-4 text-muted-foreground/40" />
        <h1 className="font-display text-3xl font-bold mb-3">Sellers Area</h1>
        <p className="text-muted-foreground mb-4">
          You need a <strong>Creator</strong> or <strong>Admin</strong> role to
          open a shop.
        </p>
        <Link to="/admin" data-ocid="sellers.admin.link">
          <Button variant="outline">
            <Shield className="h-4 w-4 mr-2" />
            Go to Admin Panel
          </Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-10" data-ocid="sellers.page">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-8">
          <h1 className="font-display text-4xl font-bold">Sellers Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage your shop and keep track of buyer activity.
          </p>
        </div>

        {/* Regular shop slot */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Store className="h-5 w-5 text-accent" />
            <h2 className="font-display text-xl font-semibold">Regular Shop</h2>
            {regularShop && (
              <span className="text-xs text-muted-foreground ml-1">
                (non-NSFW)
              </span>
            )}
          </div>
          {regularShop ? (
            <ShopEditor shopId={regularShop.id} />
          ) : (
            <CreateShopForm defaultNsfw={false} />
          )}
        </div>

        {/* NSFW shop slot */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Store className="h-5 w-5 text-destructive" />
            <h2 className="font-display text-xl font-semibold">NSFW Shop</h2>
            <span className="text-xs bg-destructive/20 text-destructive border border-destructive/30 rounded px-1.5 py-0.5">
              18+
            </span>
          </div>
          {nsfwShop ? (
            <ShopEditor shopId={nsfwShop.id} />
          ) : (
            <CreateShopForm defaultNsfw={true} />
          )}
        </div>

        <BuyersActivity />
      </motion.div>
    </main>
  );
}
