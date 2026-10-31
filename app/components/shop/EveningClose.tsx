import { actionErrorMessage, useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import { IconMoon, IconRefresh } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { SourceBadge } from "./EntryLine";
import { dayLabel } from "./format";

interface CloseView {
  id: string;
  day: string;
  closedBy: string;
  createdAt: string;
  remindersDrafted: number;
  headline: string;
}

/**
 * The evening close: written by itself at 7 pm Lagos (or when the owner taps
 * Close the day). Shows how the day went and how many reminder drafts are
 * waiting; the drafts themselves sit in Reminders for the owner to approve.
 */
export function EveningClose() {
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

  return (
    <section aria-labelledby="close-heading" className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <IconMoon className="size-4" aria-hidden />
        <h2 id="close-heading" className="font-display text-lg font-semibold">
          Evening close
        </h2>
        {latest ? <SourceBadge source={latest.closedBy} className="ml-auto" /> : null}
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {latest ? (
          <>
            {closedToday ? null : <span className="font-medium text-foreground">{dayLabel(latest.day)}: </span>}
            {latest.headline}
          </>
        ) : (
          "At 7 pm the day closes by itself: totals, and a reminder draft for each late payer."
        )}
      </p>
      <div className="mt-3 flex items-center gap-3">
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
        {latest ? <span className="text-xs text-muted-foreground">Next: 7 pm, by itself</span> : null}
      </div>
    </section>
  );
}
