import { NoWriteError } from "@agent-native/core/action";
import { and, asc, eq, isNotNull, ne } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../db/index.js";
import { listAccounts } from "./ledger.js";
import { formatMoney, toNaira } from "./money.js";
import type { ShopRef } from "./shop.js";
import { localDay } from "./time.js";

/**
 * Credit sense: before more goods go out on credit, look at how this customer
 * has paid before. Everything here is derived from posted entries, so it is
 * explainable in one sentence and never invented by the model.
 *
 * - "Repaid up to": the largest balance they have run up and then cleared.
 * - Suggested limit: a starter amount for new customers, otherwise a quarter
 *   more than the most they've owed and paid back, rounded to ₦5,000.
 * - Status: hold (well past their promise, or over the limit), watch (past
 *   the promise or near the limit), good.
 */

const { entries, customers } = schema;

/** Starter credit for someone with no repayment history, in naira. */
const STARTER_LIMIT = 50_000;
const LATE_HOLD_DAYS = 7;

export const creditStandingOut = z.object({
  customerId: z.string(),
  name: z.string(),
  balance: z.number(),
  promisedBy: z.string().nullable(),
  daysOverdue: z.number().nullable(),
  repaidUpTo: z.number(),
  timesCleared: z.number(),
  limit: z.number(),
  limitSource: z.enum(["owner", "suggested"]),
  suggestedLimit: z.number(),
  status: z.enum(["good", "watch", "hold"]),
  reason: z.string(),
});
export type CreditStanding = z.infer<typeof creditStandingOut>;

function roundUpTo5k(naira: number): number {
  return Math.ceil(naira / 5000) * 5000;
}

export async function creditStandings(shop: ShopRef, customerId?: string): Promise<CreditStanding[]> {
  const today = localDay(new Date(), shop.timezone);
  const accounts = await listAccounts(shop, { owingOnly: false, limit: 500, today, customerId });
  if (!accounts.length) return [];
  const limits = await getDb()
    .select({ id: customers.id, creditLimitKobo: customers.creditLimitKobo })
    .from(customers)
    .where(and(eq(customers.shopId, shop.id), customerId ? eq(customers.id, customerId) : undefined));
  const moves = await getDb()
    .select({ customerId: entries.customerId, delta: entries.balanceDeltaKobo, at: entries.occurredAt })
    .from(entries)
    .where(
      and(
        eq(entries.shopId, shop.id),
        eq(entries.status, "posted"),
        isNotNull(entries.customerId),
        ne(entries.balanceDeltaKobo, 0),
        customerId ? eq(entries.customerId, customerId) : undefined,
      ),
    )
    .orderBy(asc(entries.occurredAt), asc(entries.id));

  return accounts.map((account) => {
    let running = 0;
    let peak = 0;
    let repaidKobo = 0;
    let cleared = 0;
    for (const move of moves) {
      if (move.customerId !== account.id) continue;
      running += move.delta;
      peak = Math.max(peak, running);
      if (running <= 0 && peak > 0) {
        repaidKobo = Math.max(repaidKobo, peak);
        cleared += 1;
        peak = 0;
        running = 0;
      }
    }
    const repaidUpTo = toNaira(repaidKobo);
    const suggestedLimit = repaidUpTo > 0 ? roundUpTo5k(Math.max(STARTER_LIMIT, repaidUpTo * 1.25)) : STARTER_LIMIT;
    const ownerLimitKobo = limits.find((l) => l.id === account.id)?.creditLimitKobo ?? null;
    const limit = ownerLimitKobo != null ? toNaira(ownerLimitKobo) : suggestedLimit;
    const late = account.daysOverdue ?? 0;
    const money = (n: number) => formatMoney(Math.round(n * 100), shop.currency);

    let status: CreditStanding["status"] = "good";
    let reason: string;
    if (late > LATE_HOLD_DAYS) {
      status = "hold";
      reason = `Owes ${money(account.balance)}, ${late} days past the day they promised.`;
    } else if (account.balance > limit) {
      status = "hold";
      reason = `Owes ${money(account.balance)}, over the ${money(limit)} limit.`;
    } else if (late > 0) {
      status = "watch";
      reason = `Owes ${money(account.balance)}, ${late} day${late === 1 ? "" : "s"} past the day they promised.`;
    } else if (account.balance >= limit * 0.8 && account.balance > 0) {
      status = "watch";
      reason = `Owes ${money(account.balance)}, close to the ${money(limit)} limit.`;
    } else if (repaidUpTo > 0) {
      reason = `Has paid back up to ${money(repaidUpTo)} before${cleared > 1 ? ` (${cleared} times cleared)` : ""}.`;
    } else {
      reason = account.balance > 0 ? `Owes ${money(account.balance)}; no repayment history yet.` : "No credit history yet.";
    }
    return {
      customerId: account.id,
      name: account.name,
      balance: account.balance,
      promisedBy: account.promisedBy,
      daysOverdue: account.daysOverdue,
      repaidUpTo,
      timesCleared: cleared,
      limit,
      limitSource: ownerLimitKobo != null ? "owner" : "suggested",
      suggestedLimit,
      status,
      reason,
    };
  });
}

/**
 * Called by postSale before more credit goes to an existing customer. Throws
 * credit_check (409) when the owner should decide first; the caller repeats
 * the sale with confirmCredit once they agree.
 */
export async function assertCreditOk(shop: ShopRef, customerId: string, extraCreditKobo: number): Promise<void> {
  const [standing] = await creditStandings(shop, customerId);
  if (!standing) return;
  const newBalance = standing.balance + toNaira(extraCreditKobo);
  const late = (standing.daysOverdue ?? 0) > LATE_HOLD_DAYS;
  if (!late && newBalance <= standing.limit) return;
  const money = (n: number) => formatMoney(Math.round(n * 100), shop.currency);
  const why = late
    ? `${standing.name} already owes ${money(standing.balance)} and is ${standing.daysOverdue} days past the day they promised`
    : `this would take ${standing.name} to ${money(newBalance)}, over their ${money(standing.limit)} limit`;
  throw new NoWriteError(
    `Credit check: ${why}. Ask the owner before giving more credit; if they agree, record it again with confirmCredit.`,
    {
      errorCode: "credit_check",
      statusCode: 409,
      details: { ...standing, newBalance, extraCredit: toNaira(extraCreditKobo) },
    },
  );
}
