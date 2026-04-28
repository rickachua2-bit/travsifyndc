import { createFileRoute } from "@tanstack/react-router";

const SDK_VERSION = "1.3.0";

const SDK_SOURCE = `/* Travsify Unified API SDK v${SDK_VERSION} */
(function (global) {
  var BASE = "%BASE%";
  function client(apiKey) {
    if (!apiKey || typeof apiKey !== "string") throw new Error("Travsify: API key required");
    function unavailable(path, message) {
      return { fallback: true, error: { code: "search_unavailable", message: message || "Search is temporarily unavailable. Please retry shortly." }, data: path.indexOf("visas") > -1 ? { visas: [] } : {} };
    }
    function call(method, path, body) {
      return fetch(BASE + path, {
        method: method,
        headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined
      }).then(function (r) { return r.json().then(function (j) {
        if ((r.status === 403 || r.status >= 500) && path.indexOf("/search") > -1) return unavailable(path, (j && j.error && j.error.message) || ("HTTP " + r.status));
        if (!r.ok) { var e = new Error((j && j.error && j.error.message) || ("HTTP " + r.status)); e.code = j && j.error && j.error.code; e.status = r.status; throw e; }
        return j.warning ? { data: j.data, warning: j.warning, fallback: !!j.warning.fallback } : j.data;
      }); }).catch(function (e) {
        if (path.indexOf("/search") > -1) return unavailable(path, e && e.message);
        throw e;
      });
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
      // Catalog: every country/destination/location we have inventory for.
      // Use this to populate frontend dropdowns without running a search first.
      catalog: function (vertical) {
        var qs = vertical ? "?vertical=" + encodeURIComponent(vertical) : "";
        return call("GET", "/api/v1/catalog" + qs);
      },
      flights: {
        // Backward-compatible: returns final flight results, not just the queued job.
        search: function (p, opts) {
          return call("POST", "/api/v1/flights/search", p).then(function (queued) {
            return waitForFlightResults(queued.search_id, opts);
          });
        },
        // Low-level async queue: returns { search_id, status: 'queued', poll_url }.
        enqueue: function (p) { return call("POST", "/api/v1/flights/search", p); },
        getResults: function (searchId) { return call("GET", "/api/v1/flights/search/" + searchId); },
        // Convenience: enqueue + poll until done in one call.
        searchAndWait: function (p, opts) { return this.search(p, opts); },
        book:   function (p) { return call("POST", "/api/v1/flights/orders", p); }
      },
      hotels: {
        search: function (p) { return call("POST", "/api/v1/hotels/search", p); },
        book:   function (p) { return call("POST", "/api/v1/hotels/bookings", p); }
      },
      visas: {
        search: function (p) { return call("POST", "/api/v1/visas/search", p); },
        book:   function (p) { return call("POST", "/api/v1/visas/bookings", p); }
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
        return sdkResponse(request);
      },
    },
  },
});

export function sdkResponse(request: Request) {
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
}
