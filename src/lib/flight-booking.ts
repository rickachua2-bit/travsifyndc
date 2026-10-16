import { z } from "zod";

export const FlightPassengerSchema = z.object({
  id: z.string().optional(),
  given_name: z.string().min(1).max(80),
  family_name: z.string().min(1).max(80),
  born_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: z.enum(["m", "f"]),
  title: z.enum(["mr", "ms", "mrs", "miss", "dr"]),
  email: z.string().email(),
  phone_number: z.string().min(5).max(30),
  age_type: z.enum(["Adult", "Child", "Infant"]).default("Adult"),
  document_number: z.string().min(3).max(40).optional(),
  document_expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  nationality_iso3: z.string().regex(/^[A-Z]{3}$/).optional(),
});
export const FlightPayloadSchema = z.object({
  offer_id: z.string().min(1),
  passengers: z.array(FlightPassengerSchema).min(1).max(9),
  ndc_context: z.object({ offer_code: z.string().min(1), search_guid: z.string().optional(), currency: z.string().length(3) }).optional(),
}).superRefine((v, ctx) => {
  if (v.offer_id.startsWith("xmlagency_") && !v.ndc_context) {
    ctx.addIssue({ code: "custom", path: ["ndc_context"], message: "This flight has expired. Search again." });
  }
  if (v.ndc_context) v.passengers.forEach((p, i) => {
    if (!p.document_number) ctx.addIssue({ code: "custom", path: ["passengers", i, "document_number"], message: "Passport number is required for every traveler." });
  });
});
export type FlightPayload = z.infer<typeof FlightPayloadSchema>;

export function travelerTypes(adults: number, children = 0, infants = 0): Array<"Adult" | "Child" | "Infant"> {
  return [...Array.from({ length: adults }, () => "Adult" as const), ...Array.from({ length: children }, () => "Child" as const), ...Array.from({ length: infants }, () => "Infant" as const)];
}

export function requireWalletDebit(error: { message: string } | null) {
  if (error) throw new Error(`Wallet payment failed: ${error.message}`);
}