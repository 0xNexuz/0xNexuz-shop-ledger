import { actionErrorMessage, useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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

import { money } from "./format";

interface Line {
  key: number;
  productId: string;
  qty: string;
}

const selectClass =
  "h-9 w-full rounded-md border border-input bg-card px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** The same record-sale action the agent uses, as a form. */
export function SaleDialog({ open, onOpenChange, currency }: { open: boolean; onOpenChange: (open: boolean) => void; currency: string }) {
  const products = useActionQuery("list-products", {}, { enabled: open });
  const customers = useActionQuery("list-customers", {}, { enabled: open });
  const [lines, setLines] = useState<Line[]>([{ key: 1, productId: "", qty: "1" }]);
  const [customer, setCustomer] = useState("");
  const [paid, setPaid] = useState("");
  const [method, setMethod] = useState<"cash" | "transfer" | "pos">("cash");
  const [dueDate, setDueDate] = useState("");

  const catalog = products.data?.products ?? [];
  const total = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const product = catalog.find((p) => p.id === line.productId);
        return sum + (product ? product.price * (Number(line.qty) || 0) : 0);
      }, 0),
    [lines, catalog],
  );
  const paidNumber = paid.trim() === "" ? total : Number(paid);
  const onCredit = Math.max(0, total - (Number.isFinite(paidNumber) ? paidNumber : 0));

  const reset = () => {
    setLines([{ key: Date.now(), productId: "", qty: "1" }]);
    setCustomer("");
    setPaid("");
    setMethod("cash");
    setDueDate("");
  };

  const sale = useActionMutation("record-sale", {
    onSuccess: (result) => {
      toast.success(result.message);
      reset();
      onOpenChange(false);
    },
    onError: (error) => toast.error(actionErrorMessage(error) ?? "Couldn't record the sale."),
  });

  const ready = lines.every((l) => l.productId && Number(l.qty) > 0) && (onCredit === 0 || customer.trim().length >= 2);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready) return;
    sale.mutate({
      lines: lines.map((l) => ({ product: l.productId, qty: Number(l.qty) })),
      method,
      ...(customer.trim() ? { customer: customer.trim() } : {}),
      ...(paid.trim() !== "" ? { paid: Number(paid) } : {}),
      ...(onCredit > 0 && dueDate ? { dueDate } : {}),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Record a sale</DialogTitle>
          <DialogDescription>Anything not paid now goes on the customer's account.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium">Items</legend>
            {lines.map((line, index) => {
              const product = catalog.find((p) => p.id === line.productId);
              return (
                <div key={line.key} className="flex items-center gap-2">
                  <label className="sr-only" htmlFor={`line-product-${line.key}`}>
                    Product {index + 1}
                  </label>
                  <select
                    id={`line-product-${line.key}`}
                    value={line.productId}
                    onChange={(event) =>
                      setLines((all) => all.map((l) => (l.key === line.key ? { ...l, productId: event.target.value } : l)))
                    }
                    className={selectClass}
                  >
                    <option value="">Choose a product…</option>
                    {catalog.map((p) => (
                      <option key={p.id} value={p.id} disabled={p.stock === 0}>
                        {p.name} — {money(p.price, currency)} ({p.stock} left)
                      </option>
                    ))}
                  </select>
                  <label className="sr-only" htmlFor={`line-qty-${line.key}`}>
                    Quantity {index + 1}
                  </label>
                  <Input
                    id={`line-qty-${line.key}`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={product?.stock}
                    value={line.qty}
                    onChange={(event) =>
                      setLines((all) => all.map((l) => (l.key === line.key ? { ...l, qty: event.target.value } : l)))
                    }
                    className="w-20"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove item ${index + 1}`}
                    disabled={lines.length === 1}
                    onClick={() => setLines((all) => all.filter((l) => l.key !== line.key))}
                  >
                    <IconTrash className="size-4" />
                  </Button>
                </div>
              );
            })}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setLines((all) => [...all, { key: Date.now(), productId: "", qty: "1" }])}
            >
              <IconPlus className="size-4" /> Add item
            </Button>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sale-customer">Customer {onCredit > 0 ? "(required)" : "(optional)"}</Label>
              <Input
                id="sale-customer"
                list="sale-customer-list"
                value={customer}
                onChange={(event) => setCustomer(event.target.value)}
                placeholder="Walk-in"
                autoComplete="off"
              />
              <datalist id="sale-customer-list">
                {(customers.data?.customers ?? []).map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sale-paid">Paid now (₦)</Label>
              <Input
                id="sale-paid"
                type="number"
                inputMode="decimal"
                min={0}
                value={paid}
                onChange={(event) => setPaid(event.target.value)}
                placeholder={total ? `${total} (full)` : "Full amount"}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sale-method">Paid by</Label>
              <select
                id="sale-method"
                value={method}
                onChange={(event) => setMethod(event.target.value as typeof method)}
                className={selectClass}
              >
                <option value="cash">Cash</option>
                <option value="transfer">Transfer</option>
                <option value="pos">POS</option>
              </select>
            </div>
            {onCredit > 0 ? (
              <div className="space-y-1.5">
                <Label htmlFor="sale-due">Promised to pay by</Label>
                <Input id="sale-due" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
              </div>
            ) : null}
          </div>

          <div className="brand-corner flex items-center justify-between rounded-lg bg-primary px-4 py-3 text-primary-foreground">
            <span className="text-sm">
              Total{onCredit > 0 ? <span className="opacity-80"> · {money(onCredit, currency)} on credit</span> : null}
            </span>
            <span className="tabular font-display text-xl font-bold">{money(total, currency)}</span>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!ready || sale.isPending}>
              {sale.isPending ? "Saving…" : "Record sale"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
