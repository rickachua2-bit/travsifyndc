// Public catalog endpoint.
// Returns everything we have live in our database so partners can populate
// their own frontends (country selectors, destination dropdowns, etc.) without
// running a search first.
//
// GET /api/v1/catalog                    → all verticals
// GET /api/v1/catalog?vertical=tours     → just one vertical
//
// Cached at the edge for 5 minutes (catalog changes slowly).
import { createFileRoute } from "@tanstack/react-router";
import { withGateway, jsonResponse, errorResponse, API_CORS_HEADERS } from "@/server/gateway";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type VerticalKey = "tours" | "visas" | "transfers" | "rentals" | "insurance";

const ALL: VerticalKey[] = ["tours", "visas", "transfers", "rentals", "insurance"];

async function loadTours() {
  const { data } = await supabaseAdmin
    .from("tours")
    .select("country, location")
    .not("country", "is", null);
  const byCountry = new Map<string, Set<string>>();
  for (const r of data ?? []) {
    if (!r.country) continue;
    if (!byCountry.has(r.country)) byCountry.set(r.country, new Set());
    if (r.location) byCountry.get(r.country)!.add(r.location);
  }
  return {
    total_items: data?.length ?? 0,
    countries: [...byCountry.entries()]
      .map(([country, cities]) => ({ country, cities: [...cities].sort() }))
      .sort((a, b) => a.country.localeCompare(b.country)),
  };
}

async function loadVisas() {
  // Use evisas (legacy) + visa_products (new sherpa-backed) and merge.
  const [{ data: e }, { data: p }] = await Promise.all([
    supabaseAdmin.from("evisas").select("destination_country, nationality, visa_type"),
    supabaseAdmin.from("visa_products").select("destination, destination_name, nationality, nationality_name, visa_type").eq("is_active", true),
  ]);
  const corridors = new Map<string, { destination: string; destination_name?: string; nationalities: Set<string>; visa_types: Set<string> }>();
  for (const r of e ?? []) {
    if (!r.destination_country) continue;
    const key = r.destination_country;
    if (!corridors.has(key)) corridors.set(key, { destination: key, nationalities: new Set(), visa_types: new Set() });
    const c = corridors.get(key)!;
    if (r.nationality) c.nationalities.add(r.nationality);
    if (r.visa_type) c.visa_types.add(r.visa_type);
  }
  for (const r of p ?? []) {
    if (!r.destination) continue;
    const key = r.destination;
    if (!corridors.has(key)) corridors.set(key, { destination: key, destination_name: r.destination_name, nationalities: new Set(), visa_types: new Set() });
    const c = corridors.get(key)!;
    if (!c.destination_name && r.destination_name) c.destination_name = r.destination_name;
    if (r.nationality) c.nationalities.add(r.nationality);
    if (r.visa_type) c.visa_types.add(r.visa_type);
  }
  return {
    total_items: (e?.length ?? 0) + (p?.length ?? 0),
    destinations: [...corridors.values()]
      .map((c) => ({
        destination: c.destination,
        destination_name: c.destination_name ?? c.destination,
        nationalities: [...c.nationalities].sort(),
        visa_types: [...c.visa_types].sort(),
      }))
      .sort((a, b) => a.destination.localeCompare(b.destination)),
  };
}

async function loadTransfers() {
  const { data } = await supabaseAdmin
    .from("car_transfers")
    .select("country, pickup_location, dropoff_location");
  const byCountry = new Map<string, Set<string>>();
  for (const r of data ?? []) {
    const key = r.country ?? "Unknown";
    if (!byCountry.has(key)) byCountry.set(key, new Set());
    if (r.pickup_location) byCountry.get(key)!.add(r.pickup_location);
    if (r.dropoff_location) byCountry.get(key)!.add(r.dropoff_location);
  }
  return {
    total_items: data?.length ?? 0,
    countries: [...byCountry.entries()]
      .map(([country, locations]) => ({ country, locations: [...locations].sort() }))
      .sort((a, b) => a.country.localeCompare(b.country)),
  };
}

async function loadRentals() {
  const { data } = await supabaseAdmin
    .from("car_rentals")
    .select("country, location");
  const byCountry = new Map<string, Set<string>>();
  for (const r of data ?? []) {
    const key = r.country ?? "Unknown";
    if (!byCountry.has(key)) byCountry.set(key, new Set());
    if (r.location) byCountry.get(key)!.add(r.location);
  }
  return {
    total_items: data?.length ?? 0,
    countries: [...byCountry.entries()]
      .map(([country, locations]) => ({ country, locations: [...locations].sort() }))
      .sort((a, b) => a.country.localeCompare(b.country)),
  };
}

async function loadInsurance() {
  const { data } = await supabaseAdmin
    .from("insurance_packages")
    .select("provider, name");
  return {
    total_items: data?.length ?? 0,
    // Insurance is global by design (not country-scoped) — return providers + plan names.
    providers: [...new Set((data ?? []).map((r) => r.provider).filter(Boolean))].sort(),
    plans: (data ?? []).map((r) => ({ provider: r.provider, name: r.name })),
  };
}

export const Route = createFileRoute("/api/v1/catalog")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: API_CORS_HEADERS }),
      GET: async ({ request }) =>
        withGateway(request, { endpoint: "/v1/catalog", vertical: "catalog" }, async () => {
          const url = new URL(request.url);
          const requested = url.searchParams.get("vertical");
          const verticals: VerticalKey[] = requested
            ? ALL.includes(requested as VerticalKey)
              ? [requested as VerticalKey]
              : []
            : ALL;

          if (requested && verticals.length === 0) {
            return errorResponse("invalid_vertical", `Unknown vertical '${requested}'. Valid: ${ALL.join(", ")}.`, 400);
          }

          const out: Record<string, unknown> = {};
          await Promise.all(
            verticals.map(async (v) => {
              try {
                if (v === "tours") out.tours = await loadTours();
                else if (v === "visas") out.visas = await loadVisas();
                else if (v === "transfers") out.transfers = await loadTransfers();
                else if (v === "rentals") out.rentals = await loadRentals();
                else if (v === "insurance") out.insurance = await loadInsurance();
              } catch (e) {
                out[v] = { error: (e as Error).message };
              }
            }),
          );

          return jsonResponse(
            { data: out, generated_at: new Date().toISOString() },
            200,
            { "Cache-Control": "public, max-age=300, s-maxage=300" },
          );
        }),
    },
  },
});
