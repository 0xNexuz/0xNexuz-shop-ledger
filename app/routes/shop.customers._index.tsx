import { actionErrorMessage, useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import { IconSearch, IconUserPlus } from "@tabler/icons-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

import { dayLabel, money } from "@/components/shop/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { useShop } from "./shop";

export default function ShopCustomers() {
  const { shop } = useShop();
  const [search, setSearch] = useState("");
  const [owingOnly, setOwingOnly] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const query = useActionQuery("list-customers", owingOnly ? { owingOnly: true } : {});
  const add = useActionMutation("create-customer", {
    onSuccess: (customer) => {
      toast.success(`${customer.name} added.`);
      setName("");
      setPhone("");
    },
    onError: (error) => toast.error(actionErrorMessage(error) ?? "Couldn't add the customer."),
  });
  const wanted = search.trim().toLowerCase();
  const customers = (query.data?.customers ?? []).filter((c) => !wanted || c.name.toLowerCase().includes(wanted));
  const totalOwed = customers.reduce((sum, c) => sum + c.balance, 0);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <section aria-labelledby="customers-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 id="customers-heading" className="font-display text-2xl font-semibold">
              Customers
            </h1>
            <p className="text-sm text-muted-foreground">
              {money(totalOwed, shop.currency)} owed across {customers.filter((c) => c.balance > 0).length} accounts
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <label htmlFor="customer-search" className="sr-only">
                Search customers
              </label>
              <Input
                id="customer-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search"
                className="w-40 pl-8"
              />
            </div>
            <Button variant={owingOnly ? "default" : "outline"} size="sm" aria-pressed={owingOnly} onClick={() => setOwingOnly((v) => !v)}>
              Owing only
            </Button>
          </div>
        </div>
        {query.isPending ? (
          <Skeleton className="h-64 rounded-lg" />
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {customers.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/shop/customers/${c.id}`}
                  className="flex items-center gap-3 py-3 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span
                    aria-hidden
                    className="brand-corner grid size-9 shrink-0 place-items-center rounded-md bg-secondary font-display text-sm font-bold"
                  >
                    {c.name.replace(/[^\p{L}\s]/gu, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{c.name}</span>
                    <span className={cn("text-xs", c.daysOverdue ? "font-medium text-destructive" : "text-muted-foreground")}>
                      {c.balance <= 0
                        ? "All paid up"
                        : c.daysOverdue
                          ? `${c.daysOverdue} day${c.daysOverdue === 1 ? "" : "s"} overdue`
                          : c.promisedBy
                            ? `Promised ${dayLabel(c.promisedBy)}`
                            : "No date promised"}
                      {c.openReminder ? ` · reminder ${c.openReminder}` : ""}
                    </span>
                  </span>
                  <span className={cn("tabular font-display font-semibold", c.balance <= 0 && "text-muted-foreground")}>
                    {money(c.balance, shop.currency)}
                  </span>
                </Link>
              </li>
            ))}
            {!customers.length ? <li className="py-6 text-center text-sm text-muted-foreground">No customers match.</li> : null}
          </ul>
        )}
      </section>

      <aside>
        <form
          className="brand-corner space-y-3 rounded-lg bg-secondary p-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim().length >= 2) add.mutate({ name: name.trim(), ...(phone.trim() ? { phone: phone.trim() } : {}) });
          }}
        >
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <IconUserPlus className="size-5" /> Add a customer
          </h2>
          <div className="space-y-1.5">
            <Label htmlFor="new-customer-name">Name</Label>
            <Input id="new-customer-name" value={name} onChange={(e) => setName(e.target.value)} className="bg-card" maxLength={80} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-customer-phone">Phone (for WhatsApp reminders)</Label>
            <Input
              id="new-customer-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0803 123 4567"
              className="bg-card"
            />
          </div>
          <Button type="submit" className="w-full" disabled={name.trim().length < 2 || add.isPending}>
            {add.isPending ? "Adding…" : "Add customer"}
          </Button>
          <p className="text-xs text-muted-foreground">Selling on credit to a new name adds them automatically.</p>
        </form>
      </aside>
    </div>
  );
}
