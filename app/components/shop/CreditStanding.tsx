import { actionErrorMessage, useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import { IconShieldCheck } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { askAgent, money } from "./format";

export type CreditStatus = "good" | "watch" | "hold";

const STATUS: Record<CreditStatus, { label: string; className: string }> = {
  good: { label: "Good payer", className: "border-success text-success" },
  watch: { label: "Watch", className: "border-warning text-warning" },
  hold: { label: "Hold credit", className: "border-destructive bg-destructive text-white" },
};

export function CreditChip({ status, className }: { status: CreditStatus; className?: string }) {
  const s = STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        s.className,
        className,
      )}
    >
      {s.label}
    </span>
  );
}

/** All customers' credit status in one read, for lists. */
export function useCreditStatuses(): Map<string, CreditStatus> {
  const query = useActionQuery("get-credit-standing", {});
  const map = new Map<string, CreditStatus>();
  for (const s of query.data?.standings ?? []) map.set(s.customerId, s.status as CreditStatus);
  return map;
}

/**
 * Credit sense on the customer page: how they've paid before, the limit the
 * books suggest (or the owner's own), and the status a new credit sale checks.
 */
export function CreditStandingCard({ customerId, currency }: { customerId: string; currency: string }) {
  const query = useActionQuery("get-credit-standing", { customer: customerId });
  const standing = query.data?.standings?.[0];
  const [limit, setLimit] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const save = useActionMutation("update-customer", {
    onSuccess: () => {
      toast.success("Credit limit saved.");
      setLimit(null);
      setEditing(false);
    },
    onError: (error) => toast.error(actionErrorMessage(error) ?? "Couldn't save the limit."),
  });
  if (!standing) return null;

  return (
    <section aria-labelledby="credit-heading" className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <IconShieldCheck className="size-4" aria-hidden />
        <h2 id="credit-heading" className="font-display text-lg font-semibold">
          Credit
        </h2>
        <CreditChip status={standing.status as CreditStatus} className="ml-auto" />
      </div>
      <p className="text-sm text-muted-foreground">{standing.reason}</p>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Limit ({standing.limitSource === "owner" ? "yours" : "suggested"})</dt>
          <dd className="tabular font-display text-base font-semibold">{money(standing.limit, currency)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Paid back up to</dt>
          <dd className="tabular font-display text-base font-semibold">
            {standing.repaidUpTo ? money(standing.repaidUpTo, currency) : "Not yet"}
          </dd>
        </div>
      </dl>
      {editing ? (
        <form
          className="space-y-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            if (limit !== null && limit.trim() !== "") save.mutate({ id: customerId, creditLimit: Number(limit) });
          }}
        >
          <Label htmlFor="credit-limit">Your own limit (₦)</Label>
          <div className="flex gap-2">
            <Input
              id="credit-limit"
              type="number"
              inputMode="decimal"
              min={0}
              step={1000}
              autoFocus
              value={limit ?? (standing.limitSource === "owner" ? String(standing.limit) : "")}
              onChange={(event) => setLimit(event.target.value)}
              placeholder={`Suggested ${money(standing.suggestedLimit, currency)}`}
            />
            <Button type="submit" variant="outline" disabled={limit === null || limit.trim() === "" || save.isPending}>
              Save
            </Button>
          </div>
        </form>
      ) : null}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium">
        {!editing ? (
          <button type="button" className="text-brand-blue hover:underline" onClick={() => setEditing(true)}>
            Change limit
          </button>
        ) : (
          <button type="button" className="text-muted-foreground hover:underline" onClick={() => setEditing(false)}>
            Cancel
          </button>
        )}
        {standing.limitSource === "owner" ? (
          <button
            type="button"
            className="text-brand-blue hover:underline"
            onClick={() => save.mutate({ id: customerId, creditLimit: null })}
          >
            Use the suggested limit
          </button>
        ) : null}
        <button
          type="button"
          className="text-brand-blue hover:underline"
          onClick={() => askAgent(`Should I give ${standing.name} more credit? Explain using their payment history.`)}
        >
          Ask the agent
        </button>
      </div>
    </section>
  );
}
