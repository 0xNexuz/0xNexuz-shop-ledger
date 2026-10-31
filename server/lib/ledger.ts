import { NoWriteError, fail } from "@agent-native/core/action";
import { and, asc, desc, eq, gt, gte, inArray, lt, lte, ne, sql } from "drizzle-orm";

import { getDb, schema } from "../db/index.js";
import type { EntryKind, PaymentMethod } from "../db/schema.js";
import { formatMoney, planSale, toNaira } from "./money.js";
import {
  type Actor,
  type ShopRef,
  type Tx,
  kobo,
  loadCustomers,
  loadProducts,
  occurredAt,
  resolveCustomer,
  resolveProduct,
} from "./shop.js";
import { dayBoundsUtc, daysOverdue, localDay } from "./time.js";

const { entries, entryLines, products, customers, reminders } = schema;

// ---------------------------------------------------------------- views

export interface EntryLineView {
  productId: string;
  productName: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

export interface EntryView {
  id: string;
  kind: EntryKind;
  status: "posted" | "voided";
  customerId: string | null;
  customerName: string | null;
  total: number;
  paid: number;
  balanceChange: number;
  method: PaymentMethod | null;
  dueDate: string | null;
  note: string | null;
  source: string;
  occurredAt: string;
  voidedAt: string | null;
  voidReason: string | null;
  lines: EntryLineView[];
  summary: string;
}

const entryColumns = {
  id: entries.id,
  kind: entries.kind,
  status: entries.status,
  customerId: entries.customerId,
  totalKobo: entries.totalKobo,
  paidKobo: entries.paidKobo,
  balanceDeltaKobo: entries.balanceDeltaKobo,
  method: entries.method,
  dueDate: entries.dueDate,
  note: entries.note,
  source: entries.source,
  occurredAt: entries.occurredAt,
  voidedAt: entries.voidedAt,
  voidReason: entries.voidReason,
};

type EntryRow = {
  id: string;
  kind: EntryKind;
  status: "posted" | "voided";
  customerId: string | null;
  totalKobo: number;
  paidKobo: number;
  balanceDeltaKobo: number;
  method: PaymentMethod | null;
  dueDate: string | null;
  note: string | null;
  source: string;
  occurredAt: string;
  voidedAt: string | null;
  voidReason: string | null;
};

function describe(row: EntryRow, lines: EntryLineView[], customerName: string | null, currency: string): string {
  const money = (k: number) => formatMoney(k, currency);
  const items = lines.map((l) => `${l.qty} × ${l.productName}`).join(", ");
  let text: string;
  switch (row.kind) {
    case "sale": {
      const credit = row.totalKobo - row.paidKobo;
      const who = customerName ? ` to ${customerName}` : "";
      const pay =
        credit > 0
          ? `paid ${money(row.paidKobo)}, ${money(credit)} on credit${row.dueDate ? ` (promised ${row.dueDate})` : ""}`
          : `paid in full${row.method ? ` by ${row.method}` : ""}`;
      text = `Sold ${items}${who} for ${money(row.totalKobo)}, ${pay}`;
      break;
    }
    case "payment":
      text = `${customerName ?? "Customer"} paid ${money(row.totalKobo)}${row.method ? ` by ${row.method}` : ""}`;
      break;
    case "restock":
      text = `Restocked ${items}${row.totalKobo ? ` for ${money(row.totalKobo)}` : ""}`;
      break;
    case "adjustment":
      text =
        row.customerId && row.balanceDeltaKobo !== 0
          ? `Opening balance: ${customerName ?? "Customer"} owes ${money(row.balanceDeltaKobo)}${row.dueDate ? ` (promised ${row.dueDate})` : ""}${row.note ? ` (${row.note})` : ""}`
          : `Stock count: ${lines.map((l) => `${l.productName} ${l.qty > 0 ? "+" : ""}${l.qty}`).join(", ")}${row.note ? ` (${row.note})` : ""}`;
      break;
  }
  return row.status === "voided" ? `[VOIDED: ${row.voidReason ?? "no reason"}] ${text}` : text;
}

async function toViews(rows: EntryRow[], currency: string): Promise<EntryView[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const lineRows = await getDb()
    .select({
      entryId: entryLines.entryId,
      productId: entryLines.productId,
      productName: entryLines.productName,
      qtyDelta: entryLines.qtyDelta,
      unitKobo: entryLines.unitKobo,
      lineTotalKobo: entryLines.lineTotalKobo,
    })
    .from(entryLines)
    .where(inArray(entryLines.entryId, ids))
    .orderBy(asc(entryLines.id));
  const customerIds = [...new Set(rows.map((r) => r.customerId).filter((id): id is string => !!id))];
  const names = new Map<string, string>();
  if (customerIds.length) {
    const found = await getDb()
      .select({ id: customers.id, name: customers.name })
      .from(customers)
      .where(inArray(customers.id, customerIds));
    for (const c of found) names.set(c.id, c.name);
  }
  return rows.map((row) => {
    const lines: EntryLineView[] = lineRows
      .filter((l) => l.entryId === row.id)
      .map((l) => ({
        productId: l.productId,
        productName: l.productName,
        qty: row.kind === "adjustment" ? l.qtyDelta : Math.abs(l.qtyDelta),
        unitPrice: toNaira(l.unitKobo),
        lineTotal: toNaira(l.lineTotalKobo),
      }));
    const customerName = row.customerId ? (names.get(row.customerId) ?? null) : null;
    return {
      id: row.id,
      kind: row.kind,
      status: row.status,
      customerId: row.customerId,
      customerName,
      total: toNaira(row.totalKobo),
      paid: toNaira(row.paidKobo),
      balanceChange: toNaira(row.balanceDeltaKobo),
      method: row.method,
      dueDate: row.dueDate,
      note: row.note,
      source: row.source,
      occurredAt: row.occurredAt,
      voidedAt: row.voidedAt,
      voidReason: row.voidReason,
      lines,
      summary: describe(row, lines, customerName, currency),
    };
  });
}

export async function getEntry(shop: ShopRef, id: string): Promise<EntryView> {
  const rows = await getDb()
    .select(entryColumns)
    .from(entries)
    .where(and(eq(entries.shopId, shop.id), eq(entries.id, id)))
    .limit(1);
  const [view] = await toViews(rows as EntryRow[], shop.currency);
  if (!view) fail("Entry not found.", { errorCode: "not_found", statusCode: 404 });
  return view;
}

export async function listEntries(
  shop: ShopRef,
  filter: {
    from?: string | undefined;
    to?: string | undefined;
    customerId?: string | undefined;
    kind?: EntryKind | undefined;
    includeVoided?: boolean | undefined;
    limit: number;
  },
): Promise<EntryView[]> {
  const rows = await getDb()
    .select(entryColumns)
    .from(entries)
    .where(
      and(
        eq(entries.shopId, shop.id),
        filter.from ? gte(entries.occurredAt, filter.from) : undefined,
        filter.to ? lt(entries.occurredAt, filter.to) : undefined,
        filter.customerId ? eq(entries.customerId, filter.customerId) : undefined,
        filter.kind ? eq(entries.kind, filter.kind) : undefined,
        filter.includeVoided === false ? eq(entries.status, "posted") : undefined,
      ),
    )
    .orderBy(desc(entries.occurredAt), desc(entries.id))
    .limit(filter.limit);
  return toViews(rows as EntryRow[], shop.currency);
}

// ---------------------------------------------------------- atomic deltas

/** Change stock only if it stays at or above zero. Returns null if it would not. */
async function applyStock(tx: Tx, shopId: string, productId: string, delta: number) {
  const [row] = await tx
    .update(products)
    .set({ stockQty: sql`${products.stockQty} + ${delta}`, updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(products.id, productId),
        eq(products.shopId, shopId),
        sql`${products.stockQty} + ${delta} >= 0`,
      ),
    )
    .returning({ stockQty: products.stockQty });
  return row ?? null;
}

/** Change a customer's balance only if it stays at or above zero. */
async function applyBalance(tx: Tx, shopId: string, customerId: string, deltaKobo: number, at: string) {
  const [row] = await tx
    .update(customers)
    .set({ balanceKobo: sql`${customers.balanceKobo} + ${deltaKobo}`, lastActivityAt: at })
    .where(
      and(
        eq(customers.id, customerId),
        eq(customers.shopId, shopId),
        sql`${customers.balanceKobo} + ${deltaKobo} >= 0`,
      ),
    )
    .returning({ balanceKobo: customers.balanceKobo });
  return row ?? null;
}

async function currentStock(tx: Tx, productId: string): Promise<number> {
  const [row] = await tx.select({ stockQty: products.stockQty }).from(products).where(eq(products.id, productId));
  return row?.stockQty ?? 0;
}

function lineRow(shop: ShopRef, actor: Actor, entryId: string, productId: string, productName: string, qtyDelta: number, unitKobo: number) {
  return {
    id: crypto.randomUUID(),
    entryId,
    shopId: shop.id,
    productId,
    productName,
    qtyDelta,
    unitKobo,
    lineTotalKobo: Math.abs(qtyDelta) * unitKobo,
    ownerEmail: actor.email,
    orgId: shop.orgId,
  };
}

// ---------------------------------------------------------------- writes

export interface SaleInput {
  customer?: string | undefined;
  createCustomerIfMissing: boolean;
  lines: { product: string; qty: number; unitPrice?: number | undefined }[];
  paid?: number | undefined;
  method: PaymentMethod;
  dueDate?: string | undefined;
  note?: string | undefined;
  occurredAt?: string | undefined;
  /** Runs before more credit goes to an existing customer; throws to stop the sale. */
  creditCheck?: ((customerId: string, creditKobo: number) => Promise<void>) | undefined;
}

export async function postSale(shop: ShopRef, actor: Actor, input: SaleInput): Promise<string> {
  const catalog = await loadProducts(shop.id);
  const lines = input.lines.map((line) => {
    const product = resolveProduct(catalog, line.product);
    const unitKobo = line.unitPrice !== undefined ? kobo(line.unitPrice, "unitPrice") : product.priceKobo;
    if (line.unitPrice === undefined && unitKobo === 0) {
      throw new NoWriteError(`${product.name} has no selling price yet. Give unitPrice or set the price.`, {
        errorCode: "price_missing",
        statusCode: 400,
      });
    }
    return { product, qty: line.qty, unitKobo };
  });

  const customer = input.customer
    ? resolveCustomer(await loadCustomers(shop.id), input.customer, input.createCustomerIfMissing)
    : null;
  const plan = planSale({
    lines: lines.map((l) => ({ qty: l.qty, unitKobo: l.unitKobo })),
    paidKobo: input.paid === undefined ? undefined : kobo(input.paid, "paid"),
    hasCustomer: !!customer,
  });
  if (!plan.ok) throw new NoWriteError(plan.message, { errorCode: plan.code, statusCode: 400 });
  if (plan.creditKobo === 0 && input.dueDate) {
    throw new NoWriteError("dueDate only applies when something is left unpaid.", { errorCode: "invalid_due_date", statusCode: 400 });
  }
  if (plan.creditKobo > 0 && customer && "existing" in customer && input.creditCheck) {
    await input.creditCheck(customer.existing.id, plan.creditKobo);
  }
  const at = occurredAt(input.occurredAt);
  const entryId = crypto.randomUUID();

  await getDb().transaction(async (tx) => {
    let customerId: string | null = null;
    if (customer && "existing" in customer) customerId = customer.existing.id;
    if (customer && "create" in customer) {
      customerId = crypto.randomUUID();
      await tx.insert(customers).values({
        id: customerId,
        shopId: shop.id,
        name: customer.create,
        ownerEmail: actor.email,
        orgId: shop.orgId,
        lastActivityAt: at,
      });
    }
    await tx.insert(entries).values({
      id: entryId,
      shopId: shop.id,
      kind: "sale",
      customerId,
      totalKobo: plan.totalKobo,
      paidKobo: plan.paidKobo,
      balanceDeltaKobo: plan.creditKobo,
      method: plan.paidKobo > 0 ? input.method : null,
      dueDate: input.dueDate ?? null,
      note: input.note ?? null,
      source: actor.source,
      occurredAt: at,
      ownerEmail: actor.email,
      orgId: shop.orgId,
    });
    for (const line of lines) {
      const ok = await applyStock(tx, shop.id, line.product.id, -line.qty);
      if (!ok) {
        const inStock = await currentStock(tx, line.product.id);
        fail(`Only ${inStock} ${line.product.unit}${inStock === 1 ? "" : "s"} of ${line.product.name} in stock; can't sell ${line.qty}.`, {
          errorCode: "insufficient_stock",
          statusCode: 409,
          details: { productId: line.product.id, inStock, requested: line.qty },
        });
      }
      await tx.insert(entryLines).values(lineRow(shop, actor, entryId, line.product.id, line.product.name, -line.qty, line.unitKobo));
    }
    if (customerId) {
      await applyBalance(tx, shop.id, customerId, plan.creditKobo, at);
    }
  });
  return entryId;
}

export async function postPayment(
  shop: ShopRef,
  actor: Actor,
  input: { customer: string; amount: number; method: PaymentMethod; note?: string | undefined; occurredAt?: string | undefined },
): Promise<string> {
  const resolved = resolveCustomer(await loadCustomers(shop.id), input.customer, false);
  if (!("existing" in resolved)) throw new Error("unreachable");
  const customer = resolved.existing;
  const amountKobo = kobo(input.amount, "amount");
  if (amountKobo === 0) throw new NoWriteError("A payment must be more than zero.", { errorCode: "invalid_amount", statusCode: 400 });
  const at = occurredAt(input.occurredAt);
  const entryId = crypto.randomUUID();
  await getDb().transaction(async (tx) => {
    const ok = await applyBalance(tx, shop.id, customer.id, -amountKobo, at);
    if (!ok) {
      const [row] = await tx.select({ balanceKobo: customers.balanceKobo }).from(customers).where(eq(customers.id, customer.id));
      fail(
        `${customer.name} only owes ${formatMoney(row?.balanceKobo ?? 0, shop.currency)}; a payment of ${formatMoney(amountKobo, shop.currency)} is more than that.`,
        { errorCode: "overpayment", statusCode: 409, details: { owes: toNaira(row?.balanceKobo ?? 0) } },
      );
    }
    await tx.insert(entries).values({
      id: entryId,
      shopId: shop.id,
      kind: "payment",
      customerId: customer.id,
      totalKobo: amountKobo,
      paidKobo: amountKobo,
      balanceDeltaKobo: -amountKobo,
      method: input.method,
      note: input.note ?? null,
      source: actor.source,
      occurredAt: at,
      ownerEmail: actor.email,
      orgId: shop.orgId,
    });
  });
  return entryId;
}

export async function postRestock(
  shop: ShopRef,
  actor: Actor,
  input: { lines: { product: string; qty: number; unitCost?: number | undefined }[]; note?: string | undefined; occurredAt?: string | undefined },
): Promise<string> {
  const catalog = await loadProducts(shop.id);
  const lines = input.lines.map((line) => {
    if (!Number.isInteger(line.qty) || line.qty <= 0) {
      throw new NoWriteError("Each restock quantity must be a whole number above zero.", { errorCode: "invalid_quantity", statusCode: 400 });
    }
    const product = resolveProduct(catalog, line.product);
    const unitKobo = line.unitCost !== undefined ? kobo(line.unitCost, "unitCost") : (product.costKobo ?? 0);
    return { product, qty: line.qty, unitKobo, newCost: line.unitCost !== undefined };
  });
  const at = occurredAt(input.occurredAt);
  const entryId = crypto.randomUUID();
  const total = lines.reduce((sum, l) => sum + l.qty * l.unitKobo, 0);
  await getDb().transaction(async (tx) => {
    await tx.insert(entries).values({
      id: entryId,
      shopId: shop.id,
      kind: "restock",
      totalKobo: total,
      paidKobo: total,
      note: input.note ?? null,
      source: actor.source,
      occurredAt: at,
      ownerEmail: actor.email,
      orgId: shop.orgId,
    });
    for (const line of lines) {
      await applyStock(tx, shop.id, line.product.id, line.qty);
      if (line.newCost) {
        await tx.update(products).set({ costKobo: line.unitKobo }).where(eq(products.id, line.product.id));
      }
      await tx.insert(entryLines).values(lineRow(shop, actor, entryId, line.product.id, line.product.name, line.qty, line.unitKobo));
    }
  });
  return entryId;
}

/** Post a new product's starting stock as an adjustment so reconcile can account for it. */
export async function postOpeningStock(
  tx: Tx,
  shop: ShopRef,
  actor: Actor,
  product: { id: string; name: string; costKobo: number | null },
  qty: number,
  at: string = new Date().toISOString(),
): Promise<void> {
  const entryId = crypto.randomUUID();
  await tx.insert(entries).values({
    id: entryId,
    shopId: shop.id,
    kind: "adjustment",
    note: "Opening stock",
    source: actor.source,
    occurredAt: at,
    ownerEmail: actor.email,
    orgId: shop.orgId,
  });
  await applyStock(tx, shop.id, product.id, qty);
  await tx.insert(entryLines).values(lineRow(shop, actor, entryId, product.id, product.name, qty, product.costKobo ?? 0));
}

/**
 * Bring an existing debt into the books (e.g. from the owner's notebook) as an
 * adjustment, so reconcile and void treat it like any other balance change.
 */
export async function postOpeningBalance(
  tx: Tx,
  shop: ShopRef,
  actor: Actor,
  customerId: string,
  amountKobo: number,
  options: { dueDate?: string | null | undefined; note?: string | undefined; at?: string | undefined } = {},
): Promise<string> {
  const at = options.at ?? new Date().toISOString();
  const entryId = crypto.randomUUID();
  await tx.insert(entries).values({
    id: entryId,
    shopId: shop.id,
    kind: "adjustment",
    customerId,
    balanceDeltaKobo: amountKobo,
    dueDate: options.dueDate ?? null,
    note: options.note ?? "Opening balance",
    source: actor.source,
    occurredAt: at,
    ownerEmail: actor.email,
    orgId: shop.orgId,
  });
  await applyBalance(tx, shop.id, customerId, amountKobo, at);
  return entryId;
}

/** Set stock to a physical count; the difference is posted as an adjustment. */
export async function postStockCount(
  shop: ShopRef,
  actor: Actor,
  input: { product: string; countedQty: number; reason: string; occurredAt?: string | undefined },
  tx?: Tx,
): Promise<string> {
  if (!Number.isInteger(input.countedQty) || input.countedQty < 0) {
    throw new NoWriteError("countedQty must be a whole number, zero or more.", { errorCode: "invalid_quantity", statusCode: 400 });
  }
  const product = resolveProduct(await loadProducts(shop.id), input.product);
  const at = occurredAt(input.occurredAt);
  const entryId = crypto.randomUUID();
  const run = async (t: Tx) => {
    const [locked] = await t
      .select({ stockQty: products.stockQty })
      .from(products)
      .where(and(eq(products.id, product.id), eq(products.shopId, shop.id)))
      .for("update");
    const delta = input.countedQty - (locked?.stockQty ?? 0);
    if (delta === 0) {
      throw new NoWriteError(`${product.name} stock is already ${input.countedQty}.`, { errorCode: "no_change", statusCode: 409 });
    }
    await t.insert(entries).values({
      id: entryId,
      shopId: shop.id,
      kind: "adjustment",
      note: input.reason,
      source: actor.source,
      occurredAt: at,
      ownerEmail: actor.email,
      orgId: shop.orgId,
    });
    await applyStock(t, shop.id, product.id, delta);
    await t.insert(entryLines).values(lineRow(shop, actor, entryId, product.id, product.name, delta, product.costKobo ?? 0));
  };
  if (tx) await run(tx);
  else await getDb().transaction(run);
  return entryId;
}

/** Reverse a posted entry. Fails if reversing would push stock or a balance below zero. */
export async function voidEntry(shop: ShopRef, actor: Actor, input: { id: string; reason: string }): Promise<void> {
  await getDb().transaction(async (tx) => {
    const [entry] = await tx
      .select({ id: entries.id, status: entries.status, customerId: entries.customerId, balanceDeltaKobo: entries.balanceDeltaKobo })
      .from(entries)
      .where(and(eq(entries.id, input.id), eq(entries.shopId, shop.id)))
      .for("update");
    if (!entry) throw new NoWriteError("Entry not found.", { errorCode: "not_found", statusCode: 404 });
    if (entry.status === "voided") throw new NoWriteError("That entry is already voided.", { errorCode: "already_voided", statusCode: 409 });
    const lines = await tx
      .select({ productId: entryLines.productId, productName: entryLines.productName, qtyDelta: entryLines.qtyDelta })
      .from(entryLines)
      .where(eq(entryLines.entryId, entry.id));
    for (const line of lines) {
      const ok = await applyStock(tx, shop.id, line.productId, -line.qtyDelta);
      if (!ok) {
        fail(`Can't void: ${line.productName} would go below zero stock (some were already sold). Record a stock count instead.`, {
          errorCode: "void_conflict",
          statusCode: 409,
        });
      }
    }
    if (entry.customerId && entry.balanceDeltaKobo !== 0) {
      const ok = await applyBalance(tx, shop.id, entry.customerId, -entry.balanceDeltaKobo, new Date().toISOString());
      if (!ok) {
        fail("Can't void: the customer has already paid against this credit. Void the later payment first.", {
          errorCode: "void_conflict",
          statusCode: 409,
        });
      }
    }
    await tx
      .update(entries)
      .set({ status: "voided", voidedAt: new Date().toISOString(), voidReason: `${input.reason} (by ${actor.email})` })
      .where(and(eq(entries.id, entry.id), eq(entries.status, "posted")));
  });
}

// ---------------------------------------------------------------- reads

export interface Debtor {
  id: string;
  name: string;
  phone: string | null;
  note: string | null;
  balance: number;
  promisedBy: string | null;
  daysOverdue: number | null;
  lastActivityAt: string | null;
  openReminder: "draft" | "approved" | null;
}

export async function listDebtors(shop: ShopRef, limit: number, today: string): Promise<Debtor[]> {
  return listAccounts(shop, { owingOnly: true, limit, today });
}

/** Customers with their balance, latest payment promise and any open reminder. */
export async function listAccounts(
  shop: ShopRef,
  filter: { owingOnly: boolean; limit: number; today: string; customerId?: string | undefined },
): Promise<Debtor[]> {
  const rows = await getDb()
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      note: customers.note,
      balanceKobo: customers.balanceKobo,
      lastActivityAt: customers.lastActivityAt,
    })
    .from(customers)
    .where(
      and(
        eq(customers.shopId, shop.id),
        filter.owingOnly ? gt(customers.balanceKobo, 0) : undefined,
        filter.customerId ? eq(customers.id, filter.customerId) : undefined,
      ),
    )
    .orderBy(desc(customers.balanceKobo), asc(customers.name))
    .limit(filter.limit);
  const today = filter.today;
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const promises = await getDb()
    .select({ customerId: entries.customerId, dueDate: sql<string | null>`max(${entries.dueDate})` })
    .from(entries)
    .where(
      and(
        inArray(entries.customerId, ids),
        inArray(entries.kind, ["sale", "adjustment"]),
        eq(entries.status, "posted"),
        gt(entries.balanceDeltaKobo, 0),
      ),
    )
    .groupBy(entries.customerId);
  const open = await getDb()
    .select({ customerId: reminders.customerId, status: reminders.status })
    .from(reminders)
    .where(and(inArray(reminders.customerId, ids), inArray(reminders.status, ["draft", "approved"])));
  return rows.map((r) => {
    const promisedBy = promises.find((p) => p.customerId === r.id)?.dueDate ?? null;
    const reminder = open.find((o) => o.customerId === r.id);
    const owes = r.balanceKobo > 0;
    return {
      id: r.id,
      name: r.name,
      phone: r.phone,
      note: r.note,
      balance: toNaira(r.balanceKobo),
      promisedBy: owes ? promisedBy : null,
      daysOverdue: owes && promisedBy ? Math.max(0, daysOverdue(promisedBy, today)) : null,
      lastActivityAt: r.lastActivityAt,
      openReminder: (reminder?.status as "draft" | "approved" | undefined) ?? null,
    };
  });
}

