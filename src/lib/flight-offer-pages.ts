export type OfferPage<T> = { data: T[]; meta?: { after?: string | null } };

/** Follow the supplier cursor until all returned offer pages are collected. */
export async function collectOfferPages<T>(fetchPage: (after?: string) => Promise<OfferPage<T>>) {
  const offers: T[] = [];
  const cursors = new Set<string>();
  let after: string | undefined;
  do {
    const page = await fetchPage(after);
    offers.push(...page.data);
    const next = page.meta?.after;
    if (!next) break;
    if (cursors.has(next)) throw new Error("Flight supplier returned a repeated pagination cursor");
    cursors.add(next);
    after = next;
  } while (after);
  return offers;
}