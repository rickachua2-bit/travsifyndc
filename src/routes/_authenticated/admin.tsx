import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useIsAdmin } from "@/hooks/useProfile";
import { Loader2, Shield } from "lucide-react";
import { Logo } from "@/components/landing/Logo";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { isAdmin, loading } = useIsAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/dashboard" });
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
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link to="/"><Logo /></Link>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
              <Shield className="h-3 w-3" /> Admin
            </span>
          </div>
          <nav className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
            <Link to="/admin" activeOptions={{ exact: true }} activeProps={{ className: "text-foreground" }} className="hover:text-foreground">KYC queue</Link>
            <Link to="/admin/withdrawals" activeProps={{ className: "text-foreground" }} className="hover:text-foreground">Withdrawals</Link>
            <Link to="/dashboard" className="hover:text-foreground">My dashboard</Link>
          </nav>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
