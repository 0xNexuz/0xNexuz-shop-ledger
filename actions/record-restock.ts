import { defineAction, defineActionErrors } from "@agent-native/core/action";
import { z } from "zod";

import { occurredAtArg, shopIdArg, writeResult, writeResultOut } from "../server/lib/contracts.js";
import { postRestock } from "../server/lib/ledger.js";
import { requireActor, requireShop } from "../server/lib/shop.js";

const errors = defineActionErrors("unknown_product", "ambiguous_product", "invalid_amount", "invalid_quantity", "invalid_time", "no_shop");

export default defineAction({
  description:
    "Record new stock that arrived (from a supplier or the market). Products must already exist; create a new one with create-product first.",
  schema: z.object({
    shopId: shopIdArg,
    lines: z
      .array(
        z.object({
          product: z.string().min(1).describe("Product id or name"),
          qty: z.coerce.number().int().positive().describe("Whole units received"),
          unitCost: z.coerce
            .number()
            .nonnegative()
            .optional()
            .describe("What the shop paid per unit in naira; also saved as the product's cost"),
        }),
      )
      .min(1)
      .max(30)
      .describe("Items received"),
    note: z.string().max(280).optional().describe("Supplier or other note"),
    occurredAt: occurredAtArg,
  }),
  outputSchema: writeResultOut,
  errors,
  run: async (args, ctx) => {
    const actor = requireActor(ctx);
    const shop = await requireShop(args.shopId, "write");
    const id = await postRestock(shop, actor, args);
    return writeResult(shop, id);
  },
});
