import { NoWriteError, fail } from "@agent-native/core/action";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../db/index.js";
import { postOpeningBalance, postOpeningStock, postStockCount } from "./ledger.js";
import { matchByName, normalizeName } from "./match.js";
import { formatMoney, toNaira } from "./money.js";
import { CUSTOMER_MATCH, type Actor, type ShopRef, kobo, loadCustomers, loadProducts } from "./shop.js";

/**
 * The agent turns typed old balances and stock counts into a proposal. The proposal
 * is stored as a draft; only the owner, in the app, can apply it. Applying
 * posts ordinary ledger entries (opening balances and stock counts), so the
 * books still reconcile and every line can be voided like any other entry.
 */

const { imports, customers, products } = schema;

const dayPattern = /^\d{4}-\d{2}-\d{2}$/;

export const importCustomerLine = z.object({
  name: z.string().min(2).max(80).describe("Customer name as written"),
  owes: z.coerce.number().nonnegative().describe("Naira the customer owes, as typed by the owner"),
  dueDate: z.string().regex(dayPattern).nullable().optional().describe("Promised payment day YYYY-MM-DD, if written"),
  phone: z.string().max(30).nullable().optional(),
  note: z.string().max(140).nullable().optional().describe("Anything else on the line worth keeping"),
});

export const importProductLine = z.object({
  name: z.string().min(2).max(80).describe("Product name as written"),
  stock: z.coerce.number().int().nonnegative().describe("Units counted / on hand"),
  price: z.coerce.number().nonnegative().nullable().optional().describe("Selling price per unit in naira, if written"),
  unit: z.string().max(20).nullable().optional().describe('Unit, e.g. "bag", "carton", "tin"'),
});

export const importPayload = z.object({
  customers: z.array(importCustomerLine).max(60).default([]),
  products: z.array(importProductLine).max(60).default([]),
});
export type ImportPayload = z.infer<typeof importPayload>;

export const importOut = z.object({
  id: z.string(),
  status: z.enum(["draft", "applied", "dismissed"]),
  source: z.string(),
  note: z.string().nullable(),
  createdAt: z.string(),
  customers: z.array(
    z.object({
      index: z.number(),
      name: z.string(),
      owes: z.number(),
      dueDate: z.string().nullable(),
      phone: z.string().nullable(),
      note: z.string().nullable(),
      existing: z.object({ id: z.string(), name: z.string(), balance: z.number() }).nullable(),
    }),
  ),
  products: z.array(
    z.object({
      index: z.number(),
      name: z.string(),
      stock: z.number(),
      price: z.number().nullable(),
      unit: z.string().nullable(),
      existing: z.object({ id: z.string(), name: z.string(), stock: z.number() }).nullable(),
    }),
  ),
  totals: z.object({ owed: z.number(), customers: z.number(), products: z.number() }),
});
export type ImportView = z.infer<typeof importOut>;

function cleanPayload(raw: ImportPayload): ImportPayload {
  // Merge repeated customers (two lines for the same person) by adding what they owe.
  const byName = new Map<string, ImportPayload["customers"][number]>();
  for (const line of raw.customers) {
    const name = line.name.trim().replace(/\s+/g, " ");
    const key = normalizeName(name);
    if (!key) continue;
    const prev = byName.get(key);
    if (prev) {
      prev.owes += line.owes;
      prev.dueDate = prev.dueDate ?? line.dueDate ?? null;
    } else {
      byName.set(key, { ...line, name });
    }
  }
  const productsByName = new Map<string, ImportPayload["products"][number]>();
  for (const line of raw.products) {
    const name = line.name.trim().replace(/\s+/g, " ");
    const key = normalizeName(name);
    if (key) productsByName.set(key, { ...line, name });
  }
  return { customers: [...byName.values()], products: [...productsByName.values()] };
}

