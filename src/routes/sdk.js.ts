import { createFileRoute } from "@tanstack/react-router";

const SDK_VERSION = "1.0.0";

const SDK_SOURCE = `/* Travsify Unified API SDK v${SDK_VERSION} */
(function (global) {
  var BASE = "%BASE%";
  function client(apiKey) {
    if (!apiKey || typeof apiKey !== "string") throw new Error("Travsify: API key required");
    function call(method, path, body) {
      return fetch(BASE + path, {
        method: method,
        headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined
      }).then(function (r) { return r.json().then(function (j) {
        if (!r.ok) { var e = new Error((j && j.error && j.error.message) || ("HTTP " + r.status)); e.code = j && j.error && j.error.code; e.status = r.status; throw e; }
        return j.data;
      }); });
    }
    return {
      apiKey: apiKey,
      health: function () { return call("GET", "/api/v1/health"); },
      flights: {
        search: function (p) { return call("POST", "/api/v1/flights/search", p); },
        book:   function (p) { return call("POST", "/api/v1/flights/orders", p); }
      },
      hotels: {
        search: function (p) { return call("POST", "/api/v1/hotels/search", p); },
        book:   function (p) { return call("POST", "/api/v1/hotels/bookings", p); }
      },
      payments: {
        createIntent: function (p) { return call("POST", "/api/v1/payments/intents", p); }
      },
      payouts: {
        create: function (p) { return call("POST", "/api/v1/payouts", p); }
      }
    };
  }
  global.Travsify = { init: client, version: "${SDK_VERSION}" };
})(typeof window !== "undefined" ? window : globalThis);
`;

export const Route = createFileRoute("/sdk.js")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const base = `${url.protocol}//${url.host}`;
        return new Response(SDK_SOURCE.replace("%BASE%", base), {
          status: 200,
          headers: {
            "Content-Type": "application/javascript; charset=utf-8",
            "Cache-Control": "public, max-age=300, s-maxage=300",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});
