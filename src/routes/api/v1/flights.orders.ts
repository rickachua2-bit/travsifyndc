import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { withGateway, jsonResponse, errorResponse, API_CORS_HEADERS } from "@/server/gateway";
import { createOrder } from "@/server/providers/duffel";
import {
  ndcPrebook, ndcBook, ndcConfirm, ndcAnnulate,
  isNdcEnabled, type NdcOfferContext, type NdcPassenger,
} from "@/server/providers/ndc";
import {
  createBookingAndDebit,
  confirmBooking,
  failAndRefundBooking,
  InsufficientFundsError,
} from "@/server/bookings";

const Schema = z.object({
  offer_id: z.string().min(1).max(500),
  // For xml.agency offers, partners pass back the `_ndc_context` they received
  // in search results. We also accept it as a top-level field for clarity.
  ndc_context: z.object({
    offer_code: z.string().min(1).max(8000),
    search_guid: z.string().max(100).optional(),
    currency: z.string().length(3),
  }).optional(),
  passengers: z.array(z.object({
    given_name: z.string().min(1).max(80),
    family_name: z.string().min(1).max(80),
    middle_name: z.string().max(80).optional(),
    born_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    gender: z.enum(["m", "f"]),
    title: z.enum(["mr", "ms", "mrs", "miss", "dr"]),
    email: z.string().email().max(255),
    phone_number: z.string().min(5).max(30),
    // Required for xml.agency (NDC) ticketing; ignored for Duffel.
    document_number: z.string().min(3).max(40).optional(),
    document_expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    nationality_iso3: z.string().length(3).optional(),
    age_type: z.enum(["Adult", "Child", "Infant"]).optional(),
  })).min(1).max(9),
  base_amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().length(3),
});

