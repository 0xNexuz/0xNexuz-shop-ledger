import { defineAction, defineActionErrors } from "@agent-native/core/action";
import { z } from "zod";

import { shopIdArg } from "../server/lib/contracts.js";
import { importOut, importPayload, proposeImport } from "../server/lib/imports.js";
import { requireActor, requireShop } from "../server/lib/shop.js";

const errors = defineActionErrors("empty_import", "invalid_amount", "no_shop");

export default defineAction({
  description:
    "Propose bringing the owner's paper notebook into the books, after you have read a photo of a page (or a typed list): customers with what they owe (and any promised date), and products with the stock counted. It is saved as a draft for the owner to review on the Today screen; NOTHING changes in the books until the owner taps Add there. Copy only what is legible. Leave out any line whose name or amount you can't read clearly and tell the owner which ones.",
  schema: z.object({
    shopId: shopIdArg,
    customers: importPayload.shape.customers.describe("People who owe money, one per line in the notebook"),
    products: importPayload.shape.products.describe("Stock on hand, one per product"),
    source: z.string().max(60).default("notebook photo").describe('Where it came from, e.g. "notebook photo" or "typed list"'),
    note: z.string().max(280).optional().describe("Anything the owner should know, e.g. lines you couldn't read"),
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
