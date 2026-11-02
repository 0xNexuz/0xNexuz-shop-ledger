import { defineAction, defineActionErrors } from "@agent-native/core/action";
import { z } from "zod";

import { shopIdArg } from "../server/lib/contracts.js";
import { importOut, importPayload, proposeImport } from "../server/lib/imports.js";
import { requireActor, requireShop } from "../server/lib/shop.js";

const errors = defineActionErrors("empty_import", "invalid_amount", "no_shop");

export default defineAction({
  description:
    "Propose bringing typed old balances and stock counts into the books: customers with what they owe (and any promised date), and products with the stock counted. It is saved as a draft for the owner to review on the Today screen; NOTHING changes in the books until the owner taps Add there. Ask about any unclear name or amount instead of guessing.",
  schema: z.object({
    shopId: shopIdArg,
    customers: importPayload.shape.customers.describe("People who owe money, one per line in the notebook"),
    products: importPayload.shape.products.describe("Stock on hand, one per product"),
    source: z.string().max(60).default("typed list").describe('Where it came from, e.g. "typed list"'),
    note: z.string().max(280).optional().describe("Anything the owner should know about the proposed entries"),
  }),
  outputSchema: importOut.extend({ message: z.string() }),
  errors,
  run: async (args, ctx) => {
    const actor = requireActor(ctx);
    const shop = await requireShop(args.shopId, "write");
    const view = await proposeImport(shop, actor, {
      payload: { customers: args.customers, products: args.products },
      source: args.source,
      note: args.note,
    });
    return {
      ...view,
      message: `Saved for the owner to review on the Today screen: ${view.totals.customers} customer balance${view.totals.customers === 1 ? "" : "s"} and ${view.totals.products} stock line${view.totals.products === 1 ? "" : "s"}. Nothing is in the books until they tap Add.`,
    };
  },
});
