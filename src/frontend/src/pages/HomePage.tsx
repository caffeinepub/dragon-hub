import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Flame,
  Heart,
  MessageSquare,
  Play,
  ShoppingBag,
} from "lucide-react";
import { motion } from "motion/react";
import {
  useAllCategories,
  useAllListings,
  useAllVideos,
} from "../hooks/useQueries";

const SKELETON_IDS = ["a", "b", "c"];

function formatPrice(price: bigint): string {
  return `${(Number(price) / 1e8).toFixed(2)} ICP`;
}

function formatDate(ts: bigint): string {
  return new Date(Number(ts) / 1_000_000).toLocaleDateString();
}

export function HomePage() {
  const { data: videos, isLoading: videosLoading } = useAllVideos();
  const { data: listings, isLoading: listingsLoading } = useAllListings();
  const { data: categories } = useAllCategories();

  const recentVideos = videos?.slice(0, 3) ?? [];
  const featuredListings = listings?.slice(0, 3) ?? [];
  const activeCategories = categories?.slice(0, 3) ?? [];

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden" data-ocid="home.section">
        <div
          className="relative h-[520px] flex items-center justify-center"
          style={{
            backgroundImage:
              "url(/assets/generated/dragon-background.dim_1920x1080.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* subtle darkening overlay so image still shows but text is readable */}
          <div className="absolute inset-0 bg-black/30" />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative z-10 text-center px-8 py-8 max-w-3xl mx-auto rounded-2xl shadow-2xl border border-border"
            style={{ backgroundColor: "hsl(var(--card))" }}
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <Flame className="h-6 w-6 text-primary" />
              <Badge
                variant="outline"
                className="border-primary/50 text-primary text-xs px-3 py-1"
              >
                The Creative Dragon&apos;s Lair
              </Badge>
              <Flame className="h-6 w-6 text-primary" />
            </div>
            <h1 className="font-display text-5xl md:text-7xl font-bold text-foreground mb-4 leading-tight">
              Dragon<span className="text-primary">Hub</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Watch, create, sell, and discuss &mdash; all in one fiery creative
              community.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button
                asChild
                className="bg-primary text-primary-foreground fire-glow hover:bg-primary/90"
                data-ocid="home.videos.primary_button"
              >
                <Link to="/videos">
                  <Play className="h-4 w-4 mr-2" />
                  Explore Videos
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-accent text-accent hover:bg-accent/10"
                data-ocid="home.shop_feed.secondary_button"
              >
                <Link to="/shops">
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Shop Feed
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12 space-y-16">
        {/* Recent Videos */}
        <div className="bg-card rounded-xl p-6 border border-border">
          <section data-ocid="home.videos.section">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3 bg-muted rounded-lg px-4 py-2">
                <div className="h-8 w-1 bg-primary rounded-full" />
                <h2 className="font-display text-2xl font-bold">
                  Recent Videos
                </h2>
              </div>
              <Link
                to="/videos"
                data-ocid="home.videos.link"
                className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
              >
                See all <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {videosLoading ? (
                SKELETON_IDS.map((id) => (
                  <Card
                    key={id}
                    className="bg-card border-border overflow-hidden"
                  >
                    <Skeleton className="h-40 w-full" />
                    <CardContent className="p-4 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </CardContent>
                  </Card>
                ))
              ) : recentVideos.length === 0 ? (
                <div
                  className="col-span-3 text-center py-12 text-muted-foreground"
                  data-ocid="home.videos.empty_state"
                >
                  <Play className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>No videos yet. Be the first to upload!</p>
                </div>
              ) : (
                recentVideos.map((v, i) => (
                  <Link
                    key={v.id.toString()}
                    to="/videos/$id"
                    params={{ id: v.id.toString() }}
                    data-ocid={`home.video.item.${i + 1}`}
                  >
                    <Card className="bg-card border-border overflow-hidden card-hover group cursor-pointer">
                      <div className="relative h-40 overflow-hidden">
                        <img
                          src={v.thumbnailBlob.getDirectURL()}
                          alt={v.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 rounded px-2 py-0.5">
                          <Heart className="h-3 w-3 text-primary" />
                          <span className="text-xs text-white">
                            {v.likes.toString()}
                          </span>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-foreground line-clamp-1">
                          {v.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(v.timestamp)}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Shop Feed Picks */}
        <div className="bg-card rounded-xl p-6 border border-border">
          <section data-ocid="home.marketplace.section">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3 bg-muted rounded-lg px-4 py-2">
                <div className="h-8 w-1 bg-accent rounded-full" />
                <h2 className="font-display text-2xl font-bold">
                  Shop Feed Picks
                </h2>
              </div>
              <Link
                to="/shops"
                data-ocid="home.marketplace.link"
                className="flex items-center gap-1 text-sm text-accent hover:text-accent/80 transition-colors"
              >
                See all <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {listingsLoading ? (
                SKELETON_IDS.map((id) => (
                  <Card
                    key={id}
                    className="bg-card border-border overflow-hidden"
                  >
                    <Skeleton className="h-40 w-full" />
                    <CardContent className="p-4 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </CardContent>
                  </Card>
                ))
              ) : featuredListings.length === 0 ? (
                <div
                  className="col-span-3 text-center py-12 text-muted-foreground"
                  data-ocid="home.listings.empty_state"
                >
                  <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>No listings yet. Start selling!</p>
                </div>
              ) : (
                featuredListings.map((l, i) => (
                  <Link
                    key={l.id.toString()}
                    to="/shops"
                    data-ocid={`home.listing.item.${i + 1}`}
                  >
                    <Card className="bg-card border-border overflow-hidden card-hover group cursor-pointer">
                      <div className="relative h-40 overflow-hidden">
                        <img
                          src={l.image.getDirectURL()}
                          alt={l.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {l.isSold && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Badge className="bg-destructive text-destructive-foreground">
                              Sold
                            </Badge>
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-foreground line-clamp-1">
                          {l.title}
                        </h3>
                        <p className="text-sm text-accent font-medium mt-1">
                          {formatPrice(l.price)}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Forum Discussions */}
        <div className="bg-card rounded-xl p-6 border border-border">
          <section data-ocid="home.forums.section">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3 bg-muted rounded-lg px-4 py-2">
                <div className="h-8 w-1 bg-muted-foreground rounded-full" />
                <h2 className="font-display text-2xl font-bold">
                  Forum Discussions
                </h2>
              </div>
              <Link
                to="/forums"
                data-ocid="home.forums.link"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                See all <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {activeCategories.length === 0 ? (
                <div
                  className="col-span-3 text-center py-12 text-muted-foreground"
                  data-ocid="home.forums.empty_state"
                >
                  <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>No forum categories yet.</p>
                </div>
              ) : (
                activeCategories.map((cat, i) => (
                  <Link
                    key={cat.id.toString()}
                    to="/forums/$categoryId"
                    params={{ categoryId: cat.id.toString() }}
                    data-ocid={`home.forum.item.${i + 1}`}
                  >
                    <Card className="bg-card border-border p-5 card-hover cursor-pointer group">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                          <MessageSquare className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground line-clamp-1">
                            {cat.name}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {cat.description}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
