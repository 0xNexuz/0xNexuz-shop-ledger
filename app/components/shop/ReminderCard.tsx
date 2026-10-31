import { actionErrorMessage, useActionMutation } from "@agent-native/core/client/hooks";
import { IconBrandWhatsapp, IconCheck, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { SourceBadge } from "./EntryLine";
import { money } from "./format";

export interface Reminder {
  id: string;
  customerName: string;
  phone: string | null;
  message: string;
  amount: number;
  currentBalance: number;
  status: "draft" | "approved" | "sent" | "dismissed";
  draftedBy: string;
  whatsappUrl: string | null;
}

/**
 * The human gate: the agent drafts, the owner edits and approves here, then
 * sends from their own WhatsApp. Approve is an owner-only action.
 */
export function ReminderCard({ reminder, currency }: { reminder: Reminder; currency: string }) {
  const [message, setMessage] = useState(reminder.message);
  const onError = (fallback: string) => (error: unknown) => toast.error(actionErrorMessage(error) ?? fallback);
  const approve = useActionMutation("approve-reminder", {
    onSuccess: () => toast.success("Approved. Open WhatsApp to send it."),
    onError: onError("Couldn't approve this reminder."),
  });
  const dismiss = useActionMutation("update-reminder", { onError: onError("Couldn't dismiss this reminder.") });
  const markSent = useActionMutation("mark-reminder-sent", {
    onSuccess: () => toast.success("Marked as sent."),
    onError: onError("Couldn't update this reminder."),
  });
  const changed = message.trim() !== reminder.message;
  const balanceMoved = reminder.status === "draft" && reminder.currentBalance !== reminder.amount;

  return (
    <article className="brand-corner rounded-lg border border-border bg-secondary/60 p-3.5">
      <header className="flex items-center gap-2">
        <h3 className="min-w-0 flex-1 truncate font-display text-[15px] font-semibold">{reminder.customerName}</h3>
        <span className="tabular font-display text-sm font-semibold">{money(reminder.currentBalance, currency)}</span>
      </header>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        <SourceBadge source={reminder.draftedBy} />
        <span>{reminder.status === "draft" ? "Draft — waiting for you" : "Approved — send it on WhatsApp"}</span>
      </div>
      {balanceMoved ? (
        <p className="mt-2 text-xs font-medium text-warning">
          Balance changed since drafting (was {money(reminder.amount, currency)}). Check the amount in the message.
        </p>
      ) : null}
      {reminder.status === "draft" ? (
        <>
          <label htmlFor={`reminder-${reminder.id}`} className="sr-only">
            Message to {reminder.customerName}
          </label>
          <Textarea
            id={`reminder-${reminder.id}`}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={4}
            maxLength={700}
            className="mt-2.5 bg-card text-sm"
          />
          <div className="mt-2.5 flex flex-wrap gap-2">
            <Button
              size="sm"
              className="gap-1.5"
              disabled={approve.isPending || message.trim().length < 10}
              onClick={() => approve.mutate({ id: reminder.id, ...(changed ? { message: message.trim() } : {}) })}
            >
              <IconCheck className="size-4" /> {approve.isPending ? "Approving…" : "Approve"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5"
              disabled={dismiss.isPending}
              onClick={() => dismiss.mutate({ id: reminder.id, dismiss: true })}
            >
              <IconX className="size-4" /> Dismiss
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-2.5 whitespace-pre-line rounded-md bg-card p-2.5 text-sm">{reminder.message}</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {reminder.whatsappUrl ? (
              <Button size="sm" asChild className="gap-1.5 bg-[#106b3d] text-white hover:bg-[#0c5530]">
                <a href={reminder.whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <IconBrandWhatsapp className="size-4" /> Open WhatsApp
                </a>
              </Button>
            ) : null}
            <Button size="sm" variant="outline" disabled={markSent.isPending} onClick={() => markSent.mutate({ id: reminder.id })}>
              I've sent it
            </Button>
            {!reminder.phone ? (
              <span className="self-center text-xs text-muted-foreground">No phone saved: WhatsApp will ask who to send to.</span>
            ) : null}
          </div>
        </>
      )}
    </article>
  );
}
