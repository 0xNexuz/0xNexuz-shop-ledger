import { and, eq, gt, sql } from "drizzle-orm";

import { getDb, schema } from "../db/index.js";
import { closeDay } from "./close.js";

/**
 * The nightly run: close the day for every shop that has been used in the
 * last two weeks. Called from the framework's daily sweep (7 pm Lagos on
 * Vercel Hobby); each shop is closed as its owner, with source "automation".
 * A system task, so it reads shops directly rather than through a user's
 * access filter, and only ever writes inside each shop it closes.
 */
export async function runNightlyCloses(limit = 200): Promise<{ closed: number; failed: number }> {
  const { shops, entries } = schema;
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const rows = await getDb()
    .select({
      id: shops.id,
      name: shops.name,
      currency: shops.currency,
      timezone: shops.timezone,
      orgId: shops.orgId,
      ownerEmail: shops.ownerEmail,
    })
    .from(shops)
    .where(
      sql`exists (${getDb()
        .select({ one: sql`1` })
        .from(entries)
        .where(and(eq(entries.shopId, shops.id), gt(entries.occurredAt, since)))})`,
    )
    .limit(limit);
  let closed = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      await closeDay(
        { id: row.id, name: row.name, currency: row.currency, timezone: row.timezone, orgId: row.orgId },
        { email: row.ownerEmail, orgId: row.orgId, source: "automation" },
      );
      closed += 1;
    } catch (error) {
      failed += 1;
      console.error(`[evening-close] shop ${row.id} failed`, error);
    }
  }
  return { closed, failed };
}
