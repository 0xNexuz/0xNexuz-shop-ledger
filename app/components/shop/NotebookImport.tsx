import { actionErrorMessage, useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import { IconCheck, IconNotebook, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { SourceBadge } from "./EntryLine";
import { dayLabel, money } from "./format";

interface ImportView {
  id: string;
  source: string;
  note: string | null;
  createdAt: string;
  customers: {
    index: number;
    name: string;
    owes: number;
    dueDate: string | null;
    existing: { id: string; name: string; balance: number } | null;
  }[];
  products: {
    index: number;
    name: string;
    stock: number;
    price: number | null;
    unit: string | null;
    existing: { id: string; name: string; stock: number } | null;
  }[];
  totals: { owed: number; customers: number; products: number };
}

/** Typed imports proposed by the agent, waiting for the owner to tick and add. */
export function NotebookImports({ currency }: { currency: string }) {
  const query = useActionQuery("list-imports", { status: "draft" });
  const drafts = (query.data?.imports ?? []) as ImportView[];
  if (!drafts.length) return null;
  return (
    <div className="space-y-4">
      {drafts.map((draft) => (
        <ImportReview key={draft.id} draft={draft} currency={currency} />
      ))}
    </div>
  );
}

function ImportReview({ draft, currency }: { draft: ImportView; currency: string }) {
  const [customers, setCustomers] = useState(() => new Set(draft.customers.map((l) => l.index)));
  const [products, setProducts] = useState(() => new Set(draft.products.map((l) => l.index)));
  const apply = useActionMutation("apply-notebook-import", {
    onSuccess: (result) => toast.success((result as { message?: string })?.message ?? "Added to your books."),
    onError: (error) => toast.error(actionErrorMessage(error) ?? "Couldn't add those lines."),
  });
  const dismiss = useActionMutation("dismiss-notebook-import", {
    onSuccess: () => toast("Import draft discarded. Nothing changed."),
    onError: (error) => toast.error(actionErrorMessage(error) ?? "Couldn't discard it."),
  });
  const chosen = customers.size + products.size;
  const owed = draft.customers.filter((l) => customers.has(l.index)).reduce((sum, l) => sum + l.owes, 0);
  const toggle = (set: Set<number>, update: (next: Set<number>) => void, index: number) => {
    const next = new Set(set);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    update(next);
  };

  return (
    <section
      aria-label="Import draft to review"
      className="brand-corner rounded-lg border-2 border-foreground bg-card p-4 shadow-[4px_4px_0_0_hsl(var(--brand-violet))] sm:p-5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <IconNotebook className="size-5" aria-hidden />
        <h2 className="font-display text-lg font-semibold">Old balances to review</h2>
        <SourceBadge source="agent" />
        <span className="ml-auto text-xs text-muted-foreground">Nothing is in your books until you tap Add.</span>
      </div>
      {draft.note ? <p className="mt-2 rounded-md bg-secondary px-3 py-2 text-sm text-secondary-foreground">{draft.note}</p> : null}

      {draft.customers.length ? (
        <fieldset className="mt-3">
          <legend className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Who owes</legend>
          <ul className="mt-1 divide-y divide-border">
            {draft.customers.map((line) => (
              <li key={line.index}>
                <label className="flex cursor-pointer items-start gap-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 accent-[hsl(var(--primary))]"
                    checked={customers.has(line.index)}
                    onChange={() => toggle(customers, setCustomers, line.index)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{line.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {line.existing
                        ? `Already a customer (owes ${money(line.existing.balance, currency)} now)`
                        : "New customer"}
                      {line.dueDate ? ` · promised ${dayLabel(line.dueDate)}` : ""}
                    </span>
                  </span>
                  <span className="tabular font-display font-semibold">{money(line.owes, currency)}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      ) : null}

      {draft.products.length ? (
        <fieldset className="mt-3">
          <legend className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Stock on hand</legend>
          <ul className="mt-1 divide-y divide-border">
            {draft.products.map((line) => (
              <li key={line.index}>
                <label className="flex cursor-pointer items-start gap-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 accent-[hsl(var(--primary))]"
                    checked={products.has(line.index)}
                    onChange={() => toggle(products, setProducts, line.index)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{line.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {line.existing
                        ? `In your stock (${line.existing.stock} now) · will set to ${line.stock}`
                        : `New product${line.price != null ? ` · ${money(line.price, currency)} each` : " · no price yet"}`}
                    </span>
                  </span>
                  <span className="tabular font-display font-semibold">
                    {line.stock} {line.unit ?? ""}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          disabled={!chosen || apply.isPending}
          onClick={() => apply.mutate({ id: draft.id, customers: [...customers], products: [...products] })}
          className="gap-1.5"
        >
          <IconCheck className="size-4" />
          {apply.isPending ? "Adding…" : `Add ${chosen} to my books`}
        </Button>
        <Button variant="ghost" disabled={dismiss.isPending} onClick={() => dismiss.mutate({ id: draft.id })} className="gap-1.5">
          <IconX className="size-4" /> Discard
        </Button>
        {owed ? (
          <span className="ml-auto text-sm text-muted-foreground">
            {money(owed, currency)} owed across {draft.customers.filter((l) => customers.has(l.index)).length} customers
          </span>
        ) : null}
      </div>
    </section>
  );
}
