import { actionErrorMessage, useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import { IconMoon, IconRefresh } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { SourceBadge } from "./EntryLine";
import { askAgent, dayLabel, money } from "./format";

interface CloseView {
  id: string;
  day: string;
  closedBy: string;
  createdAt: string;
  remindersDrafted: number;
  headline: string;
  summary: {
    overdue: { name: string; balance: number; daysOverdue: number }[];
    lowStock: { name: string; stock: number; unit: string }[];
    outstanding: { total: number; debtors: number };
  };
}

/**
 * The evening close: written by itself at 7 pm Lagos (or when the owner taps
 * Close the day). Shows how the day went and how many reminder drafts are
 * waiting; the drafts themselves sit in Reminders for the owner to approve.
 */
export function EveningClose({ currency }: { currency: string }) {
  const query = useActionQuery("get-latest-close", {});
  const close = useActionMutation("close-the-day", {
    onSuccess: (result) => {
      const drafted = (result as { remindersDrafted?: number })?.remindersDrafted ?? 0;
      toast.success(drafted ? `Day closed. ${drafted} reminder${drafted === 1 ? "" : "s"} waiting for you.` : "Day closed.");
    },
    onError: (error) => toast.error(actionErrorMessage(error) ?? "Couldn't close the day."),
  });
  const today = query.data?.today;
  const latest = (query.data?.close ?? null) as CloseView | null;
  const closedToday = !!latest && latest.day === today;
  const overdue = latest?.summary.overdue ?? [];

  return (
    <section aria-labelledby="close-heading" className="brand-corner rounded-lg border-2 border-foreground p-4">
      <div className="flex items-center gap-2">
        <IconMoon className="size-5" aria-hidden />
        <h2 id="close-heading" className="font-display text-xl font-semibold">
          Evening close
        </h2>
        {latest ? <SourceBadge source={latest.closedBy} className="ml-auto" /> : null}
      </div>

      {latest ? (
        <div className="mt-2 space-y-2 text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {closedToday ? "Today" : dayLabel(latest.day)}
          </p>
          <p>{latest.headline}</p>
          {overdue.length ? (
            <p className="text-muted-foreground">
              Past their promise:{" "}
              {overdue
                .slice(0, 3)
                .map((o) => `${o.name} (${money(o.balance, currency)})`)
                .join(", ")}
              {overdue.length > 3 ? ` and ${overdue.length - 3} more` : ""}.
            </p>
          ) : (
            <p className="text-muted-foreground">Nobody is past the day they promised.</p>
          )}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          Every evening at 7 pm your books close by themselves: the day&apos;s totals, who is late, and a reminder draft
          for each of them, waiting for you to approve.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={closedToday ? "outline" : "default"}
          className="gap-1.5"
          disabled={close.isPending || query.isPending}
          onClick={() => close.mutate(closedToday ? { refresh: true } : {})}
        >
          {closedToday ? <IconRefresh className="size-4" /> : <IconMoon className="size-4" />}
          {close.isPending ? "Closing…" : closedToday ? "Close again" : "Close the day now"}
        </Button>
        {latest ? (
          <button
            type="button"
            className="text-sm font-medium text-brand-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => askAgent("How did the shop do today? Use the evening close and compare it with yesterday.")}
          >
            Ask how today went
          </button>
        ) : null}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Closes by itself at 7 pm. Reminders are drafts until you approve.</p>
    </section>
  );
}
