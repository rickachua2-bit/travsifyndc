import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Wallet as WalletIcon, BookOpenCheck, Search, Percent,
  KeyRound, BookOpen, Clock, LogOut, Shield, Sparkles, ShieldCheck, AlertCircle,
} from "lucide-react";
import { Logo } from "@/components/landing/Logo";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useIsAdmin, type KycStatus } from "@/hooks/useProfile";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger, SidebarInset, useSidebar,
} from "@/components/ui/sidebar";
import { toast } from "sonner";
import type { ReactNode } from "react";

type NavItem = {
  title: string;
  to: "/dashboard" | "/book" | "/bookings" | "/wallet" | "/markups" | "/api-keys" | "/docs" | "/pending-review";
  icon: typeof LayoutDashboard;
  external?: boolean;
};

const PRIMARY: NavItem[] = [
  { title: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { title: "Book", to: "/book", icon: Search },
  { title: "Bookings", to: "/bookings", icon: BookOpenCheck },
  { title: "Wallet", to: "/wallet", icon: WalletIcon },
  { title: "Markups", to: "/markups", icon: Percent },
  { title: "API keys", to: "/api-keys", icon: KeyRound },
];

const SECONDARY: NavItem[] = [
  { title: "Docs", to: "/docs", icon: BookOpen },
];

export function PartnerShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-surface">
        <PartnerSidebar />
        <SidebarInset className="flex flex-1 flex-col">
          <PartnerTopBar />
          <main className="flex-1">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function PartnerSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { profile } = useProfile();
  const { isAdmin } = useIsAdmin();

  const status = profile?.kyc_status ?? "draft";
  const showApplicationStatus = status !== "approved";

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-2">
          <Logo />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {PRIMARY.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.to)} tooltip={item.title}>
                    <Link to={item.to}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Resources</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {SECONDARY.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.to)} tooltip={item.title}>
                    <Link to={item.to}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {showApplicationStatus && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/pending-review")} tooltip="Application status">
                    <Link to="/pending-review">
                      <Clock className="h-4 w-4" />
                      <span>Application status</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Admin">
                    <Link to="/admin">
                      <Shield className="h-4 w-4" />
                      <span>Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed && profile && (
          <div className="px-2 pb-1">
            <ModeBadge status={status} />
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

function PartnerTopBar() {
  const { profile } = useProfile();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  }

  const status = profile?.kyc_status ?? "draft";
  const display = profile?.legal_name || profile?.company || user?.email || "Account";

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-xl">
      <SidebarTrigger />
      <div className="hidden sm:block">
        <ModeBadge status={status} compact />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <div className="hidden text-right text-xs sm:block">
          <div className="font-semibold text-foreground">{display}</div>
          <div className="text-muted-foreground">{user?.email}</div>
        </div>
        <button
          onClick={handleSignOut}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-1.5 text-xs font-semibold text-foreground hover:border-accent hover:text-accent"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>
    </header>
  );
}

export function ModeBadge({ status, compact = false }: { status: KycStatus; compact?: boolean }) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-success">
        <Sparkles className="h-3 w-3" />
        {compact ? "Live mode" : "Live + Sandbox active"}
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-destructive">
        <AlertCircle className="h-3 w-3" />
        {compact ? "Application rejected" : "Application not approved"}
      </span>
    );
  }
  // submitted | under_review | draft
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-accent">
      <ShieldCheck className="h-3 w-3" />
      {compact ? "Sandbox mode" : "Sandbox mode · awaiting approval"}
    </span>
  );
}
