import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../db/index.js";
import { ENTRY_KINDS, PAYMENT_METHODS } from "../db/schema.js";
import { getEntry } from "./ledger.js";
import { formatMoney, toNaira } from "./money.js";
import type { ProductRow, ShopRef } from "./shop.js";

// ------------------------------------------------------------ inputs

export const shopIdArg = z.string().optional().describe("Shop id. Omit to use your shop.");

/** CLI flags arrive as strings, so accept "true"/"false" as well as booleans. */
export const flagArg = (description: string) =>
  z.union([z.boolean(), z.enum(["true", "false"])]).optional().describe(description);

export function flag(value: boolean | "true" | "false" | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === true || value === "true";
}

export const methodArg = z
  .enum(PAYMENT_METHODS)
  .default("cash")
  .describe('How the money was paid: "cash", "transfer" or "pos"; defaults to "cash"');

export const occurredAtArg = z
  .string()
  .optional()
  .describe("When it happened, ISO 8601 with UTC offset (e.g. 2026-10-31T14:05:00+01:00). Omit for now.");

export const dayArg = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .describe("Calendar day in the shop's timezone, YYYY-MM-DD");

// ------------------------------------------------------------ outputs

export const entryLineOut = z.object({
  productId: z.string(),
  productName: z.string(),
  qty: z.number(),
  unitPrice: z.number(),
  lineTotal: z.number(),
});

export const entryOut = z.object({
  id: z.string(),
  kind: z.enum(ENTRY_KINDS),
  status: z.enum(["posted", "voided"]),
  customerId: z.string().nullable(),
  customerName: z.string().nullable(),
  total: z.number(),
  paid: z.number(),
  balanceChange: z.number(),
  method: z.enum(PAYMENT_METHODS).nullable(),
  dueDate: z.string().nullable(),
  note: z.string().nullable(),
  source: z.string(),
  occurredAt: z.string(),
  voidedAt: z.string().nullable(),
  voidReason: z.string().nullable(),
  lines: z.array(entryLineOut),
  summary: z.string(),
});

export const productOut = z.object({
  id: z.string(),
  name: z.string(),
  unit: z.string(),
  price: z.number(),
  cost: z.number().nullable(),
  stock: z.number(),
  lowStockAt: z.number(),
  lowStock: z.boolean(),
  archived: z.boolean(),
});

export const debtorOut = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string().nullable(),
  note: z.string().nullable(),
  balance: z.number(),
  promisedBy: z.string().nullable(),
  daysOverdue: z.number().nullable(),
  lastActivityAt: z.string().nullable(),
  openReminder: z.enum(["draft", "approved"]).nullable(),
});

export const stockAfterOut = z.object({
  productId: z.string(),
  name: z.string(),
  stock: z.number(),
  lowStock: z.boolean(),
});

/** What every ledger write returns: the entry plus the numbers it changed. */
export const writeResultOut = z.object({
  id: z.string(),
  entry: entryOut,
  customerBalance: z.number().nullable(),
  stockAfter: z.array(stockAfterOut),
  message: z.string(),
});

export function productView(row: ProductRow) {
  return {
    id: row.id,
    name: row.name,
    unit: row.unit,
    price: toNaira(row.priceKobo),
    cost: row.costKobo === null ? null : toNaira(row.costKobo),
    stock: row.stockQty,
    lowStockAt: row.lowStockAt,
    lowStock: !row.archived && row.stockQty <= row.lowStockAt,
    archived: row.archived,
  };
}

export async function writeResult(shop: ShopRef, entryId: string) {
  const entry = await getEntry(shop, entryId);
  let customerBalance: number | null = null;
  if (entry.customerId) {
    const [c] = await getDb()
      .select({ balanceKobo: schema.customers.balanceKobo })
      .from(schema.customers)
      .where(eq(schema.customers.id, entry.customerId));
    customerBalance = c ? toNaira(c.balanceKobo) : null;
  }
  const ids = [...new Set(entry.lines.map((l) => l.productId))];
  const stock = ids.length
    ? await getDb()
        .select({
          productId: schema.products.id,
          name: schema.products.name,
          stock: schema.products.stockQty,
          lowStockAt: schema.products.lowStockAt,
        })
        .from(schema.products)
        .where(inArray(schema.products.id, ids))
    : [];
  const stockAfter = stock.map((s) => ({ productId: s.productId, name: s.name, stock: s.stock, lowStock: s.stock <= s.lowStockAt }));
  const parts = [`${entry.summary}.`];
  if (entry.customerName && customerBalance !== null) {
    parts.push(`${entry.customerName} now owes ${formatMoney(Math.round(customerBalance * 100), shop.currency)}.`);
  }
  const low = stockAfter.filter((s) => s.lowStock);
  if (low.length) parts.push(`Low stock: ${low.map((s) => `${s.name} (${s.stock})`).join(", ")}.`);
  return { id: entry.id, entry, customerBalance, stockAfter, message: parts.join(" ") };
}