async function toView(shop: ShopRef, row: typeof imports.$inferSelect): Promise<ImportView> {
  const payload = importPayload.parse(JSON.parse(row.payload));
  const [customerRows, productRows] = await Promise.all([loadCustomers(shop.id), loadProducts(shop.id)]);
  const customerLines = payload.customers.map((line, index) => {
    const match = matchByName(customerRows, line.name, CUSTOMER_MATCH);
    const existing = match.kind === "match" ? match.item : null;
    return {
      index,
      name: line.name,
      owes: line.owes,
      dueDate: line.dueDate ?? null,
      phone: line.phone ?? null,
      note: line.note ?? null,
      existing: existing ? { id: existing.id, name: existing.name, balance: toNaira(existing.balanceKobo) } : null,
    };
  });
  const productLines = payload.products.map((line, index) => {
    const match = matchByName(productRows, line.name);
    const existing = match.kind === "match" ? match.item : null;
    return {
      index,
      name: line.name,
      stock: line.stock,
      price: line.price ?? null,
      unit: line.unit ?? null,
      existing: existing ? { id: existing.id, name: existing.name, stock: existing.stockQty } : null,
    };
  });
  return {
    id: row.id,
    status: row.status,
    source: row.source,
    note: row.note,
    createdAt: row.createdAt,
    customers: customerLines,
    products: productLines,
    totals: {
      owed: customerLines.reduce((sum, l) => sum + l.owes, 0),
      customers: customerLines.length,
      products: productLines.length,
    },
  };
}

export async function proposeImport(
  shop: ShopRef,
  actor: Actor,
  input: { payload: ImportPayload; source: string; note?: string | undefined },
): Promise<ImportView> {
  const payload = cleanPayload(input.payload);
  if (!payload.customers.length && !payload.products.length) {
    throw new NoWriteError("Nothing to import: no customer balances or stock lines were given.", {
      errorCode: "empty_import",
      statusCode: 400,
    });
  }
  for (const line of payload.customers) kobo(line.owes, "owes");
  for (const line of payload.products) if (line.price != null) kobo(line.price, "price");
  const id = crypto.randomUUID();
  const [row] = await getDb()
    .insert(imports)
    .values({
      id,
      shopId: shop.id,
      source: input.source,
      payload: JSON.stringify(payload),
      note: input.note ?? null,
      draftedBy: actor.source,
      ownerEmail: actor.email,
      orgId: shop.orgId,
    })
    .returning();
  if (!row) throw new Error("Import draft was not saved.");
  return toView(shop, row);
}

export async function listImports(shop: ShopRef, status: "draft" | "all"): Promise<ImportView[]> {
  const rows = await getDb()
    .select()
    .from(imports)
    .where(and(eq(imports.shopId, shop.id), status === "draft" ? eq(imports.status, "draft") : undefined))
    .orderBy(desc(imports.createdAt))
    .limit(10);
  return Promise.all(rows.map((row) => toView(shop, row)));
}

export async function dismissImport(shop: ShopRef, id: string): Promise<void> {
  const [row] = await getDb()
    .update(imports)
    .set({ status: "dismissed" })
    .where(and(eq(imports.id, id), eq(imports.shopId, shop.id), eq(imports.status, "draft")))
    .returning({ id: imports.id });
  if (!row) throw new NoWriteError("That import is not waiting for review.", { errorCode: "not_found", statusCode: 404 });
}

/**
 * Owner applies the lines they ticked. One transaction: either every chosen
 * line lands in the books or none does.
 */
