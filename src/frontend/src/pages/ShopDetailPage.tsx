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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Loader2,
  Mail,
  MessageSquare,
  Package,
  Plus,
  ScrollText,
  Store,
  Tag,
  Trash2,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAddShopProduct,
  useAnswerShopQuestion,
  useAskShopQuestion,
  useDeleteShop,
  useDeleteShopProduct,
  useIsAdmin,
  useMyDownloadRequests,
  useRequestDownload,
  useShop,
  useShopProducts,
  useShopQuestions,
} from "../hooks/useQueries";

function formatPrice(price: bigint, currency: string): string {
  const amt = (Number(price) / 1e8).toFixed(2);
  return `${amt} ${currency || "ICP"}`;
}

function isURL(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

function ImageCarousel({ urls, title }: { urls: string[]; title: string }) {
  const [idx, setIdx] = useState(0);
  if (urls.length === 0) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-muted/50 to-muted/20 flex items-center justify-center">
        <Package className="h-10 w-10 text-muted-foreground/40" />
      </div>
    );
  }
  return (
    <div className="relative w-full h-full group">
      <img
        src={urls[idx]}
        alt={`${title} ${idx + 1}`}
        className="w-full h-full object-cover transition-opacity duration-300"
      />
      {urls.length > 1 && (
        <>
          <button
            type="button"
            className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              setIdx((prev) => (prev - 1 + urls.length) % urls.length);
            }}
            aria-label="Previous image"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              setIdx((prev) => (prev + 1) % urls.length);
            }}
            aria-label="Next image"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1">
            {urls.map((url, i) => (
              <span
                key={url}
                className={`inline-block w-1.5 h-1.5 rounded-full transition-colors ${
                  i === idx ? "bg-white" : "bg-white/40"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function QASection({
  shopId,
  isOwner,
  isSignedIn,
}: {
  shopId: bigint;
  isOwner: boolean;
  isSignedIn: boolean;
}) {
  const { data: questions } = useShopQuestions(shopId);
  const askQuestion = useAskShopQuestion();
  const answerQuestion = useAnswerShopQuestion();

  const [questionText, setQuestionText] = useState("");
  const [answeringId, setAnsweringId] = useState<bigint | null>(null);
  const [answerText, setAnswerText] = useState("");

  const handleAsk = async () => {
    if (!questionText.trim()) return;
    try {
      await askQuestion.mutateAsync({ shopId, question: questionText });
      setQuestionText("");
      toast.success("Question submitted!");
    } catch {
      toast.error("Failed to submit question");
    }
  };

  const handleAnswer = async (questionId: bigint) => {
    if (!answerText.trim()) return;
    try {
      await answerQuestion.mutateAsync({
        questionId,
        answer: answerText,
        shopId,
      });
      setAnsweringId(null);
      setAnswerText("");
      toast.success("Answer posted!");
    } catch {
      toast.error("Failed to post answer");
    }
  };

  return (
    <section className="mt-10" data-ocid="shop.qa.panel">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-5 w-5 text-accent" />
        <h2 className="font-display text-xl font-semibold">Q&amp;A</h2>
      </div>

      {questions && questions.length > 0 ? (
        <div className="space-y-4 mb-6">
          {questions.map((q, i) => (
            <div
              key={q.id.toString()}
              className="bg-card border border-border rounded-lg p-4"
              data-ocid={`shop.qa.item.${i + 1}`}
            >
              <p className="font-medium text-foreground text-sm">
                {q.question}
              </p>
              {q.answered ? (
                <p className="mt-2 text-muted-foreground text-sm pl-3 border-l-2 border-accent">
                  {q.answer}
                </p>
              ) : (
                <p className="mt-1 text-muted-foreground/60 text-xs italic">
                  Awaiting answer…
                </p>
              )}
              {isOwner &&
                !q.answered &&
                (answeringId === q.id ? (
                  <div className="mt-3 flex gap-2">
                    <Input
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      placeholder="Your answer"
                      className="flex-1 text-sm"
                      data-ocid="shop.qa.answer.input"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleAnswer(q.id)}
                      disabled={answerQuestion.isPending}
                      className="bg-accent text-accent-foreground"
                      data-ocid="shop.qa.answer.submit_button"
                    >
                      {answerQuestion.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Post"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setAnsweringId(null);
                        setAnswerText("");
                      }}
                      data-ocid="shop.qa.answer.cancel_button"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => {
                      setAnsweringId(q.id);
                      setAnswerText("");
                    }}
                    data-ocid={`shop.qa.answer_button.${i + 1}`}
                  >
                    Answer
                  </Button>
                ))}
            </div>
          ))}
        </div>
      ) : (
        <p
          className="text-muted-foreground text-sm mb-6"
          data-ocid="shop.qa.empty_state"
        >
          No questions yet. Be the first to ask!
        </p>
      )}

      {isSignedIn && (
        <div className="flex gap-2">
          <Input
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="Ask the seller a question…"
            className="flex-1"
            data-ocid="shop.qa.input"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAsk();
            }}
          />
          <Button
            onClick={handleAsk}
            disabled={askQuestion.isPending || !questionText.trim()}
            className="bg-accent text-accent-foreground"
            data-ocid="shop.qa.submit_button"
          >
            {askQuestion.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Ask"
            )}
          </Button>
        </div>
      )}
    </section>
  );
}

export function ShopDetailPage() {
  const { id } = useParams({ from: "/shops/$id" });
  const shopId = BigInt(id);
  const { identity } = useInternetIdentity();
  const navigate = useNavigate();
  const { data: shop, isLoading: shopLoading } = useShop(shopId);
  const { data: products, isLoading: productsLoading } =
    useShopProducts(shopId);
  const { data: isAdmin } = useIsAdmin();
  const addProduct = useAddShopProduct();
  const deleteProduct = useDeleteShopProduct();
  const deleteShop = useDeleteShop();
  const requestDownload = useRequestDownload();
  const { data: myDownloadRequests } = useMyDownloadRequests();

  const [productOpen, setProductOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceVal, setPriceVal] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [paymentLink, setPaymentLink] = useState("");
  const [stock, setStock] = useState("1");
  const [isDigital, setIsDigital] = useState(false);
  const [category, setCategory] = useState("");

  const callerPrincipal = identity?.getPrincipal().toString();
  const isOwner = shop && callerPrincipal === shop.owner.toString();
  const isSignedIn = !!identity;

  const handleAddProduct = async () => {
    if (!title.trim() || !priceVal) {
      toast.error("Title and price are required");
      return;
    }
    const price = BigInt(Math.round(Number.parseFloat(priceVal) * 1e8));
    const stockNum = BigInt(Math.max(0, Number.parseInt(stock) || 0));
    try {
      await addProduct.mutateAsync({
        shopId,
        title,
        description,
        price,
        currency: currency || "ICP",
        imageFiles,
        paymentLink,
        stock: stockNum,
        isDigital,
        category,
      });
      toast.success("Product added!");
      setProductOpen(false);
      setTitle("");
      setDescription("");
      setPriceVal("");
      setCurrency("USD");
      setImageFiles([]);
      setPaymentLink("");
      setStock("1");
      setIsDigital(false);
      setCategory("");
    } catch {
      toast.error("Failed to add product");
    }
  };

  const handleDeleteProduct = async (productId: bigint) => {
    try {
      await deleteProduct.mutateAsync({ productId, shopId });
      toast.success("Product removed");
    } catch {
      toast.error("Failed to remove product");
    }
  };

  const handleDeleteShop = async () => {
    if (!shop) return;
    if (!confirm(`Delete shop "${shop.name}"? This cannot be undone.`)) return;
    try {
      await deleteShop.mutateAsync(shopId);
      toast.success("Shop deleted");
      navigate({ to: "/shops" });
    } catch {
      toast.error("Failed to delete shop");
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
        <div className="absolute bottom-4 left-6 flex items-end gap-4">
          {shop.logoBlob && (
            <img
              src={shop.logoBlob.getDirectURL()}
              alt={`${shop.name} logo`}
              className="h-16 w-16 rounded-full object-cover border-2 border-background shadow-lg"
            />
          )}
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              {shop.name}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {isOwner && (
                <Badge className="bg-accent/20 text-accent border-accent/30">
                  Your Shop
                </Badge>
              )}
              {shop.isNsfw && (
                <Badge className="bg-destructive/80 text-white border-0">
                  NSFW 18+
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      {shop.categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {shop.categories.map((cat) => (
            <Badge
              key={cat}
              variant="secondary"
              className="flex items-center gap-1"
            >
              <Tag className="h-3 w-3" />
              {cat}
            </Badge>
          ))}
        </div>
      )}

      {shop.description && (
        <p className="text-muted-foreground mb-4 max-w-2xl">
          {shop.description}
        </p>
      )}

      {/* Contact + Admin delete */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {shop.contactInfo &&
          (isURL(shop.contactInfo) ? (
            <a
              href={shop.contactInfo}
              target="_blank"
              rel="noopener noreferrer"
              data-ocid="shop.contact.button"
            >
              <Button variant="outline" size="sm">
                <Mail className="h-4 w-4 mr-2" />
                Contact Seller
                <ExternalLink className="h-3 w-3 ml-1 opacity-60" />
              </Button>
            </a>
          ) : (
            <span
              className="flex items-center gap-1 text-sm text-muted-foreground"
              data-ocid="shop.contact.panel"
            >
              <Mail className="h-4 w-4" />
              {shop.contactInfo}
            </span>
          ))}
        {isAdmin && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteShop}
            disabled={deleteShop.isPending}
            data-ocid="shop.delete.button"
          >
            {deleteShop.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Delete Shop
          </Button>
        )}
      </div>

      {/* Shop Rules */}
      {shop.rules && (
        <section
          className="mb-8 bg-muted/30 border border-border rounded-lg p-5"
          data-ocid="shop.rules.panel"
        >
          <div className="flex items-center gap-2 mb-3">
            <ScrollText className="h-4 w-4 text-accent" />
            <h2 className="font-display text-lg font-semibold">Shop Rules</h2>
          </div>
          <p className="text-muted-foreground text-sm whitespace-pre-wrap">
            {shop.rules}
          </p>
        </section>
      )}

      <Separator className="mb-8" />

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
              className="sm:max-w-lg"
              data-ocid="shop.add_product.dialog"
            >
              <DialogHeader>
                <DialogTitle className="font-display text-xl">
                  Add Product
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="prod-price">Price</Label>
                    <Input
                      id="prod-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={priceVal}
                      onChange={(e) => setPriceVal(e.target.value)}
                      placeholder="e.g. 2.50"
                      data-ocid="shop.product.price.input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="prod-currency">Currency</Label>
                    <Input
                      id="prod-currency"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      placeholder="USD"
                      data-ocid="shop.product.currency.input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="prod-stock">Stock</Label>
                    <Input
                      id="prod-stock"
                      type="number"
                      min="0"
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                      placeholder="1"
                      data-ocid="shop.product.stock.input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="prod-category">Category</Label>
                    <Input
                      id="prod-category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g. Prints"
                      data-ocid="shop.product.category.input"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="prod-digital"
                    checked={isDigital}
                    onChange={(e) => setIsDigital(e.target.checked)}
                    className="h-4 w-4 accent-accent"
                  />
                  <Label htmlFor="prod-digital" className="cursor-pointer">
                    Digital Product
                  </Label>
                </div>
                <div>
                  <Label htmlFor="prod-payment">Payment Link (optional)</Label>
                  <Input
                    id="prod-payment"
                    value={paymentLink}
                    onChange={(e) => setPaymentLink(e.target.value)}
                    placeholder="https://paypal.me/... or Stripe link"
                    data-ocid="shop.product.payment.input"
                  />
                </div>
                <div>
                  <Label htmlFor="prod-imgs">Images (optional, multiple)</Label>
                  <Input
                    id="prod-imgs"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) =>
                      setImageFiles(Array.from(e.target.files ?? []))
                    }
                    data-ocid="shop.product.upload_button"
                  />
                  {imageFiles.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {imageFiles.length} image
                      {imageFiles.length !== 1 ? "s" : ""} selected
                    </p>
                  )}
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
          {products?.map((p, i) => {
            const imageUrls =
              p.imageBlobs?.map((b: any) => b.getDirectURL()) ?? [];
            return (
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
                    <ImageCarousel urls={imageUrls} title={p.title} />
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-foreground flex-1">
                        {p.title}
                      </h3>
                      <div className="flex gap-1 flex-shrink-0">
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
                            <Tag className="h-2.5 w-2.5 mr-0.5" />
                            {p.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {p.description && (
                      <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                        {p.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-accent font-semibold">
                        {formatPrice(p.price, p.currency)}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {Number(p.stock) === 0 ? (
                          <span className="text-destructive font-medium">
                            Out of stock
                          </span>
                        ) : (
                          `${Number(p.stock)} in stock`
                        )}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(() => {
                        const approvedRequest = myDownloadRequests?.find(
                          ([req]) =>
                            req.productId === p.id && req.status === "approved",
                        );
                        const pendingRequest = myDownloadRequests?.find(
                          ([req]) =>
                            req.productId === p.id && req.status === "pending",
                        );
                        return (
                          <>
                            {p.paymentLink && Number(p.stock) > 0 && (
                              <a
                                href={p.paymentLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                data-ocid={`shop.product.buy_button.${i + 1}`}
                              >
                                <Button
                                  size="sm"
                                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                                >
                                  Buy Now
                                  <ExternalLink className="h-3 w-3 ml-1" />
                                </Button>
                              </a>
                            )}
                            {p.isDigital &&
                              isSignedIn &&
                              !isOwner &&
                              (approvedRequest ? (
                                <a
                                  href={p.digitalFileBlob?.getDirectURL()}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  data-ocid={`shop.product.download_button.${i + 1}`}
                                >
                                  <Button
                                    size="sm"
                                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                                  >
                                    <Download className="h-3.5 w-3.5 mr-1" />
                                    Download File
                                  </Button>
                                </a>
                              ) : pendingRequest ? (
                                <span
                                  className="text-xs text-muted-foreground italic flex items-center gap-1"
                                  data-ocid={`shop.product.success_state.${i + 1}`}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                                  Download request sent — seller will approve
                                  after payment
                                </span>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    try {
                                      await requestDownload.mutateAsync(p.id);
                                      toast.success("Download request sent!");
                                    } catch {
                                      toast.error("Failed to send request");
                                    }
                                  }}
                                  disabled={requestDownload.isPending}
                                  data-ocid={`shop.product.button.${i + 1}`}
                                >
                                  {requestDownload.isPending ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : null}
                                  Request Download
                                </Button>
                              ))}
                            {!p.paymentLink && !p.isDigital && isOwner && (
                              <span className="text-xs text-muted-foreground italic">
                                No payment link set
                              </span>
                            )}
                            {Number(p.stock) === 0 && !p.isDigital && (
                              <span className="text-xs text-destructive font-medium">
                                Out of Stock
                              </span>
                            )}
                          </>
                        );
                      })()}
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteProduct(p.id)}
                          disabled={deleteProduct.isPending}
                          data-ocid={`shop.product.delete_button.${i + 1}`}
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Remove
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Q&A */}
      <Separator className="mt-10" />
      <QASection shopId={shopId} isOwner={!!isOwner} isSignedIn={isSignedIn} />
    </main>
  );
}
