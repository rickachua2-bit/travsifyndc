import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { collectFlightOffers, rankFlightOffers } from "./flight-search";

describe("XML and Duffel price comparison", () => {
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