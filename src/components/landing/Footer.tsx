import { Logo } from "./Logo";
import { Twitter, Linkedin, Github, Youtube } from "lucide-react";

const cols = [
  { title: "Product", links: ["APIs", "Documentation", "Status"] },
  { title: "Company", links: ["About Us", "Careers", "Press"] },
  { title: "Resources", links: ["Guides", "Changelog", "Blog", "Support"] },
  { title: "Legal", links: ["Privacy Policy", "Terms of Service", "Data Protection"] },
];

export function Footer() {
  return (
    <footer className="bg-primary-deep py-16 text-white">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_3fr]">
          <div>
            <Logo invert />
            <p className="mt-4 max-w-xs text-sm text-white/60">
              The complete travel infrastructure for the world.
            </p>
            <div className="mt-6 flex gap-3">
              {[Twitter, Linkedin, Github, Youtube].map((Ic, i) => (
                <a key={i} href="#" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/70 transition hover:bg-accent hover:text-white">
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
                  {c.links.map((l) => <li key={l}><a href="#" className="hover:text-accent">{l}</a></li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 border-t border-white/10 pt-6 text-center text-xs text-white/50">
          © 2024 Travsify NDC. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
