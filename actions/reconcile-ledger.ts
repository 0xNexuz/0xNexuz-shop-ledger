import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { shopIdArg } from "../server/lib/contracts.js";
import { reconcile } from "../server/lib/ledger.js";
import { requireShop } from "../server/lib/shop.js";

export default defineAction({
  description:
    "Check the books: recompute every product's stock and every customer's balance from the posted entries and compare with the saved figures. Use when the user asks whether the books balance.",
  schema: z.object({ shopId: shopIdArg }),
  http: { method: "GET" },
  readOnly: true,
  outputSchema: z.object({
    ok: z.boolean(),
    productsChecked: z.number(),
    customersChecked: z.number(),
    mismatches: z.array(
      z.object({
        kind: z.enum(["stock", "balance"]),
        id: z.string(),
        name: z.string(),
        cached: z.number(),
        fromEntries: z.number(),
      }),
    ),
  }),
  run: async (args) => reconcile(await requireShop(args.shopId)),
});
