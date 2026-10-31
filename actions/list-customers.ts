import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { debtorOut, flag, flagArg, shopIdArg } from "../server/lib/contracts.js";
import { listAccounts } from "../server/lib/ledger.js";
import { normalizeName } from "../server/lib/match.js";
import { requireShop } from "../server/lib/shop.js";
import { localDay } from "../server/lib/time.js";

export default defineAction({
  description:
    "List customers with what each owes, their latest promised payment date, days overdue, and any open reminder. Biggest balances first.",
  schema: z.object({
    shopId: shopIdArg,
    query: z.string().optional().describe("Only customers whose name contains this text"),
    owingOnly: flagArg("Only customers who owe money"),
  }),
  http: { method: "GET" },
  readOnly: true,
  outputSchema: z.object({ customers: z.array(debtorOut) }),
  run: async (args) => {
    const shop = await requireShop(args.shopId);
    const wanted = args.query ? normalizeName(args.query) : "";
    const rows = await listAccounts(shop, {
      owingOnly: flag(args.owingOnly, false),
      limit: 500,
      today: localDay(new Date(), shop.timezone),
    });
    return { customers: rows.filter((c) => !wanted || normalizeName(c.name).includes(wanted)) };
  },
});