export const Route = createFileRoute("/api/v1/flights/orders")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: API_CORS_HEADERS }),
      POST: async ({ request }) =>
        withGateway(request, { endpoint: "/v1/flights/orders", vertical: "flights", provider: "auto" }, async (key) => {
          let body: unknown;
          try { body = await request.json(); } catch { return errorResponse("invalid_json", "Body must be valid JSON.", 400); }
          const parsed = Schema.safeParse(body);
          if (!parsed.success) return errorResponse("validation_error", parsed.error.issues[0].message, 400);

          const passenger = parsed.data.passengers[0];
          const baseAmount = Number(parsed.data.base_amount);
          const isXmlAgency = parsed.data.offer_id.startsWith("xmlagency_") || !!parsed.data.ndc_context;

          // ===== Path A: xml.agency (NDC SiteCity) — full auto-ticketing ======
          // Flow: AeroPrebook → debit wallet → AeroBook → ConfirmBook.
          // On any failure after debit, refund the wallet; on confirm failure
          // after a successful AeroBook, also call AnnulateBook (VOID).
          if (isXmlAgency) {
            if (!isNdcEnabled()) {
              return errorResponse("supplier_unavailable", "xml.agency supplier is not enabled.", 503);
            }
            if (!parsed.data.ndc_context) {
              return errorResponse("validation_error", "ndc_context is required for xml.agency offers.", 400);
            }
            // AeroBook requires document number for every passenger.
            const missingDocs = parsed.data.passengers.find((p) => !p.document_number);
            if (missingDocs) {
              return errorResponse("validation_error",
                "passengers[].document_number is required for xml.agency flights.", 400);
            }
            const ctx: NdcOfferContext = parsed.data.ndc_context;

            // 1) Prebook — price lock + availability check.
            let prebook: { full_price: number; currency: string };
            try {
              prebook = await ndcPrebook(ctx);
            } catch (e) {
              return errorResponse("supplier_error", `Prebook failed: ${(e as Error).message}`, 502);
            }
            if (prebook.full_price > 0 && prebook.full_price > baseAmount * 1.01) {
              return errorResponse("price_changed",
                `Supplier price moved from ${baseAmount} to ${prebook.full_price}. Re-search to get the latest price.`, 409);
            }

            // 2) Debit wallet (creates booking row in pending state).
            let created;
            try {
              created = await createBookingAndDebit({
                key,
                vertical: "flights",
                provider: "xmlagency",
                fulfillmentMode: "auto",
                providerBase: baseAmount,
                currency: parsed.data.currency,
                customer: {
                  name: `${passenger.given_name} ${passenger.family_name}`,
                  email: passenger.email,
                },
                metadata: {
                  ndc_offer_code: ctx.offer_code,
                  ndc_search_guid: ctx.search_guid,
                  prebook_full_price: prebook.full_price,
                  passengers: parsed.data.passengers,
                },
              });
            } catch (e) {
              if (e instanceof InsufficientFundsError) {
                return errorResponse("insufficient_funds", e.message, 402);
              }
              throw e;
            }

            // 3) AeroBook — create reservation with passenger data.
            const ndcPaxList: NdcPassenger[] = parsed.data.passengers.map((p) => ({
              given_name: p.given_name,
              family_name: p.family_name,
              middle_name: p.middle_name,
              born_on: p.born_on,
              gender: p.gender,
              age_type: p.age_type || "Adult",
              document_number: p.document_number!,
              document_expiry: p.document_expiry,
              nationality_iso3: p.nationality_iso3,
            }));

            let booked;
            try {
              booked = await ndcBook({
                ctx,
                client_reference: created.reference.slice(0, 40),
                email: passenger.email,
                phone: passenger.phone_number,
                passengers: ndcPaxList,
              });
            } catch (e) {
              await failAndRefundBooking({
                bookingId: created.bookingId,
                reference: created.reference,
                userId: key.userId,
                currency: parsed.data.currency,
                amount: created.price.total,
                reason: `AeroBook failed: ${(e as Error).message}`,
              });
              return errorResponse("supplier_error", `Booking failed at supplier: ${(e as Error).message}. Wallet refunded.`, 502);
            }

            // 4) ConfirmBook — issue tickets. On failure, VOID + refund.
            try {
              const confirmed = await ndcConfirm({
                book_id: booked.book_id,
                book_guid: booked.book_guid,
                price: booked.full_price || baseAmount,
                currency: booked.currency,
              });
              if (confirmed.status === "Cancelled") {
                throw new Error("Ticketing was cancelled by supplier");
              }
              await confirmBooking(created.bookingId, booked.book_id, {
                ndc_book_id: booked.book_id,
                ndc_book_guid: booked.book_guid,
                ndc_pnrs: booked.pnrs,
                ndc_confirm_status: confirmed.status,
                ndc_ticket_numbers: confirmed.ticket_numbers,
                ndc_cancellable: confirmed.cancellable,
                ndc_void_deadline_utc: confirmed.deadline_utc,
              });
              return jsonResponse({
                data: {
                  reference: created.reference,
                  status: confirmed.status === "WaitToBooking" ? "processing" : "confirmed",
                  price: created.price,
                  pnrs: booked.pnrs,
                  ticket_numbers: confirmed.ticket_numbers,
                  ticketing_status: confirmed.status,
                },
              }, confirmed.status === "Booked" ? 201 : 202);
            } catch (e) {
              await ndcAnnulate({ book_id: booked.book_id, book_guid: booked.book_guid, currency: booked.currency });
              await failAndRefundBooking({
                bookingId: created.bookingId,
                reference: created.reference,
                userId: key.userId,
                currency: parsed.data.currency,
                amount: created.price.total,
                reason: `ConfirmBook failed: ${(e as Error).message}`,
              });
              return errorResponse("supplier_error", `Ticketing failed: ${(e as Error).message}. Wallet refunded.`, 502);
            }
          }


          // ===== Path B: Duffel (auto-confirm) =================================
          let created;
          try {
            created = await createBookingAndDebit({
              key,
              vertical: "flights",
              provider: "duffel",
              fulfillmentMode: "auto",
              providerBase: baseAmount,
              currency: parsed.data.currency,
              customer: {
                name: `${passenger.given_name} ${passenger.family_name}`,
                email: passenger.email,
              },
              metadata: { offer_id: parsed.data.offer_id, passengers: parsed.data.passengers },
            });
          } catch (e) {
            if (e instanceof InsufficientFundsError) {
              return errorResponse("insufficient_funds", e.message, 402);
            }
            throw e;
          }

          try {
            const order = await createOrder(key.environment, {
              offer_id: parsed.data.offer_id,
              passengers: parsed.data.passengers,
              payment_amount: baseAmount.toFixed(2),
              payment_currency: parsed.data.currency,
            });
            const providerRef = (order.data as Record<string, unknown>).id as string;
            await confirmBooking(created.bookingId, providerRef, { duffel_order: order.data });
            return jsonResponse({
              data: {
                reference: created.reference,
                status: "confirmed",
                price: created.price,
                provider_order: order.data,
              },
            }, 201);
          } catch (e) {
            await failAndRefundBooking({
              bookingId: created.bookingId,
              reference: created.reference,
              userId: key.userId,
              currency: parsed.data.currency,
              amount: created.price.total,
              reason: (e as Error).message,
            });
            return errorResponse("supplier_error", `Booking failed at supplier: ${(e as Error).message}. Wallet refunded.`, 502);
          }
        }),
    },
  },
});
