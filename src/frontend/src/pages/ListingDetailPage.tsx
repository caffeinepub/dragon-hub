import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle, Loader2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useListing, useMarkListingSold } from "../hooks/useQueries";

function formatPrice(price: bigint): string {
  return `${(Number(price) / 1e8).toFixed(2)} ICP`;
}

export function ListingDetailPage() {
  const { id } = useParams({ strict: false });
  const listingId = BigInt(id ?? "0");
  const { identity } = useInternetIdentity();
  const { data: listing, isLoading } = useListing(listingId);
  const markAsSold = useMarkListingSold();

  const myPrincipal = identity?.getPrincipal().toString();
  const isOwner = myPrincipal && listing?.owner.toString() === myPrincipal;

  const handleMarkSold = async () => {
    try {
      await markAsSold.mutateAsync(listingId);
      toast.success("Marked as sold!");
    } catch {
      toast.error("Failed to mark as sold");
    }
  };

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-10">
        <Skeleton className="h-8 w-32 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Skeleton className="aspect-square rounded-xl" />
          <div className="space-y-3">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      </main>
    );
  }

  if (!listing) {
    return (
      <main className="container mx-auto px-4 py-10">
        <p className="text-muted-foreground">Listing not found.</p>
        <Link to="/marketplace">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-10">
      <Link
        to="/marketplace"
        data-ocid="listing.back.link"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Marketplace
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="relative rounded-xl overflow-hidden aspect-square">
          <img
            src={listing.image.getDirectURL()}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
          {listing.isSold && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Badge className="bg-destructive text-destructive-foreground text-lg px-4 py-2">
                SOLD
              </Badge>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-display text-3xl font-bold">{listing.title}</h1>
            {listing.isSold && (
              <Badge variant="destructive" className="flex-shrink-0">
                <CheckCircle className="h-3 w-3 mr-1" /> Sold
              </Badge>
            )}
          </div>

          <p className="text-3xl font-bold text-accent">
            {formatPrice(listing.price)}
          </p>

          {listing.description && (
            <p className="text-muted-foreground leading-relaxed">
              {listing.description}
            </p>
          )}

          <div className="pt-2">
            <p className="text-xs text-muted-foreground mb-1">Seller</p>
            <p className="text-sm font-mono text-foreground/70">
              {listing.owner.toString().slice(0, 20)}...
            </p>
          </div>

          {isOwner && !listing.isSold && (
            <Button
              onClick={handleMarkSold}
              disabled={markAsSold.isPending}
              className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="listing.sold.button"
            >
              {markAsSold.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ShoppingBag className="h-4 w-4 mr-2" />
              )}
              Mark as Sold
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
