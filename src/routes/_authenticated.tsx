import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate({ to: "/signin", search: { redirect: location.pathname } });
      return;
    }
    if (profileLoading || !profile) return;

    const path = location.pathname;
    const status = profile.kyc_status;

    // Allow admin pages regardless of personal KYC
    if (path.startsWith("/admin")) return;

    if (status === "approved") {
      // Approved users get the dashboard. Bounce them off /kyc and /pending-review.
      if (path === "/kyc" || path === "/pending-review") {
        navigate({ to: "/dashboard" });
      }
      return;
    }

    if (status === "submitted" || status === "under_review") {
      if (path !== "/pending-review") {
        navigate({ to: "/pending-review" });
      }
      return;
    }

    // draft or rejected → KYC wizard (rejected users can also see /pending-review)
    if (status === "rejected" && path === "/pending-review") return;
    if (path !== "/kyc") {
      navigate({ to: "/kyc" });
    }
  }, [authLoading, profileLoading, isAuthenticated, profile, navigate, location.pathname]);

  if (authLoading || (isAuthenticated && profileLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Redirecting to sign in…</p>
          <Link to="/signin" className="mt-2 inline-block text-sm font-semibold text-accent">
            Continue
          </Link>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