export async function overview(shop: ShopRef, day?: string) {
  const today = localDay(new Date(), shop.timezone);
  const target = day ?? today;
  const { from, to } = dayBoundsUtc(target, shop.timezone);
  const db = getDb();
  const inDay = and(eq(entries.shopId, shop.id), eq(entries.status, "posted"), gte(entries.occurredAt, from), lt(entries.occurredAt, to));
  const [sales] = await db
    .select({
      count: sql<number>`count(*)`.mapWith(Number),
      total: sql<number>`coalesce(sum(${entries.totalKobo}), 0)`.mapWith(Number),
      paid: sql<number>`coalesce(sum(${entries.paidKobo}), 0)`.mapWith(Number),
      credit: sql<number>`coalesce(sum(${entries.balanceDeltaKobo}), 0)`.mapWith(Number),
    })
    .from(entries)
    .where(and(inDay, eq(entries.kind, "sale")));
  const [payments] = await db
    .select({ total: sql<number>`coalesce(sum(${entries.totalKobo}), 0)`.mapWith(Number), count: sql<number>`count(*)`.mapWith(Number) })
    .from(entries)
    .where(and(inDay, eq(entries.kind, "payment")));
  const [owed] = await db
    .select({
      total: sql<number>`coalesce(sum(${customers.balanceKobo}), 0)`.mapWith(Number),
      debtors: sql<number>`count(*) filter (where ${customers.balanceKobo} > 0)`.mapWith(Number),
    })
    .from(customers)
    .where(eq(customers.shopId, shop.id));
  const lowStock = await db
    .select({ id: products.id, name: products.name, unit: products.unit, stock: products.stockQty, lowStockAt: products.lowStockAt })
    .from(products)
    .where(and(eq(products.shopId, shop.id), eq(products.archived, false), lte(products.stockQty, products.lowStockAt)))
    .orderBy(asc(products.stockQty), asc(products.name))
    .limit(8);
  const [reminderCounts] = await db
    .select({
      draft: sql<number>`count(*) filter (where ${reminders.status} = 'draft')`.mapWith(Number),
      approved: sql<number>`count(*) filter (where ${reminders.status} = 'approved')`.mapWith(Number),
    })
    .from(reminders)
    .where(and(eq(reminders.shopId, shop.id), ne(reminders.status, "dismissed")));
  const debtors = await listDebtors(shop, 5, today);
  const recent = await listEntries(shop, { limit: 8 });
  return {
    shop: { id: shop.id, name: shop.name, currency: shop.currency, timezone: shop.timezone },
    day: target,
    isToday: target === today,
    sales: {
      count: sales?.count ?? 0,
      total: toNaira(sales?.total ?? 0),
      paidNow: toNaira(sales?.paid ?? 0),
      creditGiven: toNaira(sales?.credit ?? 0),
    },
    paymentsReceived: toNaira(payments?.total ?? 0),
    cashIn: toNaira((sales?.paid ?? 0) + (payments?.total ?? 0)),
    outstanding: { total: toNaira(owed?.total ?? 0), debtors: owed?.debtors ?? 0 },
    topDebtors: debtors,
    lowStock,
    reminders: { draft: reminderCounts?.draft ?? 0, approved: reminderCounts?.approved ?? 0 },
    recent,
  };
}

