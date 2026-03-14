import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Flame, LogOut, Menu, Shield, User, X } from "lucide-react";
import { useState } from "react";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

const navLinks = [
  { href: "/" as const, label: "Home" },
  { href: "/videos" as const, label: "Videos" },
  { href: "/marketplace" as const, label: "Marketplace" },
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

  const { data: isAdmin } = useQuery({
    queryKey: ["isAdmin", principal],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching && !!identity,
  });

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link
          to="/"
          data-ocid="nav.link"
          className="flex items-center gap-2 group"
        >
          <Flame className="h-7 w-7 text-primary animate-ember-float" />
          <span className="font-display text-xl font-bold text-foreground">
            Dragon<span className="text-primary">Hub</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              data-ocid={`nav.${link.label.toLowerCase()}.link`}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                location.pathname === link.href
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {!!identity && (
            <Link
              to="/admin"
              data-ocid="nav.admin.link"
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                location.pathname === "/admin"
                  ? "text-primary bg-primary/10"
                  : isAdmin
                    ? "text-primary/80 hover:text-primary hover:bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Shield className="h-4 w-4" />
              Admin
            </Link>
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {isInitializing ? (
            <div className="h-9 w-24 bg-muted rounded-md animate-pulse" />
          ) : identity ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full ring-2 ring-primary/30 hover:ring-primary/60 transition-all"
                  data-ocid="nav.user.button"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/20 text-primary font-bold text-sm">
                      {shortPrincipal.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48"
                data-ocid="nav.dropdown_menu"
              >
                <DropdownMenuItem asChild>
                  <Link
                    to="/profile"
                    data-ocid="nav.profile.link"
                    className="flex items-center gap-2"
                  >
                    <User className="h-4 w-4" />
                    <span>{shortPrincipal}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={clear}
                  data-ocid="nav.logout.button"
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              onClick={login}
              data-ocid="nav.signin.button"
              className="bg-primary text-primary-foreground hover:bg-primary/90 fire-glow"
            >
              <Flame className="h-4 w-4 mr-2" />
              Sign In
            </Button>
          )}

          {/* Mobile menu toggle */}
          <button
            type="button"
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
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

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/60 bg-background/95 px-4 py-3 flex flex-col gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              data-ocid={`nav.mobile.${link.label.toLowerCase()}.link`}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                location.pathname === link.href
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {!!identity && (
            <Link
              to="/admin"
              data-ocid="nav.mobile.admin.link"
              className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
                isAdmin
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              onClick={() => setMobileOpen(false)}
            >
              <Shield className="h-4 w-4" />
              Admin Panel
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
