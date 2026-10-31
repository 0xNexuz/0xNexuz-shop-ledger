import { defineAction, defineActionErrors } from "@agent-native/core/action";
import { z } from "zod";

import { flag, flagArg, productOut, productView, shopIdArg } from "../server/lib/contracts.js";
import { updateProduct } from "../server/lib/catalog.js";
import { loadProducts, requireActor, requireShop, resolveProduct } from "../server/lib/shop.js";

const errors = defineActionErrors(
  "not_found",
  "unknown_product",
  "ambiguous_product",
  "product_exists",
  "invalid_name",
  "invalid_amount",
  "no_change",
  "no_shop",
);

export default defineAction({
  description:
    "Change a product's name, unit, price, cost, low-stock level, or archive it. Stock changes go through record-restock or record-stock-count, never here.",
  schema: z.object({
    shopId: shopIdArg,
    id: z.string().min(1).describe("Product id (or its name)"),
    name: z.string().min(2).max(80).optional().describe("New name"),
    unit: z.string().max(20).optional().describe("New selling unit"),
    price: z.coerce.number().nonnegative().optional().describe("New selling price per unit in naira"),
    cost: z.coerce.number().nonnegative().optional().describe("New cost per unit in naira"),
    lowStockAt: z.coerce.number().int().min(0).optional().describe("New low-stock warning level"),
    archived: flagArg("true to archive (hide from sale), false to restore"),
  }),
  outputSchema: productOut,
  errors,
  run: async (args, ctx) => {
    requireActor(ctx);
    const shop = await requireShop(args.shopId, "write");
    const catalog = await loadProducts(shop.id, true);
    const product = resolveProduct(catalog, args.id);
    await updateProduct(shop, product.id, {
      name: args.name,
      unit: args.unit,
      price: args.price,
      cost: args.cost,
      lowStockAt: args.lowStockAt,
      archived: args.archived === undefined ? undefined : flag(args.archived, false),
    });
    const row = (await loadProducts(shop.id, true)).find((p) => p.id === product.id);
    if (!row) throw new Error("Product vanished after update");
    return productView(row);
  },
});
