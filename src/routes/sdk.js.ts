import { createFileRoute } from "@tanstack/react-router";

const SDK_VERSION = "1.1.0";

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
    function sleep(ms) { return new Promise(function (res) { setTimeout(res, ms); }); }
    // Polls /flights/search/:id until status is 'succeeded' or 'failed'.
    // Total budget ~60s by default; raise via opts.timeoutMs for very slow corridors.
    function waitForFlightResults(searchId, opts) {
      opts = opts || {};
      var timeoutMs = opts.timeoutMs || 60000;
      var intervalMs = opts.intervalMs || 2000;
      var deadline = Date.now() + timeoutMs;
      function tick() {
        return call("GET", "/api/v1/flights/search/" + searchId).then(function (data) {
          if (data.status === "succeeded") return data;
          if (data.status === "failed") {
            var e = new Error((data.error && data.error.message) || "Search failed");
            e.code = data.error && data.error.code; throw e;
          }
          if (Date.now() > deadline) {
            var t = new Error("Timed out waiting for flight search to complete");
            t.code = "client_timeout"; throw t;
          }
          return sleep(intervalMs).then(tick);
        });
      }
      return tick();
    }
    return {
      apiKey: apiKey,
      health: function () { return call("GET", "/api/v1/health"); },
      flights: {
        // Async: returns { search_id, status: 'queued', poll_url }. Use getResults() to poll.
        search: function (p) { return call("POST", "/api/v1/flights/search", p); },
        getResults: function (searchId) { return call("GET", "/api/v1/flights/search/" + searchId); },
        // Convenience: enqueue + poll until done in one call.
        searchAndWait: function (p, opts) {
          return call("POST", "/api/v1/flights/search", p).then(function (queued) {
            return waitForFlightResults(queued.search_id, opts);
          });
        },
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

export const Route = createFileRoute("/sdk/js")({
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
