import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Download,
  ExternalLink,
  Mail,
  Package,
  ShoppingBag,
  Star,
} from "lucide-react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAllShops,
  useMyDownloadRequests,
  useMyPurchases,
  useMyReviews,
} from "../hooks/useQueries";

function formatDate(ts: bigint): string {
  return new Date(Number(ts) / 1_000_000).toLocaleDateString();
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-4 w-4 ${
            s <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "fill-muted text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

export function BuyerPage() {
  const { identity } = useInternetIdentity();
  const { data: purchases, isLoading: purchasesLoading } = useMyPurchases();
  const { data: reviews, isLoading: reviewsLoading } = useMyReviews();
  const { data: downloadRequests, isLoading: downloadsLoading } =
    useMyDownloadRequests();
  const { data: shops } = useAllShops();

  if (!identity) {
    return (
      <main
        className="container mx-auto px-4 py-20 text-center"
        data-ocid="buyer.page"
      >
        <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-muted-foreground/40" />
        <h1 className="font-display text-3xl font-bold mb-3">
          Buyer Dashboard
        </h1>
        <p className="text-muted-foreground">
          Sign in to view your purchase history, reviews, and downloads.
        </p>
      </main>
    );
  }

  const getShopName = (shopId: bigint): string => {
    return shops?.find((s) => s.id === shopId)?.name ?? `Shop #${shopId}`;
  };

  const getShopContact = (shopId: bigint): string => {
    return shops?.find((s) => s.id === shopId)?.contactInfo ?? "";
  };

  return (
    <main className="container mx-auto px-4 py-10" data-ocid="buyer.page">
      <div className="mb-8">
        <h1 className="font-display text-4xl font-bold">Buyer Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Your purchases, reviews, and downloads — all in one place.
        </p>
      </div>

      <Tabs defaultValue="purchases">
        <TabsList className="mb-6" data-ocid="buyer.tab">
          <TabsTrigger value="purchases" data-ocid="buyer.purchases.tab">
            <ShoppingBag className="h-4 w-4 mr-2" />
            Purchase History
          </TabsTrigger>
          <TabsTrigger value="reviews" data-ocid="buyer.reviews.tab">
            <Star className="h-4 w-4 mr-2" />
            My Reviews
          </TabsTrigger>
          <TabsTrigger value="downloads" data-ocid="buyer.downloads.tab">
            <Download className="h-4 w-4 mr-2" />
            Downloads
          </TabsTrigger>
        </TabsList>

        {/* Purchase History */}
        <TabsContent value="purchases">
          {purchasesLoading ? (
            <div
              className="space-y-3"
              data-ocid="buyer.purchases.loading_state"
            >
              {[1, 2, 3].map((k) => (
                <Skeleton key={k} className="h-20 w-full" />
              ))}
            </div>
          ) : !purchases?.length ? (
            <div
              className="text-center py-16 border border-dashed border-border rounded-xl"
              data-ocid="buyer.purchases.empty_state"
            >
              <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-semibold text-foreground mb-1">
                No purchases yet
              </p>
              <p className="text-muted-foreground text-sm">
                Your order history will appear here after your first purchase.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {purchases.map((purchase, i) => {
                const shopName = getShopName(purchase.shopId);
                const contact = getShopContact(purchase.shopId);
                const isURL = (s: string) => {
                  try {
                    new URL(s);
                    return true;
                  } catch {
                    return false;
                  }
                };
                return (
                  <Card
                    key={purchase.id.toString()}
                    className="bg-card border-border"
                    data-ocid={`buyer.purchase.item.${i + 1}`}
                  >
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">
                          {purchase.productTitle}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          from{" "}
                          <span className="text-foreground font-medium">
                            {shopName}
                          </span>
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-accent font-semibold text-sm">
                            {(Number(purchase.price) / 1e8).toFixed(2)}{" "}
                            {purchase.currency}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(purchase.timestamp)}
                          </span>
                        </div>
                      </div>
                      {contact &&
                        (isURL(contact) ? (
                          <a
                            href={contact}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-ocid={`buyer.purchase.button.${i + 1}`}
                          >
                            <Button variant="outline" size="sm">
                              <Mail className="h-4 w-4 mr-2" />
                              Contact Seller
                              <ExternalLink className="h-3 w-3 ml-1 opacity-60" />
                            </Button>
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            {contact}
                          </span>
                        ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* My Reviews */}
        <TabsContent value="reviews">
          {reviewsLoading ? (
            <div className="space-y-3" data-ocid="buyer.reviews.loading_state">
              {[1, 2].map((k) => (
                <Skeleton key={k} className="h-24 w-full" />
              ))}
            </div>
          ) : !reviews?.length ? (
            <div
              className="text-center py-16 border border-dashed border-border rounded-xl"
              data-ocid="buyer.reviews.empty_state"
            >
              <Star className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-semibold text-foreground mb-1">
                No reviews yet
              </p>
              <p className="text-muted-foreground text-sm">
                After visiting a shop, you can leave a review from the shop
                page.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((review, i) => (
                <Card
                  key={review.id.toString()}
                  className="bg-card border-border"
                  data-ocid={`buyer.review.item.${i + 1}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground">
                          {getShopName(review.shopId)}
                        </p>
                        <StarRating rating={Number(review.rating)} />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(review.timestamp)}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-muted-foreground text-sm mt-2">
                        {review.comment}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Downloads */}
        <TabsContent value="downloads">
          {downloadsLoading ? (
            <div
              className="space-y-3"
              data-ocid="buyer.downloads.loading_state"
            >
              {[1, 2].map((k) => (
                <Skeleton key={k} className="h-16 w-full" />
              ))}
            </div>
          ) : !downloadRequests?.length ? (
            <div
              className="text-center py-16 border border-dashed border-border rounded-xl"
              data-ocid="buyer.downloads.empty_state"
            >
              <Download className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-semibold text-foreground mb-1">
                No download requests
              </p>
              <p className="text-muted-foreground text-sm">
                Request a download on a digital product to see it here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {downloadRequests.map(([req, product], i) => (
                <Card
                  key={req.id.toString()}
                  className="bg-card border-border"
                  data-ocid={`buyer.download.item.${i + 1}`}
                >
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {product?.title ?? `Product #${req.productId}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {getShopName(req.shopId)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(req.timestamp)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {req.status === "approved" ? (
                        <>
                          <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                            Approved
                          </Badge>
                          {product?.digitalFileBlob && (
                            <a
                              href={product.digitalFileBlob.getDirectURL()}
                              target="_blank"
                              rel="noopener noreferrer"
                              data-ocid={`buyer.download.button.${i + 1}`}
                            >
                              <Button
                                size="sm"
                                className="bg-primary text-primary-foreground hover:bg-primary/90"
                              >
                                <Download className="h-3.5 w-3.5 mr-1" />
                                Download
                              </Button>
                            </a>
                          )}
                        </>
                      ) : req.status === "rejected" ? (
                        <Badge className="bg-destructive/20 text-destructive border-destructive/30">
                          Rejected
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
}
