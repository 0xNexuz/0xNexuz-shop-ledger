import { actionErrorMessage, useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import { IconAlertTriangle, IconClipboardCheck, IconPackageImport, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";

import { money } from "@/components/shop/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { useShop } from "./shop";

interface Product {
  id: string;
  name: string;
  unit: string;
  price: number;
  cost: number | null;
  stock: number;
  lowStockAt: number;
  lowStock: boolean;
}

type Panel = { kind: "restock" | "count"; product: Product } | { kind: "add" } | null;

export default function ShopStock() {
  const { shop } = useShop();
  const query = useActionQuery("list-products", {});
  const [panel, setPanel] = useState<Panel>(null);
  const products = query.data?.products ?? [];
  const value = products.reduce((sum, p) => sum + (p.cost ?? 0) * p.stock, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Stock</h1>
          <p className="text-sm text-muted-foreground">
            {products.length} products · {money(value, shop.currency)} on the shelves at cost
          </p>
        </div>
        <Button className="gap-1.5" onClick={() => setPanel({ kind: "add" })}>
          <IconPlus className="size-4" /> Add product
        </Button>
      </div>

      {query.isPending ? (
        <Skeleton className="h-80 rounded-lg" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">Product</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Price</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Cost</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">In stock</th>
                <th scope="col" className="px-3 py-2"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((p) => (
                <tr key={p.id} className={cn(p.lowStock && "bg-secondary/40")}>
                  <td className="px-3 py-2.5">
                    <span className="font-medium">{p.name}</span>
                    <span className="block text-xs text-muted-foreground">per {p.unit}</span>
                  </td>
                  <td className="tabular px-3 py-2.5 text-right">{money(p.price, shop.currency)}</td>
                  <td className="tabular px-3 py-2.5 text-right text-muted-foreground">
                    {p.cost === null ? "—" : money(p.cost, shop.currency)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={cn("tabular font-display text-base font-semibold", p.lowStock && "text-warning")}>
                      {p.lowStock ? <IconAlertTriangle className="mr-1 inline size-4 -translate-y-px" aria-label="Low stock" /> : null}
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => setPanel({ kind: "restock", product: p })}>
                        <IconPackageImport className="size-4" /> Restock
                      </Button>
                      <Button size="sm" variant="ghost" className="gap-1" onClick={() => setPanel({ kind: "count", product: p })}>
                        <IconClipboardCheck className="size-4" /> Count
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!products.length ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                    No products yet. Add the things you sell.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
      <StockPanel panel={panel} onClose={() => setPanel(null)} />
    </div>
  );
}

function StockPanel({ panel, onClose }: { panel: Panel; onClose: () => void }) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [c, setC] = useState("");
  const [d, setD] = useState("");
  const reset = () => {
    setA("");
    setB("");
    setC("");
    setD("");
    onClose();
  };
  const done = (message: string) => () => {
    toast.success(message);
    reset();
  };
  const fail = (fallback: string) => (error: unknown) => toast.error(actionErrorMessage(error) ?? fallback);
  const restock = useActionMutation("record-restock", { onSuccess: done("Stock added."), onError: fail("Couldn't add stock.") });
  const count = useActionMutation("record-stock-count", { onSuccess: done("Count saved."), onError: fail("Couldn't save the count.") });
  const create = useActionMutation("create-product", { onSuccess: done("Product added."), onError: fail("Couldn't add the product.") });

  const open = panel !== null;
  let title = "";
  let description = "";
  let body: React.ReactNode = null;
  let submit = () => {};
  let ready = false;
  let pending = false;

  if (panel?.kind === "restock") {
    title = `Restock ${panel.product.name}`;
    description = `${panel.product.stock} ${panel.product.unit}s on the shelf now.`;
    ready = Number(a) > 0;
    pending = restock.isPending;
    submit = () =>
      restock.mutate({
        lines: [{ product: panel.product.id, qty: Number(a), ...(b.trim() ? { unitCost: Number(b) } : {}) }],
      });
    body = (
      <div className="grid grid-cols-2 gap-3">
        <Field id="restock-qty" label={`How many ${panel.product.unit}s came in`} value={a} onChange={setA} type="number" />
        <Field id="restock-cost" label="Cost per unit (₦, optional)" value={b} onChange={setB} type="number" placeholder={panel.product.cost?.toString() ?? ""} />
      </div>
    );
  } else if (panel?.kind === "count") {
    title = `Count ${panel.product.name}`;
    description = `The books say ${panel.product.stock}. Enter what is actually on the shelf.`;
    ready = a.trim() !== "" && Number(a) >= 0 && b.trim().length >= 2;
    pending = count.isPending;
    submit = () => count.mutate({ product: panel.product.id, countedQty: Number(a), reason: b.trim() });
    body = (
      <div className="grid gap-3">
        <Field id="count-qty" label="Counted" value={a} onChange={setA} type="number" />
        <Field id="count-reason" label="Why it differs" value={b} onChange={setB} placeholder="e.g. 2 spoilt by rain" />
      </div>
    );
  } else if (panel?.kind === "add") {
    title = "Add a product";
    description = "Opening stock is recorded in the ledger so the books balance.";
    ready = c.trim().length >= 2 && d.trim() !== "" && Number(d) >= 0;
    pending = create.isPending;
    submit = () =>
      create.mutate({
        name: c.trim(),
        price: Number(d),
        unit: b.trim() || "piece",
        stock: Number(a) || 0,
      });
    body = (
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Field id="new-name" label="Name" value={c} onChange={setC} placeholder="e.g. Rice (50kg bag)" />
        </div>
        <Field id="new-unit" label="Sold per" value={b} onChange={setB} placeholder="bag, carton, tin…" />
        <Field id="new-price" label="Selling price (₦)" value={d} onChange={setD} type="number" />
        <Field id="new-stock" label="On the shelf now" value={a} onChange={setA} type="number" placeholder="0" />
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : reset())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (ready && !pending) submit();
          }}
          className="space-y-4"
        >
          {body}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={reset}>
              Cancel
            </Button>
            <Button type="submit" disabled={!ready || pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field(props: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={props.id}>{props.label}</Label>
      <Input
        id={props.id}
        type={props.type ?? "text"}
        inputMode={props.type === "number" ? "decimal" : undefined}
        min={props.type === "number" ? 0 : undefined}
        value={props.value}
        placeholder={props.placeholder}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </div>
  );
}
