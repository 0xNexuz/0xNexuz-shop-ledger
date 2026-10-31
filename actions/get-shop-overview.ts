import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { dayArg, debtorOut, entryOut, shopIdArg } from "../server/lib/contracts.js";
import { overview } from "../server/lib/ledger.js";
import { requireShop } from "../server/lib/shop.js";

export default defineAction({
  description:
    "The shop at a glance for one day (default today): sales, cash in, credit given, payments received, total owed and top debtors, low stock, reminders waiting, and the latest entries. Start here when asked how the shop is doing.",
  schema: z.object({
    shopId: shopIdArg,
    day: dayArg.optional().describe("Calendar day in the shop's timezone, YYYY-MM-DD; defaults to today"),
  }),
  http: { method: "GET" },
  readOnly: true,
  outputSchema: z.object({
    shop: z.object({ id: z.string(), name: z.string(), currency: z.string(), timezone: z.string() }),
    day: z.string(),
    isToday: z.boolean(),
    sales: z.object({ count: z.number(), total: z.number(), paidNow: z.number(), creditGiven: z.number() }),
    paymentsReceived: z.number(),
    cashIn: z.number(),
    outstanding: z.object({ total: z.number(), debtors: z.number() }),
    topDebtors: z.array(debtorOut),
    lowStock: z.array(
      z.object({ id: z.string(), name: z.string(), unit: z.string(), stock: z.number(), lowStockAt: z.number() }),
    ),
    reminders: z.object({ draft: z.number(), approved: z.number() }),
    recent: z.array(entryOut),
  }),
  run: async (args) => {
    const shop = await requireShop(args.shopId);
    return overview(shop, args.day);
  },
});
