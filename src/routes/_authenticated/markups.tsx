import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { listPartnerMarkups, upsertPartnerMarkup, deletePartnerMarkup } from "@/server/markups.functions";
import { MarkupEditor } from "./admin/markups";

export const Route = createFileRoute("/_authenticated/markups")({
  component: PartnerMarkupsPage,
  head: () => ({ meta: [{ title: "My markups — Travsify" }, { name: "robots", content: "noindex" }] }),
});

function PartnerMarkupsPage() {
  const list = useServerFn(listPartnerMarkups);
  const upsert = useServerFn(upsertPartnerMarkup);
  const remove = useServerFn(deletePartnerMarkup);
  return <MarkupEditor scope="partner" title="Your markup rules" subtitle="Added on top of provider base + Travsify markup. Charged to your customers, paid into your wallet." list={list} upsert={upsert} remove={remove} />;
}
