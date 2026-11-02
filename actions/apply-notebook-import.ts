import { defineAction, defineActionErrors } from "@agent-native/core/action";
import { z } from "zod";

import { shopIdArg } from "../server/lib/contracts.js";
import { applyImport } from "../server/lib/imports.js";
import { requireActor, requireShop } from "../server/lib/shop.js";

const errors = defineActionErrors("not_found", "invalid_transition", "empty_import", "invalid_amount", "no_shop");

export default defineAction({
  description:
    "Owner adds the ticked lines of a typed import to the books: opening balances for customers, stock counts or new products. Owner-only: hidden from the agent.",
  schema: z.object({
    shopId: shopIdArg,
    id: z.string().min(1).describe("Import id"),
    customers: z.array(z.number().int().nonnegative()).default([]).describe("Indexes of customer lines to add"),
    products: z.array(z.number().int().nonnegative()).default([]).describe("Indexes of product lines to add"),
  }),
  // Money moves into the books only when a signed-in person taps Add in the app.
  uiOnly: true,
  agentTool: false,
  outputSchema: z.object({
    customersAdded: z.number(),
    balancesPosted: z.number(),
    owed: z.number(),
    productsAdded: z.number(),
    stockCounted: z.number(),
    message: z.string(),
  }),
  errors,
  run: async (args, ctx) => {
    const actor = requireActor(ctx);
    const shop = await requireShop(args.shopId, "write");
    return applyImport(shop, actor, { id: args.id, customers: args.customers, products: args.products });
  },
});
