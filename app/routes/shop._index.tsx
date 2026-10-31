import { useActionQuery } from "@agent-native/core/client/hooks";
import { IconAlertTriangle, IconArrowRight, IconMessageCircle } from "@tabler/icons-react";
import { Link } from "react-router";

import { EmptyState } from "@/components/brand/LineArt";
import { AskBar } from "@/components/shop/AskBar";
import { EntryLine } from "@/components/shop/EntryLine";
import { ReminderCard } from "@/components/shop/ReminderCard";
import { askAgent, dayLabel, money } from "@/components/shop/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { useShop } from "./shop";

const NIGHTLY_REMINDERS_PROMPT =
  "Set up a scheduled automation that runs every day at 18:00 UTC (7pm in Lagos). Each run: list customers who owe, and for each one whose promised date has passed and who has no open reminder, use draft-reminders to save a short, respectful WhatsApp message with their exact balance. Only draft: never approve or send. Confirm the schedule back to me.";

export default function ShopToday() {
  const { shop } = useShop();
  const { data } = useActionQuery("get-shop-overview", {});
  const reminders = useActionQuery("list-reminders", { status: "open" });
  if (!data) return <Skeleton className="h-96 rounded-lg" />;
  const currency = shop.currency;
  const openReminders = reminders.data?.reminders ?? [];

  return (
    <div className="space-y-6">
      <AskBar />

      <section
        aria-label="Today's till"
        className="brand-corner relative overflow-hidden rounded-lg bg-primary p-5 text-primary-foreground sm:p-6"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.09] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:14px_14px]"
        />
        <div className="relative grid gap-6 md:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-80">Today · {dayLabel(data.day)}</p>
            <p className="tabular mt-2 font-display text-5xl font-bold tracking-tight sm:text-6xl">
              {money(data.sales.total, currency)}
            </p>
            <p className="mt-1 text-sm opacity-85">
              in sales from {data.sales.count} {data.sales.count === 1 ? "sale" : "sales"}
            </p>
            <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-white/20 pt-4 text-sm">
              <div>
                <dt className="opacity-75">Cash in</dt>
                <dd className="tabular font-display text-lg font-semibold">{money(data.cashIn, currency)}</dd>
              </div>
              <div>
                <dt className="opacity-75">Given on credit</dt>
                <dd className="tabular font-display text-lg font-semibold">{money(data.sales.creditGiven, currency)}</dd>
              </div>
              <div>
                <dt className="opacity-75">Debts paid</dt>
                <dd className="tabular font-display text-lg font-semibold">{money(data.paymentsReceived, currency)}</dd>
              </div>
            </dl>
          </div>
          <Link
            to="/shop/customers"
            className="brand-corner group flex flex-col justify-between rounded-lg bg-secondary p-4 text-secondary-foreground transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em]">Owed to you</p>
            <p className="tabular font-display text-4xl font-bold tracking-tight">{money(data.outstanding.total, currency)}</p>
            <p className="flex items-center gap-1 text-sm">
              by {data.outstanding.debtors} {data.outstanding.debtors === 1 ? "customer" : "customers"}
              <IconArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </p>
          </Link>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <section aria-labelledby="daybook-heading">
          <div className="mb-1 flex items-center justify-between">
            <h2 id="daybook-heading" className="font-display text-xl font-semibold">
              Daybook
            </h2>
            <Link to="/shop/ledger" className="text-sm font-medium text-brand-blue hover:underline">
              Full ledger
            </Link>
          </div>
          {data.recent.length ? (
            <ul className="divide-y divide-border">
              {data.recent.map((entry) => (
                <EntryLine key={entry.id} entry={entry} currency={currency} timeZone={shop.timezone} showDate />
              ))}
            </ul>
          ) : (
            <EmptyState art="book">Nothing recorded yet. Tell the agent your first sale above.</EmptyState>
          )}
        </section>

        <aside className="space-y-8">
          <section aria-labelledby="reminders-heading">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 id="reminders-heading" className="font-display text-xl font-semibold">
                Reminders
              </h2>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() =>
                  askAgent(
                    "Draft friendly WhatsApp reminders for customers whose promised date has passed. State the exact balance and keep each message short and respectful.",
                  )
                }
              >
                <IconMessageCircle className="size-4" /> Draft for overdue
              </Button>
            </div>
            {openReminders.length ? (
              <div className="space-y-3">
                {openReminders.map((reminder) => (
                  <ReminderCard key={`${reminder.id}:${reminder.message}`} reminder={reminder} currency={currency} />
                ))}
              </div>
            ) : (
              <EmptyState art="phone" className="py-5">
                No reminders waiting. The agent drafts them; you approve and send from WhatsApp.
              </EmptyState>
            )}
            <button
              type="button"
              onClick={() => askAgent(NIGHTLY_REMINDERS_PROMPT)}
              className="mt-3 text-sm font-medium text-brand-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Draft these for me every evening
            </button>
          </section>

          <section aria-labelledby="debtors-heading">
            <h2 id="debtors-heading" className="mb-2 font-display text-xl font-semibold">
              Who owes
            </h2>
            <ul className="divide-y divide-border">
              {data.topDebtors.map((debtor) => (
                <li key={debtor.id}>
                  <Link
                    to={`/shop/customers/${debtor.id}`}
                    className="flex items-center gap-3 py-2.5 text-sm hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{debtor.name}</span>
                      <span
                        className={cn(
                          "text-xs",
                          debtor.daysOverdue ? "font-medium text-destructive" : "text-muted-foreground",
                        )}
                      >
                        {debtor.daysOverdue
                          ? `${debtor.daysOverdue} day${debtor.daysOverdue === 1 ? "" : "s"} overdue`
                          : debtor.promisedBy
                            ? `Promised ${dayLabel(debtor.promisedBy)}`
                            : "No date promised"}
                      </span>
                    </span>
                    <span className="tabular font-display font-semibold">{money(debtor.balance, currency)}</span>
                  </Link>
                </li>
              ))}
              {!data.topDebtors.length ? <li className="py-2.5 text-sm text-muted-foreground">Nobody owes you right now.</li> : null}
            </ul>
          </section>

          <section aria-labelledby="low-heading">
            <h2 id="low-heading" className="mb-2 font-display text-xl font-semibold">
              Running low
            </h2>
            <ul className="space-y-1.5">
              {data.lowStock.map((p) => (
                <li key={p.id} className="flex items-center gap-2 text-sm">
                  <IconAlertTriangle className="size-4 shrink-0 text-warning" />
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  <span className="tabular font-medium text-warning">
                    {p.stock} {p.unit}
                    {p.stock === 1 ? "" : "s"} left
                  </span>
                </li>
              ))}
              {!data.lowStock.length ? <li className="text-sm text-muted-foreground">Stock looks healthy.</li> : null}
            </ul>
            {data.lowStock.length ? (
              <Link to="/shop/stock" className="mt-2 inline-block text-sm font-medium text-brand-blue hover:underline">
                Restock
              </Link>
            ) : null}
          </section>
        </aside>
      </div>
    </div>
  );
}
