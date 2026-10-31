import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { dayArg, entryOut, flag, flagArg, shopIdArg } from "../server/lib/contracts.js";
import { listEntries } from "../server/lib/ledger.js";
import { requireShop } from "../server/lib/shop.js";
import { dayBoundsUtc } from "../server/lib/time.js";
import { ENTRY_KINDS } from "../server/db/schema.js";

export default defineAction({
  description:
    "List ledger entries, newest first: sales, payments, restocks and stock counts. Filter by day, customer or kind. Each entry has a plain-language summary.",
  schema: z.object({
    shopId: shopIdArg,
    day: dayArg.optional().describe("Only this calendar day in the shop's timezone, YYYY-MM-DD"),
    customerId: z.string().optional().describe("Only entries for this customer id"),
    kind: z.enum(ENTRY_KINDS).optional().describe('Only "sale", "payment", "restock" or "adjustment"'),
    includeVoided: flagArg("Include voided entries; defaults to true"),
    limit: z.coerce.number().int().min(1).max(200).default(50).describe("Maximum entries, 1–200; defaults to 50"),
  }),
  http: { method: "GET" },
  readOnly: true,
  outputSchema: z.object({ entries: z.array(entryOut) }),
  run: async (args) => {
    const shop = await requireShop(args.shopId);
    const bounds = args.day ? dayBoundsUtc(args.day, shop.timezone) : undefined;
    const entries = await listEntries(shop, {
      from: bounds?.from,
      to: bounds?.to,
      customerId: args.customerId,
      kind: args.kind,
      includeVoided: flag(args.includeVoided, true),
      limit: args.limit,
    });
    return { entries };
  },
});
