import { describe, it as test } from "node:test";
import assert from "node:assert/strict";
import { FlightPayloadSchema, travelerTypes, requireWalletDebit } from "./flight-booking";

const passenger = { given_name: "Test", family_name: "Traveler", born_on: "1990-01-01", gender: "m", title: "mr", email: "test@example.com", phone_number: "+2348000000000" };
describe("flight booking safeguards", () => {
  test("collects all searched adults, children and infants", () => {
    assert.deepEqual(travelerTypes(2, 1, 1), ["Adult", "Adult", "Child", "Infant"]);
  });
  test("xml.agency booking requires offer context", () => {
    assert.equal(FlightPayloadSchema.safeParse({ offer_id: "xmlagency_test", passengers: [passenger] }).success, false);
  });
  test("xml.agency requires each traveler's passport", () => {
    const payload = { offer_id: "xmlagency_test", ndc_context: { offer_code: "test", currency: "USD" }, passengers: [{ ...passenger, document_number: "A123456" }, passenger] };
    assert.equal(FlightPayloadSchema.safeParse(payload).success, false);
    assert.equal(FlightPayloadSchema.safeParse({ ...payload, passengers: payload.passengers.map(p => ({ ...p, document_number: "A123456" })) }).success, true);
  });
  test("wallet failure stops supplier booking", () => {
    assert.throws(() => requireWalletDebit({ message: "Insufficient funds" }), /Insufficient funds/);
    assert.doesNotThrow(() => requireWalletDebit(null));
  });
});