export async function applyImport(
  shop: ShopRef,
  actor: Actor,
  input: { id: string; customers: number[]; products: number[] },
): Promise<{ customersAdded: number; balancesPosted: number; owed: number; productsAdded: number; stockCounted: number; message: string }> {
  const [row] = await getDb()
    .select()
    .from(imports)
    .where(and(eq(imports.id, input.id), eq(imports.shopId, shop.id)))
    .limit(1);
  if (!row) throw new NoWriteError("Import not found.", { errorCode: "not_found", statusCode: 404 });
  if (row.status !== "draft") {
    throw new NoWriteError(`That import was already ${row.status}.`, { errorCode: "invalid_transition", statusCode: 409 });
  }
  const payload = importPayload.parse(JSON.parse(row.payload));
  const chosenCustomers = [...new Set(input.customers)].map((i) => payload.customers[i]).filter((l) => !!l);
  const chosenProducts = [...new Set(input.products)].map((i) => payload.products[i]).filter((l) => !!l);
  if (!chosenCustomers.length && !chosenProducts.length) {
    throw new NoWriteError("Tick at least one line to add.", { errorCode: "empty_import", statusCode: 400 });
  }
  // Archived products count too: the name is still taken.
  const [customerRows, productRows] = await Promise.all([loadCustomers(shop.id), loadProducts(shop.id, true)]);
  const at = new Date().toISOString();
  const note = `From your notebook (${row.source})`;
  const result = { customersAdded: 0, balancesPosted: 0, owedKobo: 0, productsAdded: 0, stockCounted: 0 };

  await getDb().transaction(async (tx) => {
    const [locked] = await tx
      .update(imports)
      .set({ status: "applied", appliedAt: at })
      .where(and(eq(imports.id, row.id), eq(imports.status, "draft")))
      .returning({ id: imports.id });
    if (!locked) fail("That import was just applied or dismissed.", { errorCode: "invalid_transition", statusCode: 409 });

    for (const line of chosenCustomers) {
      const match = matchByName(customerRows, line.name, CUSTOMER_MATCH);
      let customerId: string;
      if (match.kind === "match") {
        customerId = match.item.id;
      } else {
        customerId = crypto.randomUUID();
        await tx.insert(customers).values({
          id: customerId,
          shopId: shop.id,
          name: line.name,
          phone: line.phone ?? null,
          note: line.note ?? null,
          ownerEmail: actor.email,
          orgId: shop.orgId,
          lastActivityAt: at,
        });
        result.customersAdded += 1;
      }
      const owesKobo = kobo(line.owes, "owes");
      if (owesKobo > 0) {
        await postOpeningBalance(tx, shop, actor, customerId, owesKobo, { dueDate: line.dueDate ?? null, note, at });
        result.balancesPosted += 1;
        result.owedKobo += owesKobo;
      }
    }

    for (const line of chosenProducts) {
      const match = matchByName(productRows, line.name);
      if (match.kind === "match") {
        if (match.item.stockQty !== line.stock) {
          await postStockCount(shop, actor, { product: match.item.id, countedQty: line.stock, reason: note }, tx);
          result.stockCounted += 1;
        }
        continue;
      }
      const id = crypto.randomUUID();
      const priceKobo = line.price != null ? kobo(line.price, "price") : 0;
      await tx.insert(products).values({
        id,
        shopId: shop.id,
        name: line.name,
        unit: line.unit?.trim() || "piece",
        priceKobo,
        ownerEmail: actor.email,
        orgId: shop.orgId,
      });
      if (line.stock > 0) await postOpeningStock(tx, shop, actor, { id, name: line.name, costKobo: null }, line.stock, at);
      result.productsAdded += 1;
    }
  });

  const parts = [
    result.balancesPosted ? `${result.balancesPosted} balance${result.balancesPosted === 1 ? "" : "s"} (${formatMoney(result.owedKobo, shop.currency)} owed)` : "",
    result.customersAdded ? `${result.customersAdded} new customer${result.customersAdded === 1 ? "" : "s"}` : "",
    result.productsAdded ? `${result.productsAdded} new product${result.productsAdded === 1 ? "" : "s"}` : "",
    result.stockCounted ? `${result.stockCounted} stock count${result.stockCounted === 1 ? "" : "s"}` : "",
  ].filter(Boolean);
  return {
    customersAdded: result.customersAdded,
    balancesPosted: result.balancesPosted,
    owed: toNaira(result.owedKobo),
    productsAdded: result.productsAdded,
    stockCounted: result.stockCounted,
    message: parts.length ? `Added to your books: ${parts.join(", ")}.` : "Nothing needed changing.",
  };
}
