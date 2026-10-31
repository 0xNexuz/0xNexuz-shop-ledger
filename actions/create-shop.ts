import { NoWriteError, defineAction, defineActionErrors } from "@agent-native/core/action";
import { accessFilter } from "@agent-native/core/sharing";
import { z } from "zod";

import { getDb, schema } from "../server/db/index.js";
import { createShop } from "../server/lib/catalog.js";
import { requireActor } from "../server/lib/shop.js";

const errors = defineActionErrors("shop_exists", "unauthenticated");

export default defineAction({
  description: "Create the user's shop (one per person or team). Prices are in naira by default.",
  schema: z.object({
    name: z.string().min(2).max(80).describe('Shop name, e.g. "Mama Chioma Provisions"'),
    currency: z.enum(["NGN", "GHS", "KES", "USD"]).default("NGN").describe('Currency code; defaults to "NGN"'),
  }),
  outputSchema: z.object({ id: z.string(), name: z.string(), currency: z.string() }),
  errors,
  run: async (args, ctx) => {
    const actor = requireActor(ctx);
    const [existing] = await getDb()
      .select({ id: schema.shops.id, name: schema.shops.name })
      .from(schema.shops)
      .where(accessFilter(schema.shops, schema.shopShares, undefined, "editor"))
      .limit(1);
    if (existing) {
      throw new NoWriteError(`You already have a shop: ${existing.name}.`, {
        errorCode: "shop_exists",
        statusCode: 409,
        details: { id: existing.id },
      });
    }
    const id = await createShop(actor, args);
    return { id, name: args.name.trim(), currency: args.currency };
  },
});
