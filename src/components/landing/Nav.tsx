import { Logo } from "./Logo";

export function Nav() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Logo />
        <div className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          <a href="#product" className="hover:text-foreground transition">Product</a>
          <a href="#verticals" className="hover:text-foreground transition">Verticals</a>
          <a href="#developers" className="hover:text-foreground transition">Developers</a>
          <a href="#pricing" className="hover:text-foreground transition">Pricing</a>
          <a href="#docs" className="hover:text-foreground transition">Docs</a>
        </div>
        <div className="flex items-center gap-3">
          <a href="#signin" className="hidden text-sm font-medium text-foreground sm:block">Sign in</a>
          <a href="#cta" className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-sm transition hover:opacity-90">
            Get API Access
          </a>
        </div>
      </div>
    </nav>
  );
}
