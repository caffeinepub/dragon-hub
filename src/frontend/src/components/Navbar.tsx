import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";
import {
  Flame,
  LayoutDashboard,
  LogOut,
  Menu,
  Shield,
  ShoppingBag,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useIsCreatorOrAdmin } from "../hooks/useQueries";

const navLinks = [
  { href: "/" as const, label: "Home" },
  { href: "/videos" as const, label: "Videos" },
  { href: "/sellers" as const, label: "Sellers" },
  { href: "/shops" as const, label: "Shop Feed" },
  { href: "/groups" as const, label: "Groups" },
  { href: "/forums" as const, label: "Forums" },
];

export function Navbar() {
  const { identity, login, clear, isInitializing } = useInternetIdentity();
  const { actor, isFetching } = useActor();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const principal = identity?.getPrincipal().toString();
  const shortPrincipal = principal
    ? `${principal.slice(0, 5)}...${principal.slice(-3)}`
    : "";

  useEffect(() => {
    if (actor && identity && !isFetching) {
      const a = actor as any;
      if (typeof a.registerCallerAsUser === "function") {
        a.registerCallerAsUser().catch(() => {});
      }
    }
  }, [actor, identity, isFetching]);

  const { data: isAdmin } = useQuery({
    queryKey: ["isAdmin", principal],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching && !!identity,
  });

  const { data: isCreatorOrAdmin } = useIsCreatorOrAdmin();

  const { data: profile } = useQuery({
    queryKey: ["callerProfile", principal],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !isFetching && !!identity,
  });

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2 font-display font-bold text-xl text-foreground"
          data-ocid="nav.home.link"
        >
          <Flame className="h-6 w-6 text-primary" />
          Dragon Hub
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                location.pathname === link.href
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
              data-ocid={`nav.${link.label.toLowerCase().replace(" ", "_")}.link`}
            >
              {link.label}
            </Link>
          ))}
          {identity && (
            <>
              {isCreatorOrAdmin && (
                <Link
                  to="/groups/manage"
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                    location.pathname === "/groups/manage"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                  data-ocid="nav.manage_groups.link"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Manage Groups
                </Link>
              )}
              <Link
                to="/buyer"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                  location.pathname === "/buyer"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
                data-ocid="nav.buyer.link"
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                My Purchases
              </Link>
              <Link
                to="/admin"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                  location.pathname === "/admin"
                    ? "bg-primary/10 text-primary"
                    : isAdmin
                      ? "text-primary/80 hover:text-primary hover:bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
                data-ocid="nav.admin.link"
              >
                <Shield
                  className={`h-3.5 w-3.5 ${isAdmin ? "text-primary" : ""}`}
                />
                Admin
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {isInitializing ? null : identity ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-9 w-9 rounded-full p-0"
                  data-ocid="nav.profile.button"
                >
                  <Avatar className="h-9 w-9">
                    {profile?.profilePicBlob ? (
                      <AvatarImage
                        src={profile.profilePicBlob.getDirectURL()}
                      />
                    ) : null}
                    <AvatarFallback className="bg-primary/20 text-primary text-sm">
                      {shortPrincipal.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56"
                data-ocid="nav.profile.dropdown_menu"
              >
                <div className="px-2 py-1.5">
                  <p className="text-xs text-muted-foreground">Signed in as</p>
                  <p className="text-sm font-medium truncate">
                    {shortPrincipal}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    to="/profile"
                    className="cursor-pointer"
                    data-ocid="nav.profile.link"
                  >
                    <User className="h-4 w-4 mr-2" /> Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    to="/buyer"
                    className="cursor-pointer"
                    data-ocid="nav.buyer.dropdown.link"
                  >
                    <ShoppingBag className="h-4 w-4 mr-2" /> My Purchases
                  </Link>
                </DropdownMenuItem>
                {isCreatorOrAdmin && (
                  <DropdownMenuItem asChild>
                    <Link
                      to="/groups/manage"
                      className="cursor-pointer"
                      data-ocid="nav.manage_groups.dropdown.link"
                    >
                      <LayoutDashboard className="h-4 w-4 mr-2" /> Manage Groups
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link
                    to="/admin"
                    className="cursor-pointer"
                    data-ocid="nav.admin.dropdown.link"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    {isAdmin ? "Admin Panel" : "Claim Admin"}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={clear}
                  className="text-destructive cursor-pointer"
                  data-ocid="nav.logout.button"
                >
                  <LogOut className="h-4 w-4 mr-2" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              onClick={login}
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-ocid="nav.login.button"
            >
              Sign In
            </Button>
          )}

          <button
            type="button"
            className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
            data-ocid="nav.mobile.toggle"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background/95 px-4 py-3 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location.pathname === link.href
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
              data-ocid={`nav.mobile.${link.label.toLowerCase().replace(" ", "_")}.link`}
            >
              {link.label}
            </Link>
          ))}
          {identity && (
            <>
              {isCreatorOrAdmin && (
                <Link
                  to="/groups/manage"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === "/groups/manage"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                  data-ocid="nav.mobile.manage_groups.link"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Manage Groups
                </Link>
              )}
              <Link
                to="/buyer"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === "/buyer"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
                data-ocid="nav.mobile.buyer.link"
              >
                <ShoppingBag className="h-4 w-4" />
                My Purchases
              </Link>
              <Link
                to="/admin"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isAdmin
                    ? "text-primary hover:bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
                data-ocid="nav.mobile.admin.link"
              >
                <Shield
                  className={`h-4 w-4 ${isAdmin ? "text-primary" : ""}`}
                />
                {isAdmin ? "Admin Panel" : "Admin / Claim Access"}
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
