import { defineAction, defineActionErrors } from "@agent-native/core/action";
import { z } from "zod";

import { occurredAtArg, shopIdArg, writeResult, writeResultOut } from "../server/lib/contracts.js";
import { postStockCount } from "../server/lib/ledger.js";
import { requireActor, requireShop } from "../server/lib/shop.js";

const errors = defineActionErrors("unknown_product", "ambiguous_product", "invalid_quantity", "no_change", "invalid_time", "no_shop");

export default defineAction({
  description:
    "Set a product's stock to what was physically counted (spoilage, theft, miscount). The difference is posted as an adjustment entry with the reason.",
  schema: z.object({
    shopId: shopIdArg,
    product: z.string().min(1).describe("Product id or name"),
    countedQty: z.coerce.number().int().min(0).describe("Units actually on the shelf"),
    reason: z.string().min(2).max(200).describe('Why it differs, e.g. "2 bags spoilt by rain"'),
    occurredAt: occurredAtArg,
  }),
  outputSchema: writeResultOut,
  errors,
  run: async (args, ctx) => {
    const actor = requireActor(ctx);
    const shop = await requireShop(args.shopId, "write");
    const id = await postStockCount(shop, actor, args);
    return writeResult(shop, id);
  },
});
