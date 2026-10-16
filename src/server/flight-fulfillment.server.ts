import { FlightPayloadSchema, type FlightPayload } from "@/lib/flight-booking";
import { getOffer, createOrder } from "./providers/duffel";
import { ndcPrebook, ndcBook, ndcConfirm, ndcAnnulate } from "./providers/ndc";

/** Validate supplier availability, price and passenger identifiers BEFORE payment. */
export async function prepareFlight(payload: Record<string, unknown>, amount: number, currency: string) {
  const flight = FlightPayloadSchema.parse(payload);
  if (flight.ndc_context) {
    const pre = await ndcPrebook(flight.ndc_context);
    if (!(pre.full_price > 0) || pre.currency.toUpperCase() !== currency.toUpperCase() || Math.abs(pre.full_price - amount) > 0.01) {
      throw new Error("The flight price changed. Search again before paying.");
    }
    return flight;
  }
  const offer = await getOffer("live", flight.offer_id) as { data: { total_amount: string; total_currency: string; passengers: Array<{ id: string }> } };
  if (offer.data.total_currency.toUpperCase() !== currency.toUpperCase() || Math.abs(Number(offer.data.total_amount) - amount) > 0.01) {
    throw new Error("The flight price changed. Search again before paying.");
  }
  if (offer.data.passengers.length !== flight.passengers.length) throw new Error("Enter details for every traveler in this flight search.");
  return { ...flight, passengers: flight.passengers.map((p, i) => ({ ...p, id: offer.data.passengers[i]?.id })) };
}

export async function fulfillFlight(flight: FlightPayload, reference: string, amount: number, currency: string) {
  if (!flight.ndc_context) {
    const order = await createOrder("live", { offer_id: flight.offer_id, passengers: flight.passengers, payment_amount: amount.toFixed(2), payment_currency: currency });
    return { status: "confirmed" as const, provider: "duffel", reference: String(order.data.id), metadata: { supplier_order: order.data } };
  }
  const contact = flight.passengers[0];
  if (!contact) throw new Error("Passenger details are required.");
  const booked = await ndcBook({ ctx: flight.ndc_context, client_reference: reference.slice(0, 40), email: contact.email, phone: contact.phone_number,
    passengers: flight.passengers.map((p) => {
      if (!p.document_number) throw new Error("Passport number is required.");
      return { ...p, document_number: p.document_number };
    }),
  });
  let confirmed;
  try {
    confirmed = await ndcConfirm({ book_id: booked.book_id, book_guid: booked.book_guid, price: booked.full_price || amount, currency: booked.currency });
  } catch (error) {
    // An ambiguous ticketing response must not be retried or refunded blindly.
    const voided = await ndcAnnulate({ book_id: booked.book_id, book_guid: booked.book_guid, currency: booked.currency });
    if (voided.success) throw error;
    return { status: "processing" as const, provider: "xmlagency", reference: booked.book_id, metadata: { ndc_book_id: booked.book_id, ndc_book_guid: booked.book_guid, ndc_pnrs: booked.pnrs, ticketing_review_required: true } };
  }
  if (confirmed.status === "Cancelled") throw new Error("Supplier cancelled ticketing.");
  return { status: confirmed.status === "Booked" ? "confirmed" as const : "processing" as const, provider: "xmlagency", reference: booked.book_id,
    metadata: { ndc_book_id: booked.book_id, ndc_book_guid: booked.book_guid, ndc_pnrs: booked.pnrs, ndc_ticket_numbers: confirmed.ticket_numbers, ndc_confirm_status: confirmed.status } };
}