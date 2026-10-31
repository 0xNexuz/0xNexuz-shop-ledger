import { actionErrorMessage, useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import { useSetPageTitle } from "@agent-native/toolkit/app-shell/header-actions";
import { IconBuildingStore, IconPlus, IconSparkles } from "@tabler/icons-react";
import { useState } from "react";
import { NavLink, Outlet, useOutletContext } from "react-router";
import { toast } from "sonner";

import { SaleDialog } from "@/components/shop/SaleDialog";
import { errorCodeOf } from "@/components/shop/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface ShopContext {
  shop: { id: string; name: string; currency: string; timezone: string };
  today: string;
  openSale: () => void;
}

export function useShop(): ShopContext {
  return useOutletContext<ShopContext>();
}

export function meta() {
  return [{ title: "Shop Ledger" }];
}

const TABS = [
  { to: "/shop", label: "Today", end: true },
  { to: "/shop/ledger", label: "Ledger", end: false },
  { to: "/shop/customers", label: "Customers", end: false },
  { to: "/shop/stock", label: "Stock", end: false },
];

export default function ShopLayout() {
  const overview = useActionQuery("get-shop-overview", {});
  const [saleOpen, setSaleOpen] = useState(false);
  useSetPageTitle(overview.data?.shop.name ?? "Shop Ledger");

  if (overview.isPending) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4 px-4 pt-6 sm:px-6">
        <Skeleton className="h-9 w-80 rounded-lg" />
        <Skeleton className="h-14 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <Skeleton className="h-96 rounded-lg" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </div>
    );
  }
  if (overview.error) {
    if (errorCodeOf(overview.error) === "no_shop" || /don't have a shop/i.test(actionErrorMessage(overview.error) ?? "")) {
      return <Onboarding />;
    }
    return (
      <p className="p-6 text-sm text-destructive">{actionErrorMessage(overview.error) ?? "Couldn't load your shop."}</p>
    );
  }

  const context: ShopContext = {
    shop: overview.data.shop,
    today: overview.data.day,
    openSale: () => setSaleOpen(true),
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-3 sm:px-6">
      <div className="sticky top-0 z-10 -mx-4 mb-5 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
        <nav aria-label="Shop" className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
        <Button size="sm" className="shrink-0 gap-1.5" aria-label="New sale" onClick={() => setSaleOpen(true)}>
          <IconPlus className="size-4" />
          <span className="hidden sm:inline">New sale</span>
        </Button>
      </div>
      <Outlet context={context} />
      <SaleDialog open={saleOpen} onOpenChange={setSaleOpen} currency={context.shop.currency} />
    </div>
  );
}

function Onboarding() {
  const [name, setName] = useState("");
  const create = useActionMutation("create-shop", {
    onSuccess: () => toast.success("Your shop is ready."),
    onError: (error) => toast.error(actionErrorMessage(error) ?? "Couldn't create the shop."),
  });
  const demo = useActionMutation("load-demo-data", {
    onSuccess: () => toast.success("Sample shop loaded: a week of sales, debts and stock."),
    onError: (error) => toast.error(actionErrorMessage(error) ?? "Couldn't load the sample shop."),
  });

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center px-4 py-12 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Shop Ledger</p>
      <h1 className="mt-3 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
        Your shop&apos;s books,
        <br />
        <span className="font-light">kept by talking.</span>
      </h1>
      <p className="mt-4 max-w-xl text-[15px] text-muted-foreground">
        Say what happened: &ldquo;sold 3 bags of rice to Mama Ngozi, she&apos;ll pay Friday&rdquo;. The agent writes it in the
        ledger, keeps stock and debts straight, and drafts polite reminders that you approve.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <form
          className="brand-corner space-y-3 rounded-lg border-2 border-foreground bg-card p-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim().length >= 2) create.mutate({ name: name.trim(), currency: "NGN" });
          }}
        >
          <IconBuildingStore className="size-6" />
          <div className="space-y-1.5">
            <Label htmlFor="shop-name">Name your shop</Label>
            <Input
              id="shop-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Mama Chioma Provisions"
              maxLength={80}
            />
          </div>
          <Button type="submit" className="w-full" disabled={name.trim().length < 2 || create.isPending}>
            {create.isPending ? "Creating…" : "Start my ledger"}
          </Button>
        </form>
        <div className="brand-corner flex flex-col justify-between gap-4 rounded-lg bg-secondary p-5">
          <IconSparkles className="size-6 text-foreground" />
          <div>
            <h2 className="font-display text-lg font-semibold">Just looking?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Open a sample provisions shop with a week of made-up sales, debts and stock to try it out.
            </p>
          </div>
          <Button variant="outline" className="w-full bg-card" disabled={demo.isPending} onClick={() => demo.mutate({})}>
            {demo.isPending ? "Setting up…" : "Open the sample shop"}
          </Button>
        </div>
      </div>
    </div>
  );
}
