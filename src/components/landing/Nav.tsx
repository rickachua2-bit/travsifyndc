import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Menu, X, ArrowRight, ChevronDown, LayoutDashboard, User as UserIcon, Settings, LogOut, Loader2 } from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

const links = [
  { to: "/developers", label: "Developers" },
  { to: "/docs", label: "Docs" },
  { to: "/demo", label: "Book" },
  { to: "/contact", label: "Contact" },
] as const;

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${
        scrolled
          ? "border-white/10 bg-black/40 shadow-xl backdrop-blur-xl"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="transition-transform hover:scale-[1.02]">
          <Logo />
        </Link>

        <div className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="story-link transition hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : isAuthenticated ? (
            <AccountMenu />
          ) : (
            <>
              <Link
                to="/signin"
                className="hidden text-sm font-medium text-foreground transition hover:text-accent sm:block"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="btn-glow group relative hidden items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-sm transition hover:opacity-95 sm:inline-flex"
              >
                Apply for API Access
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </>
          )}
          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setOpen((o) => !o)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/5 text-foreground md:hidden backdrop-blur-sm"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="animate-fade-in-up border-t border-border bg-background md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-6 py-4">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                {l.label}
              </Link>
            ))}
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                onClick={() => setOpen(false)}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
              >
                Open dashboard <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/signin"
                  onClick={() => setOpen(false)}
                  className="mt-2 inline-flex items-center justify-center rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground"
                >
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setOpen(false)}
                  className="mt-2 inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
                >
                  Apply for API Access <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

function AccountMenu() {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const display = profile?.legal_name || profile?.company || profile?.full_name || user?.email?.split("@")[0] || "Account";
  const initial = (display[0] || "A").toUpperCase();

  async function handleSignOut() {
    setOpen(false);
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((s) => !s)}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-2.5 text-sm font-semibold text-foreground transition hover:border-primary backdrop-blur-md"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-deep text-xs font-bold text-white">
          {initial}
        </span>
        <span className="hidden max-w-[140px] truncate sm:inline">{display}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {open && (
        <div
          role="menu"
          className="animate-fade-in-up absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-white/10 bg-black/80 py-1 shadow-2xl backdrop-blur-xl"
        >
          <div className="border-b border-white/10 px-3 py-2.5">
            <div className="truncate text-sm font-semibold text-foreground">{display}</div>
            <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
          </div>
          <MenuItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" onSelect={() => setOpen(false)} />
          <MenuItem to="/kyc" icon={UserIcon} label="Profile & KYB" onSelect={() => setOpen(false)} />
          <MenuItem to="/api-keys" icon={Settings} label="API keys" onSelect={() => setOpen(false)} />
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-white/5"
            role="menuitem"
          >
            <LogOut className="h-4 w-4 text-muted-foreground" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  to,
  icon: Icon,
  label,
  onSelect,
}: {
  to: "/dashboard" | "/kyc" | "/api-keys";
  icon: typeof LayoutDashboard;
  label: string;
  onSelect: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onSelect}
      className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-foreground hover:bg-white/5"
      role="menuitem"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      {label}
    </Link>
  );
}
