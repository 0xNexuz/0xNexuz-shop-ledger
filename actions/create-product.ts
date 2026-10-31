import { defineAction, defineActionErrors } from "@agent-native/core/action";
import { z } from "zod";

import { productOut, productView, shopIdArg } from "../server/lib/contracts.js";
import { createProduct } from "../server/lib/catalog.js";
import { loadProducts, requireActor, requireShop } from "../server/lib/shop.js";

const errors = defineActionErrors("product_exists", "invalid_name", "invalid_amount", "invalid_quantity", "no_shop");

export default defineAction({
  description:
    "Add a product the shop sells. Opening stock is recorded as a stock entry so the books stay balanced. Rejects product_exists when the name is taken.",
  schema: z.object({
    shopId: shopIdArg,
    name: z.string().min(2).max(80).describe('Name as the shop says it, e.g. "Rice (50kg bag)"'),
    unit: z.string().max(20).default("piece").describe('Selling unit, e.g. "bag", "carton", "tin"; defaults to "piece"'),
    price: z.coerce.number().nonnegative().describe("Selling price per unit in naira"),
    cost: z.coerce.number().nonnegative().optional().describe("Cost per unit in naira, if known"),
    stock: z.coerce.number().int().min(0).default(0).describe("Units on hand now; defaults to 0"),
    lowStockAt: z.coerce.number().int().min(0).default(5).describe("Warn when stock falls to this or below; defaults to 5"),
  }),
  outputSchema: productOut,
  errors,
  run: async (args, ctx) => {
    const actor = requireActor(ctx);
    const shop = await requireShop(args.shopId, "write");
    const id = await createProduct(shop, actor, args);
    const row = (await loadProducts(shop.id, true)).find((p) => p.id === id);
    if (!row) throw new Error("Product vanished after insert");
    return productView(row);
  },
});
