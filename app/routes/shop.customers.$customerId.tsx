import { actionErrorMessage, useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import { IconArrowLeft, IconMessageCircle, IconPhone } from "@tabler/icons-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";

import { CreditStandingCard } from "@/components/shop/CreditStanding";
import { EntryLine } from "@/components/shop/EntryLine";
import { ReminderCard } from "@/components/shop/ReminderCard";
import { askAgent, dayLabel, money } from "@/components/shop/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

import { useShop } from "./shop";

export default function CustomerAccount() {
  const { shop } = useShop();
  const { customerId = "" } = useParams();
  const query = useActionQuery("get-customer", { id: customerId });
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "transfer" | "pos">("cash");
  const [phone, setPhone] = useState<string | null>(null);

  const pay = useActionMutation("record-payment", {
    onSuccess: (result) => {
      toast.success(result.message);
      setAmount("");
    },
    onError: (error) => toast.error(actionErrorMessage(error) ?? "Couldn't record the payment."),
  });
  const savePhone = useActionMutation("update-customer", {
    onSuccess: () => {
      toast.success("Phone saved.");
      setPhone(null);
    },
    onError: (error) => toast.error(actionErrorMessage(error) ?? "Couldn't save the phone number."),
  });

  if (query.isPending) return <Skeleton className="h-96 rounded-lg" />;
  if (!query.data) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{actionErrorMessage(query.error) ?? "Customer not found."}</p>
        <Link to="/shop/customers" className="text-sm underline">
          Back to customers
        </Link>
      </div>
    );
  }
  const { customer, entries, reminders } = query.data;
  const openReminders = reminders.filter((r) => r.status === "draft" || r.status === "approved");
  const currency = shop.currency;

  return (
    <div className="space-y-6">
      <Link to="/shop/customers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <IconArrowLeft className="size-4" /> Customers
      </Link>

      <section className="brand-corner grid gap-5 rounded-lg bg-primary p-5 text-primary-foreground sm:grid-cols-[1fr_auto] sm:p-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{customer.name}</h1>
          <p className="mt-1 text-sm opacity-85">
            {customer.note ? `${customer.note} · ` : ""}
            {customer.phone ? (
              <span className="inline-flex items-center gap-1">
                <IconPhone className="size-3.5" /> {customer.phone}
              </span>
            ) : (
              "No phone saved"
            )}
          </p>
        </div>
        <div className="sm:text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-80">Owes</p>
          <p className="tabular font-display text-4xl font-bold">{money(customer.balance, currency)}</p>
          {customer.balance > 0 ? (
            <p className="text-sm opacity-85">
              {customer.daysOverdue
                ? `${customer.daysOverdue} day${customer.daysOverdue === 1 ? "" : "s"} past the promised date`
                : customer.promisedBy
                  ? `Promised by ${dayLabel(customer.promisedBy)}`
                  : "No date promised"}
            </p>
          ) : null}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section aria-labelledby="statement-heading">
          <h2 id="statement-heading" className="mb-1 font-display text-xl font-semibold">
            Statement
          </h2>
          {entries.length ? (
            <ul className="divide-y divide-border">
              {entries.map((entry) => (
                <EntryLine key={entry.id} entry={entry} currency={currency} timeZone={shop.timezone} showDate />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No sales or payments yet.</p>
          )}
        </section>

        <aside className="space-y-6">
          {customer.balance > 0 ? (
            <form
              className="brand-corner space-y-3 rounded-lg border-2 border-foreground p-4"
              onSubmit={(event) => {
                event.preventDefault();
                const value = Number(amount);
                if (value > 0) pay.mutate({ customer: customer.id, amount: value, method });
              }}
            >
              <h2 className="font-display text-lg font-semibold">Record a payment</h2>
              <div className="flex gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="pay-amount">Amount (₦)</Label>
                  <Input
                    id="pay-amount"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={customer.balance}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={String(customer.balance)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pay-method">By</Label>
                  <select
                    id="pay-method"
                    value={method}
                    onChange={(e) => setMethod(e.target.value as typeof method)}
                    className="h-9 rounded-md border border-input bg-card px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="cash">Cash</option>
                    <option value="transfer">Transfer</option>
                    <option value="pos">POS</option>
                  </select>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={!(Number(amount) > 0) || pay.isPending}>
                {pay.isPending ? "Saving…" : "Record payment"}
              </Button>
            </form>
          ) : null}

          <CreditStandingCard customerId={customer.id} currency={currency} />

          <section aria-labelledby="customer-reminders" className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 id="customer-reminders" className="font-display text-lg font-semibold">
                Reminder
              </h2>
              {customer.balance > 0 && !openReminders.length ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() =>
                    askAgent(
                      `Draft a short, respectful WhatsApp reminder for ${customer.name} about their balance of ${money(customer.balance, currency)}${customer.promisedBy ? `, which they promised to pay by ${customer.promisedBy}` : ""}.`,
                    )
                  }
                >
                  <IconMessageCircle className="size-4" /> Ask agent to draft
                </Button>
              ) : null}
            </div>
            {openReminders.map((reminder) => (
              <ReminderCard key={`${reminder.id}:${reminder.message}`} reminder={reminder} currency={currency} />
            ))}
            {!openReminders.length ? (
              <p className="text-sm text-muted-foreground">
                {customer.balance > 0 ? "No reminder waiting." : "Nothing owed, nothing to remind."}
              </p>
            ) : null}
          </section>

          <form
            className="space-y-1.5"
            onSubmit={(event) => {
              event.preventDefault();
              if (phone !== null) savePhone.mutate({ id: customer.id, phone: phone.trim() });
            }}
          >
            <Label htmlFor="customer-phone">WhatsApp number</Label>
            <div className="flex gap-2">
              <Input
                id="customer-phone"
                type="tel"
                value={phone ?? customer.phone ?? ""}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0803 123 4567"
              />
              <Button type="submit" variant="outline" disabled={phone === null || savePhone.isPending}>
                Save
              </Button>
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
}
