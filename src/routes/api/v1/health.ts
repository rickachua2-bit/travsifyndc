import { createFileRoute } from "@tanstack/react-router";
import { withGateway, jsonResponse, API_CORS_HEADERS } from "@/server/gateway";

export const Route = createFileRoute("/api/v1/health")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: API_CORS_HEADERS }),
      GET: async ({ request }) =>
        withGateway(request, { endpoint: "/v1/health" }, async (key) =>
          jsonResponse({ data: { ok: true, environment: key.environment, ts: new Date().toISOString() } }),
        ),
    },
  },
});
