import { sql } from "drizzle-orm";
import { bigint, boolean, integer, pgTable, text } from "drizzle-orm/pg-core";
import { createSharesTable, ownableColumns } from "@agent-native/core/db/schema";

/**
 * A shop is the shareable resource. Everything else is a child row that
 * carries `shop_id` plus the shop's `org_id`, and is reached only through
 * actions that check access to the shop first.
 *
 * Money columns are integer kobo. Stock and balances are cached on the
 * product/customer row and also derivable from posted entries; the
 * `reconcile-ledger` action proves the two agree.
 */
export const shops = pgTable("shops", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  currency: text("currency").notNull().default("NGN"),
  timezone: text("timezone").notNull().default("Africa/Lagos"),
  createdAt: text("created_at").notNull().default(sql`now()`),
  ...ownableColumns(),
});
export const shopShares = createSharesTable("shop_shares");

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  shopId: text("shop_id").notNull(),
  name: text("name").notNull(),
  unit: text("unit").notNull().default("piece"),
  priceKobo: bigint("price_kobo", { mode: "number" }).notNull().default(0),
  costKobo: bigint("cost_kobo", { mode: "number" }),
  stockQty: integer("stock_qty").notNull().default(0),
  lowStockAt: integer("low_stock_at").notNull().default(5),
  archived: boolean("archived").notNull().default(false),
  ownerEmail: text("owner_email").notNull(),
  orgId: text("org_id"),
  createdAt: text("created_at").notNull().default(sql`now()`),
  updatedAt: text("updated_at").notNull().default(sql`now()`),
});

export const customers = pgTable("customers", {
  id: text("id").primaryKey(),
  shopId: text("shop_id").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  note: text("note"),
  balanceKobo: bigint("balance_kobo", { mode: "number" }).notNull().default(0),
  lastActivityAt: text("last_activity_at"),
  ownerEmail: text("owner_email").notNull(),
  orgId: text("org_id"),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const ENTRY_KINDS = ["sale", "payment", "restock", "adjustment"] as const;
export type EntryKind = (typeof ENTRY_KINDS)[number];
export const PAYMENT_METHODS = ["cash", "transfer", "pos"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Append-only. A mistake is reversed by voiding, never edited or deleted. */
export const entries = pgTable("entries", {
  id: text("id").primaryKey(),
  shopId: text("shop_id").notNull(),
  kind: text("kind", { enum: ENTRY_KINDS }).notNull(),
  status: text("status", { enum: ["posted", "voided"] }).notNull().default("posted"),
  customerId: text("customer_id"),
  totalKobo: bigint("total_kobo", { mode: "number" }).notNull().default(0),
  paidKobo: bigint("paid_kobo", { mode: "number" }).notNull().default(0),
  /** Signed change to the customer's balance: + credit given, − payment. */
  balanceDeltaKobo: bigint("balance_delta_kobo", { mode: "number" }).notNull().default(0),
  method: text("method", { enum: PAYMENT_METHODS }),
  dueDate: text("due_date"),
  note: text("note"),
  source: text("source").notNull().default("ui"),
  occurredAt: text("occurred_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`now()`),
  voidedAt: text("voided_at"),
  voidReason: text("void_reason"),
  ownerEmail: text("owner_email").notNull(),
  orgId: text("org_id"),
});

export const entryLines = pgTable("entry_lines", {
  id: text("id").primaryKey(),
  entryId: text("entry_id").notNull(),
  shopId: text("shop_id").notNull(),
  productId: text("product_id").notNull(),
  productName: text("product_name").notNull(),
  /** Signed change to stock: − sold, + restocked, ± counted. */
  qtyDelta: integer("qty_delta").notNull(),
  unitKobo: bigint("unit_kobo", { mode: "number" }).notNull().default(0),
  lineTotalKobo: bigint("line_total_kobo", { mode: "number" }).notNull().default(0),
  ownerEmail: text("owner_email").notNull(),
  orgId: text("org_id"),
});

export const reminders = pgTable("reminders", {
  id: text("id").primaryKey(),
  shopId: text("shop_id").notNull(),
  customerId: text("customer_id").notNull(),
  message: text("message").notNull(),
  amountKobo: bigint("amount_kobo", { mode: "number" }).notNull(),
  status: text("status", { enum: ["draft", "approved", "sent", "dismissed"] }).notNull().default("draft"),
  draftedBy: text("drafted_by").notNull().default("ui"),
  approvedAt: text("approved_at"),
  sentAt: text("sent_at"),
  createdAt: text("created_at").notNull().default(sql`now()`),
  updatedAt: text("updated_at").notNull().default(sql`now()`),
  ownerEmail: text("owner_email").notNull(),
  orgId: text("org_id"),
});
