import { actionErrorMessage, useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import { useSetPageTitle } from "@agent-native/toolkit/app-shell/header-actions";
import { IconPlus } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useOutletContext, useSearchParams } from "react-router";
import { toast } from "sonner";

import { HeroScene } from "@/components/brand/LineArt";
import { usePreloaderHold } from "@/components/brand/preloader-store";
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
  // If the opening screen is up, keep it until the shop's first data is here.
  usePreloaderHold(overview.isPending, "extend");
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
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
      <div className="sticky top-0 z-10 -mx-4 mb-4 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
        <nav aria-label="Shop" className="no-scrollbar flex min-w-0 flex-1 gap-1 overflow-x-auto">
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
  const [params, setParams] = useSearchParams();
  // Arriving from "Try the demo" on the sign-in page: open the sample shop straight away.
  const autoDemo = params.get("demo") === "1";
  const clearDemoParam = () => {
    if (!autoDemo) return;
    const next = new URLSearchParams(params);
    next.delete("demo");
    setParams(next, { replace: true });
  };
  const demo = useActionMutation("load-demo-data", {
    onSuccess: () => {
      clearDemoParam();
      toast.success("Sample shop loaded: a week of sales, debts and stock.");
    },
    onError: (error) => {
      clearDemoParam();
      toast.error(actionErrorMessage(error) ?? "Couldn't load the sample shop.");
    },
  });
  const started = useRef(false);
  useEffect(() => {
    if (autoDemo && !started.current) {
      started.current = true;
      demo.mutate({});
    }
  }, [autoDemo, demo]);

  // The app's opening screen covers the set-up until the shop screen replaces this one.
  const settingUpDemo = (autoDemo || started.current) && !demo.isError;
  usePreloaderHold(settingUpDemo, "open");
  if (settingUpDemo) return null;

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-14 lg:py-14">
      <div className="self-end">
        <h1 className="font-display text-4xl font-bold leading-[1.02] tracking-tight sm:text-5xl xl:text-6xl">
          Your shop&apos;s books,
          <br />
          <span className="font-light">kept by talking.</span>
        </h1>
        <p className="mt-4 max-w-xl text-[15px] text-muted-foreground">
          Say what happened. The agent writes it in the ledger, keeps stock and debts straight, and drafts polite
          reminders that only you can approve.
        </p>
      </div>

      <div className="brand-corner rounded-lg border-2 border-foreground bg-white p-3 sm:p-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
        <HeroScene />
      </div>

      <div className="space-y-4 self-start">
        <form
          className="brand-corner space-y-3 rounded-lg border-2 border-foreground bg-card p-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim().length >= 2) create.mutate({ name: name.trim(), currency: "NGN" });
          }}
        >
          <Label htmlFor="shop-name" className="font-display text-lg font-semibold">
            Name your shop
          </Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="shop-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Mama Chioma Provisions"
              maxLength={80}
              className="sm:flex-1"
            />
            <Button type="submit" className="shrink-0" disabled={name.trim().length < 2 || create.isPending}>
              {create.isPending ? "Creating…" : "Start my ledger"}
            </Button>
          </div>
        </form>
        <div className="flex flex-col gap-3 rounded-lg bg-secondary p-5 sm:flex-row sm:items-center">
          <p className="flex-1 text-sm text-secondary-foreground">
            <span className="font-semibold">Just looking?</span> Open a sample provisions shop with a week of made-up
            sales, debts and stock.
          </p>
          <Button
            variant="outline"
            className="shrink-0 bg-card"
            disabled={demo.isPending}
            onClick={() => demo.mutate({})}
          >
            {demo.isPending ? "Setting up…" : "Open the sample shop"}
          </Button>
        </div>
      </div>
    </div>
  );
}
