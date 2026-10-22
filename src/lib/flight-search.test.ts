import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { collectFlightOffers, rankFlightOffers, uniqueFlightItineraries } from "./flight-search";
import { collectOfferPages } from "./flight-offer-pages";

describe("XML and Duffel price comparison", () => {
  it("fetches all pages rather than stopping at ten flights", async () => {
    const calls: Array<string | undefined> = [];
    const offers = await collectOfferPages(async after => {
      calls.push(after);
      return after ? { data: Array.from({ length: 15 }, (_, i) => ({ id: i + 200 })), meta: { after: null } }
        : { data: Array.from({ length: 200 }, (_, i) => ({ id: i })), meta: { after: "next" } };
    });
    assert.deepEqual(calls, [undefined, "next"]);
    assert.equal(offers.length, 215);
    assert.equal(offers[214].id, 214);
  });
  it("shows a repeated itinerary once at the cheapest final supplier fare", async () => {
    const slices = [{ origin: "LOS", destination: "DXB", segments: [{ marketing_carrier: "EK", flight_number: "784", departing_at: "2026-11-15T12:30:00", arriving_at: "2026-11-15T22:00:00" }] }];
    const ranked = await rankFlightOffers([
      { id: "xml", source: "xmlagency", total_amount: "300", slices, _ndc_context: { offer_code: "xml" } },
      { id: "duffel", source: "duffel", total_amount: "250", slices, passengers: [{ id: "pas_1" }] },
      { id: "different", source: "xmlagency", total_amount: "350", slices: [{ ...slices[0], segments: [{ ...slices[0].segments[0], flight_number: "786" }] }] },
    ], async amount => amount);
    const unique = uniqueFlightItineraries(ranked);
    assert.deepEqual(unique.map(o => o.id), ["duffel", "different"]);
    assert.deepEqual(unique[0].passengers, [{ id: "pas_1" }]);
  });
  it("keeps distinct incomplete itineraries and removes repeated supplier IDs", () => {
    const offers = uniqueFlightItineraries([{ id: "a", source: "xmlagency" }, { id: "b", source: "duffel" }, { id: "a", source: "xmlagency" }]);
    assert.deepEqual(offers.map(o => o.id), ["a", "b"]);
  });
  it("queries Duffel even when XML has offers and starts both concurrently", async () => {
    let release: ((value: { offers: Array<Record<string, unknown>> }) => void) | undefined;
    let duffelCalled = false;
    const result = collectFlightOffers(
      () => new Promise(resolve => { release = resolve; }),
      async () => { duffelCalled = true; return { offers: [{ id: "duffel", total_amount: "200" }] }; },
    );
    await Promise.resolve();
    assert.equal(duffelCalled, true);
    assert.ok(release);
    release({ offers: [{ id: "xml", total_amount: "300", _ndc_context: { offer_code: "xml" } }] });
    const merged = await result;
    assert.deepEqual(merged.suppliers_called, ["xmlagency", "duffel"]);
    assert.equal(merged.offers.length, 2);
    assert.deepEqual(merged.offers[0]._ndc_context, { offer_code: "xml" });
  });
  it("shows the cheapest final fare first regardless of supplier or base fare", async () => {
    const offers = await rankFlightOffers([
      { id: "xml", base_amount: 100, total_amount: "250", total_currency: "USD" },
      { id: "duffel", base_amount: 150, total_amount: "200", total_currency: "USD" },
    ], async amount => amount);
    assert.deepEqual(offers.map(o => o.id), ["duffel", "xml"]);
  });
  it("compares currencies before ordering fares", async () => {
    const offers = await rankFlightOffers([
      { id: "usd", total_amount: "200", total_currency: "USD" },
      { id: "ngn", total_amount: "165000", total_currency: "NGN" },
    ], async (amount, from) => from === "NGN" ? amount / 1650 : amount);
    assert.deepEqual(offers.map(o => o.id), ["ngn", "usd"]);
    assert.equal(offers[0].comparison_amount, 100);
  });
  it("keeps Duffel results when XML fails", async () => {
    const result = await collectFlightOffers(async () => { throw new Error("XML unavailable"); }, async () => ({ offers: [{ id: "duffel" }] }));
    assert.equal(result.offers[0].id, "duffel");
    assert.equal(result.errors.length, 1);
  });
});