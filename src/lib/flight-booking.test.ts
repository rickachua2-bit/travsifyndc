import { describe, test, expect } from "bun:test";
import { FlightPayloadSchema, travelerTypes, requireWalletDebit } from "./flight-booking";

const passenger = { given_name: "Test", family_name: "Traveler", born_on: "1990-01-01", gender: "m", title: "mr", email: "test@example.com", phone_number: "+2348000000000" };
describe("flight booking safeguards", () => {
  test("collects all searched adults, children and infants", () => {
    expect(travelerTypes(2, 1, 1)).toEqual(["Adult", "Adult", "Child", "Infant"]);
  });
  test("xml.agency booking requires offer context", () => {
    expect(FlightPayloadSchema.safeParse({ offer_id: "xmlagency_test", passengers: [passenger] }).success).toBe(false);
  });
  test("xml.agency requires each traveler's passport", () => {
    const payload = { offer_id: "xmlagency_test", ndc_context: { offer_code: "test", currency: "USD" }, passengers: [{ ...passenger, document_number: "A123456" }, passenger] };
    expect(FlightPayloadSchema.safeParse(payload).success).toBe(false);
    expect(FlightPayloadSchema.safeParse({ ...payload, passengers: payload.passengers.map(p => ({ ...p, document_number: "A123456" })) }).success).toBe(true);
  });
  test("wallet failure stops supplier booking", () => {
    expect(() => requireWalletDebit({ message: "Insufficient funds" })).toThrow("Insufficient funds");
    expect(() => requireWalletDebit(null)).not.toThrow();
  });
});