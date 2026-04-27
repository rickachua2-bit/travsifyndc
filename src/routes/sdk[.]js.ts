import { createFileRoute } from "@tanstack/react-router";
import { sdkResponse } from "./sdk.js";

export const Route = createFileRoute("/sdk.js")({
  server: {
    handlers: {
      GET: async ({ request }) => sdkResponse(request),
    },
  },
});