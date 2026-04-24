import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
} as const;

const VerticalEnum = z.enum(["flights", "hotels", "tours", "transfers", "evisas", "insurance"]);

const Schema = z.object({
  vertical: VerticalEnum,
  origin: z.string().trim().min(1).max(80).optional(),
  destination: z.string().trim().min(1).max(80).optional(),
  date: z.string().trim().min(1).max(40).optional(),
  pax: z.number().int().min(1).max(20).optional(),
  nationality: z.string().trim().min(2).max(60).optional(),
});

function fallback(vertical: z.infer<typeof VerticalEnum>) {
  switch (vertical) {
    case "flights":
      return [
        { id: "F1", carrier: "Emirates", route: "LOS → DXB", duration: "8h 15m", price: 612, currency: "USD", stops: 0 },
        { id: "F2", carrier: "Qatar Airways", route: "LOS → DOH → DXB", duration: "11h 40m", price: 548, currency: "USD", stops: 1 },
        { id: "F3", carrier: "Ethiopian", route: "LOS → ADD → DXB", duration: "12h 05m", price: 489, currency: "USD", stops: 1 },
        { id: "F4", carrier: "Turkish Airlines", route: "LOS → IST → DXB", duration: "14h 30m", price: 521, currency: "USD", stops: 1 },
      ];
    case "hotels":
      return [
        { id: "H1", name: "Atlantis The Palm", city: "Dubai", price: 340, rating: 4.7 },
        { id: "H2", name: "Burj Al Arab", city: "Dubai", price: 1250, rating: 4.9 },
        { id: "H3", name: "Address Downtown", city: "Dubai", price: 420, rating: 4.8 },
      ];
    case "tours":
      return [
        { id: "T1", name: "Desert Safari + BBQ Dinner", city: "Dubai", duration: "6h", price: 65 },
        { id: "T2", name: "Burj Khalifa Sky Lounge", city: "Dubai", duration: "2h", price: 110 },
        { id: "T3", name: "Dhow Cruise Marina", city: "Dubai", duration: "3h", price: 48 },
      ];
    case "transfers":
      return [
        { id: "X1", type: "Sedan", from: "DXB Airport", to: "Downtown Dubai", price: 38, eta: "32 min" },
        { id: "X2", type: "Premium SUV", from: "DXB Airport", to: "Palm Jumeirah", price: 72, eta: "28 min" },
        { id: "X3", type: "Van (6 pax)", from: "DXB Airport", to: "Marina", price: 95, eta: "35 min" },
      ];
    case "evisas":
      return [
        { id: "V1", country: "United Arab Emirates", processing: "48–72 hours", price: 89 },
        { id: "V2", country: "Türkiye", processing: "24 hours", price: 60 },
        { id: "V3", country: "Schengen", processing: "10–15 days", price: 120 },
      ];
    case "insurance":
      return [
        { id: "I1", plan: "Essential", cover: "$50,000 medical", price: 12 },
        { id: "I2", plan: "Plus", cover: "$250,000 + cancellation", price: 28 },
        { id: "I3", plan: "Premium", cover: "$1M + adventure sports", price: 54 },
      ];
  }
}

export const Route = createFileRoute("/api/public/demo-search")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...CORS_HEADERS },
          });
        }

        const parsed = Schema.safeParse(body);
        if (!parsed.success) {
          return new Response(JSON.stringify({ error: parsed.error.issues[0].message }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...CORS_HEADERS },
          });
        }

        const upstream = process.env.TRAVSIFY_API_URL;
        if (!upstream) {
          return new Response(
            JSON.stringify({
              source: "fallback",
              vertical: parsed.data.vertical,
              results: fallback(parsed.data.vertical),
            }),
            { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
          );
        }

        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);
          const res = await fetch(`${upstream.replace(/\/+$/, "")}/v1/demo-search`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(process.env.TRAVSIFY_API_KEY ? { Authorization: `Bearer ${process.env.TRAVSIFY_API_KEY}` } : {}),
            },
            body: JSON.stringify(parsed.data),
            signal: controller.signal,
          });
          clearTimeout(timeout);
          if (!res.ok) throw new Error(`Upstream ${res.status}`);
          const json = await res.json();
          return new Response(JSON.stringify({ source: "live", vertical: parsed.data.vertical, ...json }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...CORS_HEADERS },
          });
        } catch (err) {
          console.warn("Demo proxy fallback:", (err as Error).message);
          return new Response(
            JSON.stringify({
              source: "fallback",
              vertical: parsed.data.vertical,
              results: fallback(parsed.data.vertical),
            }),
            { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
          );
        }
      },
    },
  },
});
