import { NoWriteError, type ActionRunContext } from "@agent-native/core/action";
import { accessFilter } from "@agent-native/core/sharing";
import { and, asc, eq } from "drizzle-orm";

import { getDb, schema } from "../db/index.js";
import { matchByName } from "./match.js";
import { MoneyError, toKobo } from "./money.js";
import { TimeError, toUtcIso } from "./time.js";

export type Db = ReturnType<typeof getDb>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export interface ShopRef {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  orgId: string | null;
}

export interface Actor {
  email: string;
  orgId: string | null;
  source: string;
}

/** Where a write came from, recorded on every entry for the audit trail. */
export function sourceFromCaller(caller: ActionRunContext["caller"] | undefined): string {
  switch (caller) {
    case "tool":
      return "agent";
    case "frontend":
    case "http":
      return "ui";
    case "cli":
      return "cli";
    case "automation":
      return "automation";
    case undefined:
      return "ui";
    default:
      return "external";
  }
}

export function requireActor(ctx: ActionRunContext | undefined): Actor {
  const email = ctx?.userEmail;
  if (!email) {
    throw new NoWriteError("Sign in to use your shop.", { errorCode: "unauthenticated", statusCode: 401 });
  }
  return { email, orgId: ctx?.orgId ?? null, source: sourceFromCaller(ctx?.caller) };
}

/**
 * The shop the caller can reach: the named one, or their first shop.
 * Writes require editor access; reads need viewer access.
 */
export async function requireShop(
  shopId: string | undefined,
  access: "read" | "write" = "read",
): Promise<ShopRef> {
  const { shops, shopShares } = schema;
  const [shop] = await getDb()
    .select({
      id: shops.id,
      name: shops.name,
      currency: shops.currency,
      timezone: shops.timezone,
      orgId: shops.orgId,
    })
    .from(shops)
    .where(
      and(
        shopId ? eq(shops.id, shopId) : undefined,
        accessFilter(shops, shopShares, undefined, access === "write" ? "editor" : "viewer"),
      ),
    )
    .orderBy(asc(shops.createdAt), asc(shops.id))
    .limit(1);
  if (!shop) {
    throw new NoWriteError(
      shopId ? "Shop not found, or you can't edit it." : "You don't have a shop yet. Create one first with create-shop.",
      { errorCode: "no_shop", statusCode: 404, details: { nextRequiredAction: "create-shop" } },
    );
  }
  return shop;
}

/** Naira → kobo at the action boundary, as a retryable caller error. */
export function kobo(value: number, field: string): number {
  try {
    return toKobo(value, field);
  } catch (error) {
    if (error instanceof MoneyError) {
      throw new NoWriteError(error.message, { errorCode: "invalid_amount", statusCode: 400, details: { field } });
    }
    throw error;
  }
}

export function occurredAt(value: string | undefined): string {
  if (!value) return new Date().toISOString();
  let iso: string;
  try {
    iso = toUtcIso(value, "occurredAt");
  } catch (error) {
    if (error instanceof TimeError) {
      throw new NoWriteError(error.message, { errorCode: "invalid_time", statusCode: 400 });
    }
    throw error;
  }
  if (Date.parse(iso) > Date.now() + 10 * 60_000) {
    throw new NoWriteError("occurredAt is in the future.", { errorCode: "invalid_time", statusCode: 400 });
  }
  return iso;
}

export interface ProductRow {
  id: string;
  name: string;
  unit: string;
  priceKobo: number;
  costKobo: number | null;
  stockQty: number;
  lowStockAt: number;
  archived: boolean;
}

export async function loadProducts(shopId: string, includeArchived = false): Promise<ProductRow[]> {
  const p = schema.products;
  return getDb()
    .select({
      id: p.id,
      name: p.name,
      unit: p.unit,
      priceKobo: p.priceKobo,
      costKobo: p.costKobo,
      stockQty: p.stockQty,
      lowStockAt: p.lowStockAt,
      archived: p.archived,
    })
    .from(p)
    .where(and(eq(p.shopId, shopId), includeArchived ? undefined : eq(p.archived, false)))
    .orderBy(asc(p.name))
    .limit(1000);
}

export function resolveProduct(products: ProductRow[], ref: string): ProductRow {
  const result = matchByName(products, ref);
  if (result.kind === "match") return result.item;
  if (result.kind === "ambiguous") {
    throw new NoWriteError(
      `"${ref}" matches several products: ${result.candidates.map((c) => c.name).join(", ")}. Say which one.`,
      { errorCode: "ambiguous_product", statusCode: 409, details: { candidates: result.candidates.map((c) => ({ id: c.id, name: c.name })) } },
    );
  }
  const hint = result.suggestions.length
    ? ` Did you mean ${result.suggestions.map((c) => c.name).join(" or ")}?`
    : " Add it with create-product first.";
  throw new NoWriteError(`No product called "${ref}".${hint}`, {
    errorCode: "unknown_product",
    statusCode: 404,
    details: { suggestions: result.suggestions.map((c) => ({ id: c.id, name: c.name })) },
  });
}

export interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  balanceKobo: number;
}

export async function loadCustomers(shopId: string): Promise<CustomerRow[]> {
  const c = schema.customers;
  return getDb()
    .select({ id: c.id, name: c.name, phone: c.phone, balanceKobo: c.balanceKobo })
    .from(c)
    .where(eq(c.shopId, shopId))
    .orderBy(asc(c.name))
    .limit(2000);
}

export type CustomerResolution = { existing: CustomerRow } | { create: string };

export function resolveCustomer(
  customers: CustomerRow[],
  ref: string,
  createIfMissing: boolean,
): CustomerResolution {
  const result = matchByName(customers, ref);
  if (result.kind === "match") return { existing: result.item };
  if (result.kind === "ambiguous") {
    throw new NoWriteError(
      `"${ref}" matches several customers: ${result.candidates.map((c) => c.name).join(", ")}. Say which one.`,
      { errorCode: "ambiguous_customer", statusCode: 409, details: { candidates: result.candidates.map((c) => ({ id: c.id, name: c.name })) } },
    );
  }
  if (createIfMissing) {
    const name = ref.trim().replace(/\s+/g, " ");
    if (name.length < 2 || name.length > 80) {
      throw new NoWriteError("Customer name must be 2–80 characters.", { errorCode: "invalid_name", statusCode: 400 });
    }
    return { create: name };
  }
  const hint = result.suggestions.length ? ` Did you mean ${result.suggestions.map((c) => c.name).join(" or ")}?` : "";
  throw new NoWriteError(`No customer called "${ref}".${hint}`, {
    errorCode: "unknown_customer",
    statusCode: 404,
    details: { suggestions: result.suggestions.map((c) => ({ id: c.id, name: c.name })) },
  });
}
