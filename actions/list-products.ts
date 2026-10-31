import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { flag, flagArg, productOut, productView, shopIdArg } from "../server/lib/contracts.js";
import { normalizeName } from "../server/lib/match.js";
import { loadProducts, requireShop } from "../server/lib/shop.js";

export default defineAction({
  description: "List the shop's products with selling price, cost, stock on hand and whether stock is low.",
  schema: z.object({
    shopId: shopIdArg,
    query: z.string().optional().describe("Only products whose name contains this text"),
    lowStockOnly: flagArg("Only products at or below their low-stock level"),
    includeArchived: flagArg("Include archived products; defaults to false"),
  }),
  http: { method: "GET" },
  readOnly: true,
  outputSchema: z.object({ products: z.array(productOut) }),
  run: async (args) => {
    const shop = await requireShop(args.shopId);
    const wanted = args.query ? normalizeName(args.query) : "";
    const rows = (await loadProducts(shop.id, flag(args.includeArchived, false)))
      .filter((p) => !wanted || normalizeName(p.name).includes(wanted))
      .map(productView)
      .filter((p) => !flag(args.lowStockOnly, false) || p.lowStock);
    return { products: rows };
  },
});
