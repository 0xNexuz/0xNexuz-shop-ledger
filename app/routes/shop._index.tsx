import { useActionQuery } from "@agent-native/core/client/hooks";
import { IconAlertTriangle, IconArrowRight, IconMessageCircle } from "@tabler/icons-react";
import { Link } from "react-router";

import { EmptyState } from "@/components/brand/LineArt";
import { AskBar } from "@/components/shop/AskBar";
import { EntryLine } from "@/components/shop/EntryLine";
import { EveningClose } from "@/components/shop/EveningClose";
import { NotebookImports, SnapNotebookButton } from "@/components/shop/NotebookImport";
import { ReminderCard } from "@/components/shop/ReminderCard";
import { askAgent, dayLabel, money } from "@/components/shop/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { useShop } from "./shop";

export default function ShopToday() {
  const { shop, openSale } = useShop();
  const { data } = useActionQuery("get-shop-overview", {});
  const reminders = useActionQuery("list-reminders", { status: "open" });
  if (!data) return <Skeleton className="h-96 rounded-lg" />;
  const currency = shop.currency;
  const openReminders = reminders.data?.reminders ?? [];

  return (
    <div className="space-y-5">
      <AskBar currency={shop.currency} onManualSale={openSale} />

      <section
        aria-label="Today's till"
        className="brand-corner relative overflow-hidden rounded-lg bg-primary p-4 text-primary-foreground sm:p-5"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.09] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:14px_14px]"
        />
        <div className="relative grid gap-4 md:grid-cols-[1.4fr_1fr] md:gap-6">
          <div>
            <p className="text-xs font-medium opacity-80">Today, {dayLabel(data.day)}</p>
            <p className="tabular mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              {money(data.sales.total, currency)}
            </p>
            <p className="text-sm opacity-85">
              in sales from {data.sales.count} {data.sales.count === 1 ? "sale" : "sales"}
            </p>
            <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-white/20 pt-3 text-xs sm:text-sm">
              <div>
                <dt className="opacity-75">Cash in</dt>
                <dd className="tabular font-display text-base font-semibold sm:text-lg">{money(data.cashIn, currency)}</dd>
              </div>
              <div>
                <dt className="opacity-75">On credit</dt>
                <dd className="tabular font-display text-base font-semibold sm:text-lg">{money(data.sales.creditGiven, currency)}</dd>
              </div>
              <div>
                <dt className="opacity-75">Debts paid</dt>
                <dd className="tabular font-display text-base font-semibold sm:text-lg">{money(data.paymentsReceived, currency)}</dd>
              </div>
            </dl>
          </div>
          <Link
            to="/shop/customers"
            className="brand-corner group flex flex-col justify-center gap-1 rounded-lg bg-secondary p-4 text-secondary-foreground transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <p className="text-xs font-medium">Owed to you</p>
            <p className="tabular font-display text-3xl font-bold tracking-tight">{money(data.outstanding.total, currency)}</p>
            <p className="flex items-center gap-1 text-sm">
              by {data.outstanding.debtors} {data.outstanding.debtors === 1 ? "customer" : "customers"}
              <IconArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </p>
          </Link>
        </div>
      </section>

      <NotebookImports currency={currency} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-8">
        <section aria-labelledby="daybook-heading">
          <div className="mb-1 flex items-center justify-between">
            <h2 id="daybook-heading" className="font-display text-lg font-semibold">
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
            <EmptyState art="book" action={<SnapNotebookButton label="Snap your old notebook" />}>
              Nothing recorded yet. Tell the agent your first sale above, or bring in what&apos;s already in your paper
              notebook.
            </EmptyState>
          )}
        </section>

        <aside className="space-y-6">
          <EveningClose />

          <section aria-labelledby="reminders-heading">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 id="reminders-heading" className="font-display text-lg font-semibold">
                Reminders
              </h2>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 gap-1.5 px-2 text-brand-blue"
                onClick={() =>
                  askAgent(
                    "Draft friendly WhatsApp reminders for customers whose promised date has passed. State the exact balance and keep each message short and respectful.",
                  )
                }
              >
                <IconMessageCircle className="size-4" /> Draft for late payers
              </Button>
            </div>
            {openReminders.length ? (
              <div className="space-y-3">
                {openReminders.map((reminder) => (
                  <ReminderCard key={`${reminder.id}:${reminder.message}`} reminder={reminder} currency={currency} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                None waiting. The agent drafts them; you approve and send from WhatsApp.
              </p>
            )}
          </section>

          <section aria-labelledby="debtors-heading">
            <h2 id="debtors-heading" className="mb-1 font-display text-lg font-semibold">
              Who owes
            </h2>
            <ul className="divide-y divide-border">
              {data.topDebtors.map((debtor) => (
                <li key={debtor.id}>
                  <Link
                    to={`/shop/customers/${debtor.id}`}
                    className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            <h2 id="low-heading" className="mb-1 font-display text-lg font-semibold">
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
