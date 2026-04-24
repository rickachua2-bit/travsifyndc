import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { TrustStrip } from "@/components/landing/TrustStrip";
import { ValueProposition } from "@/components/landing/ValueProposition";
import { Verticals } from "@/components/landing/Verticals";
import { DeveloperEcosystem } from "@/components/landing/DeveloperEcosystem";
import { FintechInfra } from "@/components/landing/FintechInfra";
import { GlobalTerminal } from "@/components/landing/GlobalTerminal";
import { Analytics } from "@/components/landing/Analytics";
import { Compliance } from "@/components/landing/Compliance";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Testimonials } from "@/components/landing/Testimonials";
import { GlobalCoverage } from "@/components/landing/GlobalCoverage";
import { UseCases } from "@/components/landing/UseCases";
import { Automation } from "@/components/landing/Automation";
import { Pricing } from "@/components/landing/Pricing";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Travsify NDC — One Travel API for Africa & the World" },
      { name: "description", content: "Build, launch and scale your travel business with one API. Global inventory of flights, hotels, transfers, e-Visas and insurance — built for Africa and the world." },
      { property: "og:title", content: "Travsify NDC — Complete Travel Infrastructure" },
      { property: "og:description", content: "One API. Global inventory. Built for Africa & the World." },
      { property: "og:type", content: "website" },
    ],
  }),
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main>
        <Hero />
        <TrustStrip />
        <ValueProposition />
        <Verticals />
        <DeveloperEcosystem />
        <FintechInfra />
        <GlobalTerminal />
        <Analytics />
        <Compliance />
        <HowItWorks />
        <Testimonials />
        <GlobalCoverage />
        <UseCases />
        <Automation />
        <Pricing />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
