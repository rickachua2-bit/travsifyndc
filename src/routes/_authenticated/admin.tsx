import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useIsAdmin } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import {
  Loader2,
  Shield,
  LayoutDashboard,
  Users,
  ClipboardList,
  PackageCheck,
  FileBadge,
  Stamp,
  Banknote,
  Percent,
  Receipt,
  LogOut,
  ExternalLink,
  LifeBuoy,
  Wallet,
  BookOpen,
  KeyRound,
  Activity,
  Inbox,
  Mailbox,
} from "lucide-react";
import { Logo } from "@/components/landing/Logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

const PLATFORM: NavItem[] = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/users", label: "Users & partners", icon: Users },
  { to: "/admin/bookings", label: "Bookings", icon: Receipt },
  { to: "/admin/support", label: "Support tickets", icon: LifeBuoy },
];

const KYC: NavItem[] = [
  { to: "/admin", label: "KYC queue", icon: ClipboardList, exact: true },
];

const OPERATIONS: NavItem[] = [
  { to: "/admin/processing", label: "Manual fulfillment", icon: PackageCheck },
  { to: "/admin/visa-queue", label: "Visa applications", icon: Stamp },
  { to: "/admin/visa-products", label: "Visa products", icon: FileBadge },
  { to: "/admin/withdrawals", label: "Withdrawals", icon: Banknote },
];

const TREASURY: NavItem[] = [
  { to: "/admin/wallets", label: "Wallets", icon: Wallet },
  { to: "/admin/ledger", label: "Ledger", icon: BookOpen },
];

const DEVELOPERS: NavItem[] = [
  { to: "/admin/api-keys", label: "API keys", icon: KeyRound },
  { to: "/admin/api-logs", label: "API logs", icon: Activity },
  { to: "/admin/access-requests", label: "API access requests", icon: Inbox },
];

const INBOX: NavItem[] = [
  { to: "/admin/contact-submissions", label: "Contact inbox", icon: Mailbox },
];

const FINANCE: NavItem[] = [
  { to: "/admin/markups", label: "Markups", icon: Percent },
];

function AdminLayout() {
  const { isAdmin, loading } = useIsAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/admin-login" });
  }, [loading, isAdmin, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-surface">
        <AdminSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-xl">
            <SidebarTrigger />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
              <Shield className="h-3 w-3" /> Super admin
            </span>
            <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
              <span className="hidden sm:inline">Restricted console — all actions logged</span>
            </div>
          </header>
          <main className="min-w-0 flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const isActive = (to: string, exact?: boolean) =>
    exact ? location.pathname === to : location.pathname === to || location.pathname.startsWith(to + "/");

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/admin-login" });
  }

  const renderItems = (items: NavItem[]) => (
    <SidebarMenu>
      {items.map((item) => {
        const active = isActive(item.to, item.exact);
        return (
          <SidebarMenuItem key={item.to}>
            <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
              <Link to={item.to}>
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/admin" className="flex items-center gap-2 px-2 py-2">
          <Logo />
          {!collapsed && (
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
              Console
            </span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(PLATFORM)}</SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>KYC</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(KYC)}</SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(OPERATIONS)}</SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Finance</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(FINANCE)}</SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Open partner dashboard">
              <Link to="/dashboard">
                <ExternalLink className="h-4 w-4" />
                <span>Partner dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut} tooltip="Sign out">
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
