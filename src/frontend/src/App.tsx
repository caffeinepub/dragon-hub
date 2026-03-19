import { Toaster } from "@/components/ui/sonner";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { Footer } from "./components/Footer";
import { Navbar } from "./components/Navbar";
import { AdminPage } from "./pages/AdminPage";
import { CategoryPage } from "./pages/CategoryPage";
import { ForumsPage } from "./pages/ForumsPage";
import { GroupDetailPage } from "./pages/GroupDetailPage";
import { GroupsPage } from "./pages/GroupsPage";
import { HomePage } from "./pages/HomePage";
import { ListingDetailPage } from "./pages/ListingDetailPage";
import { MarketplacePage } from "./pages/MarketplacePage";
import { ProfilePage } from "./pages/ProfilePage";
import { SellersPage } from "./pages/SellersPage";
import { ShopDetailPage } from "./pages/ShopDetailPage";
import { ShopsPage } from "./pages/ShopsPage";
import { ThreadPage } from "./pages/ThreadPage";
import { VideoDetailPage } from "./pages/VideoDetailPage";
import { VideosPage } from "./pages/VideosPage";

function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
      <Toaster richColors />
    </div>
  );
}

const rootRoute = createRootRoute({ component: Layout });

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const videosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/videos",
  component: VideosPage,
});

const videoDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/videos/$id",
  component: VideoDetailPage,
});

const marketplaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/marketplace",
  component: MarketplacePage,
});

const listingDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/marketplace/$id",
  component: ListingDetailPage,
});

const sellersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sellers",
  component: SellersPage,
});

const shopsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/shops",
  component: ShopsPage,
});

const shopDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/shops/$id",
  component: ShopDetailPage,
});

const groupsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/groups",
  component: GroupsPage,
});

const groupDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/groups/$id",
  component: GroupDetailPage,
});

const forumsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/forums",
  component: ForumsPage,
});

const categoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/forums/$categoryId",
  component: CategoryPage,
});

const threadRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/forums/$categoryId/$threadId",
  component: ThreadPage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: ProfilePage,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminPage,
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  videosRoute,
  videoDetailRoute,
  marketplaceRoute,
  listingDetailRoute,
  sellersRoute,
  shopsRoute,
  shopDetailRoute,
  groupsRoute,
  groupDetailRoute,
  forumsRoute,
  categoryRoute,
  threadRoute,
  profileRoute,
  adminRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
