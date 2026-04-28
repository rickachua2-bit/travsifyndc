// Helpers to make the partner-facing API more forgiving and ergonomic.
// - formatZodIssues: returns a friendly "field: message" string and a structured details array.
// - aliasFields: rewrites common alternative field names so partners using different
//   conventions (pickup vs pickup_address, passengers vs num_passengers, etc.) still work.
// - normalizeCountry: accepts ISO-2 codes case-insensitively and country names.
// - normalizeEnum: lower-cases & maps common synonyms (e.g. "Tourist" -> "tourism").
import type { ZodError } from "zod";
import { COUNTRIES } from "@/data/countries";

export function formatZodIssues(err: ZodError): { message: string; details: Array<{ field: string; message: string }> } {
  const details = err.issues.map((i) => ({
    field: i.path.join(".") || "(body)",
    message: i.message,
  }));
  const message = details
    .map((d) => (d.field === "(body)" ? d.message : `${d.field}: ${d.message}`))
    .join("; ");
  return { message, details };
}

/** Rewrite alias field names on the request body, in-place safe (returns new object). */
export function aliasFields(body: unknown, aliases: Record<string, string>): Record<string, unknown> {
  if (!body || typeof body !== "object") return {};
  const out: Record<string, unknown> = { ...(body as Record<string, unknown>) };
  for (const [from, to] of Object.entries(aliases)) {
    if (out[to] === undefined && out[from] !== undefined) {
      out[to] = out[from];
      delete out[from];
    }
  }
  return out;
}

/** Accepts an ISO-2 code (any case) or a country name; returns uppercase ISO-2 or the original input. */
export function normalizeCountry(input: unknown): unknown {
  if (typeof input !== "string") return input;
  const trimmed = input.trim();
  if (trimmed.length === 2) return trimmed.toUpperCase();
  const hit = COUNTRIES.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
  return hit ? hit.code.toUpperCase() : trimmed;
}

const ENUM_SYNONYMS: Record<string, string> = {
  tourist: "tourism",
  tourism: "tourism",
  leisure: "tourism",
  holiday: "tourism",
  vacation: "tourism",
  business: "business",
  work: "business",
  transit: "transit",
  layover: "transit",
};

export function normalizeVisaPurpose(input: unknown): unknown {
  if (typeof input !== "string") return input;
  const k = input.trim().toLowerCase();
  return ENUM_SYNONYMS[k] ?? k;
}

/** Coerce travelers from `number`, `[{age}]`, `[number]`, or array of strings into `[{age:number}]`. */
export function normalizeTravelers(input: unknown): Array<{ age: number }> | unknown {
  if (typeof input === "number" && Number.isFinite(input) && input >= 1) {
    return Array.from({ length: Math.min(10, Math.floor(input)) }, () => ({ age: 30 }));
  }
  if (Array.isArray(input)) {
    return input.map((t) => {
      if (typeof t === "number") return { age: t };
      if (t && typeof t === "object" && "age" in (t as Record<string, unknown>)) {
        const a = (t as Record<string, unknown>).age;
        return { age: typeof a === "string" ? Number(a) : (a as number) };
      }
      return t;
    });
  }
  return input;
}
