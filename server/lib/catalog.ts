import { NoWriteError } from "@agent-native/core/action";
import { and, eq, sql } from "drizzle-orm";

import { getDb, schema } from "../db/index.js";
import { postOpeningStock } from "./ledger.js";
import { normalizeName } from "./match.js";
import { normalizePhone } from "./reminders.js";
import { type Actor, type ShopRef, kobo, loadCustomers, loadProducts } from "./shop.js";

const { shops, products, customers } = schema;

export async function createShop(actor: Actor, input: { name: string; currency: string }): Promise<string> {
  const id = crypto.randomUUID();
  await getDb()
    .insert(shops)
    .values({
      id,
      name: input.name.trim(),
      currency: input.currency,
      ownerEmail: actor.email,
      orgId: actor.orgId,
      visibility: actor.orgId ? "org" : "private",
    });
  return id;
}

function cleanName(value: string, field: string): string {
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 80) {
    throw new NoWriteError(`${field} must be 2–80 characters.`, { errorCode: "invalid_name", statusCode: 400 });
  }
  return name;
}

export async function createProduct(
  shop: ShopRef,
  actor: Actor,
  input: { name: string; unit: string; price: number; cost?: number | undefined; stock: number; lowStockAt: number; openedAt?: string | undefined },
): Promise<string> {
  const name = cleanName(input.name, "Product name");
  const existing = (await loadProducts(shop.id, true)).find((p) => normalizeName(p.name) === normalizeName(name));
  if (existing) {
    throw new NoWriteError(`"${existing.name}" already exists${existing.archived ? " (archived)" : ""}.`, {
      errorCode: "product_exists",
      statusCode: 409,
      details: { id: existing.id },
    });
  }
  if (!Number.isInteger(input.stock) || input.stock < 0) {
    throw new NoWriteError("Opening stock must be a whole number, zero or more.", { errorCode: "invalid_quantity", statusCode: 400 });
  }
  const id = crypto.randomUUID();
  const costKobo = input.cost === undefined ? null : kobo(input.cost, "cost");
  const row = {
    id,
    shopId: shop.id,
    name,
    unit: input.unit.trim() || "piece",
    priceKobo: kobo(input.price, "price"),
    costKobo,
    lowStockAt: input.lowStockAt,
    ownerEmail: actor.email,
    orgId: shop.orgId,
  };
  await getDb().transaction(async (tx) => {
    await tx.insert(products).values(row);
    if (input.stock > 0) await postOpeningStock(tx, shop, actor, { id, name, costKobo }, input.stock, input.openedAt);
  });
  return id;
}

export async function updateProduct(
  shop: ShopRef,
  productId: string,
  patch: { name?: string | undefined; unit?: string | undefined; price?: number | undefined; cost?: number | undefined; lowStockAt?: number | undefined; archived?: boolean | undefined },
): Promise<void> {
  const set: Partial<typeof products.$inferInsert> = { updatedAt: new Date().toISOString() };
  if (patch.name !== undefined) {
    const name = cleanName(patch.name, "Product name");
    const clash = (await loadProducts(shop.id, true)).find(
      (p) => p.id !== productId && normalizeName(p.name) === normalizeName(name),
    );
    if (clash) throw new NoWriteError(`"${clash.name}" already exists.`, { errorCode: "product_exists", statusCode: 409 });
    set.name = name;
  }
  if (patch.unit !== undefined) set.unit = patch.unit.trim() || "piece";
  if (patch.price !== undefined) set.priceKobo = kobo(patch.price, "price");
  if (patch.cost !== undefined) set.costKobo = kobo(patch.cost, "cost");
  if (patch.lowStockAt !== undefined) set.lowStockAt = patch.lowStockAt;
  if (patch.archived !== undefined) set.archived = patch.archived;
  if (Object.keys(set).length === 1) {
    throw new NoWriteError("Nothing to change.", { errorCode: "no_change", statusCode: 400 });
  }
  const [row] = await getDb()
    .update(products)
    .set(set)
    .where(and(eq(products.id, productId), eq(products.shopId, shop.id)))
    .returning({ id: products.id });
  if (!row) throw new NoWriteError("Product not found.", { errorCode: "not_found", statusCode: 404 });
}

function cleanPhone(phone: string | undefined): string | null | undefined {
  if (phone === undefined) return undefined;
  if (phone.trim() === "") return null;
  if (!normalizePhone(phone)) {
    throw new NoWriteError("That doesn't look like a phone number.", { errorCode: "invalid_phone", statusCode: 400 });
  }
  return phone.trim();
}

export async function createCustomer(
  shop: ShopRef,
  actor: Actor,
  input: { name: string; phone?: string | undefined; note?: string | undefined },
): Promise<string> {
  const name = cleanName(input.name, "Customer name");
  const clash = (await loadCustomers(shop.id)).find((c) => normalizeName(c.name) === normalizeName(name));
  if (clash) {
    throw new NoWriteError(`"${clash.name}" is already a customer.`, {
      errorCode: "customer_exists",
      statusCode: 409,
      details: { id: clash.id },
    });
  }
  const id = crypto.randomUUID();
  await getDb()
    .insert(customers)
    .values({
      id,
      shopId: shop.id,
      name,
      phone: cleanPhone(input.phone) ?? null,
      note: input.note?.trim() || null,
      ownerEmail: actor.email,
      orgId: shop.orgId,
    });
  return id;
}

export async function updateCustomer(
  shop: ShopRef,
  customerId: string,
  patch: { name?: string | undefined; phone?: string | undefined; note?: string | undefined },
): Promise<void> {
  const set: Partial<typeof customers.$inferInsert> = {};
  if (patch.name !== undefined) {
    const name = cleanName(patch.name, "Customer name");
    const clash = (await loadCustomers(shop.id)).find(
      (c) => c.id !== customerId && normalizeName(c.name) === normalizeName(name),
    );
    if (clash) throw new NoWriteError(`"${clash.name}" is already a customer.`, { errorCode: "customer_exists", statusCode: 409 });
    set.name = name;
  }
  const phone = cleanPhone(patch.phone);
  if (phone !== undefined) set.phone = phone;
  if (patch.note !== undefined) set.note = patch.note.trim() || null;
  if (!Object.keys(set).length) throw new NoWriteError("Nothing to change.", { errorCode: "no_change", statusCode: 400 });
  const [row] = await getDb()
    .update(customers)
    .set(set)
    .where(and(eq(customers.id, customerId), eq(customers.shopId, shop.id)))
    .returning({ id: customers.id });
  if (!row) throw new NoWriteError("Customer not found.", { errorCode: "not_found", statusCode: 404 });
}

export async function shopHasActivity(shopId: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(schema.entries)
    .where(eq(schema.entries.shopId, shopId));
  return (row?.n ?? 0) > 0;
}
