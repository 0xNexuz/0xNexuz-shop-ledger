import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../db/index.js";
import { listAccounts, overview } from "./ledger.js";
import { formatMoney } from "./money.js";
import { draftReminders } from "./reminder-store.js";
import type { Actor, ShopRef } from "./shop.js";
import { localDay } from "./time.js";

/**
 * The evening close. Once a day (7 pm Lagos, from the daily sweep) or when the
 * owner asks, Shop Ledger writes down how the day went and drafts a reminder
 * for everyone past their promised date. Drafts only: the owner still
 * approves and sends each one. One close per shop per day; asking again
 * returns the same close unless `refresh` is set.
 */

const { dailyCloses } = schema;

export const closeSummary = z.object({
  day: z.string(),
  sales: z.object({ count: z.number(), total: z.number(), paidNow: z.number(), creditGiven: z.number() }),
  paymentsReceived: z.number(),
  cashIn: z.number(),
  outstanding: z.object({ total: z.number(), debtors: z.number() }),
  overdue: z.array(z.object({ name: z.string(), balance: z.number(), daysOverdue: z.number() })),
  lowStock: z.array(z.object({ name: z.string(), stock: z.number(), unit: z.string() })),
});
export type CloseSummary = z.infer<typeof closeSummary>;

export const closeOut = z.object({
  id: z.string(),
  day: z.string(),
  closedBy: z.string(),
  createdAt: z.string(),
  remindersDrafted: z.number(),
  summary: closeSummary,
  headline: z.string(),
});
export type CloseView = z.infer<typeof closeOut>;

function headline(summary: CloseSummary, drafted: number, currency: string): string {
  const money = (n: number) => formatMoney(Math.round(n * 100), currency);
  const parts = [
    `${money(summary.sales.total)} in sales from ${summary.sales.count} sale${summary.sales.count === 1 ? "" : "s"}`,
    `${money(summary.cashIn)} cash in`,
    summary.sales.creditGiven ? `${money(summary.sales.creditGiven)} given on credit` : "",
  ].filter(Boolean);
  const reminders = drafted ? ` ${drafted} reminder${drafted === 1 ? "" : "s"} drafted for you to approve.` : "";
  return `${parts.join(", ")}.${reminders}`;
}

function toView(row: typeof dailyCloses.$inferSelect, currency: string): CloseView {
  const summary = closeSummary.parse(JSON.parse(row.summary));
  return {
    id: row.id,
    day: row.day,
    closedBy: row.closedBy,
    createdAt: row.createdAt,
    remindersDrafted: row.remindersDrafted,
    summary,
    headline: headline(summary, row.remindersDrafted, currency),
  };
}

function reminderText(shop: ShopRef, name: string, balance: number, promisedBy: string | null): string {
  const amount = formatMoney(Math.round(balance * 100), shop.currency);
  const promise = promisedBy
    ? `, which you promised to pay by ${new Intl.DateTimeFormat("en-NG", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${promisedBy}T12:00:00Z`))}`
    : "";
  return `Good evening ${name}, this is ${shop.name}. A gentle reminder that your balance with us is ${amount}${promise}. Thank you, and have a good night.`;
}

export async function closeDay(
  shop: ShopRef,
  actor: Actor,
  options: { refresh?: boolean | undefined } = {},
): Promise<CloseView> {
  const day = localDay(new Date(), shop.timezone);
  const [existing] = await getDb()
    .select()
    .from(dailyCloses)
    .where(and(eq(dailyCloses.shopId, shop.id), eq(dailyCloses.day, day)))
    .limit(1);
  if (existing && !options.refresh) return toView(existing, shop.currency);

  const today = await overview(shop, day);
  const accounts = await listAccounts(shop, { owingOnly: true, limit: 200, today: day });
  const overdue = accounts.filter((a) => (a.daysOverdue ?? 0) > 0);
  const toRemind = overdue.filter((a) => !a.openReminder);
  let drafted = 0;
  if (toRemind.length) {
    const result = await draftReminders(
      shop,
      actor,
      toRemind.slice(0, 20).map((a) => ({ customer: a.id, message: reminderText(shop, a.name, a.balance, a.promisedBy) })),
    );
    drafted = result.drafted.length;
  }
  const summary: CloseSummary = {
    day,
    sales: today.sales,
    paymentsReceived: today.paymentsReceived,
    cashIn: today.cashIn,
    outstanding: today.outstanding,
    overdue: overdue.map((a) => ({ name: a.name, balance: a.balance, daysOverdue: a.daysOverdue ?? 0 })),
    lowStock: today.lowStock.map((p) => ({ name: p.name, stock: p.stock, unit: p.unit })),
  };
  const values = {
    summary: JSON.stringify(summary),
    remindersDrafted: (existing?.remindersDrafted ?? 0) + drafted,
    closedBy: actor.source,
  };
  const [row] = existing
    ? await getDb().update(dailyCloses).set(values).where(eq(dailyCloses.id, existing.id)).returning()
    : await getDb()
        .insert(dailyCloses)
        .values({ id: crypto.randomUUID(), shopId: shop.id, day, ownerEmail: actor.email, orgId: shop.orgId, ...values })
        .onConflictDoNothing()
        .returning();
  if (!row) {
    // Another close for today landed first (the nightly run and the owner at once).
    const [winner] = await getDb()
      .select()
      .from(dailyCloses)
      .where(and(eq(dailyCloses.shopId, shop.id), eq(dailyCloses.day, day)))
      .limit(1);
    if (!winner) throw new Error("Evening close was not saved.");
    return toView(winner, shop.currency);
  }
  return toView(row, shop.currency);
}

export async function latestClose(shop: ShopRef): Promise<CloseView | null> {
  const [row] = await getDb()
    .select()
    .from(dailyCloses)
    .where(eq(dailyCloses.shopId, shop.id))
    .orderBy(desc(dailyCloses.day))
    .limit(1);
  return row ? toView(row, shop.currency) : null;
}
