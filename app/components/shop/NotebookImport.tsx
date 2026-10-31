import { sendToAgentChat } from "@agent-native/core/client/agent-chat";
import { actionErrorMessage, useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import { IconCamera, IconCheck, IconNotebook, IconX } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { SourceBadge } from "./EntryLine";
import { dayLabel, money } from "./format";

const NOTEBOOK_PROMPT =
  "This is a photo of a page from my shop's notebook. Read it and use propose-notebook-import to put it up for my review: each customer with what they owe (and any date they promised), and each product with the stock count and price if written. The writing may be in English, Pidgin, Yoruba, Igbo or Hausa, with amounts like 5k or 5,000. Leave out anything you can't read clearly and tell me which lines.";

/** Phone photos are several MB; the agent reads a 1600 px JPEG just as well. */
async function photoToDataUrl(file: File, maxSide = 1600): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
}

/** Camera button: snap (or pick) a notebook page and hand it to the agent. */
export function SnapNotebookButton({ className, label = "Snap your notebook" }: { className?: string; label?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("That isn't a photo. Pick a picture of the notebook page.");
      return;
    }
    setBusy(true);
    try {
      const image = await photoToDataUrl(file);
      sendToAgentChat({ message: NOTEBOOK_PROMPT, images: [image], submit: true, openSidebar: true });
      toast.success("Reading your notebook page… you'll review everything before it goes in.");
    } catch {
      toast.error("Couldn't read that photo. Try another one.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => void onFile(event.target.files?.[0])}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-foreground bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
          className,
        )}
      >
        <IconCamera className="size-3.5" />
        {busy ? "Preparing photo…" : label}
      </button>
    </>
  );
}

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

/** Notebook pages the agent has read, waiting for the owner to tick and add. */
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
    onSuccess: () => toast("Notebook page discarded. Nothing changed."),
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
      aria-label="Notebook page to review"
      className="brand-corner rounded-lg border-2 border-foreground bg-card p-4 shadow-[4px_4px_0_0_hsl(var(--brand-violet))] sm:p-5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <IconNotebook className="size-5" aria-hidden />
        <h2 className="font-display text-lg font-semibold">From your notebook</h2>
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
