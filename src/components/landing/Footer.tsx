import { Link } from "@tanstack/react-router";
import { Twitter, Linkedin, Github, Youtube } from "lucide-react";
import { Logo } from "./Logo";

type Path = "/developers" | "/docs" | "/demo" | "/contact" | "/" | "/signin" | "/get-api-access";

const cols: { title: string; links: { label: string; to: Path }[] }[] = [
  {
    title: "Platform",
    links: [
      { label: "Developers", to: "/developers" },
      { label: "Documentation", to: "/docs" },
      { label: "Live Demo", to: "/demo" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Contact", to: "/contact" },
      { label: "Home", to: "/" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "API Reference", to: "/docs" },
      { label: "Sandbox", to: "/get-api-access" },
      { label: "Status", to: "/docs" },
    ],
  },
  {
    title: "Get started",
    links: [
      { label: "Get API Access", to: "/get-api-access" },
      { label: "Sign in", to: "/signin" },
      { label: "Book a demo", to: "/demo" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-primary-deep py-16 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-0 h-[420px] w-[420px] rounded-full opacity-30 blur-3xl"
        style={{ background: "var(--gradient-accent)" }}
      />
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_3fr]">
          <div>
            <Logo invert />
            <p className="mt-4 max-w-xs text-sm text-white/60">
              The travel infrastructure powering the next billion bookings — built for Africa, ready for the world.
            </p>
            <div className="mt-6 flex gap-3">
              {[Twitter, Linkedin, Github, Youtube].map((Ic, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="Social link"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/70 transition hover:scale-110 hover:bg-accent hover:text-white"
                >
                  <Ic className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {cols.map((c) => (
              <div key={c.title}>
                <div className="mb-4 font-display text-sm font-bold text-white">{c.title}</div>
                <ul className="space-y-2 text-sm text-white/60">
                  {c.links.map((l) => (
                    <li key={l.label}>
                      <Link to={l.to} className="transition hover:text-accent">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row">
          <div>© {new Date().getFullYear()} Travsify NDC. All rights reserved.</div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 animate-pulse-glow rounded-full bg-success" />
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}
