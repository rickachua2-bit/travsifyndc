import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { listPartnerMarkups, upsertPartnerMarkup, deletePartnerMarkup } from "@/server/markups.functions";
import { MarkupEditor } from "./admin/markups";
import { PartnerShell } from "@/components/partner/PartnerShell";

export const Route = createFileRoute("/_authenticated/markups")({
  component: PartnerMarkupsPage,
  head: () => ({ meta: [{ title: "My markups — Travsify" }, { name: "robots", content: "noindex" }] }),
});

function PartnerMarkupsPage() {
  const list = useServerFn(listPartnerMarkups);
  const upsert = useServerFn(upsertPartnerMarkup);
  const remove = useServerFn(deletePartnerMarkup);
  return (
    <PartnerShell>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <MarkupEditor
          scope="partner"
          title="Your markup rules"
          subtitle=""
          list={list}
          upsert={upsert}
          remove={remove}
        />
      </div>
    </PartnerShell>
  );
}