/** Recompute stock and balances from posted entries and compare with the cached values. */
export async function reconcile(shop: ShopRef) {
  const db = getDb();
  const stockFromEntries = await db
    .select({ productId: entryLines.productId, qty: sql<number>`coalesce(sum(${entryLines.qtyDelta}), 0)`.mapWith(Number) })
    .from(entryLines)
    .innerJoin(entries, eq(entries.id, entryLines.entryId))
    .where(and(eq(entryLines.shopId, shop.id), eq(entries.status, "posted")))
    .groupBy(entryLines.productId);
  const balanceFromEntries = await db
    .select({ customerId: entries.customerId, kobo: sql<number>`coalesce(sum(${entries.balanceDeltaKobo}), 0)`.mapWith(Number) })
    .from(entries)
    .where(and(eq(entries.shopId, shop.id), eq(entries.status, "posted")))
    .groupBy(entries.customerId);
  const productRows = await loadProducts(shop.id, true);
  const customerRows = await loadCustomers(shop.id);
  const mismatches: { kind: "stock" | "balance"; id: string; name: string; cached: number; fromEntries: number }[] = [];
  for (const p of productRows) {
    const expected = stockFromEntries.find((s) => s.productId === p.id)?.qty ?? 0;
    if (expected !== p.stockQty) mismatches.push({ kind: "stock", id: p.id, name: p.name, cached: p.stockQty, fromEntries: expected });
  }
  for (const c of customerRows) {
    const expected = balanceFromEntries.find((b) => b.customerId === c.id)?.kobo ?? 0;
    if (expected !== c.balanceKobo)
      mismatches.push({ kind: "balance", id: c.id, name: c.name, cached: toNaira(c.balanceKobo), fromEntries: toNaira(expected) });
  }
  return {
    ok: mismatches.length === 0,
    productsChecked: productRows.length,
    customersChecked: customerRows.length,
    mismatches,
  };
}
