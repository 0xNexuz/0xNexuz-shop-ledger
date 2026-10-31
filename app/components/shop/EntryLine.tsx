import { actionErrorMessage, useActionMutation } from "@agent-native/core/client/hooks";
import { IconArrowBackUp } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { SOURCE_LABELS, money, timeOf } from "./format";

export interface Entry {
  id: string;
  kind: "sale" | "payment" | "restock" | "adjustment";
  status: "posted" | "voided";
  customerName: string | null;
  total: number;
  paid: number;
  balanceChange: number;
  source: string;
  occurredAt: string;
  voidReason: string | null;
  lines: { productName: string; qty: number }[];
  summary: string;
}

const KIND_LABEL: Record<Entry["kind"], string> = {
  sale: "Sale",
  payment: "Payment",
  restock: "Restock",
  adjustment: "Count",
};

export function SourceBadge({ source }: { source: string }) {
  const agent = source === "agent" || source === "automation";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        agent ? "bg-brand-violet text-white" : "border border-input text-muted-foreground",
      )}
    >
      {SOURCE_LABELS[source] ?? source}
    </span>
  );
}

function amountText(entry: Entry, currency: string): { text: string; tone: string } {
  switch (entry.kind) {
    case "payment":
      return { text: `+${money(entry.total, currency)}`, tone: "text-success" };
    case "restock":
      return { text: entry.total ? money(entry.total, currency) : "—", tone: "text-muted-foreground" };
    case "adjustment":
      return {
        text: entry.lines.map((l) => `${l.qty > 0 ? "+" : ""}${l.qty}`).join(", "),
        tone: "text-muted-foreground",
      };
    default:
      return { text: money(entry.total, currency), tone: "text-foreground" };
  }
}

/** One receipt-style ledger line: time · what happened ······ amount. */
export function EntryLine({ entry, currency, timeZone, showDate }: { entry: Entry; currency: string; timeZone: string; showDate?: boolean }) {
  const [voiding, setVoiding] = useState(false);
  const voided = entry.status === "voided";
  const amount = amountText(entry, currency);
  const credit = entry.kind === "sale" && entry.balanceChange > 0;

  return (
    <li className="group flex items-start gap-3 py-2.5">
      <time className="tabular w-14 shrink-0 pt-0.5 text-xs text-muted-foreground" dateTime={entry.occurredAt}>
        {showDate
          ? new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", timeZone }).format(new Date(entry.occurredAt))
          : timeOf(entry.occurredAt, timeZone)}
      </time>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className={cn("text-[11px] font-semibold uppercase tracking-wide text-muted-foreground", voided && "line-through")}>
            {KIND_LABEL[entry.kind]}
          </span>
          <span className="ledger-leader" aria-hidden />
          <span className={cn("tabular font-display text-[15px] font-semibold", amount.tone, voided && "line-through opacity-60")}>
            {amount.text}
          </span>
        </div>
        <p className={cn("mt-0.5 text-sm leading-snug", voided && "text-muted-foreground line-through")}>
          {entry.summary.replace(/^\[VOIDED:[^\]]*\]\s*/, "")}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <SourceBadge source={entry.source} />
          {credit && !voided ? (
            <span className="text-xs font-medium text-warning">{money(entry.balanceChange, currency)} on credit</span>
          ) : null}
          {voided ? <span className="text-xs text-destructive">Voided: {entry.voidReason}</span> : null}
          {!voided ? (
            <button
              type="button"
              onClick={() => setVoiding(true)}
              className="ml-auto inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground opacity-100 transition-opacity hover:bg-accent hover:text-foreground focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
            >
              <IconArrowBackUp className="size-3.5" /> Void
            </button>
          ) : null}
        </div>
      </div>
      <VoidDialog entry={entry} open={voiding} onOpenChange={setVoiding} />
    </li>
  );
}

function VoidDialog({ entry, open, onOpenChange }: { entry: Entry; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [reason, setReason] = useState("");
  const voidEntry = useActionMutation("void-entry", {
    onSuccess: () => {
      toast.success("Entry voided. Stock and balances are restored.");
      setReason("");
      onOpenChange(false);
    },
    onError: (error) => toast.error(actionErrorMessage(error) ?? "Couldn't void that entry."),
  });
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Void this entry?</AlertDialogTitle>
          <AlertDialogDescription>
            {entry.summary}. It stays in the ledger marked as voided, and its stock and balance changes are reversed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor={`void-${entry.id}`}>Reason</Label>
          <Input
            id={`void-${entry.id}`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. entered twice"
            maxLength={200}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction
            disabled={reason.trim().length < 2 || voidEntry.isPending}
            onClick={(event) => {
              event.preventDefault();
              voidEntry.mutate({ id: entry.id, reason: reason.trim() });
            }}
          >
            {voidEntry.isPending ? "Voiding…" : "Void entry"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
