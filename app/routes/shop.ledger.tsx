import { useActionQuery } from "@agent-native/core/client/hooks";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useSearchParams } from "react-router";

import { EntryLine } from "@/components/shop/EntryLine";
import { dayLabel, money, shiftDay } from "@/components/shop/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { useShop } from "./shop";

const KINDS = [
  { value: "", label: "Everything" },
  { value: "sale", label: "Sales" },
  { value: "payment", label: "Payments" },
  { value: "restock", label: "Restocks" },
  { value: "adjustment", label: "Counts" },
] as const;


export default function ShopLedger() {
  const { shop, today } = useShop();
  const [params, setParams] = useSearchParams();
  const day = /^\d{4}-\d{2}-\d{2}$/.test(params.get("day") ?? "") ? (params.get("day") as string) : today;
  const kindParam = params.get("kind") ?? "";
  const kind = (["sale", "payment", "restock", "adjustment"] as const).find((k) => k === kindParam);
  const query = useActionQuery("list-entries", { day, limit: 200, ...(kind ? { kind } : {}) });
  const entries = query.data?.entries ?? [];
  const posted = entries.filter((e) => e.status === "posted");
  const sales = posted.filter((e) => e.kind === "sale");
  const totals = {
    sales: sales.reduce((s, e) => s + e.total, 0),
    cashIn: sales.reduce((s, e) => s + e.paid, 0) + posted.filter((e) => e.kind === "payment").reduce((s, e) => s + e.total, 0),
    credit: sales.reduce((s, e) => s + e.balanceChange, 0),
  };

  const set = (next: { day?: string; kind?: string }) => {
    const merged = new URLSearchParams(params);
    if (next.day !== undefined) {
      if (next.day === today) merged.delete("day");
      else merged.set("day", next.day);
    }
    if (next.kind !== undefined) {
      if (next.kind) merged.set("kind", next.kind);
      else merged.delete("kind");
    }
    setParams(merged, { replace: true });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" aria-label="Previous day" onClick={() => set({ day: shiftDay(day, -1) })}>
            <IconChevronLeft className="size-4" />
          </Button>
          <h1 className="min-w-40 text-center font-display text-xl font-semibold">
            {day === today ? "Today" : dayLabel(day)}
          </h1>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next day"
            disabled={day >= today}
            onClick={() => set({ day: shiftDay(day, 1) })}
          >
            <IconChevronRight className="size-4" />
          </Button>
        </div>
        <div role="group" aria-label="Filter entries" className="flex flex-wrap gap-1">
          {KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              aria-pressed={kindParam === k.value}
              onClick={() => set({ kind: k.value })}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                kindParam === k.value ? "border-primary bg-primary text-primary-foreground" : "border-input hover:bg-accent",
              )}
            >
              {k.label}
            </button>
          ))}
        </div>
      </div>

      <dl className="flex flex-wrap gap-x-8 gap-y-2 border-y border-border py-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Sales</dt>
          <dd className="tabular font-display text-lg font-semibold">{money(totals.sales, shop.currency)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Cash in</dt>
          <dd className="tabular font-display text-lg font-semibold">{money(totals.cashIn, shop.currency)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Given on credit</dt>
          <dd className="tabular font-display text-lg font-semibold">{money(totals.credit, shop.currency)}</dd>
        </div>
      </dl>

      {query.isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-14 rounded-md" />
          ))}
        </div>
      ) : entries.length ? (
        <ul className="divide-y divide-border">
          {entries.map((entry) => (
            <EntryLine key={entry.id} entry={entry} currency={shop.currency} timeZone={shop.timezone} />
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No {kind ? KINDS.find((k) => k.value === kind)?.label.toLowerCase() : "entries"} on this day.
        </p>
      )}
    </div>
  );
}

